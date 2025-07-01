/**
 * Servizio per gestire i crediti degli utenti
 * Usato per decrementare crediti per azioni come manual scan, unlock lead, etc.
 * Include logging automatico delle transazioni per audit
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client con service role per operazioni sui crediti
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface CreditTransaction {
  userId: string
  action: string
  creditsConsumed: number
  leadId?: string
  metadata?: Record<string, any>
}

/**
 * Decrementa i crediti di un utente e logga la transazione
 */
export async function decrementUserCredits({
  userId,
  action,
  creditsConsumed = 1,
  leadId,
  metadata
}: CreditTransaction): Promise<{
  success: boolean
  error?: string
  creditsRemaining?: number
}> {
  try {
    // 1. Ottieni crediti attuali dell'utente
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits_remaining')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'Utente non trovato' }
    }

    // 2. Verifica che l'utente abbia abbastanza crediti
    if (user.credits_remaining < creditsConsumed) {
      return { 
        success: false, 
        error: `Crediti insufficienti. Disponibili: ${user.credits_remaining}, richiesti: ${creditsConsumed}` 
      }
    }

    const newCreditsRemaining = user.credits_remaining - creditsConsumed

    // 3. Aggiorna crediti utente
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        credits_remaining: newCreditsRemaining,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: 'Errore aggiornamento crediti' }
    }

    // 4. Logga la transazione
    const { error: logError } = await supabaseAdmin
      .from('credit_usage_log')
      .insert({
        user_id: userId,
        action,
        lead_id: leadId || null,
        credits_consumed: creditsConsumed,
        credits_remaining: newCreditsRemaining,
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Errore logging crediti:', logError)
      // Non bloccare l'operazione se il log fallisce
    }

    return { 
      success: true, 
      creditsRemaining: newCreditsRemaining 
    }

  } catch (error) {
    console.error('Errore decrementUserCredits:', error)
    return { 
      success: false, 
      error: 'Errore interno del sistema' 
    }
  }
}

/**
 * Ottieni i crediti rimanenti di un utente
 */
export async function getUserCredits(userId: string): Promise<{
  success: boolean
  credits?: number
  error?: string
}> {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('credits_remaining')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return { success: false, error: 'Utente non trovato' }
    }

    return { 
      success: true, 
      credits: user.credits_remaining 
    }

  } catch (error) {
    console.error('Errore getUserCredits:', error)
    return { 
      success: false, 
      error: 'Errore interno del sistema' 
    }
  }
}

/**
 * Ricarica crediti per un utente (per admin o sistema di pagamento)
 */
export async function addUserCredits({
  userId,
  creditsToAdd,
  action = 'credit_recharge',
  metadata
}: {
  userId: string
  creditsToAdd: number
  action?: string
  metadata?: Record<string, any>
}): Promise<{
  success: boolean
  error?: string
  creditsRemaining?: number
}> {
  try {
    // 1. Ottieni crediti attuali
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits_remaining')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'Utente non trovato' }
    }

    const newCreditsRemaining = user.credits_remaining + creditsToAdd

    // 2. Aggiorna crediti
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        credits_remaining: newCreditsRemaining,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: 'Errore aggiornamento crediti' }
    }

    // 3. Logga la transazione (crediti negativi = aggiunta)
    const { error: logError } = await supabaseAdmin
      .from('credit_usage_log')
      .insert({
        user_id: userId,
        action,
        credits_consumed: -creditsToAdd, // Negativo per indicare aggiunta
        credits_remaining: newCreditsRemaining,
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Errore logging crediti:', logError)
    }

    return { 
      success: true, 
      creditsRemaining: newCreditsRemaining 
    }

  } catch (error) {
    console.error('Errore addUserCredits:', error)
    return { 
      success: false, 
      error: 'Errore interno del sistema' 
    }
  }
}
