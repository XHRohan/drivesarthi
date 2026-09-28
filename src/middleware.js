import { NextResponse } from 'next/server'

/**
 * Middleware — lightweight path-based guard.
 *
 * Supabase v2 stores sessions in localStorage (not cookies) by default,
 * so the middleware cannot reliably read the session server-side.
 * Client-side protection is handled by:
 *   - AuthContext  (src/context/AuthContext.js) — tracks the live session
 *   - useRequireAuth hook (src/hooks/useRequireAuth.js) — redirects on each protected page
 *
 * This middleware only handles the one case that must be server-side:
 * preventing the raw "/" route from ever staying on "/" (it redirects to /dashboard or /login
 * via the client-side page.js, but we can let that happen client-side too).
 *
 * For the prototype this is intentionally minimal.
 */
export function middleware(request) {
  // Let everything through — auth is enforced client-side via useRequireAuth
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only run on app routes, skip static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
