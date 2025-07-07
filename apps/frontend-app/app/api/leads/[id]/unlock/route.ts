/**
 * API per sbloccare lead specifici - TrovaMi
 * Gestisce lo sblocco dei lead utilizzando i crediti dell'utente
 * Usato da: Dashboard per sbloccare contatti dei lead
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Client admin per operazioni che richiedono privilegi elevati
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id

    // Verifica autenticazione tramite Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verifica il token e ottieni l'utente
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      )
    }

    // Verifica che il lead esista usando il client admin
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      console.error('Lead error:', leadError)
      return NextResponse.json(
        { error: 'Lead non trovato' },
        { status: 404 }
      )
    }

    // Verifica i crediti dell'utente e lo stato del piano usando il client admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits_remaining, status, plan')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('User error:', userError)
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

    // Verifica se il lead è già stato sbloccato (controlla entrambe le tabelle)
    const { data: existingUnlock } = await supabaseAdmin
      .from('user_unlocked_leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .maybeSingle()

    const { data: existingCrmEntry } = await supabaseAdmin
      .from('crm_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .maybeSingle()

    if (existingUnlock || existingCrmEntry) {
      return NextResponse.json(
        { error: 'Lead già sbloccato' },
        { status: 400 }
      )
    }

    // Inizia transazione: sblocca il lead e decrementa i crediti
    const { error: unlockError } = await supabaseAdmin
      .from('user_unlocked_leads')
      .insert({
        user_id: user.id,
        lead_id: leadId,
        unlocked_at: new Date().toISOString()
      })

    if (unlockError) {
      console.error('Unlock error:', unlockError)
      return NextResponse.json(
        { error: 'Errore nello sblocco del lead' },
        { status: 500 }
      )
    }

    // Inserisci l'entry CRM direttamente (con ON CONFLICT per evitare duplicati)
    const { error: crmError } = await supabaseAdmin
      .from('crm_entries')
      .upsert({
        user_id: user.id,
        lead_id: leadId,
        status: 'to_contact',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, lead_id'
      })

    if (crmError) {
      console.error('CRM entry error:', crmError)
      // Non bloccare l'operazione se l'inserimento CRM fallisce
    }

    // Decrementa i crediti
    const { error: creditError } = await supabaseAdmin
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
    await supabaseAdmin
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
