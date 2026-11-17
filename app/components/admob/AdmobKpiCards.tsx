import { int, pct, usd } from '../../server/lib/format';
import type { AdmobMetrics } from '../../server/types/admob';

export function AdmobKpiCards({ total }: { total: AdmobMetrics }) {
  const averageImpressions = total.requests > 0 ? total.revenue_usd / total.requests : 0;

  return (
    <div className="cards cards-5">
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Gross Revenue (USD)</span>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </div>
        <strong>{usd(total.revenue_usd)}</strong>
        <small className="kpi-subtext">AUD: {usd(total.revenue)}</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Average eCPM</span>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </div>
        <strong>{usd(total.ecpm)}</strong>
        <small className="kpi-subtext">{pct(total.ctr)} click-through rate</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Total Impressions</span>
          <span className="round-arrow" aria-hidden="true">👁️</span>
        </div>
        <strong>{int(total.impressions)}</strong>
        <small className="kpi-subtext">{int(total.clicks)} total clicks</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Ad Requests</span>
          <span className="round-arrow" aria-hidden="true">📥</span>
        </div>
        <strong>{int(total.requests)}</strong>
        <small className="kpi-subtext">{usd(averageImpressions)} rev / request</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Delivery Rates</span>
          <span className="round-arrow" aria-hidden="true">📊</span>
        </div>
        <strong>{pct(total.show_rate)}</strong>
        <small className="kpi-subtext">{pct(total.match_rate)} match rate</small>
      </article>
    </div>
  );
}

