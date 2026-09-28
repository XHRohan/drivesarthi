'use client'

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

/**
 * CongestionPieChart
 * Donut chart of congestion level distribution.
 *
 * Props:
 *   data   (array) — output of fetchCongestionDistribution(): [{level, count, fill}]
 *   height (number)
 */
export default function CongestionPieChart({ data = [], height = 240 }) {
  if (!data.length) return <ChartEmpty />

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="level"
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="70%"
          paddingAngle={2}
          label={({ level, count }) => `${level} ${((count/total)*100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [v.toLocaleString(), 'Observations']}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
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
