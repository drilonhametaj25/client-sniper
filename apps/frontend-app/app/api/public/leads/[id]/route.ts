/**
 * Public API endpoint per singolo lead
 * GET: Dettaglio lead
 * PUT: Aggiorna CRM status/notes
 */

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
    .select('user_id, permissions, rate_limit, total_requests')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .is('revoked_at', null)
    .single()

  if (error || !keyData) {
    return { error: 'Invalid API key', status: 401 }
  }

  // Aggiorna stats
  supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      total_requests: (keyData.total_requests || 0) + 1,
    })
    .eq('key_hash', keyHash)
    .then(() => {}) // Fire and forget

  return { userId: keyData.user_id, permissions: keyData.permissions }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params

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

    // Verifica che l'utente abbia sbloccato questo lead
    const { data: unlockedLeads } = await supabase.rpc(
      'get_user_unlocked_leads',
      { p_user_id: userId }
    )

    const isUnlocked = unlockedLeads?.some((l: any) => l.lead_id === leadId)

    if (!isUnlocked) {
      return NextResponse.json(
        { error: 'Lead not found or not unlocked' },
        { status: 404 }
      )
    }

    // Ottieni il lead con tutti i dettagli
    const { data: lead, error: queryError } = await supabase
      .from('leads')
      .select(`
        id,
        business_name,
        website_url,
        email,
        phone,
        address,
        city,
        region,
        postal_code,
        country,
        category,
        subcategory,
        score,
        needed_roles,
        issues,
        crm_status,
        crm_notes,
        crm_follow_up_date,
        crm_deal_value,
        crm_deal_currency,
        crm_tags,
        website_analysis,
        social_links,
        created_at,
        last_seen_at,
        assigned_to
      `)
      .eq('id', leadId)
      .single()

    if (queryError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error in public lead detail API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params

    // Valida API key
    const validation = await validateApiKey(request)
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      )
    }

    const { userId, permissions } = validation

    if (!permissions.write) {
      return NextResponse.json(
        { error: 'API key does not have write permission' },
        { status: 403 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verifica che l'utente abbia sbloccato questo lead
    const { data: unlockedLeads } = await supabase.rpc(
      'get_user_unlocked_leads',
      { p_user_id: userId }
    )

    const isUnlocked = unlockedLeads?.some((l: any) => l.lead_id === leadId)

    if (!isUnlocked) {
      return NextResponse.json(
        { error: 'Lead not found or not unlocked' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      crm_status,
      crm_notes,
      crm_follow_up_date,
      crm_deal_value,
      crm_deal_currency,
      crm_tags,
    } = body

    // Valida status
    const validStatuses = ['new', 'to_contact', 'contacted', 'in_negotiation', 'won', 'lost']
    if (crm_status && !validStatuses.includes(crm_status)) {
      return NextResponse.json(
        { error: `Invalid crm_status. Valid values: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Costruisci update
    const updates: any = {}
    if (crm_status !== undefined) updates.crm_status = crm_status
    if (crm_notes !== undefined) updates.crm_notes = crm_notes
    if (crm_follow_up_date !== undefined) updates.crm_follow_up_date = crm_follow_up_date
    if (crm_deal_value !== undefined) updates.crm_deal_value = crm_deal_value
    if (crm_deal_currency !== undefined) updates.crm_deal_currency = crm_deal_currency
    if (crm_tags !== undefined) updates.crm_tags = crm_tags

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Aggiorna il lead
    const { data: lead, error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating lead:', updateError)
      return NextResponse.json(
        { error: 'Error updating lead' },
        { status: 500 }
      )
    }

    // TODO: Trigger webhook per crm.status_changed se lo status è cambiato

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        crm_status: lead.crm_status,
        crm_notes: lead.crm_notes,
        crm_follow_up_date: lead.crm_follow_up_date,
        crm_deal_value: lead.crm_deal_value,
      },
    })
  } catch (error) {
    console.error('Error in public lead update API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
