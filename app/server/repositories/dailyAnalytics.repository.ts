import { Between, In } from 'typeorm';
import { initializeDatabase } from '../db/data-source';
import { DailyAnalytics } from '../db/entities/DailyAnalytics';
import { AdMobReport } from '../db/entities/AdMobReport';
import { PlayConsoleReport } from '../db/entities/PlayConsoleReports';
import { GoogleAdsReport } from '../db/entities/GoogleAdsReport';
import { DailyCurrencyRate } from '../db/entities/DailyCurrencyRate';
import { settings } from '../config/env';
import { isDate } from '../lib/dates';

export const MIN_ANALYTICS_DATE = '2026-11-01';

function numeric(value: unknown): number {
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return numeric((value as { value: unknown }).value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function getCurrencyRate(
  currency: string,
  targetDate: string,
  ratesByCurrency: Map<string, Array<{ date: string; rate: number }>>,
  fallbackRate: number,
): number {
  if (currency.toUpperCase() === 'USD') return 1.0;
  const rates = ratesByCurrency.get(currency.toUpperCase()) ?? [];
  if (!rates.length) return fallbackRate;

  // 1. Exact match for the target date
  const exact = rates.find((r) => r.date === targetDate);
  if (exact) return exact.rate;

  // 2. Closest rate on or before target date
  let closestOnOrBefore: { date: string; rate: number } | null = null;
  for (const r of rates) {
    if (r.date <= targetDate) {
      if (!closestOnOrBefore || r.date > closestOnOrBefore.date) {
        closestOnOrBefore = r;
      }
    }
  }
  if (closestOnOrBefore) return closestOnOrBefore.rate;

  // 3. Fallback to latest rate available in currency table
  let latestRate: { date: string; rate: number } = rates[0];
  for (const r of rates) {
    if (r.date > latestRate.date) latestRate = r;
  }
  return latestRate.rate;
}

export type SyncDailyAnalyticsOptions = {
  dates?: string[];
  start?: string;
  end?: string;
};

export async function syncDailyAnalytics(
  options?: SyncDailyAnalyticsOptions | string[] | string,
): Promise<DailyAnalytics[]> {
  const dataSource = await initializeDatabase();

  let targetDates: string[] = [];

  if (typeof options === 'string') {
    targetDates = [options];
  } else if (Array.isArray(options)) {
    targetDates = options;
  } else if (options && typeof options === 'object') {
    if (options.dates && options.dates.length) {
      targetDates = options.dates;
    } else if (options.start && options.end) {
      // Range query handled below
    }
  }

  // Filter to valid dates starting from MIN_ANALYTICS_DATE
  targetDates = targetDates
    .filter((d) => isDate(d) && d >= MIN_ANALYTICS_DATE)
    .sort();

  // If no specific dates passed or empty, discover all distinct dates >= MIN_ANALYTICS_DATE
  if (!targetDates.length) {
    const rawDates = await dataSource.query(`
      SELECT DISTINCT d.date
      FROM (
        SELECT date FROM admob_daily_reports WHERE date >= ?
        UNION
        SELECT date FROM google_ads_daily_reports WHERE date >= ?
        UNION
        SELECT date FROM play_console_daily_reports WHERE date >= ?
      ) d
      ORDER BY d.date ASC
    `, [MIN_ANALYTICS_DATE, MIN_ANALYTICS_DATE, MIN_ANALYTICS_DATE]) as Array<{ date: string }>;

    targetDates = rawDates.map((r) => String(r.date).slice(0, 10));
  }

  if (!targetDates.length) {
    return [];
  }

  // Load currency rates
  const currencyRows = await dataSource.getRepository<DailyCurrencyRate>('DailyCurrencyRate').find({
    order: { date: 'ASC' },
  });
  const ratesByCurrency = new Map<string, Array<{ date: string; rate: number }>>();
  for (const row of currencyRows) {
    const code = row.currency.toUpperCase();
    if (!ratesByCurrency.has(code)) {
      ratesByCurrency.set(code, []);
    }
    ratesByCurrency.get(code)!.push({
      date: typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10),
      rate: Number(row.exchangeRate),
    });
  }

  // Load source records for target dates
  const admobRecords = await dataSource.getRepository<AdMobReport>('AdMobReport').find({
    where: { date: In(targetDates) },
  });
  const admobByDate = new Map(admobRecords.map((r) => [r.date.slice(0, 10), r]));

  const playRecords = await dataSource.getRepository<PlayConsoleReport>('PlayConsoleReport').find({
    where: { date: In(targetDates) },
  });
  const playByDate = new Map(playRecords.map((r) => [r.date.slice(0, 10), r]));

  const googleAdsRecords = await dataSource.getRepository<GoogleAdsReport>('GoogleAdsReport').find({
    where: { date: In(targetDates) },
  });
  const googleAdsByDate = new Map(googleAdsRecords.map((r) => [r.date.slice(0, 10), r]));

  const results: DailyAnalytics[] = [];

  for (const date of targetDates) {
    const admob = admobByDate.get(date);
    const play = playByDate.get(date);
    const gads = googleAdsByDate.get(date);

    // 1. admob revenue (take revenue_usd directly from admob_daily_reports)
    const admobRevenueUsd = admob
      ? roundCurrency(numeric(admob.revenueUsd))
      : 0.00;
    const admobImpressions = admob ? numeric(admob.impressions) : 0;

    // 2. console play revenue without tax (from play_console_daily_reports)
    const consolePlayRevenueWithoutTax = play
      ? roundCurrency(numeric(play.revenueWithoutTax))
      : 0.00;

    // Total revenue = admob revenue_usd + console play revenue without tax
    const totalRevenue = roundCurrency(admobRevenueUsd + consolePlayRevenueWithoutTax);

    // Google ads spendings USD
    let gadsSpendUsd = gads ? roundCurrency(numeric(gads.adSpendUsd)) : 0.00;
    if (gadsSpendUsd === 0 && gads && numeric(gads.adSpend) > 0) {
      const pkrRate = getCurrencyRate('PKR', date, ratesByCurrency, 0.0036);
      gadsSpendUsd = roundCurrency(numeric(gads.adSpend) * pkrRate);
    }

    // P/L: total revenue usd - ad spending usd
    const pl = roundCurrency(totalRevenue - gadsSpendUsd);

    // Roas: admob revenue (usd) / Google ads spendings USD
    const roas = gadsSpendUsd > 0
      ? Number((admobRevenueUsd / gadsSpendUsd).toFixed(4))
      : 0.0000;

    // ecpm: (admob revenue(usd) / ad impressions (admob) ) * 1000
    const ecpm = admobImpressions > 0
      ? roundCurrency((admobRevenueUsd / admobImpressions) * 1000)
      : 0.00;

    const row = new DailyAnalytics();
    row.date = date;
    row.totalRevenue = totalRevenue;
    row.pl = pl;
    row.roas = roas;
    row.ecpm = ecpm;
    results.push(row);
  }

  if (results.length) {
    const repository = dataSource.getRepository<DailyAnalytics>('DailyAnalytics');
    await repository.upsert(results, ['date']);
  }

  return results;
}

export async function getDailyAnalytics(start?: string, end?: string): Promise<DailyAnalytics[]> {
  const dataSource = await initializeDatabase();
  const repository = dataSource.getRepository<DailyAnalytics>('DailyAnalytics');

  const effectiveStart = start && start >= MIN_ANALYTICS_DATE ? start : MIN_ANALYTICS_DATE;

  if (end) {
    return repository.find({
      where: { date: Between(effectiveStart, end) },
      order: { date: 'ASC' },
    });
  }

  return repository
    .createQueryBuilder('analytics')
    .where('analytics.date >= :start', { start: effectiveStart })
    .orderBy('analytics.date', 'ASC')
    .getMany();
}

export type PortfolioDayMetrics = {
  date: string;
  totalRevenue: number;
  admobRevenueUsd: number;
  playRevenue: number;
  adSpendUsd: number;
  pl: number;
  roas: number;
  ecpm: number;
};

export type PortfolioReportData = {
  days: PortfolioDayMetrics[];
  totalRevenue: number;
  totalAdSpendUsd: number;
  totalProfit: number;
  monthEndProjectedProfit: number;
  monthEndProjectedRevenue: number;
  currentMonthProfit: number;
  currentMonthRevenue: number;
  currentMonthSpend: number;
  currentMonthDaysElapsed: number;
  totalDaysInCurrentMonth: number;
  latestDate: string;
  latestDayRevenue: number;
  latestDaySpending: number;
  latestDayProfit: number;
  latestDayRoas: number;
  latestDayEcpm: number;
  averageEcpm: number;
  windowRoas: number;
  lastUpdated: Date | null;
};

export async function getPortfolioReport(start: string, end: string): Promise<PortfolioReportData> {
  const dataSource = await initializeDatabase();

  const rows = await dataSource.query(`
    SELECT 
      da.date as date,
      da.total_revenue,
      da.p_l,
      da.roas,
      da.ecpm,
      da.updated_at,
      COALESCE(gads.ad_spend_usd, 0) as ad_spend_usd,
      COALESCE(pc.revenue_without_tax, 0) as play_revenue
    FROM daily_analytics da
    LEFT JOIN google_ads_daily_reports gads ON gads.date = da.date
    LEFT JOIN play_console_daily_reports pc ON pc.date = da.date
    WHERE da.date >= ?
    ORDER BY da.date ASC
  `, [MIN_ANALYTICS_DATE]) as Array<{
    date: string;
    total_revenue: string | number;
    p_l: string | number;
    roas: string | number;
    ecpm: string | number;
    updated_at: string | Date;
    ad_spend_usd: string | number;
    play_revenue: string | number;
  }>;

  const allDays: PortfolioDayMetrics[] = rows.map((r) => {
    const totalRev = Number(r.total_revenue) || 0;
    const playRev = Number(r.play_revenue) || 0;
    const admobRevUsd = roundCurrency(Math.max(0, totalRev - playRev));
    return {
      date: r.date.slice(0, 10),
      totalRevenue: totalRev,
      admobRevenueUsd: admobRevUsd,
      playRevenue: playRev,
      adSpendUsd: Number(r.ad_spend_usd) || 0,
      pl: Number(r.p_l) || 0,
      roas: Number(r.roas) || 0,
      ecpm: Number(r.ecpm) || 0,
    };
  });

  const latestAvailableDate = allDays.length ? allDays[allDays.length - 1].date : MIN_ANALYTICS_DATE;
  const currentMonthPrefix = latestAvailableDate.slice(0, 7);
  const currentMonthYear = Number(latestAvailableDate.slice(0, 4));
  const currentMonthNum = Number(latestAvailableDate.slice(5, 7));
  const totalDaysInCurrentMonth = new Date(currentMonthYear, currentMonthNum, 0).getDate();

  const currentMonthDays = allDays.filter((d) => d.date.startsWith(currentMonthPrefix));
  const currentMonthRevenue = currentMonthDays.reduce((s, d) => s + d.totalRevenue, 0);
  const currentMonthSpend = currentMonthDays.reduce((s, d) => s + d.adSpendUsd, 0);
  const currentMonthProfit = currentMonthDays.reduce((s, d) => s + d.pl, 0);
  const currentMonthDaysElapsed = currentMonthDays.length;

  const monthEndProjectedProfit = currentMonthDaysElapsed > 0
    ? roundCurrency((currentMonthProfit / currentMonthDaysElapsed) * totalDaysInCurrentMonth)
    : 0;
  const monthEndProjectedRevenue = currentMonthDaysElapsed > 0
    ? roundCurrency((currentMonthRevenue / currentMonthDaysElapsed) * totalDaysInCurrentMonth)
    : 0;

  const filteredDays = allDays.filter((d) => d.date >= start && d.date <= end);

  const totalRevenue = filteredDays.reduce((s, d) => s + d.totalRevenue, 0);
  const totalAdSpendUsd = filteredDays.reduce((s, d) => s + d.adSpendUsd, 0);
  const totalProfit = roundCurrency(totalRevenue - totalAdSpendUsd);
  const totalAdmobRevUsd = filteredDays.reduce((s, d) => s + d.admobRevenueUsd, 0);
  const windowRoas = totalAdSpendUsd > 0
    ? Number((totalAdmobRevUsd / totalAdSpendUsd).toFixed(4))
    : 0;

  const latestDay = filteredDays.length ? filteredDays[filteredDays.length - 1] : null;
  const latestDate = latestDay ? latestDay.date : '';
  const latestDayRevenue = latestDay ? latestDay.totalRevenue : 0;
  const latestDaySpending = latestDay ? latestDay.adSpendUsd : 0;
  const latestDayProfit = latestDay ? latestDay.pl : 0;
  const latestDayRoas = latestDay ? latestDay.roas : 0;
  const latestDayEcpm = latestDay ? latestDay.ecpm : 0;

  const daysWithEcpm = filteredDays.filter((d) => d.ecpm > 0);
  const averageEcpm = daysWithEcpm.length
    ? roundCurrency(daysWithEcpm.reduce((s, d) => s + d.ecpm, 0) / daysWithEcpm.length)
    : 0;

  const lastUpdated = rows.length && rows[rows.length - 1].updated_at
    ? new Date(rows[rows.length - 1].updated_at)
    : null;

  return {
    days: filteredDays,
    totalRevenue: roundCurrency(totalRevenue),
    totalAdSpendUsd: roundCurrency(totalAdSpendUsd),
    totalProfit: roundCurrency(totalProfit),
    monthEndProjectedProfit,
    monthEndProjectedRevenue,
    currentMonthProfit: roundCurrency(currentMonthProfit),
    currentMonthRevenue: roundCurrency(currentMonthRevenue),
    currentMonthSpend: roundCurrency(currentMonthSpend),
    currentMonthDaysElapsed,
    totalDaysInCurrentMonth,
    latestDate,
    latestDayRevenue,
    latestDaySpending,
    latestDayProfit,
    latestDayRoas,
    latestDayEcpm,
    averageEcpm,
    windowRoas,
    lastUpdated,
  };
}

export async function getDailyAnalyticsAvailableRange(): Promise<{ start: string; end: string } | null> {
  const dataSource = await initializeDatabase();
  const repository = dataSource.getRepository<DailyAnalytics>('DailyAnalytics');
  const result = await repository
    .createQueryBuilder('analytics')
    .select('MIN(analytics.date)', 'start')
    .addSelect('MAX(analytics.date)', 'end')
    .getRawOne<{ start: unknown; end: unknown }>();

  const normalize = (value: unknown): string | null => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
      ? value.slice(0, 10)
      : null;
  };
  const start = normalize(result?.start);
  const end = normalize(result?.end);

  return start && end ? { start, end } : null;
}


