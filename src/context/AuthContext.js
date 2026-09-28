'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

/**
 * Wraps the app and exposes the current Supabase session and user.
 * Place this inside the root layout so all client components can call useAuth().
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load the initial session once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Register a new user with email + password.
   * Supabase will send a confirmation email unless email confirmation is disabled.
   * @param {string} email
   * @param {string} password
   * @param {{ full_name: string, phone?: string, vehicle_type?: string }} meta
   */
  async function signUp(email, password, meta = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    })
    if (error) throw error
    return data
  }

  /**
   * Log in an existing user with email + password.
   */
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  /**
   * Log out the current user and clear the session.
   */
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access the current auth state and actions.
 * Must be called inside a component wrapped by <AuthProvider>.
 * @returns {{ user, session, loading, signUp, signIn, signOut }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
