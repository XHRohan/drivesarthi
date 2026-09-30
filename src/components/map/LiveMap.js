'use client'
/**
 * LiveMap.js — MapLibre GL full-screen navigation map.
 *
 * Marker strategy (simple & reliable):
 *  - Every signal and parking lot = ONE DOM Marker containing BOTH the icon and label.
 *  - No separate GeoJSON layers — eliminates all z-fighting / text-only glitches.
 *  - Countdown: only the text node of the existing span is mutated (textContent).
 *    The icon colour div's background is also just a style property update.
 *    No innerHTML swaps → zero flicker.
 *  - Map: pitch 45°, dragRotate enabled, two-finger twist on mobile.
 */

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import { computeSignalState, estimatedWaitSeconds } from '@/lib/signalHelpers'
import { formatDistance } from '@/lib/geo'

// ── OSM style ─────────────────────────────────────────────────────────────────
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

// ── Colour helpers ────────────────────────────────────────────────────────────
const PHASE_HEX  = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' }
const PHASE_DARK = { green: '#15803d', yellow: '#b45309', red: '#b91c1c' }
function parkHex(pct)  { return pct >= 50 ? '#22c55e' : pct >= 20 ? '#f59e0b' : pct > 0 ? '#f97316' : '#ef4444' }
function parkDark(pct) { return pct >= 50 ? '#15803d' : pct >= 20 ? '#92400e' : pct > 0 ? '#c2410c' : '#991b1b' }

// ── Global CSS (injected once) ────────────────────────────────────────────────
function ensureCSS() {
  if (document.getElementById('ds-map-css')) return
  const s = document.createElement('style')
  s.id = 'ds-map-css'
  s.textContent = `
    /* ── Signal marker ── */
    .ds-sig {
      display:flex;flex-direction:column;align-items:center;
      cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));
      transition:transform .12s;user-select:none;
    }
    .ds-sig:hover { transform:scale(1.15); }

    .ds-sig-light {
      width:32px;height:32px;border-radius:50%;
      border:3px solid #fff;
      display:flex;align-items:center;justify-content:center;
      position:relative;flex-shrink:0;
    }
    /* pulsing outer ring on green */
    .ds-sig-light.green::after {
      content:'';position:absolute;inset:-5px;border-radius:50%;
      border:2px solid rgba(34,197,94,.55);
      animation:ds-sigpulse 1.8s ease-out infinite;
    }
    @keyframes ds-sigpulse {
      0%   { transform:scale(1);   opacity:.8 }
      70%  { transform:scale(1.5); opacity:0  }
      100% { transform:scale(1);   opacity:0  }
    }
    .ds-sig-count {
      font:700 11px/1 system-ui,sans-serif;
      color:#fff;
    }
    .ds-sig-label {
      margin-top:3px;
      background:rgba(0,0,0,.72);color:#fff;
      font:600 9px/1.2 system-ui,sans-serif;
      padding:2px 5px;border-radius:4px;white-space:nowrap;
      pointer-events:none;
    }

    /* ── Parking marker ── */
    .ds-park {
      display:flex;flex-direction:column;align-items:center;
      cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3));
      transition:transform .12s;user-select:none;
    }
    .ds-park:hover { transform:scale(1.15); }
    .ds-park-pin {
      width:30px;height:30px;border-radius:8px;
      border:2.5px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font:900 15px/1 system-ui,sans-serif;color:#fff;
      flex-shrink:0;
    }
    .ds-park-label {
      margin-top:3px;
      background:rgba(0,0,0,.72);color:#fff;
      font:600 9px/1.2 system-ui,sans-serif;
      padding:2px 5px;border-radius:4px;white-space:nowrap;
      pointer-events:none;
    }

    /* ── User arrow ── */
    .ds-arrow-wrap { position:relative;width:52px;height:52px; }
    .ds-pulse-ring {
      position:absolute;inset:0;border-radius:50%;
      background:rgba(59,130,246,.22);
      animation:ds-userpulse 2.2s ease-out infinite;
      pointer-events:none;
    }
    @keyframes ds-userpulse {
      0%   { transform:scale(1);   opacity:.7 }
      70%  { transform:scale(1.9); opacity:0  }
      100% { transform:scale(1);   opacity:0  }
    }

    /* ── Popups ── */
    .maplibregl-popup-content {
      border-radius:14px !important;
      box-shadow:0 8px 32px rgba(0,0,0,.18) !important;
      padding:12px 14px !important;
      font-family:system-ui,sans-serif;
    }
    .maplibregl-popup-tip { border-top-color:transparent!important; }

    /* ── Controls ── */
    .ds-ctrl-btn {
      background:#fff;border:none;border-radius:8px;
      box-shadow:0 1px 4px rgba(0,0,0,.22);
      width:30px;height:30px;cursor:pointer;font-size:14px;
      display:flex;align-items:center;justify-content:center;
    }
    .ds-ctrl-btn:hover { background:#f0f0f0; }

    /* ── Rotation hint ── */
    .ds-hint {
      position:absolute;bottom:110px;left:50%;transform:translateX(-50%);
      z-index:10;background:rgba(0,0,0,.6);color:#fff;
      font:500 11px/1 system-ui,sans-serif;
      padding:6px 12px;border-radius:20px;white-space:nowrap;
      pointer-events:none;transition:opacity .8s;
    }
  `
  document.head.appendChild(s)
}

// ── Build signal marker element ───────────────────────────────────────────────
function createSignalEl(sig, state) {
  const phase = state.phase
  const bg    = PHASE_HEX[phase]  ?? '#94a3b8'
  const bd    = PHASE_DARK[phase] ?? '#52525b'

  const wrap  = document.createElement('div')
  wrap.className = 'ds-sig'

  // Traffic light circle
  const light = document.createElement('div')
  light.className = `ds-sig-light ${phase}`
  light.style.background = bg
  light.style.borderColor = '#fff'
  light.style.boxShadow = `0 0 0 2px ${bd}`

  const count = document.createElement('span')
  count.className = 'ds-sig-count'
  count.textContent = `${state.secondsRemaining}s`
  light.appendChild(count)
  wrap.appendChild(light)

  // Label below
  const label = document.createElement('div')
  label.className = 'ds-sig-label'
  // Truncate long names
  const shortName = sig.location_name.length > 18
    ? sig.location_name.slice(0, 17) + '…'
    : sig.location_name
  label.textContent = shortName
  wrap.appendChild(label)

  return { wrap, light, count }
}

// ── Build parking marker element ──────────────────────────────────────────────
function createParkingEl(lot) {
  const bg = parkHex(lot.avail_pct)
  const bd = parkDark(lot.avail_pct)

  const wrap = document.createElement('div')
  wrap.className = 'ds-park'

  const pin = document.createElement('div')
  pin.className = 'ds-park-pin'
  pin.style.background = bg
  pin.style.boxShadow = `0 0 0 2px ${bd}`
  pin.textContent = 'P'
  wrap.appendChild(pin)

  const label = document.createElement('div')
  label.className = 'ds-park-label'
  label.textContent = `${lot.avail_pct}% free`
  wrap.appendChild(label)

  return { wrap, pin, label }
}

// ── User arrow element ────────────────────────────────────────────────────────
function createArrowEl() {
  const wrap = document.createElement('div')
  wrap.className = 'ds-arrow-wrap'

  const pulse = document.createElement('div')
  pulse.className = 'ds-pulse-ring'
  wrap.appendChild(pulse)

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 52 52')
  svg.setAttribute('width', '52')
  svg.setAttribute('height', '52')
  svg.style.cssText = 'position:absolute;top:0;left:0;transition:transform .35s ease;'
  svg.innerHTML = `
    <defs>
      <filter id="ds-sh" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,.42)"/>
      </filter>
    </defs>
    <polygon points="26,3 33,18 26,15 19,18" fill="rgba(59,130,246,.45)"/>
    <circle cx="26" cy="26" r="13" fill="#3b82f6" filter="url(#ds-sh)"/>
    <circle cx="26" cy="26" r="13" fill="none" stroke="white" stroke-width="2.5"/>
    <polyline points="20,30 26,21 32,30" fill="none" stroke="white"
      stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  `
  wrap.appendChild(svg)
  return { wrap, svg }
}

// ── Popup HTML ────────────────────────────────────────────────────────────────
function signalPopupHTML(sig) {
  const st   = computeSignalState(sig)
  const wait = estimatedWaitSeconds(st)
  const c    = PHASE_HEX[st.phase] ?? '#94a3b8'
  const dist = sig.distance_km != null ? formatDistance(sig.distance_km) : null
  return `
    <div style="min-width:185px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:12px;height:12px;border-radius:50%;background:${c};flex-shrink:0;
          box-shadow:0 0 0 3px ${c}44;display:inline-block"></span>
        <span style="font-weight:700;font-size:13px;color:#18181b;line-height:1.3">
          ${sig.location_name}
        </span>
      </div>
      <div style="font-size:11px;color:#71717a;margin-bottom:6px">${sig.road_name}</div>
      <div style="font-size:12px;font-weight:600;color:#18181b;margin-bottom:3px">
        ${st.phase.charAt(0).toUpperCase()+st.phase.slice(1)} — ${st.secondsRemaining}s remaining
      </div>
      ${st.phase !== 'green'
        ? `<div style="font-size:11px;color:#6b7280;margin-bottom:3px">🟢 Green in ~${wait}s</div>`
        : `<div style="font-size:11px;color:#16a34a;margin-bottom:3px">✓ Signal is green</div>`}
      ${dist ? `<div style="font-size:11px;color:#a1a1aa">${dist} from your location</div>` : ''}
    </div>`
}

function parkingPopupHTML(lot) {
  const bc   = parkHex(lot.avail_pct)
  const dist = lot.distance_label ?? ''
  return `
    <div style="min-width:185px">
      <div style="font-weight:700;font-size:13px;color:#18181b;margin-bottom:3px">
        🅿 ${lot.name}
      </div>
      <div style="font-size:11px;color:#71717a;margin-bottom:7px">${lot.address ?? ''}</div>
      <div style="background:#f4f4f5;border-radius:5px;height:7px;margin-bottom:5px;overflow:hidden">
        <div style="width:${lot.avail_pct}%;height:100%;background:${bc};border-radius:5px;transition:width .3s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;
        color:#18181b;margin-bottom:4px">
        <span>${lot.available} / ${lot.total_spots} spaces free</span>
        <span>${lot.avail_pct}%</span>
      </div>
      <div style="font-size:11px;color:#a1a1aa;margin-bottom:3px">
        ${[dist, lot.price_per_hour > 0 ? '₹'+lot.price_per_hour+'/hr' : 'Free',
          lot.is_covered ? '🏠 Covered' : ''].filter(Boolean).join(' · ')}
      </div>
      <div style="font-size:10px;color:#f59e0b;margin-top:4px">⚠ Prototype · simulated data</div>
    </div>`
}

// ── Tilt-reset control ────────────────────────────────────────────────────────
class TiltResetControl {
  onAdd(map) {
    this._btn = document.createElement('button')
    this._btn.className = 'ds-ctrl-btn'
    this._btn.title = 'Reset north & tilt'
    this._btn.textContent = '⬆'
    this._btn.onclick = () => map.easeTo({ pitch: 45, bearing: 0, duration: 600 })
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
  const centeredRef  = useRef(false)
  const arrowRef     = useRef(null)             // { marker, svg }
  const sigMapRef    = useRef(new Map())        // id → { marker, light, count, sig }
  const parkMapRef   = useRef(new Map())        // id → { marker }

  // Stable refs so map event handlers never go stale
  const sigDataRef   = useRef(signals)
  const parkDataRef  = useRef(parkingLots)
  const onSigCb      = useRef(onSignalClick)
  const onParkCb     = useRef(onParkingClick)
  useEffect(() => { sigDataRef.current  = signals       }, [signals])
  useEffect(() => { parkDataRef.current = parkingLots   }, [parkingLots])
  useEffect(() => { onSigCb.current     = onSignalClick }, [onSignalClick])
  useEffect(() => { onParkCb.current    = onParkingClick}, [onParkingClick])

  // ── Map init (once) ────────────────────────────────────────────────────
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

    map.touchZoomRotate.enableRotation()

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }),
      'bottom-right'
    )
    map.addControl(new TiltResetControl(), 'bottom-right')

    // Rotation hint — fades after 5 s
    if (containerRef.current) {
      const hint = document.createElement('div')
      hint.className = 'ds-hint'
      hint.textContent = '🖱 Right-click drag or two-finger twist to rotate'
      containerRef.current.appendChild(hint)
      setTimeout(() => { hint.style.opacity = '0' }, 5000)
      setTimeout(() => hint.remove(), 6000)
    }

    map.on('load', () => {
      readyRef.current = true
      rebuildSignalMarkers(map, sigDataRef.current)
      rebuildParkingMarkers(map, parkDataRef.current)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current   = null
      readyRef.current = false
      centeredRef.current = false
      sigMapRef.current.forEach(({ marker }) => marker.remove())
      sigMapRef.current.clear()
      parkMapRef.current.forEach(({ marker }) => marker.remove())
      parkMapRef.current.clear()
      arrowRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build / rebuild signal markers ───────────────────────────────────
  function rebuildSignalMarkers(map, sigs) {
    sigMapRef.current.forEach(({ marker }) => marker.remove())
    sigMapRef.current.clear()

    sigs.forEach(sig => {
      const state   = computeSignalState(sig)
      const { wrap, light, count } = createSignalEl(sig, state)

      wrap.addEventListener('click', () => {
        new maplibregl.Popup({ offset: 20, maxWidth: '270px', closeButton: true })
          .setLngLat([sig.lng, sig.lat])
          .setHTML(signalPopupHTML({ ...sig, distance_km: sig.distance_km }))
          .addTo(map)
        onSigCb.current({ ...sig, distance_km: sig.distance_km })
      })

      const marker = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat([sig.lng, sig.lat])
        .addTo(map)

      sigMapRef.current.set(sig.id, { marker, light, count, sig })
    })
  }

  // ── Build / rebuild parking markers ──────────────────────────────────
  function rebuildParkingMarkers(map, lots) {
    parkMapRef.current.forEach(({ marker }) => marker.remove())
    parkMapRef.current.clear()

    lots.forEach(lot => {
      const { wrap } = createParkingEl(lot)

      wrap.addEventListener('click', () => {
        new maplibregl.Popup({ offset: 20, maxWidth: '270px', closeButton: true })
          .setLngLat([lot.lng, lot.lat])
          .setHTML(parkingPopupHTML(lot))
          .addTo(map)
        onParkCb.current(lot)
      })

      const marker = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat([lot.lng, lot.lat])
        .addTo(map)

      parkMapRef.current.set(lot.id, { marker })
    })
  }

  // ── Update signal countdowns every tick (textContent only) ────────────
  useEffect(() => {
    sigMapRef.current.forEach(({ light, count, sig }) => {
      const state = computeSignalState(sig)
      const bg    = PHASE_HEX[state.phase] ?? '#94a3b8'
      const bd    = PHASE_DARK[state.phase] ?? '#52525b'
      // Update colour
      light.style.background = bg
      light.style.boxShadow  = `0 0 0 2px ${bd}`
      // Update phase class for pulsing ring
      light.className = `ds-sig-light ${state.phase}`
      // Update countdown text — textContent only, no DOM rebuild
      count.textContent = `${state.secondsRemaining}s`
    })
  }, [tick])

  // ── Rebuild signal markers when signals data changes ──────────────────
  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return
    rebuildSignalMarkers(mapRef.current, signals)
  }, [signals]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rebuild parking markers when data changes ─────────────────────────
  useEffect(() => {
    if (!mapRef.current || !readyRef.current) return
    rebuildParkingMarkers(mapRef.current, parkingLots)
  }, [parkingLots]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── User position arrow ───────────────────────────────────────────────
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
