import { int, pct, usd } from '../../server/lib/format';
import type { AdmobMetrics } from '../../server/types/admob';

export function KpiCards({ total }: { total: AdmobMetrics }) {
  const averageImpressions = total.requests > 0
    ? total.revenue_usd / total.requests
    : 0;

  return (
    <div className="cards">
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Gross Revenue</span>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </div>
        <strong>{usd(total.revenue_usd)}</strong>
        <small>{int(total.requests)} total requests</small>
      </article>
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Avg. eCPM AUD</span>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </div>
        <strong>{usd(total.ecpm)}</strong>
        <small>{pct(total.ctr)} click-through rate</small>
      </article>
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Impressions</span>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </div>
        <strong>{int(total.impressions)}</strong>
        <small>{usd(averageImpressions)} average revenue/request</small>
      </article>
    </div>
  );
}
