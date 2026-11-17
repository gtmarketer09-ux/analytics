import { usd } from '../../server/lib/format';
import type { PortfolioReportData } from '../../server/repositories/dailyAnalytics.repository';

export function PortfolioKpiCards({ data }: { data: PortfolioReportData }) {
  const isProfit = data.totalProfit >= 0;
  const isMonthProfit = data.currentMonthProfit >= 0;
  const isProjectedProfit = data.monthEndProjectedProfit >= 0;

  return (
    <div className="cards cards-5">
      {/* Box 1: Revenue = AdMob + Play Console */}
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Total Revenue</span>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </div>
        <strong>{usd(data.totalRevenue)}</strong>
        <small className="kpi-subtext">
          AdMob + Play Console (Net)
        </small>
      </article>

      {/* Box 2: Ad Spend in USD */}
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Ad Spend</span>
          <span className="round-arrow" aria-hidden="true">↘</span>
        </div>
        <strong>{usd(data.totalAdSpendUsd)}</strong>
        <small className="kpi-subtext">
          Google Ads (USD)
        </small>
      </article>

      {/* Box 3: Profit / Loss */}
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Profit / Loss</span>
          <span className={`kpi-pill ${isProfit ? 'pill-up' : 'pill-down'}`}>
            {isProfit ? 'Profit' : 'Loss'}
          </span>
        </div>
        <strong className={isProfit ? 'up' : 'down'}>
          {isProfit ? '+' : ''}{usd(data.totalProfit)}
        </strong>
        <small className="kpi-subtext">
          Total Revenue - Ad Spend
        </small>
      </article>

      {/* Box 4: Month End Projection */}
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Month-End Projection</span>
          <span className="round-arrow" aria-hidden="true">🎯</span>
        </div>
        <strong className={isProjectedProfit ? 'up' : 'down'}>
          {isProjectedProfit ? '+' : ''}{usd(data.monthEndProjectedProfit)}
        </strong>
        <small className="kpi-subtext">
          Projected Rev: {usd(data.monthEndProjectedRevenue)}
        </small>
      </article>

      {/* Box 5: Current Month Profit */}
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Current Month Profit</span>
          <span className={`kpi-pill ${isMonthProfit ? 'pill-up' : 'pill-down'}`}>
            {data.currentMonthDaysElapsed}/{data.totalDaysInCurrentMonth} days
          </span>
        </div>
        <strong className={isMonthProfit ? 'up' : 'down'}>
          {isMonthProfit ? '+' : ''}{usd(data.currentMonthProfit)}
        </strong>
        <small className="kpi-subtext">
          MTD Rev: {usd(data.currentMonthRevenue)}
        </small>
      </article>
    </div>
  );
}

