// API per gestire voti up/down sui feedback pubblici
// Richiede autenticazione e previene voti multipli

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

    // Ottieni il token di autenticazione dall'header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Devi essere loggato per votare' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Usa getSupabase() per ottenere il client
    const supabase = getSupabase()

    // Verifica che l'utente sia autenticato
    const { data: { user } } = await getSupabase().auth.getUser(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Devi essere loggato per votare' },
        { status: 401 }
      )
    }

    console.log('User authenticated:', user.id)

    // Chiama la funzione RPC per gestire il voto
    const { data, error } = await getSupabase().rpc('vote_feedback', {
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
