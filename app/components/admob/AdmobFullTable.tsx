import { int, pct, usd } from '../../server/lib/format';
import type { AdmobMetrics } from '../../server/types/admob';

const COLUMNS = [
  'Date',
  'Requests',
  'Match Rate',
  'Show Rate',
  'Impressions',
  'Clicks',
  'CTR',
  'eCPM AUD',
  'Revenue AUD',
  'Revenue USD',
];

export function AdmobFullTable({ days, total }: { days: AdmobMetrics[]; total: AdmobMetrics }) {
  return (
    <div className="section-block">
      <div className="section-header">
        <div>
          <h2 className="section-title">AdMob Daily Reports</h2>
          <p className="muted">Performance metrics retrieved from AdMob network API</p>
        </div>
      </div>
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
              <tr key={d.date}>
                <td><strong>{d.date}</strong></td>
                <td>{int(d.requests)}</td>
                <td>{pct(d.match_rate)}</td>
                <td>{pct(d.show_rate)}</td>
                <td>{int(d.impressions)}</td>
                <td>{int(d.clicks)}</td>
                <td>{pct(d.ctr)}</td>
                <td>{usd(d.ecpm)}</td>
                <td>{usd(d.revenue)}</td>
                <td>
                  <strong className="up">{usd(d.revenue_usd)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>{int(total.requests)}</td>
              <td>{pct(total.match_rate)}</td>
              <td>{pct(total.show_rate)}</td>
              <td>{int(total.impressions)}</td>
              <td>{int(total.clicks)}</td>
              <td>{pct(total.ctr)}</td>
              <td>{usd(total.ecpm)}</td>
              <td>{usd(total.revenue)}</td>
              <td>
                <strong className="up">{usd(total.revenue_usd)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

