import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Supabase client singleton.
 *
 * Lazily initialised so the module can be imported during Next.js static
 * analysis without throwing (credentials are only needed at runtime).
 *
 * Usage:
 *   import { getSupabase } from '@/lib/supabase'
 *   const supabase = getSupabase()
 *
 * Or via the named re-export for backwards compatibility:
 *   import { supabase } from '@/lib/supabase'   ← same as getSupabase()
 */
let _client = null

export function getSupabase() {
  if (_client) return _client

  if (!supabaseUrl || !supabaseAnonKey) {
    // In the browser, warn and return a dummy-shaped object so the app
    // doesn't crash with an unintelligible error.
    if (typeof window !== 'undefined') {
      console.error(
        '[DriveSarthi] Supabase env vars missing. ' +
        'Copy .env.local.example → .env.local and restart the dev server.'
      )
    }
    // Throw during runtime calls (not at module load time)
    throw new Error(
      'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
    )
  }

  _client = createClient(supabaseUrl, supabaseAnonKey)
  return _client
}

// Convenience proxy — behaves like the singleton but initialises lazily.
// Calling methods on `supabase` before env vars are set will throw at
// call time (not at import time), which is what we want.
export const supabase = new Proxy({}, {
  get(_target, prop) {
    return getSupabase()[prop]
  },
})
