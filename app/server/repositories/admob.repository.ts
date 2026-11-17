import { Between } from 'typeorm';
import { AdMobReport as AdMobReportEntity } from '../db/entities/AdMobReport';
import { initializeDatabase } from '../db/data-source';
import type { AdmobMetrics, AdmobReport } from '../types/admob';

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAdmobReport(start: string, end: string): Promise<AdmobReport> {
  const dataSource = await initializeDatabase();
  const records = await dataSource.getRepository<AdMobReportEntity>('AdMobReport').find({
    where: { date: Between(start, end) },
    order: { date: 'ASC' },
  });

  const days: AdmobMetrics[] = records.map((record) => ({
    date: record.date,
    requests: numeric(record.requests),
    match_rate: numeric(record.motionRate) * 100,
    show_rate: numeric(record.showRate) * 100,
    impressions: numeric(record.impressions),
    clicks: numeric(record.clicks),
    ctr: numeric(record.ctr) * 100,
    ecpm: numeric(record.ecpm),
    revenue: numeric(record.revenue),
    revenue_usd: numeric(record.revenueUsd),
  }));

  const requests = days.reduce((sum, day) => sum + day.requests, 0);
  const impressions = days.reduce((sum, day) => sum + day.impressions, 0);
  const clicks = days.reduce((sum, day) => sum + day.clicks, 0);
  const revenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const revenueUsd = days.reduce((sum, day) => sum + day.revenue_usd, 0);
  const matchedRequests = records.reduce(
    (sum, record) => sum + numeric(record.requests) * numeric(record.motionRate),
    0,
  );
  const total: AdmobMetrics = {
    date: 'Total',
    requests,
    match_rate: requests > 0 ? (matchedRequests / requests) * 100 : 0,
    show_rate: matchedRequests > 0 ? (impressions / matchedRequests) * 100 : 0,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    ecpm: impressions > 0 ? (revenue / impressions) * 1000 : 0,
    revenue,
    revenue_usd: revenueUsd,
  };

  const lastUpdated = records.reduce<Date | null>(
    (latest, record) => (!latest || record.createdAt > latest ? record.createdAt : latest),
    null,
  );

  return { days, total, lastUpdated };
}

export async function getAdmobAvailableRange(): Promise<{ start: string; end: string } | null> {
  const dataSource = await initializeDatabase();
  const repository = dataSource.getRepository<AdMobReportEntity>('AdMobReport');
  const result = await repository
    .createQueryBuilder('report')
    .select('MIN(report.date)', 'start')
    .addSelect('MAX(report.date)', 'end')
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

export async function getAdmobStoredDates(start: string, end: string): Promise<string[]> {
  const dataSource = await initializeDatabase();
  const records = await dataSource.getRepository<AdMobReportEntity>('AdMobReport').find({
    where: { date: Between(start, end) },
    order: { date: 'ASC' },
  });

  return records.map((record) => record.date);
}

export async function saveAdmobReports(
  reports: Omit<AdMobReportEntity, 'id' | 'createdAt'>[],
): Promise<void> {
  if (!reports.length) return;

  const dataSource = await initializeDatabase();
  await dataSource.getRepository<AdMobReportEntity>('AdMobReport').upsert(reports, ['date']);
}