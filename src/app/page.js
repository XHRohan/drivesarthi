'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

/**
 * Root landing page — redirects immediately based on auth state.
 * Authenticated  → /dashboard
 * Unauthenticated → /login
 *
 * While the auth state is loading a minimal spinner is shown.
 */
export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : '/login')
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading DriveSarthi…</p>
    </div>
  )
}
