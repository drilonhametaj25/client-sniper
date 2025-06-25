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
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  loading: boolean
}

// Funzione per ottenere il profilo utente completo
export async function getUserProfile(userId: string): Promise<AuthUser | null> {
  try {
    // Query semplice e veloce
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, plan, credits_remaining')
      .eq('id', userId)
      .limit(1)
      .maybeSingle() // Non fallisce se non trova nulla

    if (error) {
      console.error('Errore query users:', error)
      return null
    }

    if (!data) {
      // Se non troviamo l'utente nella tabella, usiamo i dati dalla sessione
      const { data: authData } = await supabase.auth.getUser()
      if (authData.user) {
        return {
          ...authData.user,
          role: 'client',
          plan: 'free',
          credits_remaining: 2,
        } as AuthUser
      }
      return null
    }

    // Combina i dati dalla tabella users con quelli dalla sessione
    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      return {
        ...authData.user,
        role: data.role || 'client',
        plan: data.plan || 'free',
        credits_remaining: data.credits_remaining || 2,
      } as AuthUser
    }

    return null
  } catch (error) {
    console.error('Errore getUserProfile:', error)
    return null
  }
}

// Funzione per registrare un nuovo utente
export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Errore registrazione:', error)
    return { data: null, error }
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
