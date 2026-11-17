import { NextResponse } from 'next/server';
import { env, settings } from '../../../server/config/env';
import { addDays, isDate, yesterday } from '../../../server/lib/dates';
import { clearCurrencyRates, syncCurrencyConversions, syncExistingCurrencyConversions } from '../../../server/repositories/currency.repository';
import { syncDailyAnalytics } from '../../../server/repositories/dailyAnalytics.repository';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  try {
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized access attempt' }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const start = params.get('start');
    const end = params.get('end');
    const requestedDate = params.get('date');
    const clear = params.get('clear') === '1' || params.get('clear') === 'true';

    if (clear) {
      await clearCurrencyRates();
    }

    if (!requestedDate && !start && !end) {
      const date = yesterday(settings.timeZone);
      const result = await syncCurrencyConversions(date);
      await syncDailyAnalytics(date);
      return NextResponse.json({
        success: true,
        ...result,
        message: `Stored the latest USD currency rates for ${result.date}.`,
      });
    }

    if (start && end) {
      if (!isDate(start) || !isDate(end) || start > end) {
        return NextResponse.json({ error: 'Provide a valid start and end date.' }, { status: 400 });
      }
      const results = [];
      for (let date = start; date <= end; date = addDays(date, 1)) {
        results.push(await syncCurrencyConversions(date));
      }
      await syncDailyAnalytics({ start, end });
      return NextResponse.json({
        success: true,
        start,
        end,
        count: results.length,
        results,
        message: `Updated latest currency rates ${results.length} times.`,
      });
    }

    const date = requestedDate ?? end ?? yesterday(settings.timeZone);
    if (!isDate(date)) {
      return NextResponse.json({ error: 'Provide a valid date in YYYY-MM-DD format.' }, { status: 400 });
    }

    if (clear) await clearCurrencyRates();
    const result = await syncCurrencyConversions(date);
    await syncDailyAnalytics(date);
    return NextResponse.json({
      success: true,
      ...result,
      message: `Stored the latest USD currency rates for ${result.date}.`,
    });
  } catch (error: unknown) {
    console.error('Currency conversion sync error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
