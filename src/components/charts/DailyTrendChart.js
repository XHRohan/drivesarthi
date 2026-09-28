'use client'

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

/**
 * DailyTrendChart
 * Area + line chart of total daily vehicles and avg speed over days.
 *
 * Props:
 *   data   (array) — output of fetchDailyTrend(): [{date, label, total, avg_speed, avg_density}]
 *   height (number)
 */
export default function DailyTrendChart({ data = [], height = 240 }) {
  if (!data.length) return <ChartEmpty />

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e4e4e7)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
          tickLine={false}
        />
        <YAxis
          yAxisId="total"
          tick={{ fontSize: 11 }}
          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
          width={40}
        />
        <YAxis
          yAxisId="speed"
          orientation="right"
          tick={{ fontSize: 11 }}
          tickFormatter={v => `${v}`}
          width={36}
        />
        <Tooltip
          formatter={(v, name) => {
            if (name === 'Total Vehicles') return [v.toLocaleString(), name]
            if (name === 'Avg Speed km/h') return [`${v} km/h`, name]
            return [v, name]
          }}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          yAxisId="total"
          type="monotone"
          dataKey="total"
          name="Total Vehicles"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#totalGrad)"
          dot={false}
        />
        <Line
          yAxisId="speed"
          type="monotone"
          dataKey="avg_speed"
          name="Avg Speed km/h"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 2"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function ChartEmpty() {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-zinc-400 dark:text-zinc-600">
      No data for the selected filters
    </div>
  )
}
