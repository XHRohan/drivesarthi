'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const VEHICLE_TYPES = [
  { value: 'car',           label: 'Car' },
  { value: 'bike',          label: 'Bike / Scooter' },
  { value: 'auto_rickshaw', label: 'Auto Rickshaw' },
  { value: 'bus',           label: 'Bus' },
  { value: 'truck',         label: 'Truck' },
  { value: 'other',         label: 'Other' },
]

export default function ProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '', vehicle_type: 'car' })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState(null)

  // Load existing profile from Supabase
  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, vehicle_type')
        .eq('id', user.id)
        .single()
      if (data) {
        setForm({
          full_name:    data.full_name    || user.user_metadata?.full_name || '',
          phone:        data.phone        || user.user_metadata?.phone     || '',
          vehicle_type: data.vehicle_type || 'car',
        })
      }
      setLoading(false)
    }
    load()
  }, [user])

  function set(field) {
    return e => {
      setSaved(false)
      setForm(prev => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...form, updated_at: new Date().toISOString() })
      if (upsertErr) throw upsertErr
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = (form.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">My Profile</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your account information
        </p>
      </div>

      {/* Avatar card */}
      <div className="flex items-center gap-4 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-xl font-bold flex items-center justify-center select-none shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-zinc-800 dark:text-white truncate">
            {form.full_name || 'No name set'}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{user?.email}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Member since {user ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSave}
        className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-4"
      >
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Edit Details</h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={set('full_name')}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rahul Singh"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label htmlFor="vehicle_type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Vehicle Type
              </label>
              <select
                id="vehicle_type"
                value={form.vehicle_type}
                onChange={set('vehicle_type')}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VEHICLE_TYPES.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {saved  && <p className="text-sm text-green-600 dark:text-green-400">Profile saved.</p>}

        <button
          type="submit"
          disabled={saving || loading}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Read-only account info */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Account</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Email</span>
          <span className="text-zinc-800 dark:text-white font-medium">{user?.email}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">User ID</span>
          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-xs truncate max-w-[180px]">{user?.id}</span>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-1">
          To change your email or password, use Supabase Auth settings.
        </p>
      </div>
    </div>
  )
}
