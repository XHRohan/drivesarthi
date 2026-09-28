/**
 * trafficQueries.js
 * -----------------
 * All Supabase queries for the traffic_data table.
 * Import these in page components — never call supabase.from('traffic_data') directly in pages.
 *
 * Data source: drivesarthi_traffic_data.csv → imported into Supabase via npm run import-traffic
 * All data is SYNTHETIC prototype data.
 */

import { supabase } from '@/lib/supabase'

// ── constants ────────────────────────────────────────────────────────────────

export const ROADS = [
  { id: 'RD001', name: 'NH24 Corridor',    type: 'highway'     },
  { id: 'RD002', name: 'GT Road',          type: 'arterial'    },
  { id: 'RD003', name: 'City Center Road', type: 'city_road'   },
  { id: 'RD004', name: 'Market Road',      type: 'market_road' },
  { id: 'RD005', name: 'College Road',     type: 'city_road'   },
]

export const CONGESTION_LEVELS = ['Low', 'Moderate', 'High', 'Very High']

export const VEHICLE_FIELDS = ['cars', 'bikes', 'auto_rickshaws', 'buses', 'trucks', 'other_vehicles']

export const VEHICLE_LABELS = {
  cars:           'Cars',
  bikes:          'Bikes',
  auto_rickshaws: 'Auto Rickshaws',
  buses:          'Buses',
  trucks:         'Trucks',
  other_vehicles: 'Other',
}

export const VEHICLE_COLOURS = {
  cars:           '#3b82f6',
  bikes:          '#10b981',
  auto_rickshaws: '#f59e0b',
  buses:          '#8b5cf6',
  trucks:         '#ef4444',
  other_vehicles: '#6b7280',
}

export const CONGESTION_COLOURS = {
  Low:        '#10b981',
  Moderate:   '#f59e0b',
  High:       '#f97316',
  'Very High':'#ef4444',
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a base query with optional road_id and date-range filters.
 * @param {string|null} roadId
 * @param {string|null} dateFrom  ISO date string 'YYYY-MM-DD'
 * @param {string|null} dateTo    ISO date string 'YYYY-MM-DD'
 */
function baseQuery(roadId, dateFrom, dateTo) {
  let q = supabase.from('traffic_data')
  if (roadId && roadId !== 'all') q = q.eq('road_id', roadId)
  if (dateFrom) q = q.gte('timestamp', `${dateFrom}T00:00:00`)
  if (dateTo)   q = q.lte('timestamp', `${dateTo}T23:59:59`)
  return q
}

// ── 1. Latest reading per road (Dashboard) ───────────────────────────────────

/**
 * Fetch the latest single traffic row for each of the 5 roads.
 * Used by: Dashboard road-conditions cards.
 * Returns up to 5 rows (one per road), ordered latest-first.
 */
export async function fetchLatestPerRoad() {
  const { data, error } = await supabase
    .from('traffic_data')
    .select(
      'road_id, road_name, road_type, timestamp, cars, bikes, auto_rickshaws, buses, trucks, ' +
      'other_vehicles, total_vehicles, road_capacity, density, density_percent, avg_speed_kmh, ' +
      'congestion_level, estimated_clearance_minutes, weather, event'
    )
    .order('timestamp', { ascending: false })
    .limit(50) // enough to find latest for each of 5 roads

  if (error) throw error

  // Deduplicate: keep the first (latest) row per road_id
  const seen = new Set()
  return (data || []).filter(r => {
    if (seen.has(r.road_id)) return false
    seen.add(r.road_id)
    return true
  })
}

// ── 2. Latest single road reading (Dashboard detail) ─────────────────────────

/**
 * Fetch the most recent row for a specific road.
 * Used by: Dashboard selected-road detail panel.
 */
export async function fetchLatestForRoad(roadId) {
  const { data, error } = await supabase
    .from('traffic_data')
    .select('*')
    .eq('road_id', roadId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error
  return data
}

// ── 3. Congestion trend over time ─────────────────────────────────────────────

/**
 * Fetch density_percent and avg_speed_kmh over time, sampled every N rows.
 * Used by: CongestionLineChart, SpeedLineChart.
 * Limits rows to avoid browser memory issues — returns at most `limit` rows.
 */
export async function fetchCongestionTrend({ roadId = 'all', dateFrom, dateTo, limit = 288 } = {}) {
  const { data, error } = await baseQuery(roadId, dateFrom, dateTo)
    .select('timestamp, road_id, road_name, density_percent, avg_speed_kmh, congestion_level, total_vehicles')
    .order('timestamp', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data || []).map(r => ({
    ...r,
    time: formatTimestamp(r.timestamp),
    density_percent: Number(r.density_percent),
    avg_speed_kmh:   Number(r.avg_speed_kmh),
    total_vehicles:  Number(r.total_vehicles),
  }))
}

// ── 4. Congestion level distribution (pie/bar) ────────────────────────────────

/**
 * Count rows by congestion_level for a road/date range.
 * Used by: congestion distribution chart.
 * Aggregated in JS from a capped query — avoids needing a DB function.
 */
export async function fetchCongestionDistribution({ roadId = 'all', dateFrom, dateTo } = {}) {
  const { data, error } = await baseQuery(roadId, dateFrom, dateTo)
    .select('congestion_level')
    .limit(5000)

  if (error) throw error

  const counts = {}
  ;(data || []).forEach(r => {
    counts[r.congestion_level] = (counts[r.congestion_level] || 0) + 1
  })

  return CONGESTION_LEVELS
    .filter(l => counts[l] > 0)
    .map(l => ({ level: l, count: counts[l], fill: CONGESTION_COLOURS[l] }))
}

// ── 5. Vehicle type totals ────────────────────────────────────────────────────

/**
 * Sum each vehicle type across a road/date range.
 * Used by: VehicleBarChart (total composition).
 */
export async function fetchVehicleTotals({ roadId = 'all', dateFrom, dateTo } = {}) {
  const { data, error } = await baseQuery(roadId, dateFrom, dateTo)
    .select('cars, bikes, auto_rickshaws, buses, trucks, other_vehicles')
    .limit(5000)

  if (error) throw error

  const totals = { cars: 0, bikes: 0, auto_rickshaws: 0, buses: 0, trucks: 0, other_vehicles: 0 }
  ;(data || []).forEach(r => {
    VEHICLE_FIELDS.forEach(f => { totals[f] += Number(r[f]) || 0 })
  })

  return VEHICLE_FIELDS.map(f => ({
    vehicle: VEHICLE_LABELS[f],
    count:   totals[f],
    fill:    VEHICLE_COLOURS[f],
  }))
}

// ── 6. Peak-hour analysis ─────────────────────────────────────────────────────

/**
 * Average total_vehicles per hour-of-day (0–23).
 * Used by: PeakHourChart.
 */
export async function fetchPeakHourData({ roadId = 'all', dateFrom, dateTo } = {}) {
  const { data, error } = await baseQuery(roadId, dateFrom, dateTo)
    .select('timestamp, total_vehicles')
    .limit(5000)

  if (error) throw error

  // Accumulate per hour
  const hourBuckets = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
  ;(data || []).forEach(r => {
    const h = new Date(r.timestamp).getHours()
    hourBuckets[h].sum   += Number(r.total_vehicles) || 0
    hourBuckets[h].count += 1
  })

  return hourBuckets.map((b, h) => ({
    hour:    `${String(h).padStart(2, '0')}:00`,
    avg:     b.count > 0 ? Math.round(b.sum / b.count) : 0,
    isPeak:  [8, 9, 17, 18, 19].includes(h),
  }))
}

// ── 7. Daily traffic totals ───────────────────────────────────────────────────

/**
 * Sum total_vehicles per calendar date.
 * Used by: daily traffic trend line chart.
 * Returns at most `limit` days.
 */
export async function fetchDailyTrend({ roadId = 'all', dateFrom, dateTo, limit = 30 } = {}) {
  const { data, error } = await baseQuery(roadId, dateFrom, dateTo)
    .select('timestamp, total_vehicles, avg_speed_kmh, density_percent')
    .order('timestamp', { ascending: true })
    .limit(limit * 288) // 288 = 24h × 12 five-min slots per hour

  if (error) throw error

  const dayMap = {}
  ;(data || []).forEach(r => {
    const day = r.timestamp.slice(0, 10) // 'YYYY-MM-DD'
    if (!dayMap[day]) dayMap[day] = { total: 0, speedSum: 0, densitySum: 0, count: 0 }
    dayMap[day].total      += Number(r.total_vehicles) || 0
    dayMap[day].speedSum   += Number(r.avg_speed_kmh) || 0
    dayMap[day].densitySum += Number(r.density_percent) || 0
    dayMap[day].count      += 1
  })

  return Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, limit)
    .map(([day, v]) => ({
      date:       day,
      label:      formatDate(day),
      total:      v.total,
      avg_speed:  v.count > 0 ? +(v.speedSum  / v.count).toFixed(1) : 0,
      avg_density:v.count > 0 ? +(v.densitySum / v.count).toFixed(1) : 0,
    }))
}

// ── 8. Per-road summary (all roads at once) ───────────────────────────────────

/**
 * Average vehicles, speed and density per road_id.
 * Used by: "Traffic by road" bar chart.
 */
export async function fetchByRoadSummary({ dateFrom, dateTo } = {}) {
  const { data, error } = await baseQuery(null, dateFrom, dateTo)
    .select('road_id, road_name, total_vehicles, avg_speed_kmh, density_percent')
    .limit(5000)

  if (error) throw error

  const roadMap = {}
  ;(data || []).forEach(r => {
    if (!roadMap[r.road_id]) roadMap[r.road_id] = { name: r.road_name, totalSum: 0, speedSum: 0, densitySum: 0, count: 0 }
    roadMap[r.road_id].totalSum   += Number(r.total_vehicles) || 0
    roadMap[r.road_id].speedSum   += Number(r.avg_speed_kmh) || 0
    roadMap[r.road_id].densitySum += Number(r.density_percent) || 0
    roadMap[r.road_id].count      += 1
  })

  return Object.values(roadMap).map(v => ({
    road:        v.name,
    avg_vehicles:v.count > 0 ? Math.round(v.totalSum  / v.count) : 0,
    avg_speed:   v.count > 0 ? +(v.speedSum   / v.count).toFixed(1) : 0,
    avg_density: v.count > 0 ? +(v.densitySum / v.count).toFixed(1) : 0,
  }))
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function formatDate(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}
