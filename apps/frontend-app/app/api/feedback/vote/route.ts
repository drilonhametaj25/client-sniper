// API per gestire voti up/down sui feedback pubblici
// Richiede autenticazione e previene voti multipli

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireUser, getSupabaseAdmin } from '@/lib/api/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedbackId, voteType } = body

    console.log('Vote request:', { feedbackId, voteType })

    if (!feedbackId || !voteType) {
      return NextResponse.json(
        { error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    if (!['up', 'down'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Tipo di voto non valido' },
        { status: 400 }
      )
    }

    // Verifica che l'utente sia autenticato
    const auth = await requireUser(request)
    if (auth.errorResponse) {
      return NextResponse.json(
        { error: 'Devi essere loggato per votare' },
        { status: 401 }
      )
    }

    const { user } = auth

    console.log('User authenticated:', user.id)

    // Chiama la funzione RPC per gestire il voto
    const { data, error } = await getSupabaseAdmin().rpc('vote_feedback', {
      p_feedback_id: feedbackId,
      p_vote_type: voteType
    })

    console.log('RPC response:', { data, error })

    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json(
        { error: `Errore durante il voto: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Impossibile processare il voto' },
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
      message: result.message,
      upvotes: result.new_upvotes,
      downvotes: result.new_downvotes
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
