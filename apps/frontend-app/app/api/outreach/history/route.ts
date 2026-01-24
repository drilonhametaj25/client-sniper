/**
 * API endpoint per ottenere la cronologia email di outreach
 * Supporta filtro per lead_id o tutte le email dell'utente
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
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
    const leadId = searchParams.get('lead_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Costruisci query
    let query = supabase
      .from('outreach_emails')
      .select(`
        id,
        lead_id,
        template_id,
        subject,
        recipient_email,
        status,
        sent_at,
        opened_at,
        open_count,
        last_opened_at,
        clicked_at,
        bounced_at,
        bounce_reason
      `)
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    const { data: emails, error: queryError } = await query

    if (queryError) {
      console.error('Error fetching outreach history:', queryError)
      return NextResponse.json({ error: 'Error fetching history' }, { status: 500 })
    }

    // Conta totale
    let countQuery = supabase
      .from('outreach_emails')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (leadId) {
      countQuery = countQuery.eq('lead_id', leadId)
    }

    const { count } = await countQuery

    // Calcola statistiche
    const stats = {
      total: count || 0,
      sent: emails?.filter(e => e.status === 'sent').length || 0,
      opened: emails?.filter(e => e.status === 'opened' || e.opened_at).length || 0,
      bounced: emails?.filter(e => e.status === 'bounced').length || 0,
      openRate: 0,
    }

    if (stats.sent > 0) {
      stats.openRate = Math.round((stats.opened / stats.sent) * 100)
    }

    return NextResponse.json({
      emails: emails || [],
      total: count || 0,
      limit,
      offset,
      stats,
    })
  } catch (error) {
    console.error('Error in outreach history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
