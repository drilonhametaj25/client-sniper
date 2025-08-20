/**
 * API per richieste di sostituzione lead - TrovaMi.pro
 * Permette agli utenti di segnalare lead non validi e richiedere sostituzioni
 * Usato da: Dashboard, lead details page
 * Chiamato da: Frontend quando utente segnala lead problematico
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ReplacementRequest {
  leadId: string
  reason: string
  leadDetails: {
    business_name: string
    website_url?: string
    phone?: string
    city: string
    category: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verifica autenticazione
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const body: ReplacementRequest = await request.json()
    const { leadId, reason, leadDetails } = body

    if (!leadId || !reason || !leadDetails) {
      return NextResponse.json(
        { error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Verifica che l'utente abbia un piano attivo
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('plan, status, current_plan_monthly_replacements')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (userData.status !== 'active') {
      return NextResponse.json(
        { error: 'Piano non attivo' },
        { status: 403 }
      )
    }

    if (userData.plan === 'free') {
      return NextResponse.json(
        { error: 'Le sostituzioni non sono disponibili nel piano gratuito' },
        { status: 403 }
      )
    }

    // Verifica che non abbia già richiesto sostituzione per questo lead
    const { data: existingRequest } = await supabaseAdmin
      .from('lead_replacement_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('lead_id', leadId)
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Hai già richiesto una sostituzione per questo lead' },
        { status: 409 }
      )
    }

    // Ottieni informazioni sostituzioni mensili
    const { data: replacementInfo, error: replacementError } = await supabaseAdmin
      .rpc('get_user_replacement_info', { p_user_id: userId })

    if (replacementError) {
      console.error('Errore ottenimento info sostituzioni:', replacementError)
      return NextResponse.json(
        { error: 'Errore sistema sostituzioni' },
        { status: 500 }
      )
    }

    const replacementData = replacementInfo[0]
    
    if (replacementData.replacements_remaining <= 0) {
      return NextResponse.json(
        { 
          error: 'Hai raggiunto il limite di sostituzioni per questo mese',
          replacements_used: replacementData.replacements_used,
          replacements_limit: replacementData.replacements_limit
        },
        { status: 429 }
      )
    }

    // Crea richiesta di sostituzione
    const { data: requestData, error: insertError } = await supabaseAdmin
      .from('lead_replacement_requests')
      .insert({
        user_id: userId,
        lead_id: leadId,
        lead_details: leadDetails,
        reason,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Errore creazione richiesta:', insertError)
      return NextResponse.json(
        { error: 'Errore durante la creazione della richiesta' },
        { status: 500 }
      )
    }

    // Usa un credito di sostituzione
    const { data: useReplacementResult, error: useError } = await supabaseAdmin
      .rpc('use_replacement_credit', { p_user_id: userId })

    if (useError || !useReplacementResult) {
      // Rollback: elimina la richiesta creata
      await supabaseAdmin
        .from('lead_replacement_requests')
        .delete()
        .eq('id', requestData.id)

      return NextResponse.json(
        { error: 'Impossibile utilizzare credito di sostituzione' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Richiesta di sostituzione inviata con successo',
      request_id: requestData.id,
      replacements_remaining: replacementData.replacements_remaining - 1
    })

  } catch (error) {
    console.error('Errore API sostituzione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verifica autenticazione
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Ottieni info sostituzioni mensili
    const { data: replacementInfo, error: infoError } = await supabaseAdmin
      .rpc('get_user_replacement_info', { p_user_id: userId })

    if (infoError) {
      console.error('Errore ottenimento info:', infoError)
      return NextResponse.json(
        { error: 'Errore sistema sostituzioni' },
        { status: 500 }
      )
    }

    // Ottieni storico richieste
    const { data: requests, error: requestsError } = await supabase
      .from('lead_replacement_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (requestsError) {
      console.error('Errore ottenimento richieste:', requestsError)
      return NextResponse.json(
        { error: 'Errore caricamento storico' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      replacement_info: replacementInfo[0] || {
        replacements_used: 0,
        replacements_limit: 0,
        replacements_remaining: 0
      },
      recent_requests: requests || []
    })

  } catch (error) {
    console.error('Errore GET sostituzione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
