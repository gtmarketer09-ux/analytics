'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GoogleAdsDailyMetrics } from '../../server/repositories/googleAds.repository';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function GoogleAdsChartsExpanded({ days }: { days: GoogleAdsDailyMetrics[] }) {
  const data = days.map((day) => ({
    ...day,
    spendDisplay: day.adSpendUsd > 0 ? day.adSpendUsd : day.adSpend,
    label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }),
  }));

  return (
    <div className="charts-stack">
      <div className="chart-grid">
        {/* Chart 1: Ad Spend vs Conversion Value */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Ad Spend vs. Conversion Value (USD)</h2>
              <p className="muted">Daily investment vs generated value</p>
            </div>
            <span className="chart-mark" style={{ background: '#ff5a1f' }} aria-hidden="true" />
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5a1f" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ff5a1f" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#168b69" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#168b69" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(val: number) => currencyFormat.format(val)}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip
                  formatter={(value) => currencyFormat.format(Number(value))}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: 'var(--text)',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="spendDisplay"
                  name="Ad Spend (USD)"
                  stroke="#ff5a1f"
                  strokeWidth={2.5}
                  fill="url(#spendFill)"
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="conversionValue"
                  name="Conversion Value"
                  stroke="#168b69"
                  strokeWidth={2.5}
                  fill="url(#convFill)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Chart 2: Traffic Volumes */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Impressions &amp; Clicks</h2>
              <p className="muted">Traffic generated across campaigns</p>
            </div>
            <span className="chart-mark delivery-mark" aria-hidden="true" />
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="impressions"
                  tickFormatter={(val: number) => numberFormat.format(val)}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <YAxis
                  yAxisId="clicks"
                  orientation="right"
                  tickFormatter={(val: number) => numberFormat.format(val)}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => numberFormat.format(Number(value))}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: 'var(--text)',
                  }}
                />
                <Legend />
                <Bar yAxisId="impressions" dataKey="impressions" name="Impressions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="clicks" dataKey="clicks" name="Clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="chart-grid">
        {/* Chart 3: ROAS Trend */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>ROAS Performance</h2>
              <p className="muted">Daily Return on Ad Spend</p>
            </div>
            <span className="round-arrow" aria-hidden="true">⚡</span>
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(val: number) => `${val.toFixed(1)}x`}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(2)}x`}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: 'var(--text)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="roas" name="ROAS" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Chart 4: CTR & Conversion Rate Trend */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>CTR &amp; Conversion Rates (%)</h2>
              <p className="muted">Engagement and conversion efficiency</p>
            </div>
            <span className="round-arrow" aria-hidden="true">📊</span>
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(val: number) => `${val.toFixed(1)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: 'var(--text)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="ctr" name="CTR %" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="conversionRate" name="Conv. Rate %" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </div>
  );
}

