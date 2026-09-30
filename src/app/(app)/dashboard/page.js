'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCurrentPosition, haversineKm, formatDistance } from '@/lib/geo'
import { computeSignalState, PHASE_COLOURS, phaseLabel, estimatedWaitSeconds, recommendedSpeed } from '@/lib/signalHelpers'
import { enrichAndRankLots, availabilityBadge } from '@/lib/parkingHelpers'

// ── Map loaded client-side only ──────────────────────────────────────────────
const LiveMap = dynamic(() => import('@/components/map/LiveMap'), { ssr: false })

// ── Default location: ABESIT Engineering College, Ghaziabad ──────────────────
const ABESIT = { lat: 28.6730, lng: 77.4950 }
const ABESIT_ZOOM = 14

// ── HUD panel state ───────────────────────────────────────────────────────────
const PANELS = { signal: 'signal', parking: 'parking', none: 'none' }

// Road speed limits keyed by road_id from seed data
const SPEED_LIMITS = {
  RD001: 80, RD002: 60, RD003: 50, RD004: 40, RD005: 40,
}

export default function DashboardPage() {
  const { user } = useAuth()

  const [userPos, setUserPos]       = useState(null)
  const [locError, setLocError]     = useState(null)
  const [locating, setLocating]     = useState(true)

  const [signals, setSignals]       = useState([])
  const [parkingLots, setParkingLots] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  const [activePanel, setActivePanel] = useState(PANELS.none)
  const [selectedSignal, setSelectedSignal] = useState(null)
  const [selectedParking, setSelectedParking] = useState(null)
  const [tick, setTick] = useState(0)
  // Imperative ref: LiveMap calls this to expose its flyTo function
  const flyToRef = useRef(null)

  // 1-second tick for live signal countdown
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Get user location
  useEffect(() => {
    setLocating(true)
    getCurrentPosition()
      .then(pos => { setUserPos(pos); setLocating(false) })
      .catch(err => { setLocError(err.message); setLocating(false) })
  }, [])

  // Load signals + parking from Supabase
  useEffect(() => {
    async function load() {
      setDataLoading(true)
      const [sigRes, parkRes] = await Promise.allSettled([
        supabase.from('signals').select('*').order('road_name'),
        supabase.from('parking_lots').select('*'),
      ])
      if (sigRes.status === 'fulfilled')  setSignals(sigRes.value.data ?? [])
      if (parkRes.status === 'fulfilled') setParkingLots(parkRes.value.data ?? [])
      setDataLoading(false)
    }
    load()
  }, [])

  const ref = userPos ?? ABESIT

  // Enrich parking lots with distance from user (or ABESIT default)
  const enrichedParking = enrichAndRankLots(parkingLots, ref.lat, ref.lng)

  // Nearest signal
  const signalsWithDist = signals.map(s => ({
    ...s,
    distance_km: haversineKm(ref.lat, ref.lng, s.lat, s.lng),
    state: computeSignalState(s),
  })).sort((a, b) => a.distance_km - b.distance_km)

  const nearestSignal = signalsWithDist[0] ?? null
  const bestParking   = enrichedParking[0] ?? null

  function handleSignalClick(sig) {
    const withState = { ...sig, distance_km: haversineKm(ref.lat, ref.lng, sig.lat, sig.lng), state: computeSignalState(sig) }
    setSelectedSignal(withState)
    setSelectedParking(null)
    setActivePanel(PANELS.signal)
    // Fly map to signal
    flyToRef.current?.({ lng: sig.lng, lat: sig.lat, zoom: 17 })
  }

  function handleParkingClick(lot) {
    setSelectedParking(lot)
    setSelectedSignal(null)
    setActivePanel(PANELS.parking)
    // Fly map to parking lot
    flyToRef.current?.({ lng: lot.lng, lat: lot.lat, zoom: 17 })
  }

  // Called when HUD "Next Signal" card is clicked
  function handleNearestSignalHUD() {
    if (!nearestSignal) return
    handleSignalClick(nearestSignal)
  }

  // Called when HUD "Best Parking" card is clicked
  function handleBestParkingHUD() {
    if (!bestParking) return
    handleParkingClick(bestParking)
  }

  return (
    <div className="relative w-full h-full">

      {/* ── Full-screen map ────────────────────────────────────────────── */}
      <LiveMap
        userPos={userPos ?? ABESIT}
        isDefaultPos={!userPos}
        defaultCenter={ABESIT}
        defaultZoom={ABESIT_ZOOM}
        signals={signalsWithDist}
        parkingLots={enrichedParking}
        onSignalClick={handleSignalClick}
        onParkingClick={handleParkingClick}
        tick={tick}
        flyToRef={flyToRef}
      />

      {/* ── Top HUD bar ───────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2 pointer-events-none">
        {/* App brand */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-xl shadow-lg px-3 py-2 pointer-events-auto">
          <span className="text-blue-600 font-bold text-sm">DriveSarthi</span>
          <span className="text-[10px] text-zinc-400 hidden sm:inline">Live Map</span>
        </div>

        {/* Location status */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 rounded-xl shadow-lg px-3 py-2 pointer-events-auto">
          {locating ? (
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          ) : userPos ? (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
          )}
          <span className="text-xs text-zinc-600 dark:text-zinc-300">
            {locating ? 'Locating…' : userPos ? 'Live GPS' : '📍 ABESIT (demo)'}
          </span>
        </div>

        
      </div>

      {/* ── Nearest Signal HUD (bottom-left) ──────────────────────────── */}
      {nearestSignal && (
        <button
          onClick={handleNearestSignalHUD}
          className="absolute bottom-36 left-3 z-[1000] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl px-4 py-3 w-56 text-left hover:ring-2 hover:ring-blue-400 transition-all"
        >
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Next Signal</p>
          <div className="flex items-center gap-2">
            <SignalDot phase={nearestSignal.state.phase} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{nearestSignal.location_name}</p>
              <p className="text-[11px] text-zinc-500">{formatDistance(nearestSignal.distance_km)} ahead</p>
            </div>
            <span className={`text-sm font-black ml-auto shrink-0 ${PHASE_COLOURS[nearestSignal.state.phase]?.text}`}>
              {nearestSignal.state.secondsRemaining}s
            </span>
          </div>
          {nearestSignal.state.phase !== 'green' && (
            <p className="text-[10px] text-zinc-400 mt-1">
              🟢 Green in ~{estimatedWaitSeconds(nearestSignal.state)}s
            </p>
          )}
        </button>
      )}

      {/* ── Best Parking HUD (bottom-left, below signal) ──────────────── */}
      {bestParking && (
        <button
          onClick={handleBestParkingHUD}
          className="absolute bottom-16 left-3 z-[1000] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl px-4 py-3 w-56 text-left hover:ring-2 hover:ring-blue-400 transition-all"
        >
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Best Parking</p>
          <div className="flex items-center gap-2">
            <span className="text-lg">🅿</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{bestParking.name}</p>
              <p className="text-[11px] text-zinc-500">{bestParking.distance_label} · {bestParking.avail_pct}% free</p>
            </div>
          </div>
        </button>
      )}

      {/* ── Side panel: Signal detail ─────────────────────────────────── */}
      {activePanel === PANELS.signal && selectedSignal && (
        <SignalPanel
          sig={selectedSignal}
          tick={tick}
          onClose={() => setActivePanel(PANELS.none)}
        />
      )}

      {/* ── Side panel: Parking detail ────────────────────────────────── */}
      {activePanel === PANELS.parking && selectedParking && (
        <ParkingPanel
          lot={selectedParking}
          onClose={() => setActivePanel(PANELS.none)}
        />
      )}

      {/* Loading overlay */}
      {dataLoading && (
        <div className="absolute inset-0 z-[999] bg-white/60 dark:bg-black/60 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Loading map data…</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SignalPanel ───────────────────────────────────────────────────────────────
function SignalPanel({ sig, tick, onClose }) {
  const state = computeSignalState(sig)
  const c     = PHASE_COLOURS[state.phase]
  const wait  = estimatedWaitSeconds(state)

  // Speed recommendation — capped to road limit and never below 15 km/h
  const speedLimit  = SPEED_LIMITS[sig.road_id] ?? 50
  const distKm      = sig.distance_km ?? 0
  const rawSpeed    = recommendedSpeed(distKm, state, speedLimit)
  // Safety: clamp to [15, speedLimit], and only show if distance is meaningful
  const safeSpeed   = rawSpeed.recommendedSpeed
    ? Math.min(Math.max(rawSpeed.recommendedSpeed, 15), speedLimit)
    : null
  const speedAdvice = distKm < 0.05
    ? 'You are at the signal.'
    : rawSpeed.advice

  const radius    = 28
  const circ      = 2 * Math.PI * radius
  const phaseTotal = state.phase === 'green' ? state.greenSeconds
                   : state.phase === 'yellow' ? state.yellowSeconds
                   : state.redSeconds
  const dashArr   = circ * Math.max(0, state.secondsRemaining / phaseTotal)

  return (
    <div className="absolute top-16 right-3 z-[1001] w-72 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Signal</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{sig.location_name}</p>
          <p className="text-xs text-zinc-400">{sig.road_name} · {formatDistance(sig.distance_km ?? 0)}</p>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 text-lg leading-none">✕</button>
      </div>

      {/* Countdown ring */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r={radius} stroke="#e4e4e7" strokeWidth="5" fill="none" />
            <circle
              cx="34" cy="34" r={radius}
              stroke={state.phase === 'green' ? '#22c55e' : state.phase === 'yellow' ? '#eab308' : '#ef4444'}
              strokeWidth="5" fill="none"
              strokeDasharray={`${dashArr} ${circ}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s linear' }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-lg font-black ${c?.text}`}>
            {state.secondsRemaining}
          </span>
        </div>

        <div className="space-y-1.5 flex-1">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Phase</span>
            <span className={`font-semibold ${c?.text}`}>{phaseLabel(state.phase)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Wait</span>
            <span className="font-semibold text-zinc-800 dark:text-white">~{wait}s</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Cycle</span>
            <span className="font-semibold text-zinc-800 dark:text-white">{state.cycleSeconds}s</span>
          </div>
        </div>
      </div>

      {/* ── Recommended speed box ── */}
      {distKm > 0.05 && safeSpeed && (
        <div className={`rounded-xl px-3 py-2.5 border ${
          state.phase === 'green'
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
        }`}>
          <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">
            Recommended Speed
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-zinc-900 dark:text-white">{safeSpeed}</span>
            <span className="text-sm font-semibold text-zinc-500">km/h</span>
            {safeSpeed < speedLimit && (
              <span className="ml-auto text-[10px] font-medium text-zinc-400">limit {speedLimit} km/h</span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">{speedAdvice}</p>
        </div>
      )}
      {distKm <= 0.05 && (
        <p className="text-xs text-zinc-400 text-center">You are at the signal.</p>
      )}

      {/* Timing bar */}
      <div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden">
          <div className="bg-green-500 rounded-full"  style={{ width: `${(state.greenSeconds /state.cycleSeconds)*100}%` }} />
          <div className="bg-yellow-400 rounded-full" style={{ width: `${(state.yellowSeconds/state.cycleSeconds)*100}%` }} />
          <div className="bg-red-500 rounded-full"    style={{ width: `${(state.redSeconds   /state.cycleSeconds)*100}%` }} />
        </div>
        <div className="flex gap-3 text-[10px] text-zinc-400 mt-1">
          <span>🟢 {state.greenSeconds}s</span>
          <span>🟡 {state.yellowSeconds}s</span>
          <span>🔴 {state.redSeconds}s</span>
        </div>
      </div>

      <Link
        href="/signal"
        className="block text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
      >
        Open Signal Assistant →
      </Link>
    </div>
  )
}

// ── ParkingPanel ──────────────────────────────────────────────────────────────
function ParkingPanel({ lot, onClose }) {
  const badge = availabilityBadge(lot.avail_pct)
  return (
    <div className="absolute top-16 right-3 z-[1001] w-72 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Parking</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight mt-0.5">{lot.name}</p>
          <p className="text-xs text-zinc-400">{lot.address}</p>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1">✕</button>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.colour}`}>{badge.label}</span>
        {lot.is_covered && <span className="text-xs text-zinc-500">🏠 Covered</span>}
        <span className="text-xs text-zinc-500 ml-auto">{lot.distance_label} away</span>
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>{lot.available} free</span>
          <span>{lot.total_spots} total</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${lot.avail_pct >= 50 ? 'bg-green-500' : lot.avail_pct >= 20 ? 'bg-yellow-400' : lot.avail_pct > 0 ? 'bg-orange-500' : 'bg-red-500'}`}
            style={{ width: `${lot.avail_pct}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-400 mt-0.5">{lot.avail_pct}% available</p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-600 dark:text-zinc-300">
          {lot.price_per_hour > 0 ? `₹${lot.price_per_hour}/hr` : 'Free'}
        </span>
        <span className="text-zinc-400">Score: {lot.score}/100</span>
      </div>

      

      <Link
        href="/parking"
        className="block text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
      >
        Open Parking Module →
      </Link>
    </div>
  )
}

// ── SignalDot ─────────────────────────────────────────────────────────────────
function SignalDot({ phase }) {
  const colours = { green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' }
  return (
    <span className={`w-4 h-4 rounded-full shrink-0 ${colours[phase] ?? 'bg-zinc-400'} ring-2 ring-white dark:ring-zinc-900 shadow`} />
  )
}
