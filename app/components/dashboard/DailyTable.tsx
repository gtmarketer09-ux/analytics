import { int, pct, usd } from '../../server/lib/format';
import type { AdmobMetrics } from '../../server/types/admob';

const COLUMNS = ['Date', 'Requests', 'Match rate', 'Show rate', 'Impressions', 'Clicks', 'CTR', 'eCPM AUD', 'Revenue AUD', 'Revenue USD'];

export function DailyTable({ days, total }: { days: AdmobMetrics[]; total: AdmobMetrics }) {
  return (
    <div className="wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <Row key={d.date} r={d} />
          ))}
        </tbody>
        <tfoot>
          <Row r={total} />
        </tfoot>
      </table>
    </div>
  );
}

function Row({ r }: { r: AdmobMetrics }) {
  return (
    <tr>
      <td>{r.date}</td>
      <td>{int(r.requests)}</td>
      <td>{pct(r.match_rate)}</td>
      <td>{pct(r.show_rate)}</td>
      <td>{int(r.impressions)}</td>
      <td>{int(r.clicks)}</td>
      <td>{pct(r.ctr)}</td>
      <td>{usd(r.ecpm)}</td>
      <td>{usd(r.revenue)}</td>
      <td>{usd(r.revenue_usd)}</td>
    </tr>
  );
}
