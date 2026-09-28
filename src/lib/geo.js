/**
 * geo.js — client-side geographic helpers.
 * No external API calls — pure math + browser Geolocation API.
 */

const EARTH_KM = 6371

/**
 * Haversine distance between two lat/lng points.
 * Returns distance in kilometres.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_KM * 2 * Math.asin(Math.sqrt(a))
}

/** Format a distance value for display. */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/**
 * Get the browser's current position as a Promise.
 * Resolves to { lat, lng } or rejects with a user-friendly message.
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        const msgs = {
          1: 'Location permission denied. Enable location access to use this feature.',
          2: 'Location unavailable. Please try again.',
          3: 'Location request timed out.',
        }
        reject(new Error(msgs[err.code] ?? 'Could not get your location.'))
      },
      { timeout: 10000, maximumAge: 60000, ...options }
    )
  })
}

/**
 * Sort an array of objects that have `lat` and `lng` fields by distance
 * from a reference point, adding a `distance_km` field to each.
 */
export function sortByDistance(items, refLat, refLng) {
  return items
    .map(item => ({
      ...item,
      distance_km: haversineKm(refLat, refLng, item.lat, item.lng),
    }))
    .sort((a, b) => a.distance_km - b.distance_km)
}
