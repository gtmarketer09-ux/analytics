import { initializeDatabase } from '../db/data-source';
import { AdMobReport } from '../db/entities/AdMobReport';
import { GoogleAdsReport } from '../db/entities/GoogleAdsReport';
import { isDate } from '../lib/dates';

type CurrencyApiResponse = {
  date: string;
  usd: Record<string, number>;
};

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

const CURRENCY_CODES = [
  'AUD', 'BRL', 'CAD', 'COP', 'EUR', 'GBP', 'GEL', 'GHS', 'HUF', 'IDR',
  'ILS', 'INR', 'JPY', 'KES', 'KRW', 'LKR', 'MYR', 'NGN', 'NZD', 'PEN',
  'PHP', 'PKR', 'PYG', 'THB', 'TRY', 'USD', 'VND', 'ZAR',
] as const;

export async function clearCurrencyRates(): Promise<number> {
  const dataSource = await initializeDatabase();
  const result = await dataSource.query(
    `DELETE FROM daily_currency_rates`,
  );
  return typeof result[1] === 'number' ? result[1] : 0;
}

async function fetchUsdRates(date?: string): Promise<CurrencyApiResponse> {
  const urls = [
    date ? `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json` : '',
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
  ].filter(Boolean);

  let lastError = 'No response received';
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const body = await response.text();
        lastError = `Currency API returned ${response.status}: ${body}`;
        continue;
      }

      const data = await response.json() as CurrencyApiResponse;
      if (!isDate(data.date) || !data.usd || typeof data.usd !== 'object') {
        throw new Error('Currency API returned an invalid response.');
      }
      for (const code of CURRENCY_CODES) {
        if (!numeric(data.usd[code.toLowerCase()])) {
          throw new Error(`Currency API returned a missing ${code} rate.`);
        }
      }
      return data;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`Unable to fetch latest currency rates: ${lastError}`);
}

export async function syncCurrencyConversions(date?: string): Promise<{
  date: string;
  audToUsd: number;
  pkrToUsd: number;
  rates: Record<string, number>;
  updatedAdmobRows: number;
  updatedGoogleAdsRows: number;
}> {
  const ratesResponse = await fetchUsdRates(date);
  const normalizedDate = date && isDate(date) ? date : ratesResponse.date;

  const dataSource = await initializeDatabase();
  const rates: Record<string, number> = {};
  for (const code of CURRENCY_CODES) {
    const usdRate = numeric(ratesResponse.usd[code.toLowerCase()]);
    rates[code] = code === 'USD' ? 1 : 1 / usdRate;
  }

  await dataSource.transaction(async (manager) => {
    await manager.query(`
      CREATE TABLE IF NOT EXISTS daily_currency_rates (
        date date NOT NULL,
        currency varchar(3) NOT NULL,
        exchange_rate numeric(18,10) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (date, currency)
      )
    `);
    // Clear previous rates so only the most recent values are stored in the table
    await manager.query(`DELETE FROM daily_currency_rates`);
    for (const code of CURRENCY_CODES) {
      await manager.query(
        `INSERT INTO daily_currency_rates (date, currency, exchange_rate)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE exchange_rate = VALUES(exchange_rate), updated_at = CURRENT_TIMESTAMP`,
        [normalizedDate, code, rates[code]],
      );
    }
  });

  const audToUsd = rates.AUD;
  const pkrToUsd = rates.PKR;

  const admobRepository = dataSource.getRepository<AdMobReport>('AdMobReport');
  const admobReports = await admobRepository.find({ where: { date: normalizedDate } });
  const googleRepository = dataSource.getRepository<GoogleAdsReport>('GoogleAdsReport');
  const googleReports = await googleRepository.find({ where: { date: normalizedDate } });
  for (const report of googleReports) {
    report.adSpendUsd = roundCurrency(numeric(report.adSpend) * pkrToUsd);
  }
  if (googleReports.length) await googleRepository.save(googleReports);

  for (const report of admobReports) {
    report.revenueUsd = roundCurrency(numeric(report.revenue) * audToUsd);
  }
  if (admobReports.length) await admobRepository.save(admobReports);

  return {
    date: normalizedDate,
    audToUsd,
    pkrToUsd,
    rates,
    updatedAdmobRows: admobReports.length,
    updatedGoogleAdsRows: googleReports.length,
  };
}

export async function syncExistingCurrencyConversions(): Promise<Array<Awaited<ReturnType<typeof syncCurrencyConversions>>>> {
  const result = await syncCurrencyConversions();
  return [result];
}
