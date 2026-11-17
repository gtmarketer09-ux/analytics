import { usd } from '../../server/lib/format';
import type { PortfolioDayMetrics } from '../../server/repositories/dailyAnalytics.repository';

export function PortfolioDailyTable({
  days,
  totalRevenue,
  totalAdSpend,
  totalProfit,
  windowRoas,
  averageEcpm,
}: {
  days: PortfolioDayMetrics[];
  totalRevenue: number;
  totalAdSpend: number;
  totalProfit: number;
  windowRoas: number;
  averageEcpm?: number;
}) {
  const avgEcpm = averageEcpm ?? (
    days.filter((d) => d.ecpm > 0).length
      ? days.reduce((sum, d) => sum + d.ecpm, 0) / days.filter((d) => d.ecpm > 0).length
      : 0
  );

  return (
    <div className="section-block">
      <div className="section-header">
        <div>
          <h2 className="section-title">Daily Performance Breakdown</h2>
          <p className="muted">Combined metrics across AdMob, Google Ads, and Play Console</p>
        </div>
      </div>
      <div className="wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Revenue</th>
              <th>Ad Spend (USD)</th>
              <th>P / L (USD)</th>
              <th>ROAS</th>
              <th>eCPM</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const isProfit = d.pl >= 0;
              return (
                <tr key={d.date}>
                  <td>
                    <strong>{d.date}</strong>
                  </td>
                  <td>{usd(d.totalRevenue)}</td>
                  <td>{usd(d.adSpendUsd)}</td>
                  <td className={isProfit ? 'up' : 'down'}>
                    <span className={`table-badge ${isProfit ? 'badge-up' : 'badge-down'}`}>
                      {isProfit ? '+' : ''}{usd(d.pl)}
                    </span>
                  </td>
                  <td>
                    <strong>{d.roas.toFixed(2)}x</strong>
                  </td>
                  <td>
                    <strong className="table-ecpm">{usd(d.ecpm)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total / Summary</td>
              <td>{usd(totalRevenue)}</td>
              <td>{usd(totalAdSpend)}</td>
              <td className={totalProfit >= 0 ? 'up' : 'down'}>
                <span className={`table-badge ${totalProfit >= 0 ? 'badge-up' : 'badge-down'}`}>
                  {totalProfit >= 0 ? '+' : ''}{usd(totalProfit)}
                </span>
              </td>
              <td>
                <strong>{windowRoas.toFixed(2)}x</strong>
              </td>
              <td>
                <strong>{usd(avgEcpm)} avg</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

