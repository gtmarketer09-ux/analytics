import { Suspense } from 'react';
import { connection } from 'next/server';
import { Sidebar } from '@/app/components/navigation/Sidebar';
import { DateRangeForm } from '@/app/components/dashboard/DateRangeFrom';
import { PortfolioKpiCards } from '@/app/components/portfolio/PortfolioKpiCards';
import { PortfolioDailyTable } from '@/app/components/portfolio/PortfolioDailyTable';
import { PortfolioLatestCards } from '@/app/components/portfolio/PortfolioLatestCards';
import { PortfolioCharts } from '@/app/components/portfolio/PortfolioCharts';
import { AdmobKpiCards } from '@/app/components/admob/AdmobKpiCards';
import { AdmobChartsExpanded } from '@/app/components/admob/AdmobChartsExpanded';
import { AdmobFullTable } from '@/app/components/admob/AdmobFullTable';
import { GoogleAdsKpiCards } from '@/app/components/googleads/GoogleAdsKpiCards';
import { GoogleAdsChartsExpanded } from '@/app/components/googleads/GoogleAdsChartsExpanded';
import { GoogleAdsFullTable } from '@/app/components/googleads/GoogleAdsFullTable';
import { PlayConsoleKpiCards } from '@/app/components/playconsole/PlayConsoleKpiCards';
import { PlayConsoleChartsExpanded } from '@/app/components/playconsole/PlayConsoleChartsExpanded';
import { PlayConsoleFullTable } from '@/app/components/playconsole/PlayConsoleFullTable';
import { settings } from '@/app/server/config/env';
import { addDays, isDate, yesterday } from '@/app/server/lib/dates';
import { getAdmobAvailableRange, getAdmobReport } from '@/app/server/repositories/admob.repository';
import { getGoogleAdsAvailableRange, getGoogleAdsReport } from '@/app/server/repositories/googleAds.repository';
import { getPlayConsoleAvailableRange, getPlayConsoleReport } from '@/app/server/repositories/playConsole.repository';
import {
  getDailyAnalyticsAvailableRange,
  getPortfolioReport,
  MIN_ANALYTICS_DATE,
} from '@/app/server/repositories/dailyAnalytics.repository';

type Props = {
  searchParams: Promise<{ start?: string; end?: string; view?: string }>;
};

export default function DashboardPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<main className="loading-state"><p className="muted">Loading dashboard...</p></main>}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: Props) {
  await connection();
  const sp = await searchParams;
  const activeView = sp.view === 'admob'
    ? 'admob'
    : sp.view === 'ads'
      ? 'ads'
      : sp.view === 'play-console'
        ? 'play-console'
        : 'portfolio';

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: settings.timeZone })
    .format(new Date())
    .replace(/\//g, '-');
  const latest = yesterday(settings.timeZone);
  const admobAvailable = await getAdmobAvailableRange();
  const googleAdsAvailable = await getGoogleAdsAvailableRange();
  const playConsoleAvailable = await getPlayConsoleAvailableRange();
  const analyticsAvailable = await getDailyAnalyticsAvailableRange();

  const timelineCandidates = [admobAvailable, googleAdsAvailable, playConsoleAvailable, analyticsAvailable].filter(
    (range): range is { start: string; end: string } => Boolean(range),
  );

  const timelineStart = timelineCandidates.length
    ? timelineCandidates.map((range) => range.start).sort()[0]
    : MIN_ANALYTICS_DATE;
  const rawTimelineEnd = timelineCandidates.length
    ? timelineCandidates.map((range) => range.end).sort().at(-1) ?? latest
    : latest;

  const maxSelectableDate = [today, rawTimelineEnd].filter(Boolean).sort().at(-1) ?? today;

  const effectiveEarliest = activeView === 'portfolio' ? MIN_ANALYTICS_DATE : timelineStart;
  const requestedEnd = isDate(sp.end) ? sp.end : maxSelectableDate;
  const end = requestedEnd < effectiveEarliest
    ? effectiveEarliest
    : requestedEnd > maxSelectableDate
      ? maxSelectableDate
      : requestedEnd;

  const defaultStart = activeView === 'portfolio'
    ? MIN_ANALYTICS_DATE
    : addDays(end, -29) < timelineStart
      ? timelineStart
      : addDays(end, -29);

  const requestedStart = isDate(sp.start) ? sp.start : defaultStart;
  const start = requestedStart < effectiveEarliest ? effectiveEarliest : requestedStart > end ? end : requestedStart;

  let portfolioData: Awaited<ReturnType<typeof getPortfolioReport>> | null = null;
  let admobReport: Awaited<ReturnType<typeof getAdmobReport>> | null = null;
  let googleAdsReport: Awaited<ReturnType<typeof getGoogleAdsReport>> | null = null;
  let playConsoleReport: Awaited<ReturnType<typeof getPlayConsoleReport>> | null = null;
  let error: string | null = null;

  try {
    if (activeView === 'portfolio') {
      portfolioData = await getPortfolioReport(start, end);
    } else if (activeView === 'admob') {
      admobReport = await getAdmobReport(start, end);
    } else if (activeView === 'ads') {
      googleAdsReport = await getGoogleAdsReport(start, end);
    } else if (activeView === 'play-console') {
      playConsoleReport = await getPlayConsoleReport(start, end);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const lastUpdatedDate =
    portfolioData?.lastUpdated ||
    admobReport?.lastUpdated ||
    googleAdsReport?.lastUpdated ||
    playConsoleReport?.lastUpdated;
  const lastUpdated = lastUpdatedDate
    ? new Date(lastUpdatedDate).toLocaleString('en-GB', { timeZone: settings.timeZone })
    : null;

  const viewTitles: Record<string, { title: string; subtitle: string }> = {
    portfolio: {
      title: 'Portfolio Overview',
      subtitle: 'Cross-platform total revenue, ad spendings, net profit, and projections',
    },
    admob: {
      title: 'AdMob Analytics',
      subtitle: 'Daily impressions, requests, CTR, eCPM, and earnings in USD',
    },
    ads: {
      title: 'Google Ads Campaigns',
      subtitle: 'Campaign acquisition spend, clicks, conversion performance, and ROAS',
    },
    'play-console': {
      title: 'Google Play Console',
      subtitle: 'In-app purchases, financial reports, store fees, and net revenue',
    },
  };

  const currentMeta = viewTitles[activeView];

  return (
    <div className="dashboard-shell">
      <Sidebar activeView={activeView} start={start} end={end} />

      <main className="dashboard-main">
        {/* Top Header */}
        <div className="dashboard-header">
          <div>
            <h1>{currentMeta.title}</h1>
            <span className="muted">{currentMeta.subtitle}</span>
          </div>
          <div className="header-actions">
            <DateRangeForm
              start={start}
              end={end}
              earliest={effectiveEarliest}
              latest={maxSelectableDate}
              view={activeView}
            />
            <button className="export-button" type="button">
              Export Data
            </button>
          </div>
        </div>

        {lastUpdated && <p className="last-updated">Last synchronized: {lastUpdated} (Asia/Karachi) · USD Base Currency</p>}

        {error && <div className="error">Unable to load analytics data: {error}</div>}

        {/* --- VIEW 1: PORTFOLIO --- */}
        {activeView === 'portfolio' && portfolioData && (
          <div className="portfolio-content">
            {/* 1. Top 5 Boxes */}
            <PortfolioKpiCards data={portfolioData} />

            {/* 2. Daily Basis Table */}
            <PortfolioDailyTable
              days={portfolioData.days}
              totalRevenue={portfolioData.totalRevenue}
              totalAdSpend={portfolioData.totalAdSpendUsd}
              totalProfit={portfolioData.totalProfit}
              windowRoas={portfolioData.windowRoas}
              averageEcpm={portfolioData.averageEcpm}
            />

            {/* 3. Bottom 5 Boxes (Latest Day + Window ROAS) */}
            <PortfolioLatestCards data={portfolioData} />

            {/* 4. Graph of Total Revenue USD and Ad Spending USD */}
            <PortfolioCharts days={portfolioData.days} />
          </div>
        )}

        {/* --- VIEW 2: ADMOB --- */}
        {activeView === 'admob' && admobReport && (
          <div className="admob-content">
            <AdmobKpiCards total={admobReport.total} />
            <AdmobChartsExpanded days={admobReport.days} />
            <AdmobFullTable days={admobReport.days} total={admobReport.total} />
          </div>
        )}

        {/* --- VIEW 3: GOOGLE ADS --- */}
        {activeView === 'ads' && googleAdsReport && (
          <div className="ads-content">
            <GoogleAdsKpiCards report={googleAdsReport} />
            <GoogleAdsChartsExpanded days={googleAdsReport.days} />
            <GoogleAdsFullTable report={googleAdsReport} />
          </div>
        )}

        {/* --- VIEW 4: PLAY CONSOLE --- */}
        {activeView === 'play-console' && playConsoleReport && (
          <div className="play-console-content">
            <PlayConsoleKpiCards report={playConsoleReport} />
            <PlayConsoleChartsExpanded days={playConsoleReport.days} />
            <PlayConsoleFullTable report={playConsoleReport} />
          </div>
        )}
      </main>
    </div>
  );
}
