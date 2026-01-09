/**
 * API per gestire una singola Saved Search
 * GET: Dettaglio saved search
 * PUT: Aggiorna saved search
 * DELETE: Elimina saved search
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Alert non trovato' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Errore API saved-search GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Verifica ownership
    const { data: existing } = await supabaseAdmin
      .from('saved_searches')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Alert non trovato' }, { status: 404 })
    }

    const body = await request.json()

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }

    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.categories !== undefined) updateData.categories = body.categories
    if (body.cities !== undefined) updateData.cities = body.cities
    if (body.scoreMin !== undefined) updateData.score_min = body.scoreMin
    if (body.scoreMax !== undefined) updateData.score_max = body.scoreMax
    if (body.hasEmail !== undefined) updateData.has_email = body.hasEmail
    if (body.hasPhone !== undefined) updateData.has_phone = body.hasPhone
    if (body.filterNoSsl !== undefined) updateData.filter_no_ssl = body.filterNoSsl
    if (body.filterSlowLoading !== undefined) updateData.filter_slow_loading = body.filterSlowLoading
    if (body.filterNoAnalytics !== undefined) updateData.filter_no_analytics = body.filterNoAnalytics
    if (body.filterNoFacebookPixel !== undefined) updateData.filter_no_facebook_pixel = body.filterNoFacebookPixel
    if (body.alertEnabled !== undefined) updateData.alert_enabled = body.alertEnabled
    if (body.alertFrequency !== undefined) updateData.alert_frequency = body.alertFrequency

    const { data, error } = await supabaseAdmin
      .from('saved_searches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Errore aggiornamento saved search:', error)
      return NextResponse.json({ error: 'Errore aggiornamento alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Errore API saved-search PUT:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('saved_searches')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Errore eliminazione saved search:', error)
      return NextResponse.json({ error: 'Errore eliminazione alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Errore API saved-search DELETE:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
