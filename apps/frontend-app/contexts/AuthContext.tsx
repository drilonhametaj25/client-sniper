'use client'

// Questo context gestisce lo stato di autenticazione globale
// È parte del modulo apps/frontend-app
// Viene utilizzato da tutte le componenti che necessitano di dati utente
// ⚠️ Aggiornare se si modificano le logiche di stato auth

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { 
  AuthUser, 
  AuthState, 
  getUserProfile, 
  onAuthStateChange, 
  getCurrentSession 
} from '@/lib/auth'

const AuthContext = createContext<AuthState & {
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  refreshProfile: () => Promise<void>
}>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => ({}),
  refreshProfile: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Funzione per caricare il profilo utente
  const loadUserProfile = async (session: Session | null) => {
    try {
      if (session?.user) {
        console.log('🔄 Caricamento profilo per utente:', session.user.id)
        
        // Timeout aumentato a 10 secondi
        const profilePromise = getUserProfile(session.user.id)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile loading timeout')), 10000)
        )
        
        const profile = await Promise.race([profilePromise, timeoutPromise]) as any
        console.log('✅ Profilo caricato:', profile?.plan)
        setUser(profile)
      } else {
        console.log('❌ Nessuna sessione')
        setUser(null)
      }
    } catch (error) {
      console.error('Errore caricamento profilo:', error)
      if (session?.user) {
        console.log('🔄 Usando profilo fallback')
        // Fallback semplificato: usa dati della sessione
        const fallbackUser = {
          ...session.user,
          role: 'client' as const,
          plan: 'free' as const,
          credits_remaining: 2
        }
        setUser(fallbackUser)
      } else {
        setUser(null)
      }
    } finally {
      setLoading(false)
      console.log('✅ Loading completato')
    }
  }

  // Funzione per aggiornare il profilo
  const refreshProfile = async () => {
    if (session?.user) {
      const profile = await getUserProfile(session.user.id)
      setUser(profile)
    }
  }

  // Inizializza la sessione al mount
  useEffect(() => {
    const initializeAuth = async () => {
      const currentSession = await getCurrentSession()
      setSession(currentSession)
      await loadUserProfile(currentSession)
    }

    initializeAuth()
  }, [])

  // Ascolta i cambiamenti di autenticazione
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      setSession(session)
      await loadUserProfile(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Funzioni di autenticazione
  const signIn = async (email: string, password: string) => {
    const { signIn: authSignIn } = await import('@/lib/auth')
    return authSignIn(email, password)
  }

  const signUp = async (email: string, password: string) => {
    const { signUp: authSignUp } = await import('@/lib/auth')
    return authSignUp(email, password)
  }

  const signOut = async () => {
    const { signOut: authSignOut } = await import('@/lib/auth')
    const result = await authSignOut()
    if (!result.error) {
      setUser(null)
      setSession(null)
    }
    return result
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
