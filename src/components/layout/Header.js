'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import NavIcon from '@/components/ui/NavIcon'

/**
 * Header — top bar of the authenticated app shell.
 *
 * Props:
 *   onMenuClick (fn) — called when the mobile hamburger button is pressed
 *   pageTitle (string) — optional, shown in header centre on mobile
 *
 * Shows:
 *  - Hamburger button (mobile only)
 *  - Page title
 *  - User avatar (initials) + name + sign-out dropdown
 */
export default function Header({ onMenuClick, pageTitle = 'DriveSarthi' }) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User'

  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      {/* Left — hamburger (mobile) + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
          aria-label="Open menu"
        >
          <NavIcon name="menu" className="w-5 h-5" />
        </button>
        <span className="font-semibold text-zinc-800 dark:text-white text-sm md:text-base">
          {pageTitle}
        </span>
      </div>

      {/* Right — user menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="User menu"
          aria-expanded={menuOpen}
        >
          {/* Avatar circle with initials */}
          <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center select-none">
            {initials}
          </span>
          <span className="hidden sm:block text-sm font-medium text-zinc-700 dark:text-zinc-200 max-w-[120px] truncate">
            {displayName}
          </span>
          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            {/* Click-away backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Signed in as</p>
                <p className="text-sm font-medium text-zinc-800 dark:text-white truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <NavIcon name="logout" className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
