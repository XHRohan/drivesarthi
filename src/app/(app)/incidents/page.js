'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Marker, Popup } from 'react-leaflet'
import { useAuth } from '@/context/AuthContext'
import {
  INCIDENT_TYPES, fetchMyIncidents, createIncident,
  typeConfig, statusConfig,
} from '@/lib/incidentHelpers'
import { getCurrentPosition } from '@/lib/geo'

const BaseMap = dynamic(() => import('@/components/map/BaseMap'), { ssr: false })

const DEFAULT_CENTER = [28.6600, 77.2200]
const MAX_IMAGE_MB = 5

// ── page ──────────────────────────────────────────────────────────────────────
export default function IncidentsPage() {
  const { user } = useAuth()
  const [view, setView]           = useState('list') // 'list' | 'report' | 'map'
  const [incidents, setIncidents] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)

  function reload() {
    if (!user) return
    setLoadingList(true)
    fetchMyIncidents(user.id)
      .then(rows => { setIncidents(rows); setListError(null) })
      .catch(e => setListError(e.message))
      .finally(() => setLoadingList(false))
  }

  useEffect(() => { reload() }, [user])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header + tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Incident Reporting</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Report accidents, jams, and road damage for your community.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'list', label: 'My Reports' },
            { key: 'map',  label: 'Map View'   },
            { key: 'report', label: '+ Report'  },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                view === t.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content panels */}
      {view === 'report' && (
        <ReportForm user={user} onSuccess={() => { setView('list'); reload() }} />
      )}
      {view === 'list' && (
        <IncidentList incidents={incidents} loading={loadingList} error={listError} />
      )}
      {view === 'map' && (
        <IncidentMap incidents={incidents} />
      )}
    </div>
  )
}

// ── ReportForm ────────────────────────────────────────────────────────────────
function ReportForm({ user, onSuccess }) {
  const [form, setForm] = useState({ type: 'accident', description: '', address: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [locating, setLocating]   = useState(false)
  const [coords, setCoords]       = useState(null)
  const [locError, setLocError]   = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const fileRef = useRef()

  function setField(key) {
    return e => setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setSubmitError(`Image must be under ${MAX_IMAGE_MB} MB.`)
      return
    }
    setSubmitError(null)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function getLocation() {
    setLocating(true)
    setLocError(null)
    try {
      const pos = await getCurrentPosition()
      setCoords(pos)
    } catch (e) {
      setLocError(e.message)
    } finally {
      setLocating(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) { setSubmitError('Description is required.'); return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createIncident(
        user.id,
        {
          type:        form.type,
          description: form.description.trim(),
          address:     form.address.trim() || null,
          lat:         coords?.lat ?? null,
          lng:         coords?.lng ?? null,
        },
        imageFile
      )
      onSuccess()
    } catch (e) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 space-y-4"
    >
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">New Incident Report</h2>

      {/* Type */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Incident Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INCIDENT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm(p => ({ ...p, type: t.value }))}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors ${
                form.type === t.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-xl">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="desc" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="desc"
          rows={3}
          required
          value={form.description}
          onChange={setField('description')}
          placeholder="Describe what you observed..."
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Location</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.address}
            onChange={setField('address')}
            placeholder="Address or landmark (optional)"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={getLocation}
            disabled={locating}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {locating ? 'Locating…' : '📍 Use GPS'}
          </button>
        </div>
        {coords && (
          <p className="text-xs text-green-600 dark:text-green-400">
            GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
        )}
        {locError && <p className="text-xs text-yellow-600 dark:text-yellow-400">{locError}</p>}
      </div>

      {/* Image */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Photo <span className="text-zinc-400">(optional, max {MAX_IMAGE_MB} MB)</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImage}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          📷 Attach Photo
        </button>
        {imagePreview && (
          <div className="mt-2 relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-24 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" />
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null) }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center leading-none"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </form>
  )
}

// ── IncidentList ──────────────────────────────────────────────────────────────
function IncidentList({ incidents, loading, error }) {
  if (loading) return (
    <div className="space-y-3">{[...Array(3)].map((_, i) => <Skel key={i} h="h-20" />)}</div>
  )
  if (error) return <ErrBox msg={error} />
  if (!incidents.length) return (
    <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-10 text-center">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No incidents reported yet.</p>
      <p className="text-xs text-zinc-400 mt-1">Click &quot;+ Report&quot; to submit your first incident.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {incidents.map(inc => {
        const tc = typeConfig(inc.type)
        const sc = statusConfig(inc.status)
        return (
          <Link
            key={inc.id}
            href={`/incidents/${inc.id}`}
            className="flex items-start gap-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:shadow-sm transition-shadow"
          >
            <span className="text-2xl shrink-0 mt-0.5">{tc.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tc.colour}`}>{tc.label}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sc.colour}`}>{sc.label}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-800 dark:text-white line-clamp-2">{inc.description}</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {inc.address && `${inc.address} · `}
                {new Date(inc.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {inc.image_url && (
              <img
                src={inc.image_url}
                alt=""
                className="w-14 h-14 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}

// ── IncidentMap ───────────────────────────────────────────────────────────────
function IncidentMap({ incidents }) {
  const withCoords = incidents.filter(i => i.lat && i.lng)
  const center = withCoords.length
    ? [withCoords[0].lat, withCoords[0].lng]
    : DEFAULT_CENTER

  return (
    <div className="space-y-3">
      {withCoords.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-4">
          No incidents with GPS coordinates yet. Use &quot;📍 Use GPS&quot; when submitting.
        </p>
      )}
      <BaseMap center={center} zoom={13} className="h-96 w-full rounded-xl overflow-hidden shadow-sm">
        {withCoords.map(inc => {
          const tc = typeConfig(inc.type)
          return (
            <Marker key={inc.id} position={[inc.lat, inc.lng]}>
              <Popup>
                <div className="text-sm space-y-1 min-w-[160px]">
                  <p className="font-semibold">{tc.emoji} {tc.label}</p>
                  <p className="text-xs text-zinc-500 line-clamp-3">{inc.description}</p>
                  <Link href={`/incidents/${inc.id}`} className="text-xs text-blue-600 hover:underline block">
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </BaseMap>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────
function Skel({ h }) { return <div className={`${h} rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse`} /> }
function ErrBox({ msg }) {
  return <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">{msg}</div>
}
