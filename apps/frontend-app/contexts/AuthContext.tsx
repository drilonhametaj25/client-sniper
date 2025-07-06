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

  // ⚡ CACHE PERSISTENTE ULTRA-ROBUSTA: Conserva i dati per prevenire perdite
  const getCachedProfile = useCallback((userId: string): AuthUser | null => {
    try {
      const cached = localStorage.getItem(`profile_cache_${userId}`)
      if (cached) {
        const parsedCache = JSON.parse(cached)
        // Cache valida per 2 ORE (aumentata drasticamente per stabilità)
        if (Date.now() - parsedCache.timestamp < 2 * 60 * 60 * 1000) {
          return parsedCache.profile
        } else {
          // NON RIMUOVERE cache scaduta, potrebbe essere utile come backup
          // Segna come "backup" ma tienila
          parsedCache.isBackup = true
          return parsedCache.profile
        }
      }
    } catch (error) {
      console.warn('⚠️ Errore lettura cache:', error)
    }
    return null
  }, [])

  const setCachedProfile = useCallback((userId: string, profile: AuthUser) => {
    try {
      // SEMPRE salva il profilo se ha almeno l'ID e email (anche se incompleto)
      if (profile.id && profile.email) {
        const cacheData = {
          profile,
          timestamp: Date.now(),
          version: '2.0' // Versione cache per eventuali migrations
        }
        localStorage.setItem(`profile_cache_${userId}`, JSON.stringify(cacheData))
      } else {
        // Profilo troppo incompleto per cache
      }
    } catch (error) {
      // Errore salvataggio cache
    }
  }, [])

  // Funzione per caricare il profilo utente (ottimizzata con cache persistente)
  const loadUserProfile = useCallback(async (session: Session | null) => {
    try {
      if (session?.user) {
        // ⚡ EVITA CHIAMATE MULTIPLE PER LO STESSO UTENTE
        if (lastUserIdRef.current === session.user.id && isLoadingProfile.current) {
          console.log('⏸️ Saltando caricamento profilo (già in corso)', session.user.id)
          return
        }
        
        isLoadingProfile.current = true
        lastUserIdRef.current = session.user.id
        
        // ⚡ PROVA PRIMA LA CACHE PERSISTENTE
        const cachedProfile = getCachedProfile(session.user.id)
        if (cachedProfile && cachedProfile.plan && cachedProfile.role) {
          console.log('🚀 Profilo completo caricato da cache:', cachedProfile.plan)
          setUserProtected(cachedProfile)
          setLoading(false)
          isLoadingProfile.current = false
          
          // CARICA COMUNQUE DA DB in background per aggiornare cache
          setTimeout(() => {
            getUserProfileWithRetry(session.user.id, session.user, 2)
              .then(freshProfile => {
                if (freshProfile && freshProfile.plan && freshProfile.role) {
                  console.log('🔄 Profilo aggiornato in background:', freshProfile.plan)
                  setUserProtected(freshProfile)
                  setCachedProfile(session.user.id, freshProfile)
                }
              })
              .catch(err => console.warn('⚠️ Aggiornamento background fallito:', err))
          }, 1000) // Ritardo di 1s per non bloccare UI
          
          return
        }
        
        console.log('🔄 Cache miss o incompleta, caricamento profilo da DB per utente:', session.user.id)
        
        // ⚡ Caricamento da DB con retry più robusti
        const profile = await getUserProfileWithRetry(session.user.id, session.user, 3) // Aumentato a 3 retry
        
        if (profile && profile.plan && profile.role) {
          console.log('✅ Profilo completo caricato da DB:', profile.plan, profile.role)
          setUserProtected(profile)
          // ⚡ SALVA IN CACHE PERSISTENTE solo se profilo completo
          setCachedProfile(session.user.id, profile)
        } else {
          console.warn('⚠️ Profilo incompleto dal DB, cercando soluzioni alternative')
          
          // STRATEGIA 1: Usa cache esistente anche se "scaduta"
          const emergencyCache = getCachedProfile(session.user.id)
          if (emergencyCache && emergencyCache.plan && emergencyCache.role) {
            console.log('🆘 Usando cache di emergenza:', emergencyCache.plan)
            setUserProtected(emergencyCache)
          } else {
            // STRATEGIA 2: Riprova con query più semplice
            console.log('🔄 Tentando query di emergenza...')
            try {
              const emergencyData = await getUserProfile(session.user.id, session.user)
              if (emergencyData && emergencyData.plan) {
                console.log('✅ Query di emergenza riuscita:', emergencyData.plan)
                setUserProtected(emergencyData)
                setCachedProfile(session.user.id, emergencyData)
              } else {
                // STRATEGIA 3: Mantieni sessione ma senza impostare piano predefinito
                console.warn('⚠️ Profilo non recuperabile, mantenendo solo sessione')
                setUserProtected({
                  ...session.user,
                  role: 'client', // Solo questo campo è sicuro
                  // NON impostiamo plan qui per evitare sovrascrittura
                } as AuthUser)
              }
            } catch (emergencyError) {
              console.error('❌ Anche query di emergenza fallita:', emergencyError)
              // Mantieni sessione senza plan
              setUserProtected({
                ...session.user,
                role: 'client',
              } as AuthUser)
            }
          }
        }
      } else {
        console.log('❌ Nessuna sessione')
        lastUserIdRef.current = null
        setUser(null)
      }
    } catch (error) {
      console.error('Errore critico caricamento profilo:', error)
      
      // FALLBACK MIGLIORATO: Prova la cache prima di creare fallback
      if (session?.user) {
        const cachedProfile = getCachedProfile(session.user.id)
        if (cachedProfile) {
          console.log('🔄 Usando cache salvata come fallback dopo errore')
          setUserProtected(cachedProfile)
        } else {
          console.warn('⚠️ Creando profilo parziale temporaneo dopo errore (NO PLAN)')
          // NON impostiamo plan: 'free' per evitare sovrascrittura
          setUserProtected({
            ...session.user,
            role: 'client',
            // Nessun plan di default - sarà recuperato successivamente
          } as AuthUser)
        }
      } else {
        setUser(null)
      }
    } finally {
      isLoadingProfile.current = false
      setLoading(false)
      console.log('✅ Loading completato')
    }
  }, [getCachedProfile, setCachedProfile])

  // ⚡ Funzione con retry più robusti per affidabilità
  const getUserProfileWithRetry = async (userId: string, sessionUser: any, retries: number): Promise<AuthUser | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔄 Tentativo ${i + 1}/${retries} caricamento profilo...`)
        
        // ⚡ TIMEOUT PROGRESSIVO: inizia con 5s, poi aumenta
        const timeoutMs = 5000 + (i * 2000) // 5s, 7s, 9s
        const timeoutPromise = new Promise<AuthUser | null>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout caricamento profilo (${timeoutMs}ms)`)), timeoutMs)
        })
        
        const profilePromise = getUserProfile(userId, sessionUser)
        const profile = await Promise.race([profilePromise, timeoutPromise])
        
        if (profile?.plan && profile?.role && profile?.id) {
          console.log(`✅ Profilo completo trovato al tentativo ${i + 1}:`, profile.plan)
          return profile
        } else if (profile?.id && profile?.email) {
          // Profilo parziale ma valido - potrebbe essere nuovo utente
          console.warn(`⚠️ Profilo parziale ma valido al tentativo ${i + 1}:`, profile.email)
          if (i === retries - 1) {
            // Ultimo tentativo, restituiamo quello che abbiamo
            return profile
          }
        }
        
        // Se profilo completamente vuoto, retry con delay progressivo
        if (i < retries - 1) {
          const delay = 1000 * (i + 1) // Delay progressivo: 1s, 2s
          console.log(`⏳ Profilo incompleto, retry in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`❌ Tentativo ${i + 1} fallito:`, error)
        if (i < retries - 1) {
          const delay = 2000 * (i + 1) // Delay progressivo in caso di errore
          console.log(`⏳ Retry in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
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
          setUserProtected(profile)
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
        
        // ⚡ TIMEOUT RIDOTTO per inizializzazione: 5s massimo
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout inizializzazione auth')), 5000) // 5s timeout
        })
        
        const currentSession = await Promise.race([sessionPromise, timeoutPromise]) as Session | null
        
        if (mounted && currentSession?.user) {
          // ⚡ CARICAMENTO ISTANTANEO: Prova subito la cache persistente
          const cachedProfile = getCachedProfile(currentSession.user.id)
          if (cachedProfile && cachedProfile.plan && cachedProfile.role) {
            console.log('🚀 INIZIALIZZAZIONE ISTANTANEA con cache persistente!')
            setSession(currentSession)
            setUserProtected(cachedProfile)
            setLoading(false)
            
            // AGGIORNA CACHE IN BACKGROUND senza bloccare UI
            setTimeout(() => {
              loadUserProfile(currentSession).catch(err => 
                console.warn('⚠️ Aggiornamento background fallito ma cache OK:', err)
              )
            }, 2000) // 2s di ritardo
            
            return // Esce subito, UI già pronta
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

  // ⚡ FUNZIONE PROTETTIVA: Impedisce sovrascrittura accidentale del piano
  const isProfileDowngrade = useCallback((newProfile: AuthUser, currentProfile: AuthUser | null): boolean => {
    if (!currentProfile || !newProfile) return false
    
    // Se il piano corrente è migliore del nuovo piano, potrebbe essere un errore
    const planPriority = { 'free': 1, 'starter': 2, 'pro': 3 }
    const currentPriority = planPriority[currentProfile.plan as keyof typeof planPriority] || 0
    const newPriority = planPriority[newProfile.plan as keyof typeof planPriority] || 0
    
    if (currentPriority > newPriority && currentProfile.plan !== 'free') {
      console.warn('🛡️ PROTEZIONE: Possibile downgrade accidentale da', currentProfile.plan, 'a', newProfile.plan)
      return true
    }
    
    return false
  }, [])

  // ⚡ SETUSER PROTETTO: Impedisce perdite accidentali di dati
  const setUserProtected = useCallback((newUser: AuthUser | null) => {
    if (!newUser) {
      setUser(null)
      return
    }
    
    // Se il nuovo profilo sembra incompleto rispetto al corrente, usa protezioni
    if (user && isProfileDowngrade(newUser, user)) {
      console.warn('🛡️ PROTEZIONE ATTIVA: Mantenendo piano esistente')
      const protectedProfile = {
        ...newUser,
        plan: user.plan, // Mantieni piano esistente
        role: user.role, // Mantieni ruolo esistente
        credits_remaining: newUser.credits_remaining ?? user.credits_remaining
      }
      setUser(protectedProfile)
      
      // Salva il profilo protetto in cache
      setCachedProfile(newUser.id, protectedProfile)
    } else {
      setUser(newUser)
    }
  }, [user, isProfileDowngrade, setCachedProfile])

  // ⚡ MONITOR CAMBIAMENTI SOSPETTI: Logga e previene perdite impreviste
  useEffect(() => {
    if (user && user.plan) {
      // Salva lo stato corrente nel localStorage per monitoraggio
      try {
        const currentState = {
          userId: user.id,
          plan: user.plan,
          role: user.role,
          timestamp: Date.now()
        }
        localStorage.setItem('last_known_state', JSON.stringify(currentState))
      } catch (e) {
        console.warn('⚠️ Errore salvataggio stato corrente:', e)
      }
    }
  }, [user?.plan, user?.role])

  // ⚡ DETECTOR PERDITA DATI: Rileva se il piano è sparito inspiegabilmente
  useEffect(() => {
    try {
      const lastState = localStorage.getItem('last_known_state')
      if (lastState && user && !user.plan) {
        const parsed = JSON.parse(lastState)
        if (parsed.userId === user.id && parsed.plan && parsed.plan !== 'free') {
          console.error('🚨 DETECTOR: Piano perso! Era', parsed.plan, 'ora è', user.plan)
          console.error('🚨 Tentando recupero automatico...')
          
          // Tenta recupero immediato dalla cache
          const recoveryProfile = getCachedProfile(user.id)
          if (recoveryProfile && recoveryProfile.plan) {
            console.log('🔄 RECUPERO: Piano recuperato dalla cache:', recoveryProfile.plan)
            setUserProtected(recoveryProfile)
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Errore detector perdita dati:', e)
    }
  }, [user, getCachedProfile, setUserProtected])

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
