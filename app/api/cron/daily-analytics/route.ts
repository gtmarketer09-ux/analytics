import { NextResponse } from 'next/server';
import { env } from '../../../server/config/env';
import { isDate } from '../../../server/lib/dates';
import { MIN_ANALYTICS_DATE, syncDailyAnalytics } from '../../../server/repositories/dailyAnalytics.repository';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  try {
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized access attempt' }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const requestedDate = params.get('date');
    const start = params.get('start');
    const end = params.get('end');

    if (requestedDate) {
      if (!isDate(requestedDate)) {
        return NextResponse.json({ error: 'Provide a valid date in YYYY-MM-DD format.' }, { status: 400 });
      }
      if (requestedDate < MIN_ANALYTICS_DATE) {
        return NextResponse.json({
          error: `Daily analytics only tracks dates starting from ${MIN_ANALYTICS_DATE}.`,
        }, { status: 400 });
      }
      const results = await syncDailyAnalytics(requestedDate);
      return NextResponse.json({
        success: true,
        count: results.length,
        results,
        message: `Synchronized daily analytics for ${requestedDate}.`,
      });
    }

    if (start && end) {
      if (!isDate(start) || !isDate(end) || start > end) {
        return NextResponse.json({ error: 'Provide a valid start and end date.' }, { status: 400 });
      }
      const dates: string[] = [];
      const current = new Date(`${start}T00:00:00Z`);
      const endDate = new Date(`${end}T00:00:00Z`);
      while (current <= endDate) {
        const iso = current.toISOString().slice(0, 10);
        if (iso >= MIN_ANALYTICS_DATE) dates.push(iso);
        current.setUTCDate(current.getUTCDate() + 1);
      }
      const results = await syncDailyAnalytics(dates);
      return NextResponse.json({
        success: true,
        count: results.length,
        results,
        message: `Synchronized daily analytics for ${dates.length} days from ${start} to ${end}.`,
      });
    }

    // Default: sync all available dates starting from Nov 1
    const results = await syncDailyAnalytics();
    return NextResponse.json({
      success: true,
      count: results.length,
      results,
      message: `Synchronized daily analytics for ${results.length} days starting from ${MIN_ANALYTICS_DATE}.`,
    });
  } catch (error: unknown) {
    console.error('Daily Analytics sync error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

