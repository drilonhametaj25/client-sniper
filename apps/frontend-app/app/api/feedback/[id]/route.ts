// API per ottenere dettagli di un singolo feedback pubblico
// Include risposta admin se presente e voto dell'utente corrente

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feedbackId = params.id

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'ID feedback mancante' },
        { status: 400 }
      )
    }

    // Crea client Supabase
    const supabase = getSupabase()


    // Chiama la funzione RPC per ottenere dettagli feedback
    const { data, error } = await supabase.rpc('get_feedback_details', {
      p_feedback_id: feedbackId
    })


    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json(
        { error: `Errore nel recupero del feedback: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Feedback non trovato o non pubblico' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data[0]
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
