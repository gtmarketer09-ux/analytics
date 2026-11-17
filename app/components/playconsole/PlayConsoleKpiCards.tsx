import { int, pct, usd } from '../../server/lib/format';
import type { PlayConsoleReport } from '../../server/types/playConsole';

export function PlayConsoleKpiCards({ report }: { report: PlayConsoleReport }) {
  const { total } = report;
  const gross = total.revenueWithTax;
  const net = total.revenueWithoutTax;
  const feesAndTaxes = Math.max(0, gross - net);
  const feePct = gross > 0 ? (feesAndTaxes / gross) * 100 : 0;
  const retainedPct = gross > 0 ? (net / gross) * 100 : 100;
  const avgOrderValue = total.inApps > 0 ? net / total.inApps : 0;

  return (
    <div className="cards cards-5">
      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Net Revenue (USD)</span>
          <span className="round-arrow" aria-hidden="true">↗</span>
        </div>
        <strong className="up">{usd(net)}</strong>
        <small className="kpi-subtext">{pct(retainedPct)} retained after deductions</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Gross Sales (USD)</span>
          <span className="round-arrow" aria-hidden="true">💳</span>
        </div>
        <strong>{usd(gross)}</strong>
        <small className="kpi-subtext">Total buyer charged volume</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Store Fees &amp; Taxes</span>
          <span className="round-arrow" aria-hidden="true">🏷️</span>
        </div>
        <strong className="down">{usd(feesAndTaxes)}</strong>
        <small className="kpi-subtext">{pct(feePct)} effective rate</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>In-App Transactions</span>
          <span className="round-arrow" aria-hidden="true">📦</span>
        </div>
        <strong>{int(total.inApps)}</strong>
        <small className="kpi-subtext">Total purchases &amp; renewals</small>
      </article>

      <article className="card kpi-card">
        <div className="kpi-top">
          <span>Avg Net / Order</span>
          <span className="round-arrow" aria-hidden="true">📊</span>
        </div>
        <strong>{usd(avgOrderValue)}</strong>
        <small className="kpi-subtext">Net earnings per transaction</small>
      </article>
    </div>
  );
}

