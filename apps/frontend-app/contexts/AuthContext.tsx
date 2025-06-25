'use client'

// Questo context gestisce lo stato di autenticazione globale
// È parte del modulo apps/frontend-app
// Viene utilizzato da tutte le componenti che necessitano di dati utente
// ⚠️ Aggiornare se si modificano le logiche di stato auth

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { 
  AuthUser, 
  AuthState, 
  getUserProfile, 
  onAuthStateChange, 
  getCurrentSession,
  invalidateProfileCache
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
  
  // ⚡ REF per evitare chiamate multiple per lo stesso utente
  const lastUserIdRef = useRef<string | null>(null)
  const isLoadingProfile = useRef(false)

  // ⚡ CACHE PERSISTENTE: Salva/carica profilo da localStorage per velocità su refresh
  const getCachedProfile = useCallback((userId: string): AuthUser | null => {
    try {
      const cached = localStorage.getItem(`profile_cache_${userId}`)
      if (cached) {
        const parsedCache = JSON.parse(cached)
        // Cache valida per 10 minuti
        if (Date.now() - parsedCache.timestamp < 10 * 60 * 1000) {
          console.log('💾 Profilo caricato da cache persistente')
          return parsedCache.profile
        } else {
          localStorage.removeItem(`profile_cache_${userId}`)
          console.log('🗑️ Cache scaduta, rimossa')
        }
      }
    } catch (error) {
      console.warn('⚠️ Errore lettura cache:', error)
    }
    return null
  }, [])

  const setCachedProfile = useCallback((userId: string, profile: AuthUser) => {
    try {
      localStorage.setItem(`profile_cache_${userId}`, JSON.stringify({
        profile,
        timestamp: Date.now()
      }))
      console.log('💾 Profilo salvato in cache persistente')
    } catch (error) {
      console.warn('⚠️ Errore salvataggio cache:', error)
    }
  }, [])

  // Funzione per caricare il profilo utente (ottimizzata con cache persistente)
  const loadUserProfile = useCallback(async (session: Session | null) => {
    try {
      if (session?.user) {
        // ⚡ EVITA CHIAMATE MULTIPLE PER LO STESSO UTENTE
        if (lastUserIdRef.current === session.user.id || isLoadingProfile.current) {
          console.log('⏸️ Saltando caricamento profilo (stesso utente o già in corso)', session.user.id)
          return
        }
        
        isLoadingProfile.current = true
        lastUserIdRef.current = session.user.id
        
        // ⚡ PROVA PRIMA LA CACHE PERSISTENTE
        const cachedProfile = getCachedProfile(session.user.id)
        if (cachedProfile) {
          console.log('🚀 Profilo caricato ISTANTANEAMENTE da cache persistente!')
          setUser(cachedProfile)
          setLoading(false)
          isLoadingProfile.current = false
          return
        }
        
        console.log('🔄 Cache miss, caricamento profilo da DB per utente:', session.user.id)
        
        // ⚡ ULTRA-OTTIMIZZAZIONE: Se cache miss, carica dal DB
        const profile = await getUserProfileWithRetry(session.user.id, session.user, 1) // Solo 1 retry ultra-veloce
        
        if (profile) {
          console.log('✅ Profilo caricato da DB:', profile?.plan, profile?.role)
          setUser(profile)
          // ⚡ SALVA IN CACHE PERSISTENTE per prossimi refresh
          setCachedProfile(session.user.id, profile)
        } else {
          console.warn('⚠️ Profilo non trovato, creo fallback con dati sessione')
          // Mantieni sessione attiva ma senza dati specifici
          const fallbackUser = {
            ...session.user,
            role: 'client', // Fallback default
            plan: 'free', // Fallback default
            credits_remaining: 0,
          } as AuthUser
          setUser(fallbackUser)
          // Non salvare fallback in cache
        }
      } else {
        console.log('❌ Nessuna sessione')
        lastUserIdRef.current = null
        setUser(null)
      }
    } catch (error) {
      console.error('Errore critico caricamento profilo:', error)
      
      // FALLBACK MIGLIORATO
      if (session?.user) {
        console.log('⚠️ Mantengo sessione con dati di fallback')
        setUser({
          ...session.user,
          role: 'client', // Fallback default
          plan: 'free', // Fallback default
          credits_remaining: 0,
        } as AuthUser)
      } else {
        setUser(null)
      }
    } finally {
      isLoadingProfile.current = false
      setLoading(false)
      console.log('✅ Loading completato')
    }
  }, [getCachedProfile, setCachedProfile]) // Aggiunte dipendenze cache

  // ⚡ ULTRA-OTTIMIZZATO: Funzione con retry aggressivi per velocità
  const getUserProfileWithRetry = async (userId: string, sessionUser: any, retries: number): Promise<AuthUser | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Tentativo ${i + 1}/${retries} caricamento profilo...`)
        
        // ⚡ TIMEOUT ULTRA-AGGRESSIVO: 2s per evitare attese lunghe
        const timeoutPromise = new Promise<AuthUser | null>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout caricamento profilo')), 2000) // DRASTICAMENTE ridotto a 2s
        })
        
        const profilePromise = getUserProfile(userId, sessionUser)
        const profile = await Promise.race([profilePromise, timeoutPromise])
        
        if (profile?.plan && profile?.role) {
          console.log(`✅ Profilo completo trovato al tentativo ${i + 1}`)
          return profile
        }
        
        // Se profilo incompleto, retry IMMEDIATO
        if (i < retries - 1) {
          console.log(`⏳ Profilo incompleto, retry immediato...`)
          await new Promise(resolve => setTimeout(resolve, 100)) // DRASTICAMENTE ridotto a 100ms
        }
      } catch (error) {
        console.error(`❌ Tentativo ${i + 1} fallito:`, error)
        if (i < retries - 1) {
          console.log(`⏳ Retry immediato...`)
          await new Promise(resolve => setTimeout(resolve, 100)) // DRASTICAMENTE ridotto a 100ms
        }
      }
    }
    
    console.error('❌ Tutti i retry falliti per getUserProfile')
    return null
  }

  // ⚡ ULTRA-OTTIMIZZATO: Funzione per aggiornare il profilo (con invalidazione cache)
  const refreshProfile = useCallback(async () => {
    if (session?.user && !isLoadingProfile.current) {
      isLoadingProfile.current = true
      try {
        // ⚡ INVALIDA CACHE PERSISTENTE per forzare reload fresco
        try {
          localStorage.removeItem(`profile_cache_${session.user.id}`)
          console.log('🗑️ Cache persistente invalidata per refresh profilo')
        } catch (e) {
          console.warn('⚠️ Errore invalidazione cache:', e)
        }
        
        // ⚡ INVALIDA ANCHE CACHE IN-MEMORY
        invalidateProfileCache(session.user.id)
        
        const profile = await getUserProfile(session.user.id, session.user)
        if (profile) {
          setUser(profile)
          // ⚡ AGGIORNA CACHE PERSISTENTE con nuovi dati
          setCachedProfile(session.user.id, profile)
        }
      } catch (error) {
        console.error('Errore refresh profilo:', error)
      } finally {
        isLoadingProfile.current = false
      }
    }
  }, [session?.user?.id, setCachedProfile]) // Aggiunte dipendenze

  // ⚡ ULTRA-OTTIMIZZATO: Inizializza la sessione al mount con cache istantanea
  useEffect(() => {
    let mounted = true
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 Inizializzazione Auth Context ULTRA-VELOCE...')
        
        // ⚡ CONTROLLO IMMEDIATO CACHE: Prova prima a caricare dalla cache
        const sessionPromise = getCurrentSession()
        
        // ⚡ TIMEOUT DRASTICAMENTE RIDOTTO: 3s massimo per inizializzazione
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout inizializzazione auth')), 3000) // RIDOTTO da 10s a 3s
        })
        
        const currentSession = await Promise.race([sessionPromise, timeoutPromise]) as Session | null
        
        if (mounted && currentSession?.user) {
          // ⚡ CARICAMENTO ISTANTANEO: Prova subito la cache persistente
          const cachedProfile = getCachedProfile(currentSession.user.id)
          if (cachedProfile) {
            console.log('🚀 INIZIALIZZAZIONE ISTANTANEA con cache persistente!')
            setSession(currentSession)
            setUser(cachedProfile)
            setLoading(false)
            return // Esce subito, evita il caricamento DB
          }
        }
        
        if (mounted) {
          setSession(currentSession)
          await loadUserProfile(currentSession)
        }
      } catch (error) {
        console.error('❌ Errore inizializzazione auth:', error)
        if (mounted) {
          setLoading(false)
          // ⚡ FALLBACK IMMEDIATO: In caso di timeout, imposta subito stato base per non bloccare UI
          setSession(null)
          setUser(null)
        }
      }
    }

    initializeAuth()
    
    return () => {
      mounted = false
    }
  }, [loadUserProfile, getCachedProfile])

  // ⚡ ULTRA-OTTIMIZZATO: Ascolta i cambiamenti di autenticazione con timeout aggressivo
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
      console.log('🔄 Auth state change ULTRA-VELOCE:', event)
      
      try {
        // ⚡ TIMEOUT ULTRA-AGGRESSIVO: 2s per evitare blocchi su auth state change
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout auth state change')), 2000) // RIDOTTO da 8s a 2s
        })
        
        const profilePromise = loadUserProfile(newSession)
        await Promise.race([profilePromise, timeoutPromise])
        
        setSession(newSession)
      } catch (error) {
        console.error('❌ Errore auth state change:', error)
        // ⚡ FALLBACK IMMEDIATO: imposta almeno la sessione per non bloccare
        setSession(newSession)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserProfile])

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
