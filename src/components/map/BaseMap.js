'use client'

/**
 * BaseMap — reusable Leaflet/OpenStreetMap wrapper.
 *
 * Must be imported with next/dynamic (ssr: false) because Leaflet
 * accesses `window` at module evaluation time.
 *
 * Usage:
 *   const BaseMap = dynamic(() => import('@/components/map/BaseMap'), { ssr: false })
 *   <BaseMap center={[28.66, 77.22]} zoom={13} className="h-80 w-full rounded-xl">
 *     {children}   ← react-leaflet child components (Marker, Popup, Circle…)
 *   </BaseMap>
 *
 * Props:
 *   center      [lat, lng]   default: Delhi NCR area
 *   zoom        number       default: 13
 *   className   string       applied to the container div
 *   children    ReactNode    react-leaflet child components
 *   onMapReady  fn(map)      called with the Leaflet map instance once mounted
 */

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default marker icon paths (broken in webpack builds)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/** Inner component: fires onMapReady once the map instance is available. */
function MapReadyHandler({ onMapReady }) {
  const map = useMap()
  const fired = useRef(false)
  useEffect(() => {
    if (!fired.current && onMapReady) {
      fired.current = true
      onMapReady(map)
    }
  }, [map, onMapReady])
  return null
}

export default function BaseMap({
  center = [28.6600, 77.2200],
  zoom   = 13,
  className = 'h-80 w-full rounded-xl',
  children,
  onMapReady,
}) {
  return (
    <div className={className} style={{ zIndex: 0 }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onMapReady && <MapReadyHandler onMapReady={onMapReady} />}
        {children}
      </MapContainer>
    </div>
  )
}
