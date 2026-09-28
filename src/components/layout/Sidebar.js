'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/nav'
import NavIcon from '@/components/ui/NavIcon'

/**
 * Sidebar — left navigation panel for the authenticated app shell.
 *
 * Props:
 *   open (bool)       — mobile: whether the sidebar drawer is visible
 *   onClose (fn)      — mobile: callback to close the drawer
 *
 * On desktop (md+) the sidebar is always visible as a fixed left column.
 * On mobile it slides in as an overlay drawer controlled by `open`.
 */
export default function Sidebar({ open, onClose }) {
  const pathname = usePathname()

  function isActive(href) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const navLinks = (
    <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className={[
            'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive(item.href)
              ? 'bg-blue-600 text-white'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
          ].join(' ')}
        >
          <NavIcon
            name={item.icon}
            className={`w-5 h-5 shrink-0 ${isActive(item.href) ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'}`}
          />
          <span className="truncate">{item.label}</span>
          {item.href === '/sos' && (
            <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded-full">
              SOS
            </span>
          )}
        </Link>
      ))}
    </nav>
  )

  return (
    <>
      {/* ── Desktop sidebar ── always visible on md+ ────────────────── */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-full">
        <div className="flex items-center gap-2 px-5 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <span className="text-blue-600 font-bold text-lg tracking-tight">DriveSarthi</span>
        </div>
        {navLinks}
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center">
            Prototype · Synthetic data only
          </p>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Navigation"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <span className="text-blue-600 font-bold text-lg tracking-tight">DriveSarthi</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
            aria-label="Close menu"
          >
            <NavIcon name="close" className="w-5 h-5" />
          </button>
        </div>
        {navLinks}
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center">
            Prototype · Synthetic data only
          </p>
        </div>
      </aside>
    </>
  )
}
