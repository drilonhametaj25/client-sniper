/**
 * API: My Feedback
 *
 * Endpoint per recuperare i feedback inviati dall'utente corrente.
 * Include sia feedback pubblici che privati, con risposte admin.
 * Supporta filtri per tipo e stato.
 *
 * Usato da: /dashboard/feedback
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireUser, getSupabaseAdmin } from '@/lib/api/auth'

export async function GET(request: NextRequest) {
  try {
    // Verifica utente
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse

    // Ottieni parametri di filtro
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || null
    const status = searchParams.get('status') || null

    // Chiama RPC per ottenere i feedback dell'utente
    const { data, error } = await getSupabaseAdmin().rpc('get_user_feedback', {
      filter_type: type,
      filter_status: status
    })

    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json(
        { error: `Errore nel recupero dei feedback: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Error in my feedback API:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
