import { Between } from 'typeorm';
import { BigQuery } from '@google-cloud/bigquery';
import { initializeDatabase } from '../db/data-source';
import { FirebaseReport } from '../db/entities/FirebaseReport';
import { addDays, isDate } from '../lib/dates';

export type FirebaseDailyMetrics = {
  date: string;
  inApps: number;
  subscriptionRenewals: number;
};

export type FirebaseReportData = {
  days: FirebaseDailyMetrics[];
  inAppsTotal: number;
  subscriptionRenewalsTotal: number;
  lastUpdated: Date | null;
};

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return normalizeDate((value as { value: unknown }).value);
  }
  if (typeof value === 'string') {
    const date = value.slice(0, 10);
    return isDate(date) ? date : null;
  }
  return null;
}

export async function getFirebaseStoredDates(start: string, end: string): Promise<string[]> {
  const dataSource = await initializeDatabase();
  const records = await dataSource.getRepository<FirebaseReport>('FirebaseReport').find({
    where: { date: Between(start, end) },
    order: { date: 'ASC' },
  });
  return records.map((record) => record.date);
}

export async function getFirebaseAvailableRange(): Promise<{ start: string; end: string } | null> {
  const dataSource = await initializeDatabase();
  const repository = dataSource.getRepository<FirebaseReport>('FirebaseReport');
  const result = await repository
    .createQueryBuilder('report')
    .select('MIN(report.date)', 'start')
    .addSelect('MAX(report.date)', 'end')
    .getRawOne<{ start: unknown; end: unknown }>();
  const start = normalizeDate(result?.start);
  const end = normalizeDate(result?.end);
  return start && end ? { start, end } : null;
}

export async function fetchAndSaveFirebaseReports(start: string, end: string): Promise<string[]> {
  if (!isDate(start) || !isDate(end) || start > end) {
    throw new Error('A valid start and end date are required.');
  }

  const bigquery = new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  });
  const query = `
    SELECT
      PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) AS event_date,
      COUNTIF(event_name = 'in_app_purchase') AS in_apps,
      COUNTIF(event_name = 'app_store_subscription_renew') AS subscription_renewals
    FROM \`analytics_517302865.events_*\`
    WHERE event_name IN ('in_app_purchase', 'app_store_subscription_renew')
      AND _TABLE_SUFFIX BETWEEN @startSuffix AND @endSuffix
    GROUP BY event_date
    ORDER BY event_date DESC
  `;

  const [rows] = await bigquery.query({
    query,
    location: 'US',
    params: {
      startSuffix: start.replace(/-/g, ''),
      endSuffix: end.replace(/-/g, ''),
    },
  });

  const reports: Array<{ date: string; inApps: number; subscriptionRenewals: number }> = [];
  const totalsByDate = new Map<string, { inApps: number; subscriptionRenewals: number }>();
  for (const row of rows as Record<string, unknown>[]) {
    const date = normalizeDate(row.event_date);
    if (!date) continue;
    totalsByDate.set(date, {
      inApps: numeric(row.in_apps),
      subscriptionRenewals: numeric(row.subscription_renewals),
    });
  }
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const totals = totalsByDate.get(date) ?? { inApps: 0, subscriptionRenewals: 0 };
    reports.push({ date, ...totals });
  }

  if (reports.length) {
    const dataSource = await initializeDatabase();
    await dataSource.getRepository<FirebaseReport>('FirebaseReport').upsert(reports, ['date']);

    // Update in_apps column in play_console_daily_reports to take value from Firebase
    for (const report of reports) {
      await dataSource.query(
        `UPDATE play_console_daily_reports SET in_apps = ? WHERE date = ?`,
        [report.inApps, report.date],
      );
    }
  }
  return reports.map((report) => report.date);
}

export async function getFirebaseReport(start: string, end: string): Promise<FirebaseReportData> {
  const dataSource = await initializeDatabase();
  const records = await dataSource.getRepository<FirebaseReport>('FirebaseReport').find({
    where: { date: Between(start, end) },
    order: { date: 'ASC' },
  });
  const days = records.map((record) => ({
    date: record.date,
    inApps: numeric(record.inApps),
    subscriptionRenewals: numeric(record.subscriptionRenewals),
  }));
  const lastUpdated = records.reduce<Date | null>(
    (latest, record) => (!latest || record.createdAt > latest ? record.createdAt : latest),
    null,
  );

  return {
    days,
    inAppsTotal: days.reduce((sum, day) => sum + day.inApps, 0),
    subscriptionRenewalsTotal: days.reduce((sum, day) => sum + day.subscriptionRenewals, 0),
    lastUpdated,
  };
}
