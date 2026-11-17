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
import type { PlayConsoleMetrics } from '../../server/types/playConsole';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function PlayConsoleChartsExpanded({ days }: { days: PlayConsoleMetrics[] }) {
  const data = days.map((day) => {
    const gross = day.revenueWithTax;
    const net = day.revenueWithoutTax;
    const fees = Math.max(0, gross - net);
    const retentionRate = gross > 0 ? (net / gross) * 100 : 100;
    return {
      ...day,
      fees,
      retentionRate,
      label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC',
      }),
    };
  });

  return (
    <div className="charts-stack">
      <div className="chart-grid">
        {/* Chart 1: Gross vs Net Revenue */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Gross vs Net Sales (USD)</h2>
              <p className="muted">Total buyer spend compared with earnings after fees</p>
            </div>
            <span className="chart-mark revenue-mark" aria-hidden="true" />
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="playGrossFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="playNetFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#168b69" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#168b69" stopOpacity={0.03} />
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
                <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="revenueWithTax"
                  name="Gross Sales"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#playGrossFill)"
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenueWithoutTax"
                  name="Net Revenue"
                  stroke="#168b69"
                  strokeWidth={2.5}
                  fill="url(#playNetFill)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Chart 2: In-App Transactions Count */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>In-App Purchases &amp; Orders</h2>
              <p className="muted">Daily successful transaction volume</p>
            </div>
            <span className="round-arrow" aria-hidden="true">📦</span>
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
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
                <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="inApps" name="Transactions Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="chart-grid">
        {/* Chart 3: Store Fees & Taxes Trend */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Store Deductions (Taxes &amp; Fees)</h2>
              <p className="muted">Daily difference between buyer spend and payout</p>
            </div>
            <span className="round-arrow" aria-hidden="true">🏷️</span>
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="fees" name="Deductions & Taxes" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Chart 4: Effective Retention Rate (%) */}
        <article className="chart-panel">
          <div className="chart-heading">
            <div>
              <h2>Effective Net Retention Rate (%)</h2>
              <p className="muted">Percentage of gross sales received as net earnings</p>
            </div>
            <span className="round-arrow" aria-hidden="true">📈</span>
          </div>
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(val: number) => `${val.toFixed(0)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={52}
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
                <Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="retentionRate"
                  name="Retention %"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </div>
  );
}

