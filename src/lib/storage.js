/**
 * Supabase Storage utilities for incident image uploads.
 * Bucket: incident-images
 * Path pattern: {user_id}/{incident_id}.{ext}
 */

import { supabase } from './supabase'

const BUCKET = 'incident-images'

/**
 * Upload an incident image to Supabase Storage.
 * @param {string} userId — authenticated user's UUID
 * @param {string} incidentId — UUID of the incident record
 * @param {File} file — image File object from <input type="file">
 * @returns {Promise<string>} — public URL of the uploaded image
 */
export async function uploadIncidentImage(userId, incidentId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${incidentId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) throw new Error(`Image upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete an incident image from Supabase Storage.
 * @param {string} userId
 * @param {string} incidentId
 * @param {string} ext — file extension e.g. 'jpg'
 */
export async function deleteIncidentImage(userId, incidentId, ext) {
  const path = `${userId}/${incidentId}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Image delete failed: ${error.message}`)
}

/**
 * Get the public URL for an existing incident image.
 * @param {string} path — storage path e.g. '{userId}/{incidentId}.jpg'
 * @returns {string} public URL
 */
export function getIncidentImageUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
