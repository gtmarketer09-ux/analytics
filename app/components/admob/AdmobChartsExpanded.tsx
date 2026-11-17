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
import type { AdmobMetrics } from '../../server/types/admob';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function AdmobChartsExpanded({ days }: { days: AdmobMetrics[] }) {
  const data = days.map((day) => ({
    ...day,
    label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }),
  }));

  return (
    <div className="charts-stack">
      <div className="chart-grid">
        {/* Chart 1: Revenue Activity */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Revenue Activity (USD)</h2>
              <p className="muted">Daily estimated earnings in USD</p>
            </div>
            <span className="chart-mark revenue-mark" aria-hidden="true" />
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="admobRevFill" x1="0" y1="0" x2="0" y2="1">
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
                <Area
                  type="monotone"
                  dataKey="revenue_usd"
                  name="Revenue (USD)"
                  stroke="#168b69"
                  strokeWidth={2.5}
                  fill="url(#admobRevFill)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Chart 2: Delivery Volumes */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Ad Delivery Volumes</h2>
              <p className="muted">Requests, impressions &amp; clicks</p>
            </div>
            <span className="chart-mark delivery-mark" aria-hidden="true" />
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="vol"
                  tickFormatter={(val: number) => numberFormat.format(val)}
                  tickLine={false}
                  axisLine={false}
                  width={56}
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
                <Bar yAxisId="vol" dataKey="requests" name="Requests" fill="#b9bdc6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="vol" dataKey="impressions" name="Impressions" fill="#ff5a1f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="chart-grid">
        {/* Chart 3: eCPM Trend */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>eCPM Trend</h2>
              <p className="muted">Effective cost per mille in AUD / USD</p>
            </div>
            <span className="round-arrow" aria-hidden="true">💲</span>
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(val: number) => `$${val.toFixed(1)}`}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  formatter={(value) => `$${Number(value).toFixed(2)}`}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    color: 'var(--text)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="ecpm" name="eCPM (AUD)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Chart 4: Rates Performance */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Conversion &amp; Delivery Rates (%)</h2>
              <p className="muted">CTR, Match Rate &amp; Show Rate</p>
            </div>
            <span className="round-arrow" aria-hidden="true">📈</span>
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(val: number) => `${val.toFixed(0)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={50}
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
                <Line type="monotone" dataKey="ctr" name="CTR %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="show_rate" name="Show Rate %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="match_rate" name="Match Rate %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </div>
  );
}

