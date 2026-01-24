/**
 * Public API endpoint per leads
 * GET: Lista lead sbloccati dall'utente
 * Autenticazione via API Key header
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Helper per validare API key
async function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey) {
    return { error: 'Missing API key', status: 401 }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('user_id, permissions, rate_limit')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .is('revoked_at', null)
    .single()

  if (error || !keyData) {
    return { error: 'Invalid API key', status: 401 }
  }

  // Aggiorna last_used_at e total_requests
  await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      total_requests: supabase.rpc('increment_api_requests', { key_hash: keyHash }),
    })
    .eq('key_hash', keyHash)

  return { userId: keyData.user_id, permissions: keyData.permissions }
}

// Helper per loggare richieste API
async function logApiRequest(
  supabase: any,
  apiKeyId: string | null,
  userId: string,
  request: NextRequest,
  statusCode: number,
  responseTimeMs: number
) {
  try {
    await supabase.from('api_logs').insert({
      api_key_id: apiKeyId,
      user_id: userId,
      method: request.method,
      path: new URL(request.url).pathname,
      query_params: Object.fromEntries(new URL(request.url).searchParams),
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    })
  } catch (e) {
    console.error('Error logging API request:', e)
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Valida API key
    const validation = await validateApiKey(request)
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      )
    }

    const { userId, permissions } = validation

    if (!permissions.read) {
      return NextResponse.json(
        { error: 'API key does not have read permission' },
        { status: 403 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')
    const city = searchParams.get('city')
    const crmStatus = searchParams.get('crm_status')
    const minScore = searchParams.get('min_score')
    const maxScore = searchParams.get('max_score')
    const hasEmail = searchParams.get('has_email')
    const hasPhone = searchParams.get('has_phone')

    // Ottieni i lead sbloccati dall'utente
    const { data: unlockedLeads } = await supabase.rpc(
      'get_user_unlocked_leads',
      { p_user_id: userId }
    )

    if (!unlockedLeads || unlockedLeads.length === 0) {
      return NextResponse.json({
        leads: [],
        total: 0,
        limit,
        offset,
      })
    }

    const unlockedLeadIds = unlockedLeads.map((l: any) => l.lead_id)

    // Costruisci query
    let query = supabase
      .from('leads')
      .select(`
        id,
        business_name,
        website_url,
        email,
        phone,
        address,
        city,
        category,
        score,
        crm_status,
        crm_notes,
        crm_follow_up_date,
        crm_deal_value,
        created_at,
        last_seen_at
      `, { count: 'exact' })
      .in('id', unlockedLeadIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Applica filtri
    if (category) {
      query = query.ilike('category', `%${category}%`)
    }
    if (city) {
      query = query.ilike('city', `%${city}%`)
    }
    if (crmStatus) {
      query = query.eq('crm_status', crmStatus)
    }
    if (minScore) {
      query = query.gte('score', parseInt(minScore))
    }
    if (maxScore) {
      query = query.lte('score', parseInt(maxScore))
    }
    if (hasEmail === 'true') {
      query = query.not('email', 'is', null)
    }
    if (hasPhone === 'true') {
      query = query.not('phone', 'is', null)
    }

    const { data: leads, count, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching leads:', queryError)
      return NextResponse.json(
        { error: 'Error fetching leads' },
        { status: 500 }
      )
    }

    const responseTime = Date.now() - startTime
    await logApiRequest(supabase, null, userId, request, 200, responseTime)

    return NextResponse.json({
      leads: leads || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in public leads API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
