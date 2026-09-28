'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

/**
 * CongestionLineChart
 * Shows density_percent and optionally total_vehicles over time.
 *
 * Props:
 *   data   (array) — output of fetchCongestionTrend()
 *   height (number) — chart height in px, default 240
 */
export default function CongestionLineChart({ data = [], height = 240 }) {
  if (!data.length) return <ChartEmpty />

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e4e4e7)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
          tickLine={false}
        />
        <YAxis
          yAxisId="density"
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          tickFormatter={v => `${v}%`}
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
          formatter={(value, name) => {
            if (name === 'Density %') return [`${value}%`, name]
            if (name === 'Speed km/h') return [`${value} km/h`, name]
            return [value, name]
          }}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="density"
          type="monotone"
          dataKey="density_percent"
          name="Density %"
          stroke="#3b82f6"
          dot={false}
          strokeWidth={2}
        />
        <Line
          yAxisId="speed"
          type="monotone"
          dataKey="avg_speed_kmh"
          name="Speed km/h"
          stroke="#10b981"
          dot={false}
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      </LineChart>
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
