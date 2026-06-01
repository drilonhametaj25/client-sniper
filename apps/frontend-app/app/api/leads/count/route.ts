import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { leadsHasStatusColumn } from '@/lib/utils/leads-schema'

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verifica il JWT usando service role
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      )
    }

    // Conta i lead pubblicati (la quarantena a bassa confidenza resta esclusa,
    // così il totale riflette ciò che gli utenti possono davvero vedere).
    // Il filtro si applica solo se la colonna `status` esiste (robusto pre-migration).
    const admin = getSupabaseAdmin()
    let countQuery = admin
      .from('leads')
      .select('*', { count: 'exact', head: true })
    if (await leadsHasStatusColumn(admin)) {
      countQuery = countQuery.eq('status', 'published')
    }
    const { count, error } = await countQuery

    if (error) {
      console.error('Errore conteggio lead:', error)
      return NextResponse.json(
        { success: false, error: 'Errore nel conteggio dei lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: count || 0
    })

  } catch (error) {
    console.error('Errore API count leads:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
