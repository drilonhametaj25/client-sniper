// API per segnalare contenuti inappropriati nei feedback pubblici
// Richiede autenticazione e previene segnalazioni multiple

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

    // Ottieni il token di autenticazione dall'header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Devi essere loggato per segnalare contenuti' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Crea client Supabase con il token dell'utente
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verifica che l'utente sia autenticato
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Devi essere loggato per segnalare contenuti' },
        { status: 401 }
      )
    }

    // Verifica che l'utente sia autenticato
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Devi essere loggato per segnalare contenuti' },
        { status: 401 }
      )
    }

    // Chiama la funzione RPC per segnalare abuso
    const { data, error } = await supabase.rpc('report_feedback_abuse', {
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
