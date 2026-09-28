'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'

/**
 * VehicleBarChart
 * Horizontal bar chart showing count per vehicle type.
 *
 * Props:
 *   data   (array) — output of fetchVehicleTotals(): [{vehicle, count, fill}]
 *   height (number)
 */
export default function VehicleBarChart({ data = [], height = 240 }) {
  if (!data.length || data.every(d => d.count === 0)) {
    return <ChartEmpty />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 80, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid, #e4e4e7)" />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
        />
        <YAxis
          dataKey="vehicle"
          type="category"
          tick={{ fontSize: 11 }}
          width={76}
        />
        <Tooltip
          formatter={(v) => [v.toLocaleString(), 'Count']}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
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
