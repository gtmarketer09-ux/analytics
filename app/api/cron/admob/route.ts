import { NextResponse } from "next/server";
import { google } from "googleapis";
import { env, settings } from "../../../server/config/env";
import { addDays, dayCount, isDate, toApiDate, yesterday } from "../../../server/lib/dates";
import { getAdmobStoredDates, saveAdmobReports } from "../../../server/repositories/admob.repository";
import { syncDailyAnalytics } from "../../../server/repositories/dailyAnalytics.repository";
function missingRanges(start: string, end: string, storedDates: string[]): Array<{ start: string; end: string }> {
  const stored = new Set(storedDates);
  const ranges: Array<{ start: string; end: string }> = [];
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (!stored.has(date)) {
      if (!rangeStart) rangeStart = date;
      rangeEnd = date;
    } else if (rangeStart && rangeEnd) {
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = null;
      rangeEnd = null;
    }
  }

  if (rangeStart && rangeEnd) ranges.push({ start: rangeStart, end: rangeEnd });
  return ranges;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  try {
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized access attempt" }, { status: 401 });
    }

    const url = new URL(request.url);
    const requestedStart = url.searchParams.get('start');
    const requestedEnd = url.searchParams.get('end');
    const refresh = url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true';
    const latest = yesterday(settings.timeZone);
    const start = requestedStart ?? latest;
    const end = requestedEnd ?? latest;

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

    const admobConfig = env.admob;
    const storedDates = await getAdmobStoredDates(start, end);
    const ranges = refresh ? [{ start, end }] : missingRanges(start, end, storedDates);

    if (!ranges.length) {
      return NextResponse.json({
        success: true,
        message: `No API fetch needed; all reports for ${start} through ${end} are already stored.`,
        count: 0,
        savedCount: 0,
      });
    }

    // 2. Setup Google Auth Client
    const oauth2Client = new google.auth.OAuth2(
      admobConfig.clientId,
      admobConfig.clientSecret
    );
    oauth2Client.setCredentials({ refresh_token: admobConfig.refreshToken });
    const admob = google.admob({ version: "v1", auth: oauth2Client });

    type AdmobReportRow = {
      date: string;
      requests: number;
      impressions: number;
      clicks: number;
      currency: string;
      revenue: number;
      revenueUsd: number;
      ctr: number;
      ecpm: number;
      motionRate: number;
      showRate: number;
    };

    const reports: AdmobReportRow[] = [];

    for (const range of ranges) {
      console.log(`API fetching missing AdMob dates: ${range.start} through ${range.end}`);
      const response = await admob.accounts.networkReport.generate({
        parent: `accounts/${admobConfig.publisherId}`,
        requestBody: {
          reportSpec: {
            dateRange: {
              startDate: toApiDate(range.start),
              endDate: toApiDate(range.end),
            },
            metrics: ["AD_REQUESTS", "MATCHED_REQUESTS", "IMPRESSIONS", "CLICKS", "ESTIMATED_EARNINGS"],
            dimensions: ["DATE"],
          },
        },
      });

      type ReportResponse = typeof response.data;
      const responseItems: ReportResponse[] = Array.isArray(response.data)
        ? response.data as ReportResponse[]
        : [response.data];
      const currency = responseItems.find((item) => item.header)?.header?.localizationSettings?.currencyCode || "USD";

      for (const item of responseItems) {
        const row = item.row;
        const apiDate = row?.dimensionValues?.DATE?.value;
        if (!apiDate) continue;

        const date = /^\d{8}$/.test(apiDate)
          ? `${apiDate.slice(0, 4)}-${apiDate.slice(4, 6)}-${apiDate.slice(6, 8)}`
          : apiDate;
        if (!isDate(date) || date < range.start || date > range.end || (!refresh && storedDates.includes(date))) continue;

        const metrics = row.metricValues ?? {};
        const requests = Number(metrics.AD_REQUESTS?.integerValue || 0);
        const impressions = Number(metrics.IMPRESSIONS?.integerValue || 0);
        const clicks = Number(metrics.CLICKS?.integerValue || 0);
        const revenue = Number(metrics.ESTIMATED_EARNINGS?.microsValue || 0) / 1000000;
        const matchedRequests = Number(metrics.MATCHED_REQUESTS?.integerValue || 0);

        reports.push({
          date,
          requests,
          impressions,
          clicks,
          currency,
          revenue,
          revenueUsd: Number((revenue * settings.admobAudToUsdRate).toFixed(2)),
          ctr: impressions > 0 ? clicks / impressions : 0,
          ecpm: impressions > 0 ? (revenue / impressions) * 1000 : 0,
          motionRate: requests > 0 ? matchedRequests / requests : 0,
          showRate: matchedRequests > 0 ? impressions / matchedRequests : 0,
        });
      }
    }

    await saveAdmobReports(reports);
    await syncDailyAnalytics(reports.map((r) => r.date));

    return NextResponse.json({
      success: true,
      message: `Synchronized ${reports.length} daily reports for ${start} through ${end}.`,
      count: reports.length,
    });

  } catch (error: unknown) {
    console.error("AdMob Fetch Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
