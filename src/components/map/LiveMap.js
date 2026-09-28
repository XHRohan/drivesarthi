'use client'
/**
 * LiveMap.js — MapLibre GL full-screen navigation map.
 *
 * v3 — stable marker architecture:
 *  - Circle layers (WebGL) for signal/parking dots — anchored to map, no glitch
 *  - Single DOM Marker per signal/parking for the text label only
 *    (textContent updated in-place, never innerHTML swap → no flicker)
 *  - No symbol layers → no glyphs URL needed with plain OSM raster style
 *  - Right-click drag OR two-finger twist to rotate
 *  - Compass NavigationControl + custom tilt-reset button
 *
 * Import with: dynamic(() => import('@/components/map/LiveMap'), { ssr: false })
 */

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import { computeSignalState, phaseLabel, estimatedWaitSeconds } from '@/lib/signalHelpers'
import { formatDistance } from '@/lib/geo'

// ── OSM raster style — zero API key ──────────────────────────────────────────
const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

// ── Colours ───────────────────────────────────────────────────────────────────
const PHASE_HEX = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }
function parkingHex(pct) {
  return pct >= 50 ? '#22c55e' : pct >= 20 ? '#eab308' : pct > 0 ? '#f97316' : '#ef4444'
}

// ── GeoJSON builders ──────────────────────────────────────────────────────────
function signalGeoJSON(signals) {
  return {
    type: 'FeatureCollection',
    features: signals.map(s => {
      const st = computeSignalState(s)
      return {
        type: 'Feature',
        id: s.id,
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: {
          id:       s.id,
          phase:    st.phase,
          seconds:  st.secondsRemaining,
          color:    PHASE_HEX[st.phase] ?? '#94a3b8',
        },
      }
    }),
  }
}

function parkingGeoJSON(lots) {
  return {
    type: 'FeatureCollection',
    features: lots.map(l => ({
      type: 'Feature',
      id: l.id,
      geometry: { type: 'Point', coordinates: [l.lng, l.lat] },
      properties: {
        id:        l.id,
        avail_pct: l.avail_pct,
        color:     parkingHex(l.avail_pct),
      },
    })),
  }
}

// ── Popup HTML ────────────────────────────────────────────────────────────────
function signalPopupHTML(sig, signals) {
  const full = signals.find(s => s.id === sig.id) ?? sig
  const st   = computeSignalState(full)
  const wait = estimatedWaitSeconds(st)
  const c    = PHASE_HEX[st.phase] ?? '#94a3b8'
  return `
    <div style="font-family:system-ui,sans-serif;min-width:190px">
      <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#18181b">${full.location_name}</p>
      <p style="font-size:11px;color:#71717a;margin:0 0 8px">${full.road_name}</p>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="width:10px;height:10px;border-radius:50%;background:${c};flex-shrink:0;display:inline-block"></span>
        <span style="font-weight:600;font-size:12px;color:#18181b">
          ${st.phase.charAt(0).toUpperCase()+st.phase.slice(1)} · ${st.secondsRemaining}s
        </span>
      </div>
      ${st.phase !== 'green'
        ? `<p style="font-size:11px;color:#6b7280;margin:0 0 3px">🟢 Green in ~${wait}s</p>` : ''}
      ${full.distance_km != null
        ? `<p style="font-size:11px;color:#a1a1aa;margin:0">${formatDistance(full.distance_km)} away</p>` : ''}
    </div>`
}

function parkingPopupHTML(lot) {
  const bc = parkingHex(lot.avail_pct)
  return `
    <div style="font-family:system-ui,sans-serif;min-width:190px">
      <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#18181b">🅿 ${lot.name}</p>
      <p style="font-size:11px;color:#71717a;margin:0 0 6px">${lot.address ?? ''}</p>
      <div style="background:#f4f4f5;border-radius:4px;height:6px;margin-bottom:5px">
        <div style="width:${lot.avail_pct}%;height:100%;background:${bc};border-radius:4px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:#18181b;margin-bottom:3px">
        <span>${lot.available}/${lot.total_spots} free</span><span>${lot.avail_pct}%</span>
      </div>
      <p style="font-size:11px;color:#a1a1aa;margin:0 0 2px">
        ${lot.distance_label ?? ''} · ${lot.price_per_hour > 0 ? '₹'+lot.price_per_hour+'/hr' : 'Free'}
        ${lot.is_covered ? ' · 🏠 Covered' : ''}
      </p>
      <p style="font-size:10px;color:#f59e0b;margin:4px 0 0">⚠ Prototype · simulated availability</p>
    </div>`
}

// ── Inject shared CSS ─────────────────────────────────────────────────────────
function ensureCSS() {
  if (document.getElementById('ds-livemap-css')) return
  const s = document.createElement('style')
  s.id = 'ds-livemap-css'
  s.textContent = `
    @keyframes ds-pulse {
      0%   { transform:scale(1);   opacity:.7 }
      70%  { transform:scale(2);   opacity:0  }
      100% { transform:scale(1);   opacity:0  }
    }
    .ds-pulse-ring {
      position:absolute;inset:0;border-radius:50%;
      background:rgba(59,130,246,.25);
      animation:ds-pulse 2.2s ease-out infinite;
      pointer-events:none;
    }
    /* marker label badges */
    .ds-sig-badge {
      position:absolute;top:-22px;left:50%;transform:translateX(-50%);
      background:#18181b;color:#fff;
      font:700 10px/1 system-ui,sans-serif;
      padding:2px 5px;border-radius:4px;white-space:nowrap;
      pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.35);
    }
    .ds-park-badge {
      position:absolute;top:-20px;left:50%;transform:translateX(-50%);
      background:#fff;color:#18181b;border:1.5px solid #d4d4d8;
      font:600 9px/1 system-ui,sans-serif;
      padding:2px 5px;border-radius:4px;white-space:nowrap;
      pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.2);
    }
    .maplibregl-popup-content {
      border-radius:12px !important;
      box-shadow:0 6px 28px rgba(0,0,0,.18) !important;
      padding:12px 14px !important;
    }
    .maplibregl-popup-close-button { font-size:16px !important; top:4px !important; right:6px !important; }
    /* rotation hint */
    .ds-rotate-hint {
      position:absolute;bottom:110px;left:50%;transform:translateX(-50%);z-index:10;
      background:rgba(0,0,0,.55);color:#fff;font-size:11px;
      padding:5px 10px;border-radius:20px;pointer-events:none;
      opacity:1;transition:opacity 1s;
    }
    /* custom reset button */
    .ds-reset-btn {
      background:#fff;border:none;border-radius:8px;
      box-shadow:0 1px 4px rgba(0,0,0,.25);
      width:30px;height:30px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      font-size:15px;
    }
    .ds-reset-btn:hover { background:#f4f4f5; }
  `
  document.head.appendChild(s)
}

// ── User arrow element ────────────────────────────────────────────────────────
function createArrowEl() {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:relative;width:52px;height:52px;'

  const pulse = document.createElement('div')
  pulse.className = 'ds-pulse-ring'
  wrap.appendChild(pulse)

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 52 52')
  svg.setAttribute('width', '52')
  svg.setAttribute('height', '52')
  svg.style.cssText = 'position:absolute;top:0;left:0;transition:transform .3s ease;'
  svg.innerHTML = `
    <defs>
      <filter id="ds-sh" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,.4)"/>
      </filter>
    </defs>
    <polygon points="26,3 33,18 26,15 19,18" fill="rgba(59,130,246,.45)"/>
    <circle cx="26" cy="26" r="12" fill="#3b82f6" filter="url(#ds-sh)"/>
    <circle cx="26" cy="26" r="12" fill="none" stroke="white" stroke-width="2.5"/>
    <polyline points="20,29 26,21 32,29" fill="none" stroke="white"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  `
  wrap.appendChild(svg)
  return { wrap, svg }
}

// ── Label badge elements (DOM, anchored via Marker, textContent updated only) ─
function createSignalBadgeEl(state) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:relative;width:0;height:0;'
  const badge = document.createElement('div')
  badge.className = 'ds-sig-badge'
  badge.textContent = `${state.secondsRemaining}s`
  wrap.appendChild(badge)
  return { wrap, badge }
}

function createParkingBadgeEl(lot) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:relative;width:0;height:0;'
  const badge = document.createElement('div')
  badge.className = 'ds-park-badge'
  badge.textContent = `${lot.avail_pct}% free`
  wrap.appendChild(badge)
  return { wrap, badge }
}

// ── Tilt-reset custom control ─────────────────────────────────────────────────
class TiltResetControl {
  onAdd(map) {
    this._map = map
    this._btn = document.createElement('button')
    this._btn.className  = 'ds-reset-btn'
    this._btn.title      = 'Reset tilt & north'
    this._btn.textContent = '⬆'
    this._btn.addEventListener('click', () => {
      map.easeTo({ pitch: 45, bearing: 0, duration: 600 })
    })
    this._container = document.createElement('div')
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    this._container.appendChild(this._btn)
    return this._container
  }
  onRemove() { this._container.parentNode?.removeChild(this._container) }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LiveMap({
  userPos, defaultCenter, defaultZoom,
  signals, parkingLots,
  onSignalClick, onParkingClick,
  tick,
}) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const readyRef     = useRef(false)

  const arrowRef     = useRef(null)     // { marker, svg }
  const centeredRef  = useRef(false)

  // Per-signal label markers: Map<id, { marker, badge }>
  const sigBadgesRef  = useRef(new Map())
  // Per-parking label markers: Map<id, { marker, badge }>
  const parkBadgesRef = useRef(new Map())

  // Keep stable refs for callbacks / data
  const sigRef   = useRef(signals)
  const parkRef  = useRef(parkingLots)
  const onSigRef = useRef(onSignalClick)
  const onPkRef  = useRef(onParkingClick)
  useEffect(() => { sigRef.current   = signals       }, [signals])
  useEffect(() => { parkRef.current  = parkingLots   }, [parkingLots])
  useEffect(() => { onSigRef.current = onSignalClick }, [onSignalClick])
  useEffect(() => { onPkRef.current  = onParkingClick}, [onParkingClick])

  // ── Init map ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    ensureCSS()

    const map = new maplibregl.Map({
      container:  containerRef.current,
      style:      OSM_STYLE,
      center:     [defaultCenter.lng, defaultCenter.lat],
      zoom:       defaultZoom,
      pitch:      45,
      bearing:    0,
      antialias:  true,
      dragRotate: true,
    })

    // Explicitly enable touch rotation (two-finger twist)
    map.touchZoomRotate.enableRotation()

    // Controls
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }),
      'bottom-right'
    )
    map.addControl(new TiltResetControl(), 'bottom-right')

    // Rotation hint (fades after 4 s)
    const hint = document.createElement('div')
    hint.className = 'ds-rotate-hint'
    hint.textContent = '🖱 Right-click drag or two-finger twist to rotate'
    containerRef.current?.appendChild(hint)
    setTimeout(() => { hint.style.opacity = '0' }, 4000)
    setTimeout(() => { hint.remove() },           5200)

    map.on('load', () => {
      // ── Signal circle source + layer ───────────────────────────────────
      map.addSource('signals', { type: 'geojson', data: signalGeoJSON(sigRef.current) })

      // Glow halo
      map.addLayer({
        id: 'signals-halo', type: 'circle', source: 'signals',
        paint: {
          'circle-radius': 22,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.18,
          'circle-blur': 0.8,
          'circle-pitch-alignment': 'map',
        },
      })
      // Solid dot
      map.addLayer({
        id: 'signals-dot', type: 'circle', source: 'signals',
        paint: {
          'circle-radius': 13,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
          'circle-pitch-alignment': 'map',
          'circle-pitch-scale': 'map',
        },
      })

      // ── Parking circle source + layer ───────────────────────────────────
      map.addSource('parking', { type: 'geojson', data: parkingGeoJSON(parkRef.current) })

      map.addLayer({
        id: 'parking-dot', type: 'circle', source: 'parking',
        paint: {
          'circle-radius': 11,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5,
          'circle-pitch-alignment': 'map',
          'circle-pitch-scale': 'map',
        },
      })

      // ── Click handlers ──────────────────────────────────────────────────
      map.on('click', 'signals-dot', e => {
        const props = e.features[0]?.properties
        if (!props) return
        const full = sigRef.current.find(s => s.id === props.id)
        if (full) {
          new maplibregl.Popup({ offset: 18, maxWidth: '260px' })
            .setLngLat([full.lng, full.lat])
            .setHTML(signalPopupHTML(full, sigRef.current))
            .addTo(map)
          onSigRef.current(full)
        }
      })

      map.on('click', 'parking-dot', e => {
        const props = e.features[0]?.properties
        if (!props) return
        const full = parkRef.current.find(l => l.id === props.id)
        if (full) {
          new maplibregl.Popup({ offset: 16, maxWidth: '260px' })
            .setLngLat([full.lng, full.lat])
            .setHTML(parkingPopupHTML(full))
            .addTo(map)
          onPkRef.current(full)
        }
      })

      ;['signals-dot', 'parking-dot'].forEach(id => {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
      })

      readyRef.current = true

      // Initial badge markers once ready
      addSignalBadges(map, sigRef.current)
      addParkingBadges(map, parkRef.current)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current  = null
      readyRef.current = false
      centeredRef.current = false
      sigBadgesRef.current.clear()
      parkBadgesRef.current.clear()
      arrowRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers to build label markers ────────────────────────────────────
  function addSignalBadges(map, sigs) {
    // Remove old
    sigBadgesRef.current.forEach(({ marker }) => marker.remove())
    sigBadgesRef.current.clear()
    sigs.forEach(sig => {
      const state = computeSignalState(sig)
      const { wrap, badge } = createSignalBadgeEl(state)
      const marker = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat([sig.lng, sig.lat])
        .addTo(map)
      sigBadgesRef.current.set(sig.id, { marker, badge, sig })
    })
  }

  function addParkingBadges(map, lots) {
    parkBadgesRef.current.forEach(({ marker }) => marker.remove())
    parkBadgesRef.current.clear()
    lots.forEach(lot => {
      const { wrap, badge } = createParkingBadgeEl(lot)
      const marker = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat([lot.lng, lot.lat])
        .addTo(map)
      parkBadgesRef.current.set(lot.id, { marker, badge })
    })
  }

  // ── Update signal circles + badge textContent every tick ──────────────
  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return

    // 1. Update GeoJSON source (circle colour/position)
    const src = mapRef.current.getSource('signals')
    if (src) src.setData(signalGeoJSON(signals))

    // 2. Update badge text in-place (textContent only — no DOM rebuild)
    sigBadgesRef.current.forEach(({ badge, sig }) => {
      const state = computeSignalState(sig)
      badge.textContent = `${state.secondsRemaining}s`
    })
  }, [tick, signals])

  // ── Rebuild signal badges when signals list changes ───────────────────
  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return
    addSignalBadges(mapRef.current, signals)
  }, [signals]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rebuild parking when lots change ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return
    const src = mapRef.current.getSource('parking')
    if (src) src.setData(parkingGeoJSON(parkingLots))
    addParkingBadges(mapRef.current, parkingLots)
  }, [parkingLots]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── User arrow marker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !userPos) return
    const map = mapRef.current

    if (!arrowRef.current) {
      const { wrap, svg } = createArrowEl()
      const marker = new maplibregl.Marker({ element: wrap, anchor: 'center' })
        .setLngLat([userPos.lng, userPos.lat])
        .addTo(map)
      arrowRef.current = { marker, svg }
    } else {
      arrowRef.current.marker.setLngLat([userPos.lng, userPos.lat])
    }

    if (userPos.heading != null) {
      arrowRef.current.svg.style.transform = `rotate(${userPos.heading}deg)`
    }

    if (!centeredRef.current) {
      centeredRef.current = true
      map.flyTo({
        center: [userPos.lng, userPos.lat], zoom: 16,
        pitch: 50, bearing: userPos.heading ?? 0,
        duration: 1600, essential: true,
      })
    }
  }, [userPos])

  return <div ref={containerRef} className="w-full h-full" />
}
