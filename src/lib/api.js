/**
 * FastAPI helpers — used only for AI/ML endpoints.
 * All CRUD operations use the Supabase client directly.
 *
 * Base URL is set via NEXT_PUBLIC_FASTAPI_URL in .env.local
 * Defaults to http://localhost:8000 for local development.
 */

const BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FastAPI error ${res.status}: ${text}`)
  }
  return res.json()
}

/**
 * POST /analyze/image
 * Runs YOLO vehicle detection on an uploaded image.
 * @param {File} file — image file from an <input type="file">
 * @returns {{ cars: number, bikes: number, buses: number, trucks: number, density: number }}
 */
export async function analyzeImage(file) {
  const form = new FormData()
  form.append('image', file)
  return apiFetch('/analyze/image', { method: 'POST', body: form })
}

/**
 * GET /traffic/current
 * Returns the latest synthetic traffic observation for a road.
 * @param {string} roadId — e.g. 'RD001'
 * @returns {object} — single row matching CSV structure
 */
export async function getTrafficCurrent(roadId) {
  return apiFetch(`/traffic/current?road_id=${encodeURIComponent(roadId)}`)
}

/**
 * GET /traffic/predict
 * Returns ML-predicted congestion level and clearance time.
 * @param {string} roadId
 * @param {number} hour — 0–23
 * @param {string} weather — e.g. 'Clear', 'Light Rain'
 * @returns {{ congestion_level: string, clearance_minutes: number }}
 */
export async function predictTraffic(roadId, hour, weather) {
  const params = new URLSearchParams({ road_id: roadId, hour, weather })
  return apiFetch(`/traffic/predict?${params}`)
}

/**
 * GET /signal/timing
 * Returns recommended signal timing and driving speed.
 * @param {string} roadId
 * @param {number} densityPercent — 0–100
 * @returns {{ green_seconds: number, recommended_speed_kmh: number, wait_seconds: number }}
 */
export async function getSignalTiming(roadId, densityPercent) {
  const params = new URLSearchParams({ road_id: roadId, density: densityPercent })
  return apiFetch(`/signal/timing?${params}`)
}

/**
 * GET /analytics/summary
 * Returns aggregated traffic statistics for the Analytics page.
 * @param {string} roadId — pass 'all' for all roads
 * @param {string} dateFrom — ISO date string
 * @param {string} dateTo — ISO date string
 * @returns {object} — aggregated stats
 */
export async function getAnalyticsSummary(roadId, dateFrom, dateTo) {
  const params = new URLSearchParams({ road_id: roadId, date_from: dateFrom, date_to: dateTo })
  return apiFetch(`/analytics/summary?${params}`)
}
