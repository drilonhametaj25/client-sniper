/**
 * API Admin per gestione richieste sostituzione lead - TrovaMi.pro
 * Permette agli admin di approvare/rifiutare richieste di sostituzione
 * Usato da: Pannello admin
 * Chiamato da: Admin dashboard per processare richieste utenti
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSupabaseAdmin } from '@/lib/api/auth'

interface ProcessRequest {
  requestId: string
  action: 'approve' | 'reject'
  adminResponse: string
}

export async function GET(request: NextRequest) {
  try {
    // Autenticazione unificata (401) + verifica ruolo admin (403)
    const auth = await requireAdmin(request)
    if (auth.errorResponse) return auth.errorResponse

    // Ottieni parametri query
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'pending'
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Query richieste con dati utente (disambigua le foreign key)
    const { data: requests, error: requestsError } = await getSupabaseAdmin()
      .from('lead_replacement_requests')
      .select(`
        *,
        user:users!lead_replacement_requests_user_id_fkey(id, email, plan),
        processed_by_user:users!lead_replacement_requests_processed_by_fkey(id, email)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (requestsError) {
      console.error('Errore caricamento richieste:', requestsError)
      return NextResponse.json(
        { error: 'Errore caricamento richieste' },
        { status: 500 }
      )
    }

    // Conta totale richieste per paginazione
    const { count, error: countError } = await getSupabaseAdmin()
      .from('lead_replacement_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)

    if (countError) {
      console.error('Errore conteggio richieste:', countError)
    }

    // Statistiche generali
    const { data: stats, error: statsError } = await getSupabaseAdmin()
      .from('lead_replacement_requests')
      .select('status')

    const statistics = stats ? {
      total: stats.length,
      pending: stats.filter(r => r.status === 'pending').length,
      approved: stats.filter(r => r.status === 'approved').length,
      rejected: stats.filter(r => r.status === 'rejected').length
    } : { total: 0, pending: 0, approved: 0, rejected: 0 }

    return NextResponse.json({
      requests: requests || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      },
      statistics
    })

  } catch (error) {
    console.error('Errore GET admin replacements:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticazione unificata (401) + verifica ruolo admin (403)
    const auth = await requireAdmin(request)
    if (auth.errorResponse) return auth.errorResponse

    const adminUserId = auth.user.id

    const body: ProcessRequest = await request.json()
    const { requestId, action, adminResponse } = body

    if (!requestId || !action || !adminResponse) {
      return NextResponse.json(
        { error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Azione non valida' },
        { status: 400 }
      )
    }

    // Ottieni dettagli richiesta
    const { data: requestData, error: requestError } = await getSupabaseAdmin()
      .from('lead_replacement_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !requestData) {
      return NextResponse.json(
        { error: 'Richiesta non trovata' },
        { status: 404 }
      )
    }

    if (requestData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Richiesta già processata' },
        { status: 409 }
      )
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Aggiorna richiesta
    const { error: updateError } = await getSupabaseAdmin()
      .from('lead_replacement_requests')
      .update({
        status: newStatus,
        admin_response: adminResponse,
        processed_by: adminUserId,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Errore aggiornamento richiesta:', updateError)
      return NextResponse.json(
        { error: 'Errore durante l\'aggiornamento' },
        { status: 500 }
      )
    }

    // Se approvata, aggiungi credito sostitutivo all'utente
    if (action === 'approve') {
      // Ottieni crediti attuali e incrementa
      const { data: currentUser, error: getUserError } = await getSupabaseAdmin()
        .from('users')
        .select('credits_remaining')
        .eq('id', requestData.user_id)
        .single()

      if (!getUserError && currentUser) {
        const { error: creditError } = await getSupabaseAdmin()
          .from('users')
          .update({
            credits_remaining: currentUser.credits_remaining + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestData.user_id)

        if (creditError) {
          console.error('Errore aggiunta credito:', creditError)
          // Non fail completamente, ma log l'errore
        }
      }

      // Segna come credito dato
      await getSupabaseAdmin()
        .from('lead_replacement_requests')
        .update({ replacement_credit_given: true })
        .eq('id', requestId)
    }

    // Log dell'operazione per audit
    await getSupabaseAdmin()
      .from('plan_status_logs')
      .insert({
        user_id: requestData.user_id,
        action: action === 'approve' ? 'replacement_approved' : 'replacement_rejected',
        reason: `Admin ${action} replacement request: ${adminResponse}`,
        triggered_by: 'admin'
      })

    return NextResponse.json({
      success: true,
      message: `Richiesta ${action === 'approve' ? 'approvata' : 'rifiutata'} con successo`,
      new_status: newStatus
    })

  } catch (error) {
    console.error('Errore POST admin replacements:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
