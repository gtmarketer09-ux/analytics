'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
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

export function AdmobCharts({ days }: { days: AdmobMetrics[] }) {
  const data = days.map((day) => ({
    ...day,
    label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }),
  }));

  return (
    <section className="chart-grid" aria-label="AdMob performance charts">
      <article className="chart-panel">
        <div className="chart-heading">
          <div>
            <h2>Revenue Activity</h2>
            <p className="muted">Daily estimated earnings in USD</p>
          </div>
          <span className="chart-mark revenue-mark" aria-hidden="true" />
        </div>
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#168b69" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#168b69" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value: number) => currencyFormat.format(value)}
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
                name="Revenue"
                stroke="#168b69"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-panel">
        <div className="chart-heading">
          <div>
            <h2>Ad delivery</h2>
            <p className="muted">Requests, impressions and clicks by day</p>
          </div>
          <span className="chart-mark delivery-mark" aria-hidden="true" />
        </div>
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="volume"
                tickFormatter={(value: number) => numberFormat.format(value)}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <YAxis
                yAxisId="clicks"
                orientation="right"
                tickFormatter={(value: number) => numberFormat.format(value)}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => numberFormat.format(Number(value))}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  color: 'var(--text)',
                }}
              />
              <Bar yAxisId="volume" dataKey="requests" name="Requests" fill="#3169c6" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="volume" dataKey="impressions" name="Impressions" fill="#df8b35" radius={[3, 3, 0, 0]} />
              <Line yAxisId="clicks" dataKey="clicks" name="Clicks" type="monotone" stroke="#b74b4b" strokeWidth={2} dot={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}