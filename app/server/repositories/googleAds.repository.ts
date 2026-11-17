import { BigQuery } from '@google-cloud/bigquery';
import { Between } from 'typeorm';
import { initializeDatabase } from '../db/data-source';
import { GoogleAdsReport } from '../db/entities/GoogleAdsReport';
import { DailyCurrencyRate } from '../db/entities/DailyCurrencyRate';
import { addDays, isDate } from '../lib/dates';

export type GoogleAdsDailyMetrics = {
  date: string;
  impressions: number;
  clicks: number;
  adSpend: number;
  adSpendUsd: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  conversionRate: number;
  roas: number;
};

export type GoogleAdsReportData = {
  days: GoogleAdsDailyMetrics[];
  totalAdSpend: number;
  totalConversions: number;
  totalConversionValue: number;
  lastUpdated: Date | null;
};

function numeric(value: unknown): number {
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return numeric((value as { value: unknown }).value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return normalizeDate((value as { value: unknown }).value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== 'string') return null;
  const date = value.slice(0, 10).replace(/\//g, '-');
  return isDate(date) ? date : null;
}

export async function getGoogleAdsStoredDates(start: string, end: string): Promise<string[]> {
  const dataSource = await initializeDatabase();
  const records = await dataSource.getRepository<GoogleAdsReport>('GoogleAdsReport').find({
    where: { date: Between(start, end) },
    order: { date: 'ASC' },
  });
  return records.map((record) => record.date);
}

export async function getGoogleAdsAvailableRange(): Promise<{ start: string; end: string } | null> {
  const dataSource = await initializeDatabase();
  const repository = dataSource.getRepository<GoogleAdsReport>('GoogleAdsReport');
  const result = await repository
    .createQueryBuilder('report')
    .select('MIN(report.date)', 'start')
    .addSelect('MAX(report.date)', 'end')
    .getRawOne<{ start: unknown; end: unknown }>();
  const start = normalizeDate(result?.start);
  const end = normalizeDate(result?.end);
  return start && end ? { start, end } : null;
}

export async function fetchAndSaveGoogleAdsReports(start: string, end: string): Promise<string[]> {
  if (!isDate(start) || !isDate(end) || start > end) {
    throw new Error('A valid start and end date are required.');
  }

  const bigquery = new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  });
  const query = `
    WITH daily_traffic_stats AS (
      SELECT
        segments_date AS ad_date,
        campaign_id,
        SUM(metrics_impressions) AS total_impressions,
        SUM(metrics_clicks) AS total_clicks,
        ROUND(SUM(metrics_cost_micros) / 1000000, 2) AS total_ad_spend_pkr
      FROM \`vr-player-app.google_ads_raw.ads_HourlyCampaignStats_7627469376\`
      WHERE segments_date BETWEEN @start AND @end
      GROUP BY ad_date, campaign_id
    ),
    daily_conversion_stats AS (
      SELECT
        segments_date AS ad_date,
        campaign_id,
        ROUND(SUM(metrics_conversions), 1) AS total_conversions,
        ROUND(SUM(metrics_conversions_value), 2) AS total_conversion_value_pkr
      FROM \`vr-player-app.google_ads_raw.ads_HourlyCampaignConversionStats_7627469376\`
      WHERE segments_date BETWEEN @start AND @end
      GROUP BY ad_date, campaign_id
    )
    SELECT
      t.ad_date,
      SUM(t.total_impressions) AS total_impressions,
      SUM(t.total_clicks) AS total_clicks,
      SUM(t.total_ad_spend_pkr) AS total_ad_spend_pkr,
      COALESCE(SUM(c.total_conversions), 0) AS total_conversions,
      COALESCE(SUM(c.total_conversion_value_pkr), 0) AS total_conversion_value_pkr,
      ROUND(SAFE_DIVIDE(SUM(t.total_clicks), SUM(t.total_impressions)) * 100, 2) AS ctr_percentage,
      ROUND(SAFE_DIVIDE(SUM(c.total_conversions), SUM(t.total_clicks)) * 100, 2) AS conversion_rate_percentage,
      0 AS roas
    FROM daily_traffic_stats t
    LEFT JOIN daily_conversion_stats c
      ON t.ad_date = c.ad_date AND t.campaign_id = c.campaign_id
    GROUP BY t.ad_date
    ORDER BY t.ad_date DESC
  `;

  const [rows] = await bigquery.query({
    query,
    location: 'US',
    params: { start, end },
  });

  const totalsByDate = new Map<string, GoogleAdsDailyMetrics>();
  const conversionValuePkrByDate = new Map<string, number>();
  for (const row of rows as Record<string, unknown>[]) {
    const date = normalizeDate(row.ad_date);
    if (!date) continue;
    conversionValuePkrByDate.set(date, numeric(row.total_conversion_value_pkr));
    totalsByDate.set(date, {
      date,
      impressions: numeric(row.total_impressions),
      clicks: numeric(row.total_clicks),
      adSpend: numeric(row.total_ad_spend_pkr),
      adSpendUsd: 0,
      conversions: numeric(row.total_conversions),
      conversionValue: 0,
      ctr: numeric(row.ctr_percentage),
      conversionRate: numeric(row.conversion_rate_percentage),
      roas: numeric(row.roas),
    });
  }

  const reports: Array<Omit<GoogleAdsDailyMetrics, never>> = [];
  const dataSource = await initializeDatabase();
  const currencyRows = await dataSource.getRepository<DailyCurrencyRate>('DailyCurrencyRate').find({
    where: { currency: 'PKR' },
    order: { date: 'ASC' },
  });
  const pkrRates = new Map(
    currencyRows.map((row) => [row.date, Number(row.exchangeRate)]),
  );
  const getPkrToUsd = (date: string): number => {
    if (pkrRates.has(date)) return Number(pkrRates.get(date));
    let rate = 0;
    let rateDate = '';
    for (const [candidateDate, candidateRate] of pkrRates) {
      if (candidateDate <= date && candidateDate >= rateDate) {
        rateDate = candidateDate;
        rate = candidateRate;
      }
    }
    if (!rate && currencyRows.length > 0) {
      rate = Number(currencyRows[currencyRows.length - 1].exchangeRate);
    }
    return rate;
  };
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const source = totalsByDate.get(date) ?? {
      date,
      impressions: 0,
      clicks: 0,
      adSpend: 0,
      adSpendUsd: 0,
      conversions: 0,
      conversionValue: 0,
      ctr: 0,
      conversionRate: 0,
      roas: 0,
    };
    const pkrToUsd = getPkrToUsd(date);
    if (source.adSpend > 0 && !pkrToUsd) {
      throw new Error(`No PKR to USD exchange rate is available on or before ${date}.`);
    }
    const adSpendUsd = Number((source.adSpend * pkrToUsd).toFixed(2));
    const conversionValuePkr = conversionValuePkrByDate.get(date) ?? 0;
    const conversionValueUsd = Number((conversionValuePkr * pkrToUsd).toFixed(2));
    const roas = adSpendUsd > 0 ? Number((conversionValueUsd / adSpendUsd).toFixed(2)) : 0;
    reports.push({
      ...source,
      adSpendUsd,
      conversionValue: conversionValueUsd,
      roas,
    });
  }

  await dataSource.getRepository<GoogleAdsReport>('GoogleAdsReport').upsert(reports, ['date']);
  return reports.map((report) => report.date);
}

export async function getGoogleAdsReport(start: string, end: string): Promise<GoogleAdsReportData> {
  const dataSource = await initializeDatabase();
  const records = await dataSource.getRepository<GoogleAdsReport>('GoogleAdsReport').find({
    where: { date: Between(start, end) },
    order: { date: 'ASC' },
  });
  const days = records.map((record) => ({
    date: record.date,
    impressions: numeric(record.impressions),
    clicks: numeric(record.clicks),
    adSpend: numeric(record.adSpendUsd) > 0 ? numeric(record.adSpendUsd) : numeric(record.adSpend),
    adSpendUsd: numeric(record.adSpendUsd),
    conversions: numeric(record.conversions),
    conversionValue: numeric(record.conversionValue),
    ctr: numeric(record.ctr),
    conversionRate: numeric(record.conversionRate),
    roas: numeric(record.roas),
  }));
  const lastUpdated = records.reduce<Date | null>(
    (latest, record) => (!latest || record.createdAt > latest ? record.createdAt : latest),
    null,
  );

  return {
    days,
    totalAdSpend: days.reduce((sum, day) => sum + day.adSpend, 0),
    totalConversions: days.reduce((sum, day) => sum + day.conversions, 0),
    totalConversionValue: days.reduce((sum, day) => sum + day.conversionValue, 0),
    lastUpdated,
  };
}
