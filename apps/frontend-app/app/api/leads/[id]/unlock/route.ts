/**
 * API per aprire proposte lead - TrovaMi
 * Gestisce l'apertura dei dettagli lead usando il sistema PROPOSTE
 *
 * LOGICA PROPOSTE:
 * - Lead già aperto: accesso gratuito (non consuma)
 * - Prima proposta: SEMPRE gratuita per nuovi utenti
 * - Piano Agency: proposte illimitate
 * - Piano Starter: 25 proposte/mese
 * - Piano Free: 1 proposta/settimana
 *
 * TRACKING KLAVIYO:
 * - Proposal Opened: ogni apertura
 * - Proposals Low: quando proposte <= 3
 * - Proposals Depleted: quando proposte = 0
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { klaviyoServer } from '@/lib/services/klaviyo-server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      )
    }

    // Verifica che il lead esista usando il client admin
    const { data: lead, error: leadError } = await getSupabaseAdmin()
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

    // Verifica dati utente e piano usando il client admin
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('proposals_remaining, credits_remaining, first_proposal_used, status, plan')
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
        { error: 'Piano non attivo. Riattiva il tuo piano per continuare.' },
        { status: 403 }
      )
    }

    // Ottieni info piano (per verificare se illimitato)
    const { data: planData } = await getSupabaseAdmin()
      .from('plans')
      .select('is_unlimited, max_proposals')
      .eq('name', userData.plan)
      .single()

    const isUnlimited = planData?.is_unlimited || false
    const isFirstProposal = !userData.first_proposal_used

    // Verifica se il lead è già stato aperto (accesso gratuito, non consuma)
    const { data: existingUnlock } = await getSupabaseAdmin()
      .from('user_unlocked_leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .maybeSingle()

    // Se lead già aperto, restituisci i dati senza consumare proposte
    if (existingUnlock) {
      const { data: leadDetails } = await getSupabaseAdmin()
        .from('leads')
        .select('phone, email')
        .eq('id', leadId)
        .single()

      return NextResponse.json({
        success: true,
        already_opened: true,
        message: 'Lead già aperto',
        proposals_remaining: userData.proposals_remaining ?? userData.credits_remaining,
        phone: leadDetails?.phone || null,
        email: leadDetails?.email || null
      })
    }

    // Logica consumo proposte
    let consumeProposal = true
    let isFreeProposal = false

    // Piano illimitato (Agency): sempre OK, non consuma
    if (isUnlimited) {
      consumeProposal = false
      isFreeProposal = false
    }
    // Prima proposta: SEMPRE gratuita
    else if (isFirstProposal) {
      consumeProposal = false
      isFreeProposal = true
    }
    // Verifica proposte disponibili
    else {
      const proposalsRemaining = userData.proposals_remaining ?? userData.credits_remaining ?? 0
      if (proposalsRemaining <= 0) {
        return NextResponse.json(
          { error: 'Proposte esaurite. Passa a un piano superiore per continuare.' },
          { status: 403 }
        )
      }
    }

    // Inizia transazione: sblocca il lead
    const { error: unlockError } = await getSupabaseAdmin()
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
    const { error: crmError } = await getSupabaseAdmin()
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

    // Calcola nuove proposte rimanenti
    const currentProposals = userData.proposals_remaining ?? userData.credits_remaining ?? 0
    let newProposalsRemaining = currentProposals

    // Gestione proposte in base al tipo
    if (isFreeProposal) {
      // Prima proposta gratuita - marca come usata, non decrementa
      const { error: firstProposalError } = await getSupabaseAdmin()
        .from('users')
        .update({ first_proposal_used: true })
        .eq('id', user.id)

      if (firstProposalError) {
        console.error('Errore nel segnare prima proposta usata:', firstProposalError)
      }
    } else if (consumeProposal) {
      // Decrementa proposte (solo se non è illimitato e non è prima proposta)
      newProposalsRemaining = currentProposals - 1

      const { error: proposalError } = await getSupabaseAdmin()
        .from('users')
        .update({
          proposals_remaining: newProposalsRemaining,
          // Aggiorna anche credits_remaining per retrocompatibilità
          credits_remaining: newProposalsRemaining
        })
        .eq('id', user.id)

      if (proposalError) {
        console.error('Errore nel decremento proposte:', proposalError)
      }
    }
    // Se isUnlimited, non facciamo nulla (proposte illimitate)

    // Log dell'operazione per audit
    await getSupabaseAdmin()
      .from('credit_usage_logs')
      .insert({
        user_id: user.id,
        action: 'open_proposal',
        credits_used: consumeProposal ? 1 : 0,
        credits_remaining: isUnlimited ? -1 : newProposalsRemaining,
        details: {
          lead_id: leadId,
          is_free_proposal: isFreeProposal,
          is_unlimited: isUnlimited
        },
        created_at: new Date().toISOString()
      })

    // =====================================================
    // TRACKING KLAVIYO - Asincrono, non blocca la risposta
    // =====================================================

    // Recupera dati lead per tracking E per restituire i contatti
    const { data: leadDetails } = await getSupabaseAdmin()
      .from('leads')
      .select('business_name, category, city, score, phone, email')
      .eq('id', leadId)
      .single()

    // Conta totale proposte aperte dall'utente
    const { count: totalOpened } = await getSupabaseAdmin()
      .from('user_unlocked_leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Track Proposal Opened (fire and forget)
    klaviyoServer.trackLeadUnlocked(
      user.email!,
      {
        leadId,
        businessName: leadDetails?.business_name || 'N/A',
        category: leadDetails?.category || 'N/A',
        score: leadDetails?.score || 50,
        city: leadDetails?.city
      },
      {
        creditsRemaining: isUnlimited ? -1 : newProposalsRemaining,
        totalUnlocked: (totalOpened || 0) + 1,
        plan: userData.plan || 'free'
      }
    ).catch(err => console.error('Klaviyo trackProposalOpened error:', err))

    // Track Proposals Low (quando <= 3, ma > 0) - solo per piani non illimitati
    if (!isUnlimited && newProposalsRemaining > 0 && newProposalsRemaining <= 3) {
      klaviyoServer.trackCreditsLow(
        user.email!,
        newProposalsRemaining,
        userData.plan || 'free'
      ).catch(err => console.error('Klaviyo trackProposalsLow error:', err))
    }

    // Track Proposals Depleted (quando = 0) - solo per piani non illimitati
    if (!isUnlimited && newProposalsRemaining === 0) {
      klaviyoServer.trackCreditsDepleted(
        user.email!,
        userData.plan || 'free'
      ).catch(err => console.error('Klaviyo trackProposalsDepleted error:', err))
    }

    return NextResponse.json({
      success: true,
      message: isFreeProposal ? 'Prima proposta gratuita aperta!' : 'Proposta aperta con successo',
      proposals_remaining: isUnlimited ? -1 : newProposalsRemaining,
      is_free_proposal: isFreeProposal,
      is_unlimited: isUnlimited,
      // Retrocompatibilità
      credits_remaining: isUnlimited ? -1 : newProposalsRemaining,
      phone: leadDetails?.phone || null,
      email: leadDetails?.email || null
    })

  } catch (error) {
    console.error('Errore API unlock lead:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
