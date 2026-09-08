/**
 * API per ottenere i log dettagliati dello scraping
 * Supporta paginazione e filtri
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse
    const { admin } = auth

    // Parametri di query
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const status = searchParams.get('status') // 'success' | 'failed' | null
    const source = searchParams.get('source') // 'google_maps' | 'yelp' | null
    const from = searchParams.get('from') // ISO date string
    const to = searchParams.get('to') // ISO date string

    const offset = (page - 1) * limit

    // Costruisci query
    let query = admin
      .from('scrape_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Applica filtri
    if (status) {
      query = query.eq('status', status)
    }
    if (source) {
      query = query.eq('source', source)
    }
    if (from) {
      query = query.gte('created_at', from)
    }
    if (to) {
      query = query.lte('created_at', to)
    }

    const { data: logs, count, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Scraping logs error:', error)
    return NextResponse.json({
      error: 'Failed to fetch scraping logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
