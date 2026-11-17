import { int, pct, usd } from '../../server/lib/format';
import type { GoogleAdsReportData } from '../../server/repositories/googleAds.repository';

export function GoogleAdsKpiCards({ report }: { report: GoogleAdsReportData }) {
  const totalImpressions = report.days.reduce((s, d) => s + d.impressions, 0);
  const totalClicks = report.days.reduce((s, d) => s + d.clicks, 0);
  const totalSpendUsd = report.days.reduce((s, d) => s + (d.adSpendUsd > 0 ? d.adSpendUsd : d.adSpend), 0);
  const totalSpendPkr = report.days.reduce((s, d) => s + d.adSpend, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgRoas = totalSpendUsd > 0 ? report.totalConversionValue / totalSpendUsd : 0;

  return (
    <div className="cards cards-5">
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Ad Spend (USD)</span>
          <span className="round-arrow" aria-hidden="true">💳</span>
        </div>
        <strong>{usd(totalSpendUsd)}</strong>
        <small className="kpi-subtext">PKR {int(totalSpendPkr)}</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Total Conversions</span>
          <span className="round-arrow" aria-hidden="true">🎯</span>
        </div>
        <strong>{report.totalConversions.toLocaleString('en-US', { maximumFractionDigits: 1 })}</strong>
        <small className="kpi-subtext">Value: {usd(report.totalConversionValue)}</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Average ROAS</span>
          <span className="round-arrow" aria-hidden="true">⚡</span>
        </div>
        <strong>{avgRoas.toFixed(2)}x</strong>
        <small className="kpi-subtext">Return on ad spend</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Impressions &amp; Clicks</span>
          <span className="round-arrow" aria-hidden="true">👁️</span>
        </div>
        <strong>{int(totalImpressions)}</strong>
        <small className="kpi-subtext">{int(totalClicks)} total clicks</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Average CTR</span>
          <span className="round-arrow" aria-hidden="true">📊</span>
        </div>
        <strong>{pct(avgCtr)}</strong>
        <small className="kpi-subtext">Click-through rate</small>
      </article>
    </div>
  );
}

