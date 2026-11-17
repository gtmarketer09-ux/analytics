import { int, pct, usd } from '../../server/lib/format';
import type { GoogleAdsReportData } from '../../server/repositories/googleAds.repository';

const COLUMNS = [
  'Date',
  'Impressions',
  'Clicks',
  'CTR',
  'Ad Spend (PKR)',
  'Ad Spend (USD)',
  'Conversions',
  'Conv. Value (USD)',
  'Conv. Rate',
  'ROAS',
];

export function GoogleAdsFullTable({ report }: { report: GoogleAdsReportData }) {
  const totalImpressions = report.days.reduce((s, d) => s + d.impressions, 0);
  const totalClicks = report.days.reduce((s, d) => s + d.clicks, 0);
  const totalSpendPkr = report.days.reduce((s, d) => s + d.adSpend, 0);
  const totalSpendUsd = report.days.reduce((s, d) => s + (d.adSpendUsd > 0 ? d.adSpendUsd : d.adSpend), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgConvRate = totalClicks > 0 ? (report.totalConversions / totalClicks) * 100 : 0;
  const avgRoas = totalSpendUsd > 0 ? report.totalConversionValue / totalSpendUsd : 0;

  return (
    <div className="section-block">
      <div className="section-header">
        <div>
          <h2 className="section-title">Google Ads Daily Reports</h2>
          <p className="muted">Synchronized metrics from Google Ads BigQuery warehouse</p>
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
            {report.days.map((d) => (
              <tr key={d.date}>
                <td><strong>{d.date}</strong></td>
                <td>{int(d.impressions)}</td>
                <td>{int(d.clicks)}</td>
                <td>{pct(d.ctr)}</td>
                <td>Rs {int(d.adSpend)}</td>
                <td>
                  <strong className="down">{usd(d.adSpendUsd > 0 ? d.adSpendUsd : d.adSpend)}</strong>
                </td>
                <td>{d.conversions.toFixed(1)}</td>
                <td>{usd(d.conversionValue)}</td>
                <td>{pct(d.conversionRate)}</td>
                <td>
                  <strong>{d.roas.toFixed(2)}x</strong>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>{int(totalImpressions)}</td>
              <td>{int(totalClicks)}</td>
              <td>{pct(avgCtr)}</td>
              <td>Rs {int(totalSpendPkr)}</td>
              <td>
                <strong className="down">{usd(totalSpendUsd)}</strong>
              </td>
              <td>{report.totalConversions.toFixed(1)}</td>
              <td>{usd(report.totalConversionValue)}</td>
              <td>{pct(avgConvRate)}</td>
              <td>
                <strong>{avgRoas.toFixed(2)}x</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

