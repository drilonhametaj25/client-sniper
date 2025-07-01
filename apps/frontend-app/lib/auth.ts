// Questo file gestisce l'autenticazione e i ruoli utente
// È parte del modulo apps/frontend-app
// Viene utilizzato da tutte le pagine che richiedono autenticazione
// ⚠️ Aggiornare se si cambiano ruoli o logiche di autorizzazione

import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

export interface AuthUser extends User {
  role?: 'admin' | 'client'
  plan?: 'free' | 'starter' | 'pro'
  credits_remaining?: number
  billing_cycle_start?: string
  credits_reset_date?: string
  total_credits_used_this_cycle?: number
  stripe_subscription_id?: string
  stripe_current_period_end?: string
  status?: 'active' | 'inactive' | 'cancelled'
  deactivated_at?: string
  deactivation_reason?: string
  reactivated_at?: string
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  loading: boolean
}

// ⚡ CACHE INTELLIGENTE E ROBUSTA per profili utente
let profileCache: { [key: string]: { profile: AuthUser, timestamp: number, hits: number } } = {}
const CACHE_DURATION = 10 * 60 * 1000 // 10 minuti di cache in-memory
const MAX_CACHE_ENTRIES = 100 // Limite cache per evitare memory leak

// Funzione per ottenere il profilo utente completo (ULTRA-OTTIMIZZATA con cache)
export async function getUserProfile(userId: string, sessionUser?: User): Promise<AuthUser | null> {
  try {
    console.log('🔍 Cercando profilo per utente:', userId)
    
    // ⚡ CONTROLLO CACHE: Se abbiamo dati recenti, usali immediatamente
    const cached = profileCache[userId]
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`⚡ Usando profilo dalla cache (ultra-veloce) - hit #${cached.hits + 1}`)
      cached.hits++
      return cached.profile
    }
    
    const startTime = Date.now()
    
    // ⚡ OTTIMIZZAZIONE: Query unica per i dati del profilo (con tutti i campi necessari)
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, plan, credits_remaining, billing_cycle_start, credits_reset_date, total_credits_used_this_cycle, stripe_subscription_id, stripe_current_period_end, status, deactivated_at, deactivation_reason, reactivated_at')
      .eq('id', userId)
      .single()
    
    const queryTime = Date.now() - startTime
    console.log(`⚡ Query profilo utente completata in ${queryTime}ms`)
    
    if (error) {
      console.error('❌ Errore query users:', error.message)
      return null
    }

    if (!data) {
      console.warn('⚠️ Utente non trovato nella tabella users:', userId)
      return null
    }

    // Verifica che i dati essenziali ci siano
    if (!data.role || !data.plan) {
      console.warn('⚠️ Dati profilo incompleti:', { role: data.role, plan: data.plan })
      return null
    }

    // ⚡ OTTIMIZZAZIONE: Usa l'utente della sessione se già fornito
    let authUser = sessionUser
    if (!authUser) {
      const { data: authData } = await supabase.auth.getUser()
      authUser = authData.user || undefined
    }
    
    if (!authUser) {
      console.error('❌ Nessun utente in sessione')
      return null
    }

    // Combina i dati della tabella users con quelli della sessione
    const completeProfile: AuthUser = {
      ...authUser,
      role: data.role as 'admin' | 'client',
      plan: data.plan as 'free' | 'starter' | 'pro',
      credits_remaining: data.credits_remaining || 0,
      billing_cycle_start: data.billing_cycle_start,
      credits_reset_date: data.credits_reset_date,
      total_credits_used_this_cycle: data.total_credits_used_this_cycle,
      stripe_subscription_id: data.stripe_subscription_id,
      stripe_current_period_end: data.stripe_current_period_end,
      status: data.status as 'active' | 'inactive' | 'cancelled' || 'active',
      deactivated_at: data.deactivated_at,
      deactivation_reason: data.deactivation_reason,
      reactivated_at: data.reactivated_at,
    }

    // ⚡ SALVA NELLA CACHE per accessi futuri ultra-veloci
    profileCache[userId] = {
      profile: completeProfile,
      timestamp: Date.now(),
      hits: 1
    }

    // ⚡ PULIZIA CACHE: Rimuovi entry vecchie se superano il limite
    const cacheKeys = Object.keys(profileCache)
    if (cacheKeys.length > MAX_CACHE_ENTRIES) {
      // Ordina per timestamp e rimuovi le più vecchie
      const sortedKeys = cacheKeys.sort((a, b) => 
        profileCache[a].timestamp - profileCache[b].timestamp
      )
      const toRemove = sortedKeys.slice(0, 10) // Rimuovi 10 entry più vecchie
      toRemove.forEach(key => delete profileCache[key])
      console.log('🧹 Cache pulita, rimossi', toRemove.length, 'profili vecchi')
    }

    console.log('✅ Profilo completo assemblato e salvato in cache:', {
      email: completeProfile.email,
      role: completeProfile.role,
      plan: completeProfile.plan,
      credits: completeProfile.credits_remaining
    })

    return completeProfile

  } catch (error) {
    console.error('❌ Errore getUserProfile:', error)
    return null
  }
}

// Funzione per invalidare la cache (da chiamare dopo aggiornamenti)
export function invalidateProfileCache(userId?: string) {
  if (userId) {
    delete profileCache[userId]
    console.log('🗑️ Cache profilo invalidata per utente:', userId)
  } else {
    profileCache = {}
    console.log('🗑️ Cache profilo completamente svuotata')
  }
}

// Funzione per registrare un nuovo utente
export async function signUp(email: string, password: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://client-sniper-frontend-app.vercel.app'
    
    console.log('🔄 Registrando utente:', email)
    console.log('🔗 Redirect URL:', `${baseUrl}/auth/callback`)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`
      }
    })

    if (error) {
      console.error('❌ Errore registrazione:', error)
      throw error
    }

    console.log('✅ Registrazione completata:', data)
    return { data, error: null }
  } catch (error) {
    console.error('❌ Errore registrazione:', error)
    return { data: null, error }
  }
}

/**
 * Funzione di registrazione personalizzata che evita email Supabase
 * Usato per: Bypassare il sistema email di Supabase
 * Chiamato da: Form di registrazione
 */

import { emailService } from '@/lib/email-service'

export async function signUpWithCustomEmail(email: string, password: string) {
  try {
    console.log('🔄 Registrazione personalizzata per:', email)

    // Step 1: Registra con Supabase MA con email confirmation disabilitata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        // Tenta di disabilitare email automatica
        data: { skip_email_confirmation: true }
      }
    })

    if (error) {
      console.error('❌ Errore registrazione Supabase:', error)
      return { success: false, error: error.message }
    }

    if (data.user) {
      console.log('✅ Utente creato in Supabase:', data.user.id)

      // Step 2: Crea record nella tabella custom
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          plan: 'free',
          credits_remaining: 2,
          created_at: new Date().toISOString()
        })

      if (dbError) {
        console.error('❌ Errore creazione record custom:', dbError)
      } else {
        console.log('✅ Record custom creato')
      }

      // Step 3: Invia la NOSTRA email personalizzata
      const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token=${data.user.id}&type=custom&email=${encodeURIComponent(email)}`
      
      const emailSent = await emailService.sendConfirmationEmail(email, confirmationUrl)
      
      if (emailSent) {
        console.log('✅ Email personalizzata inviata')
        return { 
          success: true, 
          message: 'Registrazione completata! Controlla la tua email per confermare l\'account.' 
        }
      } else {
        console.log('⚠️ Errore invio email personalizzata')
        return { 
          success: true, 
          message: 'Registrazione completata, ma errore invio email. Contatta il supporto.' 
        }
      }
    }

    return { success: false, error: 'Errore durante la registrazione' }

  } catch (error) {
    console.error('❌ Errore registrazione personalizzata:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    }
  }
}

// Funzione per il login
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Errore login:', error)
    return { data: null, error }
  }
}

// Funzione per il logout
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }

    return { error: null }
  } catch (error) {
    console.error('Errore logout:', error)
    return { error }
  }
}

// Funzione per verificare se l'utente è admin
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}

// Funzione per verificare se l'utente può accedere a una risorsa
export function canAccess(user: AuthUser | null, resource: 'admin' | 'leads' | 'dashboard'): boolean {
  if (!user) return false

  switch (resource) {
    case 'admin':
      return user.role === 'admin'
    case 'leads':
    case 'dashboard':
      return user.role === 'admin' || user.role === 'client'
    default:
      return false
  }
}

// Hook per ascoltare i cambiamenti di autenticazione
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

// Funzione per ottenere la sessione corrente
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }

    return session
  } catch (error) {
    console.error('Errore getCurrentSession:', error)
    return null
  }
}

// Funzione per aggiornare i crediti utente (solo admin)
export async function updateUserCredits(userId: string, credits: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        credits_remaining: credits,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    return !error
  } catch (error) {
    console.error('Errore aggiornamento crediti:', error)
    return false
  }
}

// Funzione per assegnare un lead a un utente (solo admin)
export async function assignLeadToUser(leadId: string, userId: string): Promise<boolean> {
  try {
    // Verifica che l'utente abbia crediti disponibili
    const { data: user } = await supabase
      .from('users')
      .select('credits_remaining')
      .eq('id', userId)
      .single()

    if (!user || user.credits_remaining <= 0) {
      throw new Error('Utente senza crediti disponibili')
    }

    // Assegna il lead e decrementa i crediti
    const { error: assignError } = await supabase
      .from('leads')
      .update({ assigned_to: userId })
      .eq('id', leadId)
      .is('assigned_to', null) // Solo se non già assegnato

    if (assignError) {
      throw assignError
    }

    // Decrementa i crediti
    const { error: creditError } = await supabase
      .from('users')
      .update({ 
        credits_remaining: user.credits_remaining - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    return !creditError
  } catch (error) {
    console.error('Errore assegnazione lead:', error)
    return false
  }
}

// Funzione per calcolare i giorni rimanenti al reset crediti
export function getDaysUntilReset(user: AuthUser): number {
  if (!user.credits_reset_date) return 0
  
  const resetDate = new Date(user.credits_reset_date)
  const today = new Date()
  const diffTime = resetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

// Funzione per formattare la data di reset
export function formatResetDate(user: AuthUser): string {
  if (!user.credits_reset_date) return 'Non disponibile'
  
  const resetDate = new Date(user.credits_reset_date)
  return resetDate.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Funzione per verificare manualmente se un utente è admin
export async function verifyAdminStatus(userEmail: string): Promise<boolean> {
  try {
    console.log('🔍 Verificando status admin per:', userEmail)
    
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', userEmail)
      .single()
    
    if (error) {
      console.error('❌ Errore verifica admin:', error.message)
      return false
    }
    
    const isAdmin = data?.role === 'admin'
    console.log('📋 Status admin verificato:', isAdmin)
    return isAdmin
  } catch (error) {
    console.error('❌ Errore critico verifica admin:', error)
    return false
  }
}

// Funzione per debug delle sessioni
export async function debugUserSession() {
  try {
    const { data: session } = await supabase.auth.getSession()
    console.log('🔍 Debug sessione corrente:')
    console.log('- Sessione presente:', !!session.session)
    console.log('- User ID:', session.session?.user?.id)
    console.log('- Email:', session.session?.user?.email)
    
    if (session.session?.user?.id) {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.session.user.id)
        .single()
      
      console.log('- DB User trovato:', !!dbUser)
      console.log('- Role in DB:', dbUser?.role)
      console.log('- Plan in DB:', dbUser?.plan)
      console.log('- Errore DB:', error?.message)
    }
  } catch (error) {
    console.error('❌ Errore debug sessione:', error)
  }
}
