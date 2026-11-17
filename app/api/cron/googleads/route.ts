import { NextResponse } from 'next/server';
import { env } from '../../../server/config/env';
import { addDays, dayCount, isDate } from '../../../server/lib/dates';
import {
  fetchAndSaveGoogleAdsReports,
  getGoogleAdsStoredDates,
} from '../../../server/repositories/googleAds.repository';
import { syncDailyAnalytics } from '../../../server/repositories/dailyAnalytics.repository';

const DEFAULT_START = '2026-10-25';
const DEFAULT_END = '2026-11-03';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  try {
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized access attempt' }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const start = params.get('start') ?? DEFAULT_START;
    const end = params.get('end') ?? DEFAULT_END;
    const refresh = params.get('refresh') === '1' || params.get('refresh') === 'true';

    if (!isDate(start) || !isDate(end) || start > end) {
      return NextResponse.json({ error: 'Provide a valid start and end date.' }, { status: 400 });
    }

    const storedDates = await getGoogleAdsStoredDates(start, end);
    let missingCount = 0;
    for (let date = start; date <= end; date = addDays(date, 1)) {
      if (!storedDates.includes(date)) missingCount++;
    }

    if (!refresh && !missingCount) {
      return NextResponse.json({
        success: true,
        cached: true,
        start,
        end,
        message: `No Google Ads BigQuery query needed; ${start} through ${end} are already stored.`,
        savedDates: storedDates,
      });
    }

    const savedDates = await fetchAndSaveGoogleAdsReports(start, end);
    await syncDailyAnalytics(savedDates);
    return NextResponse.json({
      success: true,
      cached: false,
      start,
      end,
      savedCount: savedDates.length,
      savedDates,
      requestedDays: dayCount(start, end),
      message: `Fetched the Google Ads BigQuery report once and saved it for ${start} through ${end}.`,
    });
  } catch (error: unknown) {
    console.error('Google Ads BigQuery sync error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
