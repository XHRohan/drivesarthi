/**
 * signalHelpers.js
 * ----------------
 * Pure functions for simulating traffic signal state from stored timing data.
 * Signals are seeded into Supabase — their timing never changes live.
 * The "current phase" is derived from wall-clock time mod the full cycle.
 *
 * IMPORTANT: These are SIMULATED signals for prototype purposes.
 * They do NOT reflect real government traffic signal states.
 */

/**
 * Calculate the current simulated phase and countdown for a signal.
 *
 * @param {object} signal — row from Supabase signals table
 *   { green_seconds, yellow_seconds, red_seconds, phase_started_at }
 * @returns {{ phase, secondsRemaining, cycleSeconds, percentElapsed }}
 */
export function computeSignalState(signal) {
  const { green_seconds, yellow_seconds, red_seconds, phase_started_at } = signal
  const cycleSeconds = green_seconds + yellow_seconds + red_seconds

  // Seconds elapsed since the stored phase start time, looped over cycle
  const startMs  = new Date(phase_started_at).getTime()
  const elapsed  = Math.floor((Date.now() - startMs) / 1000) % cycleSeconds

  let phase, secondsRemaining
  if (elapsed < green_seconds) {
    phase            = 'green'
    secondsRemaining = green_seconds - elapsed
  } else if (elapsed < green_seconds + yellow_seconds) {
    phase            = 'yellow'
    secondsRemaining = green_seconds + yellow_seconds - elapsed
  } else {
    phase            = 'red'
    secondsRemaining = cycleSeconds - elapsed
  }

  return {
    phase,
    secondsRemaining,
    cycleSeconds,
    percentElapsed: Math.round((elapsed / cycleSeconds) * 100),
    greenSeconds:  green_seconds,
    yellowSeconds: yellow_seconds,
    redSeconds:    red_seconds,
  }
}

/**
 * Estimate waiting time in seconds.
 * If currently red → remaining red time.
 * If green/yellow → full red duration (next red after current cycle).
 */
export function estimatedWaitSeconds(signalState) {
  if (signalState.phase === 'red') return signalState.secondsRemaining
  // Green or yellow: time until end of phase + full red
  return signalState.secondsRemaining + signalState.redSeconds
}

/**
 * Recommend a driving speed (km/h) to arrive at the signal on a green phase.
 *
 * @param {number} distanceKm — distance to the signal
 * @param {object} signalState — from computeSignalState()
 * @param {number} speedLimitKmh — road speed limit (default 50)
 * @returns {{ recommendedSpeed, advice }}
 */
export function recommendedSpeed(distanceKm, signalState, speedLimitKmh = 50) {
  const { phase, secondsRemaining, greenSeconds, cycleSeconds } = signalState

  if (distanceKm <= 0.05) {
    return { recommendedSpeed: null, advice: 'You are at the signal.' }
  }

  // Time to reach signal at current speed limit
  const timeAtLimitSec = (distanceKm / speedLimitKmh) * 3600

  // Find the next green window start (seconds from now)
  let nextGreenIn = 0
  if (phase === 'green') {
    nextGreenIn = 0 // already green
  } else if (phase === 'yellow') {
    nextGreenIn = secondsRemaining + signalState.redSeconds
  } else {
    // red
    nextGreenIn = secondsRemaining
  }

  // Try to arrive exactly at the start of the next green window
  const targetSec = nextGreenIn > 0 ? nextGreenIn : greenSeconds / 2
  if (targetSec <= 1) {
    return { recommendedSpeed: speedLimitKmh, advice: 'Proceed at normal speed.' }
  }

  const speedToHitGreen = Math.round((distanceKm / targetSec) * 3600)
  const clamped = Math.min(Math.max(speedToHitGreen, 15), speedLimitKmh)

  let advice
  if (phase === 'green' && timeAtLimitSec <= secondsRemaining) {
    advice = 'Maintain speed — you will hit the green.'
  } else if (clamped < speedLimitKmh) {
    advice = `Reduce to ~${clamped} km/h to arrive on green.`
  } else {
    advice = 'Proceed at normal speed.'
  }

  return { recommendedSpeed: clamped, advice }
}

/** Human-readable phase label. */
export function phaseLabel(phase) {
  return { green: 'Green', yellow: 'Yellow', red: 'Red' }[phase] ?? phase
}

/** Tailwind colour classes per phase. */
export const PHASE_COLOURS = {
  green:  { bg: 'bg-green-500',  ring: 'ring-green-300',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'  },
  yellow: { bg: 'bg-yellow-400', ring: 'ring-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  red:    { bg: 'bg-red-500',    ring: 'ring-red-300',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'    },
}
