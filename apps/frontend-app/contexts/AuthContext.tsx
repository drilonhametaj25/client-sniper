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

  // Funzione per caricare il profilo utente (ottimizzata)
  const loadUserProfile = async (session: Session | null) => {
    try {
      if (session?.user) {
        console.log('🔄 Caricamento profilo per utente:', session.user.id)
        
        // ⚡ OTTIMIZZAZIONE: Passa l'utente della sessione per evitare chiamate duplicate
        const profile = await getUserProfileWithRetry(session.user.id, session.user, 3)
        
        if (profile) {
          console.log('✅ Profilo caricato:', profile?.plan, profile?.role)
          setUser(profile)
        } else {
          console.error('❌ Impossibile caricare profilo dopo retry')
          // Mantieni sessione attiva ma senza dati specifici
          setUser({
            ...session.user,
            role: undefined,
            plan: undefined,
            credits_remaining: undefined,
          } as AuthUser)
        }
      } else {
        console.log('❌ Nessuna sessione')
        setUser(null)
      }
    } catch (error) {
      console.error('Errore critico caricamento profilo:', error)
      
      // EVITA FALLBACK AUTOMATICO AL PIANO FREE
      if (session?.user) {
        console.log('⚠️ Mantengo sessione senza dati di piano')
        setUser({
          ...session.user,
          role: undefined,
          plan: undefined, 
          credits_remaining: undefined,
        } as AuthUser)
      } else {
        setUser(null)
      }
    } finally {
      setLoading(false)
      console.log('✅ Loading completato')
    }
  }

  // Funzione con retry per il profilo (ottimizzata)
  const getUserProfileWithRetry = async (userId: string, sessionUser: any, retries: number): Promise<AuthUser | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Tentativo ${i + 1}/${retries} caricamento profilo...`)
        
        // ⚡ OTTIMIZZAZIONE: Passa l'utente della sessione per evitare chiamate duplicate
        const profile = await getUserProfile(userId, sessionUser)
        
        if (profile?.plan && profile?.role) {
          console.log(`✅ Profilo completo trovato al tentativo ${i + 1}`)
          return profile
        }
        
        // Se profilo incompleto, riprova
        if (i < retries - 1) {
          console.log(`⏳ Profilo incompleto, retry in ${(i + 1)}s...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      } catch (error) {
        console.error(`❌ Tentativo ${i + 1} fallito:`, error)
        if (i < retries - 1) {
          console.log(`⏳ Retry in ${(i + 1)}s...`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
    }
    
    console.error('❌ Tutti i retry falliti per getUserProfile')
    return null
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
