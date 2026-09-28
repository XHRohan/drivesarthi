'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

/**
 * useRequireAuth
 * Redirects to /login if the user is not authenticated.
 * Call at the top of any protected page component.
 *
 * Returns { user, loading } so the page can show a loading state
 * before the auth check completes.
 *
 * Usage:
 *   const { user, loading } = useRequireAuth()
 *   if (loading) return <LoadingSpinner />
 */
export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  return { user, loading }
}
