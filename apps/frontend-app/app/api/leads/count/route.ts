import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { leadsHasStatusColumn } from '@/lib/utils/leads-schema'

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione (helper unificato: Bearer token o sessione cookie)
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse
    const { admin } = auth

    // Conta i lead pubblicati (la quarantena a bassa confidenza resta esclusa,
    // così il totale riflette ciò che gli utenti possono davvero vedere).
    // Il filtro si applica solo se la colonna `status` esiste (robusto pre-migration).
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
