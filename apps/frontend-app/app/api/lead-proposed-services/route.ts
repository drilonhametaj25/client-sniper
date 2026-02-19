/**
 * API endpoint per gestione servizi proposti ai lead - ClientSniper
 * Usato per: Permettere agli utenti PRO di proporre servizi ai lead con integrazione CRM
 * Chiamato da: Componente dettaglio lead, sezione "Aggiungi al CRM"
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth-middleware'
import { createClient } from '@supabase/supabase-js'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const { user, dbClient, error: authError } = await authenticateUser(request)
    
    if (!user || !dbClient) {
      return NextResponse.json(
        { error: authError || 'Autorizzazione mancante' },
        { status: 401 }
      )
    }

    // Verifica che l'utente abbia un piano PRO
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('plan, status')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (!isStarterOrHigher(userData.plan) || userData.status !== 'active') {
      return NextResponse.json(
        { error: 'Funzionalità disponibile solo per utenti Starter o superiore con piano attivo' },
        { status: 403 }
      )
    }

    const leadId = searchParams.get('lead_id')
    const status = searchParams.get('status')

    // Costruisci la query
    let query = getSupabaseAdmin()
      .from('lead_proposed_services')
      .select(`
        *,
        digital_services (
          id,
          name,
          description,
          price_freelance_eur,
          price_agency_eur,
          tags,
          category,
          complexity_level,
          estimated_hours,
          is_recurring,
          is_popular,
          is_high_profit
        ),
        leads (
          id,
          business_name,
          city,
          category
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Applica filtri
    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: proposedServices, error } = await query

    if (error) {
      console.error('Errore recupero servizi proposti:', error)
      return NextResponse.json(
        { error: 'Errore nel recupero dei servizi proposti' },
        { status: 500 }
      )
    }

    // Calcola statistiche
    const stats = {
      total: proposedServices?.length || 0,
      proposed: proposedServices?.filter(s => s.status === 'proposed').length || 0,
      accepted: proposedServices?.filter(s => s.status === 'accepted').length || 0,
      rejected: proposedServices?.filter(s => s.status === 'rejected').length || 0,
      in_negotiation: proposedServices?.filter(s => s.status === 'in_negotiation').length || 0,
      totalValue: proposedServices?.reduce((sum, s) => {
        const price = s.custom_price_eur || s.digital_services.price_freelance_eur
        return sum + (s.status === 'accepted' ? price : 0)
      }, 0) || 0,
      potentialValue: proposedServices?.reduce((sum, s) => {
        const price = s.custom_price_eur || s.digital_services.price_freelance_eur
        return sum + price
      }, 0) || 0
    }

    return NextResponse.json({
      success: true,
      data: {
        proposedServices: proposedServices || [],
        stats
      }
    })

  } catch (error) {
    console.error('Errore API servizi proposti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, dbClient, error: authError } = await authenticateUser(request)
    
    if (!user || !dbClient) {
      return NextResponse.json(
        { error: authError || 'Autorizzazione mancante' },
        { status: 401 }
      )
    }

    // Verifica che l'utente abbia un piano PRO
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('plan, status')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (!isStarterOrHigher(userData.plan) || userData.status !== 'active') {
      return NextResponse.json(
        { error: 'Funzionalità disponibile solo per utenti Starter o superiore con piano attivo' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      lead_id,
      service_id,
      custom_price_eur,
      notes,
      status = 'proposed'
    } = body

    // Validazione dati
    if (!lead_id || !service_id) {
      return NextResponse.json(
        { error: 'lead_id e service_id sono obbligatori' },
        { status: 400 }
      )
    }

    // Verifica che il lead sia sbloccato dall'utente
    const { data: unlockedLead, error: unlockedError } = await getSupabaseAdmin()
      .from('user_unlocked_leads')
      .select('lead_id')
      .eq('user_id', user.id)
      .eq('lead_id', lead_id)
      .single()

    if (unlockedError || !unlockedLead) {
      return NextResponse.json(
        { error: 'Il lead deve essere sbloccato per poter proporre servizi' },
        { status: 403 }
      )
    }

    // Verifica che il servizio esista
    const { data: service, error: serviceError } = await getSupabaseAdmin()
      .from('digital_services')
      .select('id, name, price_freelance_eur')
      .eq('id', service_id)
      .eq('is_active', true)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Servizio non trovato o non attivo' },
        { status: 404 }
      )
    }

    // Inserisci servizio proposto (upsert per gestire duplicati)
    const { data: proposedService, error: insertError } = await getSupabaseAdmin()
      .from('lead_proposed_services')
      .upsert({
        user_id: user.id,
        lead_id,
        service_id,
        custom_price_eur,
        notes,
        status
      })
      .select(`
        *,
        digital_services (
          id,
          name,
          description,
          price_freelance_eur,
          price_agency_eur,
          tags,
          category
        ),
        leads (
          id,
          business_name,
          city
        )
      `)
      .single()

    if (insertError) {
      console.error('Errore inserimento servizio proposto:', insertError)
      return NextResponse.json(
        { error: 'Errore nel salvataggio del servizio proposto' },
        { status: 500 }
      )
    }

    // Aggiorna o crea entry CRM per tracciare la proposta
    const proposalNote = `Proposto servizio: ${service.name} - €${custom_price_eur || service.price_freelance_eur}${notes ? `\nNote: ${notes}` : ''}`
    
    const { error: crmError } = await getSupabaseAdmin().rpc('upsert_crm_entry', {
      p_user_id: user.id,
      p_lead_id: lead_id,
      p_status: null, // Non cambiamo lo status esistente
      p_note: proposalNote,
      p_follow_up_date: null,
      p_attachments: null,
      p_append_note: true // Aggiungi alla nota esistente invece di sostituirla
    })

    if (crmError) {
      console.warn('Errore aggiornamento CRM (non bloccante):', crmError)
    }

    return NextResponse.json({
      success: true,
      data: proposedService,
      message: 'Servizio proposto con successo e aggiunto al CRM'
    })

  } catch (error) {
    console.error('Errore API POST servizi proposti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, dbClient, error: authError } = await authenticateUser(request)
    
    if (!user || !dbClient) {
      return NextResponse.json(
        { error: authError || 'Autorizzazione mancante' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID servizio proposto mancante' },
        { status: 400 }
      )
    }

    // Aggiorna servizio proposto (solo se appartiene all'utente)
    const { data: updatedService, error: updateError } = await getSupabaseAdmin()
      .from('lead_proposed_services')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        digital_services (
          id,
          name,
          description,
          price_freelance_eur,
          price_agency_eur,
          tags,
          category
        ),
        leads (
          id,
          business_name,
          city
        )
      `)
      .single()

    if (updateError) {
      console.error('Errore aggiornamento servizio proposto:', updateError)
      return NextResponse.json(
        { error: 'Errore nell\'aggiornamento del servizio proposto' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedService
    })

  } catch (error) {
    console.error('Errore API PUT servizi proposti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    const { user, dbClient, error: authError } = await authenticateUser(request)
    
    if (!user || !dbClient) {
      return NextResponse.json(
        { error: authError || 'Autorizzazione mancante' },
        { status: 401 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID servizio proposto mancante' },
        { status: 400 }
      )
    }

    // Elimina servizio proposto (solo se appartiene all'utente)
    const { error: deleteError } = await getSupabaseAdmin()
      .from('lead_proposed_services')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Errore eliminazione servizio proposto:', deleteError)
      return NextResponse.json(
        { error: 'Errore nell\'eliminazione del servizio proposto' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Servizio proposto eliminato con successo'
    })

  } catch (error) {
    console.error('Errore API DELETE servizi proposti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
