'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Marker, Popup, Circle } from 'react-leaflet'
import { supabase } from '@/lib/supabase'
import { getCurrentPosition, haversineKm, formatDistance, sortByDistance } from '@/lib/geo'
import {
  computeSignalState, estimatedWaitSeconds, recommendedSpeed,
  phaseLabel, PHASE_COLOURS,
} from '@/lib/signalHelpers'
import { ROADS } from '@/lib/trafficQueries'

// Leaflet must not run server-side
const BaseMap = dynamic(() => import('@/components/map/BaseMap'), { ssr: false })

// Default map centre (Delhi NCR area — matches seed data)
const DEFAULT_CENTER = [28.6600, 77.2200]
const TICK_MS = 1000

// ── road speed limits (km/h) ─────────────────────────────────────────────────
const SPEED_LIMITS = {
  RD001: 80, RD002: 60, RD003: 50, RD004: 40, RD005: 40,
}

export default function SignalPage() {
  const [signals, setSignals]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [userPos, setUserPos]       = useState(null)
  const [locError, setLocError]     = useState(null)
  const [selected, setSelected]     = useState(null)   // signal id
  const [tick, setTick]             = useState(0)       // increments every second
  const [roadFilter, setRoadFilter] = useState('all')

  // Tick every second to update countdown
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [])

  // Load signals from Supabase
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .order('road_id')
      if (error) { setError(error.message); setLoading(false); return }
      setSignals(data || [])
      if (data?.length) setSelected(data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  // Request geolocation
  useEffect(() => {
    getCurrentPosition()
      .then(pos => setUserPos(pos))
      .catch(err => setLocError(err.message))
  }, [])

  // ── derived data ─────────────────────────────────────────────────────────
  const filtered = roadFilter === 'all'
    ? signals
    : signals.filter(s => s.road_id === roadFilter)

  const signalsWithState = filtered.map(sig => {
    const state   = computeSignalState(sig)
    const distKm  = userPos ? haversineKm(userPos.lat, userPos.lng, sig.lat, sig.lng) : null
    const wait    = estimatedWaitSeconds(state)
    const speedLim = SPEED_LIMITS[sig.road_id] ?? 50
    const speed   = distKm != null ? recommendedSpeed(distKm, state, speedLim) : null
    return { ...sig, state, distKm, wait, speed }
  })

  // Sort by distance if user location available, else by road order
  const sorted = userPos
    ? [...signalsWithState].sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999))
    : signalsWithState

  const selectedSignal = sorted.find(s => s.id === selected) ?? sorted[0]
  const mapCenter = selectedSignal
    ? [selectedSignal.lat, selectedSignal.lng]
    : userPos ? [userPos.lat, userPos.lng] : DEFAULT_CENTER

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Smart Signal Assistant</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Simulated signal data — not real government traffic signals.{' '}
          {locError && <span className="text-yellow-600 dark:text-yellow-400">{locError}</span>}
        </p>
      </div>

      {/* Road filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRoadFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${roadFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          All Roads
        </button>
        {ROADS.map(r => (
          <button
            key={r.id}
            onClick={() => setRoadFilter(r.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${roadFilter === r.id ? 'bg-blue-600 text-white border-blue-600' : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skel key={i} h="h-16" />)}</div>
      ) : error ? (
        <ErrBox msg={error} />
      ) : signals.length === 0 ? (
        <EmptySignals />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: signal list */}
          <div className="lg:col-span-2 space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {sorted.map(sig => (
              <SignalCard
                key={sig.id}
                sig={sig}
                isSelected={sig.id === (selectedSignal?.id)}
                tick={tick}
                onClick={() => setSelected(sig.id)}
              />
            ))}
          </div>

          {/* Right: detail + map */}
          <div className="lg:col-span-3 space-y-4">
            {selectedSignal && (
              <SignalDetail sig={selectedSignal} tick={tick} />
            )}

            {/* Map */}
            <BaseMap center={mapCenter} zoom={14} className="h-72 w-full rounded-xl overflow-hidden shadow-sm">
              {/* User position */}
              {userPos && (
                <>
                  <Circle
                    center={[userPos.lat, userPos.lng]}
                    radius={40}
                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3 }}
                  />
                  <Marker position={[userPos.lat, userPos.lng]}>
                    <Popup>Your location</Popup>
                  </Marker>
                </>
              )}

              {/* Signal markers */}
              {sorted.map(sig => {
                const c = PHASE_COLOURS[sig.state.phase]
                return (
                  <Marker
                    key={sig.id}
                    position={[sig.lat, sig.lng]}
                    eventHandlers={{ click: () => setSelected(sig.id) }}
                  >
                    <Popup>
                      <div className="text-sm space-y-0.5 min-w-[140px]">
                        <p className="font-semibold">{sig.location_name}</p>
                        <p>{sig.road_name}</p>
                        <p className={`font-bold ${c.text}`}>{phaseLabel(sig.state.phase)} — {sig.state.secondsRemaining}s</p>
                        {sig.distKm != null && <p>{formatDistance(sig.distKm)} away</p>}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </BaseMap>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SignalCard ────────────────────────────────────────────────────────────────
function SignalCard({ sig, isSelected, tick, onClick }) {
  const state = computeSignalState(sig)
  const c     = PHASE_COLOURS[state.phase]
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 bg-white dark:bg-zinc-900'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800 dark:text-white truncate">{sig.location_name}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{sig.road_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`w-3 h-3 rounded-full ${c.bg} ring-2 ${c.ring}`} />
          <span className={`text-xs font-bold ${c.text}`}>{state.secondsRemaining}s</span>
        </div>
      </div>
      {sig.distKm != null && (
        <p className="text-xs text-zinc-400 mt-1">{formatDistance(sig.distKm)} away</p>
      )}
    </button>
  )
}

// ── SignalDetail ──────────────────────────────────────────────────────────────
function SignalDetail({ sig, tick }) {
  const state = computeSignalState(sig)
  const c     = PHASE_COLOURS[state.phase]
  const wait  = estimatedWaitSeconds(state)
  const speedLim = SPEED_LIMITS[sig.road_id] ?? 50
  const spd   = sig.distKm != null ? recommendedSpeed(sig.distKm, state, speedLim) : null

  // Countdown ring geometry
  const radius      = 36
  const circumference = 2 * Math.PI * radius
  const phaseTotal  = state.phase === 'green' ? state.greenSeconds
                    : state.phase === 'yellow' ? state.yellowSeconds
                    : state.redSeconds
  const progress = Math.max(0, state.secondsRemaining / phaseTotal)
  const strokeDash = circumference * progress

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">{sig.location_name}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{sig.road_name}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
          {phaseLabel(state.phase)}
        </span>
      </div>

      {/* Countdown ring + stats */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* SVG countdown ring */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r={radius} stroke="#e4e4e7" strokeWidth="6" fill="none" />
            <circle
              cx="42" cy="42" r={radius}
              stroke={state.phase === 'green' ? '#22c55e' : state.phase === 'yellow' ? '#eab308' : '#ef4444'}
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s linear' }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${c.text}`}>
            {state.secondsRemaining}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1 min-w-0">
          <StatTile label="Phase"         value={phaseLabel(state.phase)} />
          <StatTile label="Wait Time"     value={`~${wait}s`} sub="until next green" />
          <StatTile label="Cycle"         value={`${state.cycleSeconds}s`} sub="full cycle" />
          {sig.distKm != null
            ? <StatTile label="Distance"    value={formatDistance(sig.distKm)} />
            : <StatTile label="Distance"    value="—" sub="location needed" />
          }
        </div>
      </div>

      {/* Recommended speed */}
      {spd && (
        <div className={`rounded-lg px-4 py-3 border ${
          state.phase === 'green'
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
        }`}>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-0.5">Recommended Speed</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-white">
            {spd.recommendedSpeed ? `${spd.recommendedSpeed} km/h` : '—'}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{spd.advice}</p>
        </div>
      )}

      {/* Timing breakdown */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Signal Timing</p>
        <div className="flex gap-2 h-3 rounded-full overflow-hidden">
          <div className="bg-green-500 rounded-full"  style={{ width: `${(state.greenSeconds  / state.cycleSeconds) * 100}%` }} />
          <div className="bg-yellow-400 rounded-full" style={{ width: `${(state.yellowSeconds / state.cycleSeconds) * 100}%` }} />
          <div className="bg-red-500 rounded-full"    style={{ width: `${(state.redSeconds    / state.cycleSeconds) * 100}%` }} />
        </div>
        <div className="flex gap-4 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span>🟢 {state.greenSeconds}s</span>
          <span>🟡 {state.yellowSeconds}s</span>
          <span>🔴 {state.redSeconds}s</span>
        </div>
      </div>
    </div>
  )
}

// ── small helpers ─────────────────────────────────────────────────────────────
function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2.5">
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-sm font-bold text-zinc-900 dark:text-white">{value}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  )
}

function Skel({ h = 'h-16' }) {
  return <div className={`${h} rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse`} />
}

function ErrBox({ msg }) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 text-sm text-red-600 dark:text-red-400">
      {msg}
    </div>
  )
}

function EmptySignals() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-10 text-center space-y-2">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No signals found.</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Run the seed SQL in Supabase:
        <code className="ml-1 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">supabase/seed-signals.sql</code>
      </p>
    </div>
  )
}
