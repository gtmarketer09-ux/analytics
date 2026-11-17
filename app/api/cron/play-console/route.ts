import { NextResponse } from 'next/server';
import { env, settings } from '../../../server/config/env';
import { dayCount, isDate, yesterday } from '../../../server/lib/dates';
import { fetchAndSavePlayConsoleReports } from '../../../server/repositories/playConsole.repository';
import { syncDailyAnalytics } from '../../../server/repositories/dailyAnalytics.repository';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  try {
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized access attempt' }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const latest = yesterday(settings.timeZone);
    const start = params.get('start') ?? latest;
    const end = params.get('end') ?? latest;

    if (
      !isDate(start) ||
      !isDate(end) ||
      start > end ||
      end > latest ||
      dayCount(start, end) > settings.maxDaysPerSync
    ) {
      return NextResponse.json(
        { error: `Provide a valid date range no longer than ${settings.maxDaysPerSync} days, ending no later than ${latest}.` },
        { status: 400 },
      );
    }

    const savedDates = await fetchAndSavePlayConsoleReports(start, end);
    await syncDailyAnalytics(savedDates);
    const requestedDays = dayCount(start, end);

    return NextResponse.json({
      success: true,
      start,
      end,
      savedCount: savedDates.length,
      savedDates,
      missingDays: requestedDays - savedDates.length,
      message: `Saved ${savedDates.length} Play Console daily reports for ${start} through ${end}.`,
    });
  } catch (error: unknown) {
    console.error('Play Console sync error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}