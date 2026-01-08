/**
 * API per gestire le Saved Searches (Lead Alerts)
 * GET: Lista delle saved searches dell'utente
 * POST: Crea una nuova saved search
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_SAVED_SEARCHES_FREE = 1
const MAX_SAVED_SEARCHES_PRO = 5
const MAX_SAVED_SEARCHES_BUSINESS = 20

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const { data: searches, error } = await supabaseAdmin
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Errore recupero saved searches:', error)
      return NextResponse.json({ error: 'Errore recupero saved searches' }, { status: 500 })
    }

    // Trasforma in camelCase
    const response = searches.map(s => ({
      id: s.id,
      userId: s.user_id,
      name: s.name,
      categories: s.categories || [],
      cities: s.cities || [],
      scoreMin: s.score_min,
      scoreMax: s.score_max,
      hasEmail: s.has_email,
      hasPhone: s.has_phone,
      filterNoSsl: s.filter_no_ssl,
      filterSlowLoading: s.filter_slow_loading,
      filterNoAnalytics: s.filter_no_analytics,
      filterNoFacebookPixel: s.filter_no_facebook_pixel,
      alertEnabled: s.alert_enabled,
      alertFrequency: s.alert_frequency,
      lastAlertSentAt: s.last_alert_sent_at,
      matchesSinceLastAlert: s.matches_since_last_alert,
      isActive: s.is_active,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))

    return NextResponse.json({ success: true, data: response })

  } catch (error) {
    console.error('Errore API saved-searches GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Verifica limiti in base al piano
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier || 'free'
    let maxSearches = MAX_SAVED_SEARCHES_FREE
    if (tier === 'pro' || tier === 'starter') maxSearches = MAX_SAVED_SEARCHES_PRO
    if (tier === 'business' || tier === 'agency') maxSearches = MAX_SAVED_SEARCHES_BUSINESS

    // Conta ricerche esistenti
    const { count } = await supabaseAdmin
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if ((count || 0) >= maxSearches) {
      return NextResponse.json({
        error: `Hai raggiunto il limite di ${maxSearches} alert. Passa a un piano superiore per crearne di più.`,
        code: 'LIMIT_REACHED'
      }, { status: 403 })
    }

    const body = await request.json()

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome ricerca obbligatorio' }, { status: 400 })
    }

    const insertData = {
      user_id: user.id,
      name: body.name.trim(),
      categories: body.categories || [],
      cities: body.cities || [],
      score_min: body.scoreMin ?? 0,
      score_max: body.scoreMax ?? 100,
      has_email: body.hasEmail,
      has_phone: body.hasPhone,
      filter_no_ssl: body.filterNoSsl || false,
      filter_slow_loading: body.filterSlowLoading || false,
      filter_no_analytics: body.filterNoAnalytics || false,
      filter_no_facebook_pixel: body.filterNoFacebookPixel || false,
      alert_enabled: body.alertEnabled ?? true,
      alert_frequency: body.alertFrequency || 'daily'
    }

    const { data, error } = await supabaseAdmin
      .from('saved_searches')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Errore creazione saved search:', error)
      return NextResponse.json({ error: 'Errore creazione alert' }, { status: 500 })
    }

    // Aggiorna onboarding se primo alert
    await supabaseAdmin
      .from('user_onboarding')
      .update({
        completed_saved_search: true,
        saved_search_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('completed_saved_search', false)

    // Verifica achievement
    await checkAndAwardAchievement(user.id, 'saved_search')

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Errore API saved-searches POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

async function checkAndAwardAchievement(userId: string, achievementId: string) {
  try {
    // Verifica se già sbloccato
    const { data: existing } = await supabaseAdmin
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single()

    if (existing) return

    // Sblocca achievement
    await supabaseAdmin
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId
      })

    // Aggiungi XP
    const { data: achievement } = await supabaseAdmin
      .from('achievements')
      .select('xp_reward')
      .eq('id', achievementId)
      .single()

    if (achievement?.xp_reward) {
      await supabaseAdmin.rpc('increment_user_xp', {
        p_user_id: userId,
        p_xp_amount: achievement.xp_reward
      })
    }
  } catch (err) {
    console.error('Errore award achievement:', err)
  }
}
