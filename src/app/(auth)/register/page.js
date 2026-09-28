'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

const VEHICLE_TYPES = [
  { value: 'car',           label: 'Car' },
  { value: 'bike',          label: 'Bike / Scooter' },
  { value: 'auto_rickshaw', label: 'Auto Rickshaw' },
  { value: 'bus',           label: 'Bus' },
  { value: 'truck',         label: 'Truck' },
  { value: 'other',         label: 'Other' },
]

export default function RegisterPage() {
  const { signUp } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    full_name:    '',
    email:        '',
    phone:        '',
    vehicle_type: 'car',
    password:     '',
    confirm:      '',
  })
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await signUp(form.email, form.password, {
        full_name:    form.full_name,
        phone:        form.phone,
        vehicle_type: form.vehicle_type,
      })
      // Supabase may require email confirmation — redirect to login with a notice
      router.push('/login?registered=1')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4 py-10">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">DriveSarthi</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              required
              value={form.full_name}
              onChange={set('full_name')}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rahul Singh"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={set('email')}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Phone <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Vehicle type */}
          <div>
            <label htmlFor="vehicle_type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Vehicle Type
            </label>
            <select
              id="vehicle_type"
              value={form.vehicle_type}
              onChange={set('vehicle_type')}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {VEHICLE_TYPES.map(v => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={set('password')}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min 6 characters"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={form.confirm}
              onChange={set('confirm')}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
