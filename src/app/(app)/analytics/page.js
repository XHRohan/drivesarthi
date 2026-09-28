'use client'

import { useEffect, useState, useCallback } from 'react'
import TrafficFilters from '@/components/ui/TrafficFilters'
import CongestionLineChart  from '@/components/charts/CongestionLineChart'
import CongestionPieChart   from '@/components/charts/CongestionPieChart'
import VehicleBarChart      from '@/components/charts/VehicleBarChart'
import PeakHourChart        from '@/components/charts/PeakHourChart'
import DailyTrendChart      from '@/components/charts/DailyTrendChart'
import RoadComparisonChart  from '@/components/charts/RoadComparisonChart'
import {
  fetchCongestionTrend,
  fetchCongestionDistribution,
  fetchVehicleTotals,
  fetchPeakHourData,
  fetchDailyTrend,
  fetchByRoadSummary,
} from '@/lib/trafficQueries'

// Default date range: last 7 days of the synthetic dataset (near 2026-01-01)
const DEFAULT_FROM = '2026-01-01'
const DEFAULT_TO   = '2026-01-07'

const INITIAL_FILTERS = {
  roadId:          'all',
  dateFrom:        DEFAULT_FROM,
  dateTo:          DEFAULT_TO,
  congestionLevel: 'all',
}

// ── helpers ────────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, loading }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {loading
        ? <div className="h-52 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        : children
      }
    </div>
  )
}

function StatBadge({ label, value, sub }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── page ───────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  // Each chart has its own data + loading state so they can load independently
  const [trend,        setTrend]        = useState({ data: [], loading: true })
  const [distribution, setDistribution] = useState({ data: [], loading: true })
  const [vehicles,     setVehicles]     = useState({ data: [], loading: true })
  const [peakHour,     setPeakHour]     = useState({ data: [], loading: true })
  const [daily,        setDaily]        = useState({ data: [], loading: true })
  const [byRoad,       setByRoad]       = useState({ data: [], loading: true })

  function updateFilters(patch) {
    setFilters(prev => ({ ...prev, ...patch }))
  }

  // Re-fetch all charts when filters change
  const loadAll = useCallback(async () => {
    const args = {
      roadId:   filters.roadId,
      dateFrom: filters.dateFrom,
      dateTo:   filters.dateTo,
    }

    // Mark all as loading
    setTrend(s        => ({ ...s, loading: true }))
    setDistribution(s => ({ ...s, loading: true }))
    setVehicles(s     => ({ ...s, loading: true }))
    setPeakHour(s     => ({ ...s, loading: true }))
    setDaily(s        => ({ ...s, loading: true }))
    setByRoad(s       => ({ ...s, loading: true }))

    // Fire all queries in parallel
    const [t, d, v, p, dy, br] = await Promise.allSettled([
      fetchCongestionTrend({ ...args, limit: 144 }),
      fetchCongestionDistribution(args),
      fetchVehicleTotals(args),
      fetchPeakHourData(args),
      fetchDailyTrend({ ...args, limit: 30 }),
      fetchByRoadSummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
    ])

    setTrend({        data: t.status  === 'fulfilled' ? t.value  : [], loading: false })
    setDistribution({ data: d.status  === 'fulfilled' ? d.value  : [], loading: false })
    setVehicles({     data: v.status  === 'fulfilled' ? v.value  : [], loading: false })
    setPeakHour({     data: p.status  === 'fulfilled' ? p.value  : [], loading: false })
    setDaily({        data: dy.status === 'fulfilled' ? dy.value : [], loading: false })
    setByRoad({       data: br.status === 'fulfilled' ? br.value : [], loading: false })
  }, [filters])

  useEffect(() => { loadAll() }, [loadAll])

  // Compute summary stats from vehicle totals
  const totalVehicles = vehicles.data.reduce((s, d) => s + d.count, 0)
  const topVehicle    = vehicles.data.reduce((a, b) => (b.count > (a?.count ?? 0) ? b : a), null)
  const peakHourLabel = peakHour.data.length
    ? peakHour.data.reduce((a, b) => (b.avg > a.avg ? b : a)).hour
    : '—'
  const avgSpeed = trend.data.length
    ? (trend.data.reduce((s, r) => s + r.avg_speed_kmh, 0) / trend.data.length).toFixed(1)
    : '—'

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Traffic Analytics</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Synthetic prototype data — sourced from <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">drivesarthi_traffic_data.csv</code> via Supabase.
        </p>
      </div>

      {/* Filters */}
      <TrafficFilters
        filters={filters}
        onChange={updateFilters}
        showCongestion
      />

      {/* Summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge
          label="Total Vehicles (sample)"
          value={totalVehicles.toLocaleString()}
          sub="across selected filters"
        />
        <StatBadge
          label="Most Common"
          value={topVehicle?.vehicle ?? '—'}
          sub={topVehicle ? `${topVehicle.count.toLocaleString()} counted` : ''}
        />
        <StatBadge
          label="Peak Hour"
          value={peakHourLabel}
          sub="highest avg vehicles"
        />
        <StatBadge
          label="Avg Speed"
          value={avgSpeed !== '—' ? `${avgSpeed} km/h` : '—'}
          sub="across selected period"
        />
      </div>

      {/* Row 1: Congestion trend + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard
            title="Density & Speed Over Time"
            subtitle="Traffic density % vs average speed — select a short date range for best detail"
            loading={trend.loading}
          >
            <CongestionLineChart data={trend.data} height={220} />
          </ChartCard>
        </div>
        <ChartCard
          title="Congestion Distribution"
          subtitle="Share of observations per level"
          loading={distribution.loading}
        >
          <CongestionPieChart data={distribution.data} height={220} />
        </ChartCard>
      </div>

      {/* Row 2: Vehicle breakdown + Peak hour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Vehicle Type Breakdown"
          subtitle="Total counted vehicles by type"
          loading={vehicles.loading}
        >
          <VehicleBarChart data={vehicles.data} height={220} />
        </ChartCard>
        <ChartCard
          title="Peak Hour Analysis"
          subtitle="Average vehicles per hour of day · orange = rush hour · red = busiest"
          loading={peakHour.loading}
        >
          <PeakHourChart data={peakHour.data} height={220} />
        </ChartCard>
      </div>

      {/* Row 3: Daily trend */}
      <ChartCard
        title="Daily Traffic Trend"
        subtitle="Total vehicles and average speed per calendar day"
        loading={daily.loading}
      >
        <DailyTrendChart data={daily.data} height={220} />
      </ChartCard>

      {/* Row 4: Road comparison */}
      <ChartCard
        title="Traffic by Road"
        subtitle="Average vehicles and speed across all 5 roads — uses selected date range, ignores road filter"
        loading={byRoad.loading}
      >
        <RoadComparisonChart data={byRoad.data} height={240} />
      </ChartCard>

      {/* Data note */}
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          <strong className="text-zinc-700 dark:text-zinc-300">Data note:</strong>{' '}
          All charts show synthetic data generated from <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">drivesarthi_traffic_data.csv</code>.
          5-minute interval observations across 5 roads (RD001–RD005), Jan 2026.
          Charts sample up to 5,000 rows per query to keep response times fast.
          For full resolution, use a narrower date range.
        </p>
      </div>

    </div>
  )
}
