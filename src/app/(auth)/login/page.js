'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

/**
 * Inner form — reads searchParams so must be inside <Suspense>.
 */
function LoginForm() {
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      router.replace('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">DriveSarthi</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Sign in to your account</p>
      </div>

      {/* Registration success banner */}
      {justRegistered && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          Account created! Check your email to confirm, then sign in.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
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
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-blue-600 hover:underline">
          Register
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <Suspense fallback={
        <div className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-8 animate-pulse">
          <div className="h-8 bg-zinc-100 dark:bg-zinc-700 rounded mb-6" />
          <div className="space-y-4">
            <div className="h-9 bg-zinc-100 dark:bg-zinc-700 rounded" />
            <div className="h-9 bg-zinc-100 dark:bg-zinc-700 rounded" />
            <div className="h-9 bg-zinc-100 dark:bg-zinc-700 rounded" />
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
