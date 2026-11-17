'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PortfolioDayMetrics } from '../../server/repositories/dailyAnalytics.repository';

const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function PortfolioCharts({ days }: { days: PortfolioDayMetrics[] }) {
  const data = days.map((day) => ({
    ...day,
    label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }),
  }));

  return (
    <div className="section-block">
      <article className="chart-panel portfolio-chart-panel">
        <div className="chart-heading">
          <div>
            <h2 className="section-title">Revenue vs. Ad Spend Timeline</h2>
            <p className="muted">Comparison of Total Revenue (AdMob + Play Console) vs Google Ads Spend in USD</p>
          </div>
          <div className="chart-legend-custom">
            <span className="legend-indicator rev-indicator" /> Total Revenue
            <span className="legend-indicator spend-indicator" /> Ad Spend
          </div>
        </div>
        <div className="chart-canvas" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="totalRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#168b69" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#168b69" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="adSpendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff5a1f" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#ff5a1f" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value: number) => currencyFormat.format(value)}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  currencyFormat.format(Number(value)),
                  name === 'totalRevenue' ? 'Total Revenue' : 'Ad Spend',
                ]}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                }}
              />
              <Legend
                formatter={(value: string) => (value === 'totalRevenue' ? 'Total Revenue (USD)' : 'Ad Spend (USD)')}
              />
              <Area
                type="monotone"
                dataKey="totalRevenue"
                name="totalRevenue"
                stroke="#168b69"
                strokeWidth={2.8}
                fill="url(#totalRevenueFill)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="adSpendUsd"
                name="adSpendUsd"
                stroke="#ff5a1f"
                strokeWidth={2.8}
                fill="url(#adSpendFill)"
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}

