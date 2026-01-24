/**
 * API endpoint per gestione webhooks
 * GET: Lista webhooks
 * POST: Crea nuovo webhook
 * PUT: Aggiorna webhook
 * DELETE: Elimina webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const AVAILABLE_EVENTS = [
  'lead.unlocked',
  'crm.status_changed',
  'crm.follow_up_due',
  'report.generated',
  'email.sent',
  'email.opened',
]

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verifica piano
    const { data: profile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (!profile || !['pro', 'agency'].includes(profile.plan)) {
      return NextResponse.json(
        { error: 'Webhooks require Pro or Agency plan' },
        { status: 403 }
      )
    }

    // Ottieni webhooks
    const { data: webhooks, error: queryError } = await supabase
      .from('webhooks')
      .select(`
        id,
        name,
        url,
        events,
        is_active,
        last_triggered_at,
        success_count,
        failure_count,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      return NextResponse.json({ error: 'Error fetching webhooks' }, { status: 500 })
    }

    return NextResponse.json({
      webhooks: webhooks || [],
      availableEvents: AVAILABLE_EVENTS,
    })
  } catch (error) {
    console.error('Error in webhooks GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verifica piano
    const { data: profile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (!profile || !['pro', 'agency'].includes(profile.plan)) {
      return NextResponse.json(
        { error: 'Webhooks require Pro or Agency plan' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, url, events } = body

    if (!name || !url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, events' },
        { status: 400 }
      )
    }

    // Valida URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Valida events
    const invalidEvents = events.filter(e => !AVAILABLE_EVENTS.includes(e))
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      )
    }

    // Verifica limite webhooks (max 5)
    const { count } = await supabase
      .from('webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count && count >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 webhooks allowed' },
        { status: 400 }
      )
    }

    // Genera secret per signature
    const secret = crypto.randomBytes(32).toString('hex')

    // Crea webhook
    const { data: webhook, error: insertError } = await supabase
      .from('webhooks')
      .insert({
        user_id: user.id,
        name: name.trim(),
        url,
        events,
        secret,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating webhook:', insertError)
      return NextResponse.json({ error: 'Error creating webhook' }, { status: 500 })
    }

    // Restituisci il secret solo questa volta
    return NextResponse.json({
      webhook: {
        ...webhook,
        secret, // Mostrato solo alla creazione
      },
      message: 'Save this webhook secret now. You will not be able to see it again.',
    })
  } catch (error) {
    console.error('Error in webhooks POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { webhookId, name, url, events, is_active } = body

    if (!webhookId) {
      return NextResponse.json({ error: 'Missing webhookId' }, { status: 400 })
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (name) updates.name = name.trim()
    if (url) {
      try {
        new URL(url)
        updates.url = url
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
      }
    }
    if (events && Array.isArray(events)) {
      const invalidEvents = events.filter(e => !AVAILABLE_EVENTS.includes(e))
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid events: ${invalidEvents.join(', ')}` },
          { status: 400 }
        )
      }
      updates.events = events
    }
    if (is_active !== undefined) updates.is_active = is_active

    const { data: webhook, error: updateError } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Error updating webhook' }, { status: 500 })
    }

    return NextResponse.json({ success: true, webhook })
  } catch (error) {
    console.error('Error in webhooks PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('webhookId')

    if (!webhookId) {
      return NextResponse.json({ error: 'Missing webhookId' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Error deleting webhook' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in webhooks DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
