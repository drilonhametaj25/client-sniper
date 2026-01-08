/**
 * API per tracciare e recuperare le visualizzazioni/sblocchi di un lead
 * GET: Recupera statistiche competitor per un lead
 * POST: Registra una nuova visualizzazione/sblocco
 */

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

    // Recupera stats del lead
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('view_count, unlock_count, first_seen_at, last_unlocked_at')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Errore recupero lead stats:', error)
      return NextResponse.json({ error: 'Errore recupero dati' }, { status: 500 })
    }

    // Determina se è "hot" (molti unlock negli ultimi 7 giorni)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentUnlocks } = await supabaseAdmin
      .from('lead_views')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', id)
      .eq('view_type', 'unlock')
      .gte('viewed_at', sevenDaysAgo.toISOString())

    const isHot = (recentUnlocks || 0) >= 3

    const competitionLevel = getCompetitionLevel(lead.unlock_count || 0)

    const response = {
      leadId: id,
      viewCount: lead.view_count || 0,
      unlockCount: lead.unlock_count || 0,
      firstSeenAt: lead.first_seen_at,
      lastUnlockedAt: lead.last_unlocked_at,
      isHot,
      competitionLevel,
      recentUnlocks: recentUnlocks || 0
    }

    return NextResponse.json({ success: true, data: response })

  } catch (error) {
    console.error('Errore API lead views GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(
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

    const body = await request.json()
    const viewType = body.type || 'view' // 'view' o 'unlock'

    if (!['view', 'unlock'].includes(viewType)) {
      return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })
    }

    // Inserisci o ignora se già esistente (UNIQUE constraint)
    const { error } = await supabaseAdmin
      .from('lead_views')
      .upsert(
        {
          lead_id: id,
          user_id: user.id,
          view_type: viewType,
          viewed_at: new Date().toISOString()
        },
        { onConflict: 'lead_id,user_id,view_type' }
      )

    if (error) {
      console.error('Errore registrazione view:', error)
      return NextResponse.json({ error: 'Errore registrazione' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Errore API lead views POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

function getCompetitionLevel(unlockCount: number): 'low' | 'medium' | 'high' {
  if (unlockCount <= 2) return 'low'
  if (unlockCount <= 5) return 'medium'
  return 'high'
}
