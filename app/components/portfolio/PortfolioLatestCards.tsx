import { usd } from '../../server/lib/format';
import type { PortfolioReportData } from '../../server/repositories/dailyAnalytics.repository';

export function PortfolioLatestCards({ data }: { data: PortfolioReportData }) {
  const isLatestProfit = data.latestDayProfit >= 0;

  return (
    <div className="section-block">
      <div className="section-header">
        <div>
          <h2 className="section-title">Latest Day &amp; Window Benchmarks</h2>
          <p className="muted">
            {data.latestDate ? `Latest record from ${data.latestDate}` : 'No date available'}
          </p>
        </div>
      </div>
      <div className="cards cards-5">
        {/* 1. Latest Day Revenue */}
        <article className="card kpi-card">
          <div className="kpi-top">
            <span>Latest Day Revenue</span>
            <span className="round-arrow" aria-hidden="true">📈</span>
          </div>
          <strong>{usd(data.latestDayRevenue)}</strong>
          <small className="kpi-subtext">{data.latestDate || 'N/A'}</small>
        </article>

        {/* 2. Latest Day Spending */}
        <article className="card kpi-card">
          <div className="kpi-top">
            <span>Latest Day Spending</span>
            <span className="round-arrow" aria-hidden="true">💳</span>
          </div>
          <strong>{usd(data.latestDaySpending)}</strong>
          <small className="kpi-subtext">Google Ads (USD)</small>
        </article>

        {/* 3. Latest Day Profit */}
        <article className="card kpi-card">
          <div className="kpi-top">
            <span>Latest Day Profit</span>
            <span className={`kpi-pill ${isLatestProfit ? 'pill-up' : 'pill-down'}`}>
              {isLatestProfit ? 'Profitable' : 'Loss'}
            </span>
          </div>
          <strong className={isLatestProfit ? 'up' : 'down'}>
            {isLatestProfit ? '+' : ''}{usd(data.latestDayProfit)}
          </strong>
          <small className="kpi-subtext">Revenue - Spending</small>
        </article>

        {/* 4. Latest Day ROAS */}
        <article className="card kpi-card">
          <div className="kpi-top">
            <span>Latest Day ROAS</span>
            <span className="round-arrow" aria-hidden="true">⚡</span>
          </div>
          <strong>{data.latestDayRoas.toFixed(2)}x</strong>
          <small className="kpi-subtext">AdMob Rev / Ads Spend</small>
        </article>

        {/* 5. Window ROAS */}
        <article className="card kpi-card">
          <div className="kpi-top">
            <span>Window ROAS</span>
            <span className="round-arrow" aria-hidden="true">🌐</span>
          </div>
          <strong className="accent-roas">{data.windowRoas.toFixed(2)}x</strong>
          <small className="kpi-subtext">Total Window Return</small>
        </article>
      </div>
    </div>
  );
}

