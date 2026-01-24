/**
 * API per gestire le zone di scraping
 * GET: lista zone
 * POST: aggiungi nuova zona (solo admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parametri di query
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const source = searchParams.get('source')
    const active = searchParams.get('active') // 'true' | 'false' | null

    const offset = (page - 1) * limit

    // Query zone
    let query = getSupabaseAdmin()
      .from('zones_to_scrape')
      .select('*', { count: 'exact' })
      .order('priority_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (source) {
      query = query.eq('source', source)
    }
    if (active !== null) {
      query = query.eq('is_active', active === 'true')
    }

    const { data: zones, count, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      zones: zones || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Zones fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch zones',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verifica che sia admin
    const { data: userData } = await getSupabaseAdmin()
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Leggi body
    const body = await request.json()
    const { source, category, location_name, priority_score } = body

    // Validazione
    if (!source || !category || !location_name) {
      return NextResponse.json({
        error: 'Missing required fields: source, category, location_name'
      }, { status: 400 })
    }

    const validSources = ['google_maps', 'yelp', 'pagine_gialle']
    if (!validSources.includes(source)) {
      return NextResponse.json({
        error: `Invalid source. Valid: ${validSources.join(', ')}`
      }, { status: 400 })
    }

    // Verifica se zona esiste gia
    const { data: existingZone } = await getSupabaseAdmin()
      .from('zones_to_scrape')
      .select('id')
      .eq('source', source)
      .eq('category', category)
      .eq('location_name', location_name)
      .single()

    if (existingZone) {
      return NextResponse.json({
        error: 'Zone already exists',
        zone_id: existingZone.id
      }, { status: 409 })
    }

    // Inserisci nuova zona
    const { data: newZone, error: insertError } = await getSupabaseAdmin()
      .from('zones_to_scrape')
      .insert({
        source,
        category,
        location_name,
        priority_score: priority_score || 100,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      success: true,
      zone: newZone
    }, { status: 201 })

  } catch (error) {
    console.error('Zone creation error:', error)
    return NextResponse.json({
      error: 'Failed to create zone',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
