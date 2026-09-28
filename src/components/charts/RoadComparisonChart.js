'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

/**
 * RoadComparisonChart
 * Grouped bar chart comparing avg vehicles and avg speed across all 5 roads.
 *
 * Props:
 *   data   (array) — output of fetchByRoadSummary(): [{road, avg_vehicles, avg_speed, avg_density}]
 *   height (number)
 */
export default function RoadComparisonChart({ data = [], height = 240 }) {
  if (!data.length) return <ChartEmpty />

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid, #e4e4e7)" />
        <XAxis
          dataKey="road"
          tick={{ fontSize: 10 }}
          angle={-20}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          yAxisId="vehicles"
          tick={{ fontSize: 11 }}
          width={36}
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
            if (name === 'Avg Vehicles') return [v, name]
            if (name === 'Avg Speed km/h') return [`${v} km/h`, name]
            return [v, name]
          }}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="vehicles" dataKey="avg_vehicles" name="Avg Vehicles" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={28} />
        <Bar yAxisId="speed"    dataKey="avg_speed"    name="Avg Speed km/h" fill="#10b981" radius={[3,3,0,0]} maxBarSize={28} />
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
