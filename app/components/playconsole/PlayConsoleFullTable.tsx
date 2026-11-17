import { int, pct, usd } from '../../server/lib/format';
import type { PlayConsoleReport } from '../../server/types/playConsole';

const COLUMNS = [
  'Date',
  'Gross Sales (USD)',
  'Fees & Taxes (USD)',
  'Net Revenue (USD)',
  'In-App Orders',
  'Retention Rate',
  'Avg Net / Order',
];

export function PlayConsoleFullTable({ report }: { report: PlayConsoleReport }) {
  const { days, total } = report;
  const totalGross = total.revenueWithTax;
  const totalNet = total.revenueWithoutTax;
  const totalFees = Math.max(0, totalGross - totalNet);
  const totalInApps = total.inApps;
  const avgRetention = totalGross > 0 ? (totalNet / totalGross) * 100 : 100;
  const avgOrderValue = totalInApps > 0 ? totalNet / totalInApps : 0;

  return (
    <div className="section-block">
      <div className="section-header">
        <div>
          <h2 className="section-title">Play Console Daily Reports</h2>
          <p className="muted">Estimated sales, financial orders, and net revenue from Google Play Console</p>
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
            {days.map((d) => {
              const gross = d.revenueWithTax;
              const net = d.revenueWithoutTax;
              const fees = Math.max(0, gross - net);
              const retention = gross > 0 ? (net / gross) * 100 : 100;
              const aov = d.inApps > 0 ? net / d.inApps : 0;

              return (
                <tr key={d.date}>
                  <td><strong>{d.date}</strong></td>
                  <td>{usd(gross)}</td>
                  <td>
                    <span className="down">-{usd(fees)}</span>
                  </td>
                  <td>
                    <strong className="up">{usd(net)}</strong>
                  </td>
                  <td>{int(d.inApps)}</td>
                  <td>{pct(retention)}</td>
                  <td>{usd(aov)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>{usd(totalGross)}</td>
              <td>
                <span className="down">-{usd(totalFees)}</span>
              </td>
              <td>
                <strong className="up">{usd(totalNet)}</strong>
              </td>
              <td>{int(totalInApps)}</td>
              <td>{pct(avgRetention)}</td>
              <td>{usd(avgOrderValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

