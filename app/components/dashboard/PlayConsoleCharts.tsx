'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlayConsoleMetrics } from '../../server/types/playConsole';

const moneyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function PlayConsoleCharts({ days }: { days: PlayConsoleMetrics[] }) {
  const data = days.map((day) => ({
    ...day,
    label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }),
  }));

  return (
    <section className="chart-grid" aria-label="Google Play Console sales charts">
      <article className="chart-panel">
        <div className="chart-heading">
          <div>
            <h3>Gross and net sales</h3>
            <p className="muted">Daily sales before and after tax</p>
          </div>
          <span className="chart-mark play-mark" aria-hidden="true" />
        </div>
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value: number) => moneyFormat.format(value)}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => moneyFormat.format(Number(value))}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  color: 'var(--text)',
                }}
              />
              <Area type="monotone" dataKey="revenueWithTax" name="Gross" stroke="#c45f43" fill="#c45f43" fillOpacity={0.12} strokeWidth={2.5} />
              <Area type="monotone" dataKey="revenueWithoutTax" name="Net" stroke="#168b69" fill="#168b69" fillOpacity={0.08} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-panel">
        <div className="chart-heading">
          <div>
            <h3>Matching app sales</h3>
            <p className="muted">Transaction count for the configured package ID</p>
          </div>
          <span className="chart-mark play-mix-mark" aria-hidden="true" />
        </div>
        <div className="chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => Number(value).toLocaleString('en-US')}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  color: 'var(--text)',
                }}
              />
              <Bar dataKey="inApps" name="In-app sales count" fill="#3169c6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}