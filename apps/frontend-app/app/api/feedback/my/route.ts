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
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    // Ottieni token di autenticazione
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Autenticazione richiesta' },
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

    // Verifica utente
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // Ottieni parametri di filtro
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || null
    const status = searchParams.get('status') || null

    // Chiama RPC per ottenere i feedback dell'utente
    const { data, error } = await supabase.rpc('get_user_feedback', {
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
