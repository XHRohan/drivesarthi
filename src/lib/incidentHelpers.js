/**
 * incidentHelpers.js
 * ------------------
 * Config and Supabase query functions for the Incident Reporting module.
 * All DB access goes through these functions — never call supabase.from('incidents')
 * directly from page components.
 */

import { supabase } from '@/lib/supabase'
import { uploadIncidentImage } from '@/lib/storage'

// ── type config ──────────────────────────────────────────────────────────────

export const INCIDENT_TYPES = [
  { value: 'accident',     label: 'Accident',      emoji: '🚨', colour: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'       },
  { value: 'traffic_jam',  label: 'Traffic Jam',   emoji: '🚦', colour: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'road_damage',  label: 'Road Damage',   emoji: '🕳️', colour: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'other',        label: 'Other',         emoji: '⚠️', colour: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'         },
]

export const INCIDENT_STATUS = [
  { value: 'open',     label: 'Open',     colour: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'    },
  { value: 'resolved', label: 'Resolved', colour: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
]

export function typeConfig(value) {
  return INCIDENT_TYPES.find(t => t.value === value) ?? INCIDENT_TYPES[3]
}

export function statusConfig(value) {
  return INCIDENT_STATUS.find(s => s.value === value) ?? INCIDENT_STATUS[0]
}

// ── query functions ──────────────────────────────────────────────────────────

/**
 * Fetch all incidents for the current user, newest first.
 */
export async function fetchMyIncidents(userId) {
  const { data, error } = await supabase
    .from('incidents')
    .select('id, type, description, lat, lng, address, image_url, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Fetch a single incident by id (must belong to current user — enforced by RLS).
 */
export async function fetchIncidentById(id) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/**
 * Submit a new incident, optionally uploading an image first.
 *
 * @param {string} userId
 * @param {{ type, description, lat, lng, address }} fields
 * @param {File|null} imageFile
 * @returns {object} — the inserted incident row
 */
export async function createIncident(userId, fields, imageFile) {
  // 1. Insert the row first (to get the UUID for the image path)
  const { data: row, error: insertErr } = await supabase
    .from('incidents')
    .insert({ user_id: userId, ...fields })
    .select()
    .single()
  if (insertErr) throw insertErr

  // 2. Upload image if provided, then patch the row with the URL
  if (imageFile) {
    const imageUrl = await uploadIncidentImage(userId, row.id, imageFile)
    const { error: patchErr } = await supabase
      .from('incidents')
      .update({ image_url: imageUrl })
      .eq('id', row.id)
    if (patchErr) throw patchErr
    return { ...row, image_url: imageUrl }
  }

  return row
}

/**
 * Mark an incident as resolved.
 */
export async function resolveIncident(id) {
  const { error } = await supabase
    .from('incidents')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/**
 * Delete an incident (and its image via RLS cascade).
 */
export async function deleteIncident(id) {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id)
  if (error) throw error
}
