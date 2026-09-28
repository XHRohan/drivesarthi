'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine, ResponsiveContainer,
} from 'recharts'

/**
 * PeakHourChart
 * Bar chart of average vehicles per hour-of-day.
 * Peak hours (08, 09, 17, 18, 19) highlighted in orange.
 *
 * Props:
 *   data   (array) — output of fetchPeakHourData(): [{hour, avg, isPeak}]
 *   height (number)
 */
export default function PeakHourChart({ data = [], height = 240 }) {
  if (!data.length || data.every(d => d.avg === 0)) {
    return <ChartEmpty />
  }

  const max = Math.max(...data.map(d => d.avg))
  const avg = Math.round(data.reduce((s, d) => s + d.avg, 0) / data.length)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid, #e4e4e7)" />
        <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} width={36} />
        <Tooltip
          formatter={(v) => [v, 'Avg vehicles']}
          contentStyle={{ fontSize: 12 }}
        />
        <ReferenceLine
          y={avg}
          stroke="#94a3b8"
          strokeDasharray="4 2"
          label={{ value: 'avg', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
        />
        <Bar dataKey="avg" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.avg === max ? '#ef4444' : entry.isPeak ? '#f97316' : '#3b82f6'}
              opacity={entry.avg === 0 ? 0.2 : 1}
            />
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
