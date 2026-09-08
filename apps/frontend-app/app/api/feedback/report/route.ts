// API per segnalare contenuti inappropriati nei feedback pubblici
// Richiede autenticazione e previene segnalazioni multiple

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireUser, getSupabaseAdmin } from '@/lib/api/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedbackId, reason } = body

    if (!feedbackId || !reason) {
      return NextResponse.json(
        { error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    if (reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'La motivazione deve contenere almeno 10 caratteri' },
        { status: 400 }
      )
    }

    // Verifica che l'utente sia autenticato
    const auth = await requireUser(request)
    if (auth.errorResponse) {
      return NextResponse.json(
        { error: 'Devi essere loggato per segnalare contenuti' },
        { status: 401 }
      )
    }

    // Chiama la funzione RPC per segnalare abuso
    const { data, error } = await getSupabaseAdmin().rpc('report_feedback_abuse', {
      feedback_id: feedbackId,
      abuse_reason: reason.trim()
    })

    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json(
        { error: `Errore durante la segnalazione: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Impossibile processare la segnalazione' },
        { status: 400 }
      )
    }

    const result = data[0]

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
