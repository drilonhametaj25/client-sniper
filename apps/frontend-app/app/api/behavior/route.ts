/**
 * API per il Behavior Tracking
 *
 * POST: Traccia azione utente su un lead
 * GET: Recupera summary comportamento utente
 *
 * @file apps/frontend-app/app/api/behavior/route.ts
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Azioni valide
const VALID_ACTIONS = ['viewed', 'unlocked', 'contacted', 'converted', 'skipped', 'saved'] as const
type BehaviorAction = typeof VALID_ACTIONS[number]

/**
 * POST: Traccia un'azione utente su un lead
 *
 * Body:
 * - leadId: string (required)
 * - action: 'viewed' | 'unlocked' | 'contacted' | 'converted' | 'skipped' | 'saved' (required)
 * - metadata: object (optional)
 * - relevanceScore: number (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    const { leadId, action, metadata, relevanceScore } = body

    // Validazione
    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ error: 'leadId richiesto' }, { status: 400 })
    }

    if (!action || !VALID_ACTIONS.includes(action as BehaviorAction)) {
      return NextResponse.json({
        error: `action deve essere uno di: ${VALID_ACTIONS.join(', ')}`
      }, { status: 400 })
    }

    // Verifica lead esiste
    const { data: lead, error: leadError } = await getSupabaseAdmin()
      .from('leads')
      .select('id, score, category')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 })
    }

    // Per alcune azioni, evita duplicati
    if (['unlocked', 'converted'].includes(action)) {
      const { data: existing } = await getSupabaseAdmin()
        .from('user_behavior')
        .select('id')
        .eq('user_id', user.id)
        .eq('lead_id', leadId)
        .eq('action', action)
        .single()

      if (existing) {
        // Già tracciato, skip silenziosamente
        return NextResponse.json({
          success: true,
          message: 'Azione già registrata',
          duplicate: true
        })
      }
    }

    // Inserisci record behavior
    const insertData = {
      user_id: user.id,
      lead_id: leadId,
      action,
      action_metadata: metadata || {},
      lead_score_snapshot: lead.score,
      lead_category_snapshot: lead.category,
      relevance_score_snapshot: relevanceScore || null,
      created_at: new Date().toISOString()
    }

    const { data: behaviorRecord, error: insertError } = await getSupabaseAdmin()
      .from('user_behavior')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Errore inserimento behavior:', insertError)
      return NextResponse.json({ error: 'Errore salvataggio azione' }, { status: 500 })
    }

    // Per conversioni, aggiorna anche gamification
    if (action === 'converted') {
      await updateGamificationOnConvert(user.id, metadata)
    }

    // Per unlock, aggiorna gamification
    if (action === 'unlocked') {
      await updateGamificationOnUnlock(user.id)
    }

    // Per contatti, aggiorna gamification
    if (action === 'contacted') {
      await updateGamificationOnContact(user.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: behaviorRecord.id,
        action: behaviorRecord.action,
        leadId: behaviorRecord.lead_id,
        createdAt: behaviorRecord.created_at
      }
    })

  } catch (error) {
    console.error('Errore API behavior POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * GET: Recupera summary comportamento utente
 *
 * Query params:
 * - leadId: string (optional) - filtra per lead specifico
 * - action: string (optional) - filtra per azione
 * - limit: number (optional) - max records (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const action = searchParams.get('action')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    // Se richiesto summary
    if (searchParams.get('summary') === 'true') {
      return await getSummary(user.id)
    }

    // Query behaviors
    let query = getSupabaseAdmin()
      .from('user_behavior')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    if (action && VALID_ACTIONS.includes(action as BehaviorAction)) {
      query = query.eq('action', action)
    }

    const { data: behaviors, error } = await query

    if (error) {
      console.error('Errore query behaviors:', error)
      return NextResponse.json({ error: 'Errore recupero dati' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: behaviors,
      count: behaviors?.length || 0
    })

  } catch (error) {
    console.error('Errore API behavior GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * Helper: Recupera summary comportamento
 */
async function getSummary(userId: string) {
  try {
    // Count per azione
    const { data: behaviors, error } = await getSupabaseAdmin()
      .from('user_behavior')
      .select('action, lead_category_snapshot')
      .eq('user_id', userId)

    if (error) throw error

    // Calcola summary
    const actionCounts: Record<string, number> = {}
    const convertedCategories: string[] = []
    const convertedCities: string[] = []

    for (const b of behaviors || []) {
      actionCounts[b.action] = (actionCounts[b.action] || 0) + 1

      if (b.action === 'converted' && b.lead_category_snapshot) {
        if (!convertedCategories.includes(b.lead_category_snapshot)) {
          convertedCategories.push(b.lead_category_snapshot)
        }
      }
    }

    // Get cities from converted leads
    const { data: convertedBehaviors } = await getSupabaseAdmin()
      .from('user_behavior')
      .select('lead_id')
      .eq('user_id', userId)
      .eq('action', 'converted')

    if (convertedBehaviors && convertedBehaviors.length > 0) {
      const leadIds = convertedBehaviors.map(b => b.lead_id)
      const { data: leads } = await getSupabaseAdmin()
        .from('leads')
        .select('city')
        .in('id', leadIds)

      if (leads) {
        for (const lead of leads) {
          if (lead.city && !convertedCities.includes(lead.city)) {
            convertedCities.push(lead.city)
          }
        }
      }
    }

    const summary = {
      totalViewed: actionCounts['viewed'] || 0,
      totalUnlocked: actionCounts['unlocked'] || 0,
      totalContacted: actionCounts['contacted'] || 0,
      totalConverted: actionCounts['converted'] || 0,
      totalSkipped: actionCounts['skipped'] || 0,
      totalSaved: actionCounts['saved'] || 0,
      convertedCategories,
      convertedCities,
      lastActivity: behaviors && behaviors.length > 0
        ? new Date().toISOString()
        : null
    }

    return NextResponse.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error('Errore getSummary:', error)
    return NextResponse.json({ error: 'Errore calcolo summary' }, { status: 500 })
  }
}

/**
 * Helper: Aggiorna gamification su conversione
 */
async function updateGamificationOnConvert(userId: string, metadata?: { dealValue?: number }) {
  try {
    const { data: gamification } = await getSupabaseAdmin()
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (gamification) {
      const dealValue = metadata?.dealValue || 0

      await getSupabaseAdmin()
        .from('user_gamification')
        .update({
          total_deals_won: (gamification.total_deals_won || 0) + 1,
          total_deals_value: (gamification.total_deals_value || 0) + dealValue,
          xp_points: (gamification.xp_points || 0) + 100, // XP per deal
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    }
  } catch (error) {
    console.error('Errore updateGamificationOnConvert:', error)
  }
}

/**
 * Helper: Aggiorna gamification su unlock
 */
async function updateGamificationOnUnlock(userId: string) {
  try {
    const { data: gamification } = await getSupabaseAdmin()
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (gamification) {
      await getSupabaseAdmin()
        .from('user_gamification')
        .update({
          total_leads_unlocked: (gamification.total_leads_unlocked || 0) + 1,
          xp_points: (gamification.xp_points || 0) + 10, // XP per unlock
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    }
  } catch (error) {
    console.error('Errore updateGamificationOnUnlock:', error)
  }
}

/**
 * Helper: Aggiorna gamification su contatto
 */
async function updateGamificationOnContact(userId: string) {
  try {
    const { data: gamification } = await getSupabaseAdmin()
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (gamification) {
      await getSupabaseAdmin()
        .from('user_gamification')
        .update({
          total_leads_contacted: (gamification.total_leads_contacted || 0) + 1,
          xp_points: (gamification.xp_points || 0) + 20, // XP per contatto
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    }
  } catch (error) {
    console.error('Errore updateGamificationOnContact:', error)
  }
}
