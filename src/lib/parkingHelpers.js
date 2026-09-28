/**
 * parkingHelpers.js
 * -----------------
 * Pure functions for the Nearby Parking module.
 * Availability figures are SYNTHETIC — no live parking API is used.
 */

import { haversineKm, formatDistance } from '@/lib/geo'

/**
 * Compute a recommendation score (0–100) for a parking lot.
 * Higher = better. Transparent formula shown in UI.
 *
 * Factors:
 *   distance   — closer is better (weight 40%)
 *   availability % — more free spots is better (weight 45%)
 *   capacity   — larger lots preferred as tiebreaker (weight 15%)
 *
 * @param {object} lot   — parking_lots row with distance_km added
 * @param {number} maxDist — max distance among all lots (for normalisation)
 * @param {number} maxCap  — max capacity among all lots
 */
export function parkingScore(lot, maxDist, maxCap) {
  const availPct  = lot.total_spots > 0 ? lot.available / lot.total_spots : 0
  const distScore = maxDist > 0 ? 1 - lot.distance_km / maxDist : 1
  const capScore  = maxCap  > 0 ? lot.total_spots / maxCap : 1

  return Math.round((distScore * 40 + availPct * 45 + capScore * 15))
}

/**
 * Enrich parking lots with distance, availability %, occupancy, and score.
 * Returns lots sorted by score descending.
 *
 * @param {object[]} lots    — raw rows from Supabase parking_lots
 * @param {number}   userLat
 * @param {number}   userLng
 */
export function enrichAndRankLots(lots, userLat, userLng) {
  if (!lots.length) return []

  const enriched = lots.map(lot => ({
    ...lot,
    distance_km:    haversineKm(userLat, userLng, lot.lat, lot.lng),
    distance_label: formatDistance(haversineKm(userLat, userLng, lot.lat, lot.lng)),
    occupied:       lot.total_spots - lot.available,
    avail_pct:      lot.total_spots > 0
      ? Math.round((lot.available / lot.total_spots) * 100)
      : 0,
  }))

  const maxDist = Math.max(...enriched.map(l => l.distance_km))
  const maxCap  = Math.max(...enriched.map(l => l.total_spots))

  return enriched
    .map(lot => ({ ...lot, score: parkingScore(lot, maxDist, maxCap) }))
    .sort((a, b) => b.score - a.score)
}

/** Availability level label + colour. */
export function availabilityBadge(pct) {
  if (pct >= 50) return { label: 'Available',  colour: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'  }
  if (pct >= 20) return { label: 'Limited',    colour: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' }
  if (pct >  0)  return { label: 'Almost Full', colour: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' }
  return             { label: 'Full',        colour: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'    }
}
