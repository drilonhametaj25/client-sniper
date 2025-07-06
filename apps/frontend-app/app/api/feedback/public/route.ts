// API per ottenere feedback pubblici con filtri e ordinamento
// Accessibile sia da utenti registrati che anonimi
// Include sistema di paginazione e filtri per tipo

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Max 50 per page
    const type = searchParams.get('type') // bug, suggestion, contact, other
    const sortBy = searchParams.get('sort') || 'created_at' // created_at, upvotes, controversial
    
    const offset = (page - 1) * limit

    // Crea client Supabase con potenziale autenticazione dell'utente
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    console.log('Getting public feedback:', { page, limit, type, sortBy })

    // Chiama la funzione RPC per ottenere feedback pubblici
    const { data, error } = await supabase.rpc('get_public_feedback', {
      page_limit: limit,
      page_offset: offset,
      filter_type: type,
      sort_by: sortBy
    })

    console.log('RPC response:', { data, error })

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
      pagination: {
        page,
        limit,
        hasMore: data && data.length === limit
      },
      filters: {
        type,
        sortBy
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
