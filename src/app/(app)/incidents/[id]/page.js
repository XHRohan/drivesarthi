'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Marker, Popup } from 'react-leaflet'
import { useAuth } from '@/context/AuthContext'
import {
  fetchIncidentById, resolveIncident, deleteIncident,
  typeConfig, statusConfig,
} from '@/lib/incidentHelpers'

const BaseMap = dynamic(() => import('@/components/map/BaseMap'), { ssr: false })

export default function IncidentDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const { user } = useAuth()

  const [incident, setIncident]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [resolving, setResolving] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchIncidentById(id)
      .then(setIncident)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleResolve() {
    setResolving(true)
    try {
      await resolveIncident(id)
      setIncident(prev => ({ ...prev, status: 'resolved' }))
    } catch (e) {
      setError(e.message)
    } finally {
      setResolving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteIncident(id)
      router.push('/incidents')
    } catch (e) {
      setError(e.message)
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="h-8 w-48 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      <div className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
    </div>
  )

  if (error) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/incidents" className="text-sm text-blue-600 hover:underline">← Back</Link>
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    </div>
  )

  if (!incident) return null

  const tc = typeConfig(incident.type)
  const sc = statusConfig(incident.status)
  const isOwner = user?.id === incident.user_id

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back link */}
      <Link href="/incidents" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to Reports
      </Link>

      {/* Main card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{tc.emoji}</span>
            <div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tc.colour}`}>{tc.label}</span>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.colour}`}>{sc.label}</span>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-zinc-800 dark:text-white leading-relaxed">{incident.description}</p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3">
            <p className="text-xs text-zinc-400 mb-0.5">Reported</p>
            <p className="font-medium text-zinc-800 dark:text-white">
              {new Date(incident.created_at).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          {incident.address && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3">
              <p className="text-xs text-zinc-400 mb-0.5">Location</p>
              <p className="font-medium text-zinc-800 dark:text-white">{incident.address}</p>
            </div>
          )}
          {incident.lat && incident.lng && (
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3">
              <p className="text-xs text-zinc-400 mb-0.5">Coordinates</p>
              <p className="font-medium text-zinc-800 dark:text-white font-mono text-xs">
                {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}
              </p>
            </div>
          )}
        </div>

        {/* Image */}
        {incident.image_url && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Photo</p>
            <img
              src={incident.image_url}
              alt="Incident photo"
              className="rounded-xl max-h-72 w-full object-cover border border-zinc-200 dark:border-zinc-700"
            />
          </div>
        )}

        {/* Actions (owner only) */}
        {isOwner && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {incident.status === 'open' && (
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-sm font-semibold text-white transition-colors"
              >
                {resolving ? 'Marking…' : 'Mark Resolved'}
              </button>
            )}
            {!confirmDel ? (
              <button
                onClick={() => setConfirmDel(true)}
                className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Confirm delete?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map (if coords available) */}
      {incident.lat && incident.lng && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Incident Location</p>
          <BaseMap
            center={[incident.lat, incident.lng]}
            zoom={15}
            className="h-56 w-full rounded-xl overflow-hidden shadow-sm"
          >
            <Marker position={[incident.lat, incident.lng]}>
              <Popup>
                <span className="text-sm">{tc.emoji} {tc.label}</span>
              </Popup>
            </Marker>
          </BaseMap>
        </div>
      )}
    </div>
  )
}
