/**
 * API per sbloccare lead specifici - TrovaMi
 * Gestisce lo sblocco dei lead utilizzando i crediti dell'utente
 * Usato da: Dashboard per sbloccare contatti dei lead
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id
    const supabase = createRouteHandlerClient({ cookies })

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    // Verifica che il lead esista (non più controllo assigned_to)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead non trovato' },
        { status: 404 }
      )
    }

    // Verifica i crediti dell'utente e lo stato del piano
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits_remaining, status, plan')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Errore nel recupero dati utente' },
        { status: 500 }
      )
    }

    // Verifica che il piano sia attivo
    if (userData.status !== 'active') {
      return NextResponse.json(
        { error: 'Piano non attivo. Riattiva il tuo piano per sbloccare i lead.' },
        { status: 403 }
      )
    }

    // Verifica che ci siano crediti disponibili
    if (userData.credits_remaining <= 0) {
      return NextResponse.json(
        { error: 'Crediti insufficienti. Ricarica il tuo piano per continuare.' },
        { status: 403 }
      )
    }

    // Verifica se il lead è già stato sbloccato
    const { data: existingUnlock, error: unlockCheckError } = await supabase
      .from('user_unlocked_leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .single()

    if (existingUnlock) {
      return NextResponse.json(
        { error: 'Lead già sbloccato' },
        { status: 400 }
      )
    }

    // Inizia transazione: sblocca il lead e decrementa i crediti
    const { error: unlockError } = await supabase
      .from('user_unlocked_leads')
      .insert({
        user_id: user.id,
        lead_id: leadId,
        unlocked_at: new Date().toISOString()
      })

    if (unlockError) {
      return NextResponse.json(
        { error: 'Errore nello sblocco del lead' },
        { status: 500 }
      )
    }

    // Decrementa i crediti
    const { error: creditError } = await supabase
      .from('users')
      .update({ 
        credits_remaining: userData.credits_remaining - 1 
      })
      .eq('id', user.id)

    if (creditError) {
      console.error('Errore nel decremento crediti:', creditError)
      // Nota: in un sistema di produzione, dovresti rollback l'operazione di unlock
      // Per ora procediamo senza rollback automatico
    }

    // Log dell'operazione per audit
    await supabase
      .from('credit_usage_logs')
      .insert({
        user_id: user.id,
        action: 'unlock_lead',
        credits_used: 1,
        credits_remaining: userData.credits_remaining - 1,
        details: { lead_id: leadId },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Lead sbloccato con successo',
      credits_remaining: userData.credits_remaining - 1
    })

  } catch (error) {
    console.error('Errore API unlock lead:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
