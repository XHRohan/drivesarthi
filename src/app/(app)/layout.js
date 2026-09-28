'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { NAV_ITEMS } from '@/lib/nav'
import { useRequireAuth } from '@/hooks/useRequireAuth'

/**
 * App shell layout — wraps all authenticated routes under (app)/.
 * useRequireAuth redirects to /login if no session exists (client-side).
 * Middleware is intentionally minimal — Supabase v2 uses localStorage,
 * not cookies, so session checking must happen client-side.
 */
export default function AppLayout({ children }) {
  const { user, loading } = useRequireAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const pageTitle =
    NAV_ITEMS.find(item => pathname === item.href || pathname.startsWith(item.href + '/'))?.label
    ?? 'DriveSarthi'

  // Show a minimal spinner while the session is being resolved
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  // useRequireAuth will redirect if !user, but avoid rendering the shell briefly
  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          pageTitle={pageTitle}
        />
        <main className="flex-1 overflow-hidden relative">
          {/* Dashboard gets full-bleed map; all other pages get normal scroll + padding */}
          {pathname === '/dashboard' ? (
            children
          ) : (
            <div className="h-full overflow-y-auto p-4 md:p-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
