/**
 * API endpoint per gestione API keys
 * GET: Lista API keys
 * POST: Crea nuova API key
 * DELETE: Revoca API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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
        { error: 'API access requires Pro or Agency plan' },
        { status: 403 }
      )
    }

    // Ottieni API keys (senza esporre l'hash)
    const { data: apiKeys, error: queryError } = await supabase
      .from('api_keys')
      .select(`
        id,
        name,
        key_prefix,
        permissions,
        rate_limit,
        is_active,
        last_used_at,
        total_requests,
        created_at,
        expires_at
      `)
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    if (queryError) {
      return NextResponse.json({ error: 'Error fetching API keys' }, { status: 500 })
    }

    return NextResponse.json({ apiKeys: apiKeys || [] })
  } catch (error) {
    console.error('Error in api-keys GET:', error)
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
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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
        { error: 'API access requires Pro or Agency plan' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, permissions = { read: true, write: false } } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'API key name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Verifica limite API keys (max 5)
    const { count } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('revoked_at', null)

    if (count && count >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 API keys allowed' },
        { status: 400 }
      )
    }

    // Genera API key
    const rawKey = 'cs_' + crypto.randomBytes(32).toString('hex')
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.substring(0, 12)

    // Rate limit basato sul piano
    const rateLimit = profile.plan === 'agency' ? 200 : 100

    // Inserisci nel database
    const { data: apiKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions,
        rate_limit: rateLimit,
      })
      .select('id, name, key_prefix, permissions, rate_limit, created_at')
      .single()

    if (insertError) {
      console.error('Error creating API key:', insertError)
      return NextResponse.json({ error: 'Error creating API key' }, { status: 500 })
    }

    // Restituisci la key solo questa volta
    return NextResponse.json({
      apiKey: {
        ...apiKey,
        key: rawKey, // La key completa, mostrata solo alla creazione
      },
      message: 'Save this API key now. You will not be able to see it again.',
    })
  } catch (error) {
    console.error('Error in api-keys POST:', error)
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
    const keyId = searchParams.get('keyId')

    if (!keyId) {
      return NextResponse.json({ error: 'Missing keyId' }, { status: 400 })
    }

    // Revoca la key (soft delete)
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', keyId)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Error revoking API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in api-keys DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
