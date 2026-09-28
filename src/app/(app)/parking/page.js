'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { getCurrentPosition } from '@/lib/geo'
import { enrichAndRankLots, availabilityBadge } from '@/lib/parkingHelpers'
import { formatDistance } from '@/lib/geo'

const BaseMap = dynamic(() => import('@/components/map/BaseMap'), { ssr: false })

const DEFAULT_CENTER = [28.6600, 77.2200]

// Coloured circle icons for available / limited / full
function makeIcon(colour) {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${colour};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

const ICONS = {
  Available:   makeIcon !== undefined ? null : null,   // resolved lazily in component
  Limited:     null,
  'Almost Full': null,
  Full:        null,
}

function lotIcon(availPct) {
  if (typeof window === 'undefined') return undefined   // SSR safety
  if (availPct >= 50) return makeIcon('#22c55e')
  if (availPct >= 20) return makeIcon('#eab308')
  if (availPct > 0)   return makeIcon('#f97316')
  return makeIcon('#ef4444')
}

export default function ParkingPage() {
  const [lots, setLots]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [userPos, setUserPos]     = useState(null)
  const [locError, setLocError]   = useState(null)
  const [selected, setSelected]   = useState(null)
  const [filter, setFilter]       = useState('all') // 'all' | 'available' | 'covered'

  // Request geolocation
  useEffect(() => {
    getCurrentPosition()
      .then(pos => setUserPos(pos))
      .catch(err => setLocError(err.message))
  }, [])

  // Load parking lots
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('parking_lots')
        .select('*')
        .order('name')
      if (error) { setError(error.message); setLoading(false); return }
      setLots(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Enrich + rank lots whenever data or user position changes
  const refLat = userPos?.lat ?? DEFAULT_CENTER[0]
  const refLng = userPos?.lng ?? DEFAULT_CENTER[1]
  const ranked = enrichAndRankLots(lots, refLat, refLng)

  // Apply filter
  const displayed = ranked.filter(lot => {
    if (filter === 'available') return lot.avail_pct > 0
    if (filter === 'covered')   return lot.is_covered
    return true
  })

  const selectedLot = displayed.find(l => l.id === selected) ?? displayed[0]
  const mapCenter   = selectedLot
    ? [selectedLot.lat, selectedLot.lng]
    : userPos ? [userPos.lat, userPos.lng] : DEFAULT_CENTER

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Nearby Parking</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Availability is <strong>simulated prototype data</strong> — not live.{' '}
          {locError && <span className="text-yellow-600 dark:text-yellow-400">{locError}</span>}
          {userPos && !locError && <span className="text-green-600 dark:text-green-400">Location found — showing distances from you.</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',       label: 'All Lots'   },
          { key: 'available', label: 'Has Space'  },
          { key: 'covered',   label: 'Covered'    },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skel key={i} h="h-24" />)}
        </div>
      ) : error ? (
        <ErrBox msg={error} />
      ) : lots.length === 0 ? (
        <EmptyLots />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: lot list */}
          <div className="lg:col-span-2 space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {displayed.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">No lots match the filter.</p>
            ) : displayed.map(lot => (
              <ParkingCard
                key={lot.id}
                lot={lot}
                isSelected={lot.id === selectedLot?.id}
                onClick={() => setSelected(lot.id)}
              />
            ))}
          </div>

          {/* Right: detail + map */}
          <div className="lg:col-span-3 space-y-4">
            {selectedLot && <ParkingDetail lot={selectedLot} />}

            {/* Recommendation banner — top 3 */}
            {!loading && displayed.length > 0 && (
              <RecommendationBanner top={displayed.slice(0, 3)} onSelect={setSelected} selectedId={selectedLot?.id} />
            )}

            <BaseMap center={mapCenter} zoom={14} className="h-72 w-full rounded-xl overflow-hidden shadow-sm">
              {displayed.map(lot => (
                <Marker
                  key={lot.id}
                  position={[lot.lat, lot.lng]}
                  icon={lotIcon(lot.avail_pct)}
                  eventHandlers={{ click: () => setSelected(lot.id) }}
                >
                  <Popup>
                    <div className="text-sm space-y-0.5 min-w-[160px]">
                      <p className="font-semibold">{lot.name}</p>
                      <p className="text-xs text-zinc-500">{lot.address}</p>
                      <p>{lot.available} / {lot.total_spots} spaces free</p>
                      <p>{lot.avail_pct}% available</p>
                      {lot.price_per_hour > 0
                        ? <p>₹{lot.price_per_hour}/hr</p>
                        : <p>Free parking</p>
                      }
                      <p>{lot.distance_label} away</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </BaseMap>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />≥50% free</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />20–50% free</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />&lt;20% free</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Full</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ParkingCard ───────────────────────────────────────────────────────────────
function ParkingCard({ lot, isSelected, onClick }) {
  const badge = availabilityBadge(lot.avail_pct)
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 bg-white dark:bg-zinc-900'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800 dark:text-white truncate">{lot.name}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{lot.distance_label} away</p>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.colour}`}>
          {badge.label}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${lot.avail_pct >= 50 ? 'bg-green-500' : lot.avail_pct >= 20 ? 'bg-yellow-400' : lot.avail_pct > 0 ? 'bg-orange-500' : 'bg-red-500'}`}
            style={{ width: `${lot.avail_pct}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">{lot.available}/{lot.total_spots}</span>
      </div>
    </button>
  )
}

// ── ParkingDetail ─────────────────────────────────────────────────────────────
function ParkingDetail({ lot }) {
  const badge = availabilityBadge(lot.avail_pct)
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">{lot.name}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{lot.address}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.colour}`}>{badge.label}</span>
          {lot.is_covered && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">🏠 Covered</span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Available"  value={lot.available}    sub="spaces free" />
        <StatTile label="Occupied"   value={lot.occupied}     sub="spaces taken" />
        <StatTile label="Total"      value={lot.total_spots}  sub="capacity" />
        <StatTile label="Distance"   value={lot.distance_label} />
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          <span>{lot.avail_pct}% available</span>
          <span>{100 - lot.avail_pct}% occupied</span>
        </div>
        <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${lot.avail_pct >= 50 ? 'bg-green-500' : lot.avail_pct >= 20 ? 'bg-yellow-400' : lot.avail_pct > 0 ? 'bg-orange-500' : 'bg-red-500'}`}
            style={{ width: `${lot.avail_pct}%` }}
          />
        </div>
      </div>

      {/* Price + score */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-300">
          {lot.price_per_hour > 0 ? `₹${lot.price_per_hour} / hour` : 'Free parking'}
        </span>
        <span className="text-xs text-zinc-400">
          Score: <strong className="text-zinc-700 dark:text-zinc-200">{lot.score}</strong>/100
          <span className="text-zinc-400 ml-1">(dist 40% · avail 45% · cap 15%)</span>
        </span>
      </div>

      {/* Synthetic notice */}
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
        ⚠ Availability is simulated prototype data — not a live feed.
      </p>
    </div>
  )
}

// ── RecommendationBanner ──────────────────────────────────────────────────────
function RecommendationBanner({ top, onSelect, selectedId }) {
  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">🏆 Top Recommendations</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {top.map((lot, i) => {
          const badge = availabilityBadge(lot.avail_pct)
          return (
            <button
              key={lot.id}
              onClick={() => onSelect(lot.id)}
              className={`text-left rounded-lg p-2.5 border transition-colors ${
                lot.id === selectedId
                  ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40'
                  : 'border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-900/30'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">#{i + 1}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.colour}`}>{badge.label}</span>
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-white leading-tight">{lot.name}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{lot.distance_label} · {lot.avail_pct}% free · score {lot.score}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2.5 text-center">
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-base font-bold text-zinc-900 dark:text-white">{value}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  )
}

function Skel({ h = 'h-24' }) {
  return <div className={`${h} rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse`} />
}

function ErrBox({ msg }) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 text-sm text-red-600 dark:text-red-400">
      {msg}
    </div>
  )
}

function EmptyLots() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-10 text-center space-y-2">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No parking lots found.</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Run the seed script:{' '}
        <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          $env:SUPABASE_URL="..." ; $env:SUPABASE_SERVICE_KEY="..." ; node scripts/seed-parking.mjs
        </code>
      </p>
    </div>
  )
}
