/**
 * API per gestire le preferenze di notifica utente
 * GET: Recupera preferenze
 * PUT: Aggiorna preferenze
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Recupera preferenze esistenti o crea default
    let { data: preferences, error } = await getSupabaseAdmin()
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // Non esiste, crea default
      const { data: newPrefs, error: insertError } = await getSupabaseAdmin()
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          email_digest_enabled: true,
          email_digest_frequency: 'daily',
          notify_new_leads: true,
          notify_high_score_leads: true,
          notify_credits_low: true,
          notify_credits_reset: true,
          notify_follow_up_reminder: true,
          notify_saved_search_match: true,
          high_score_threshold: 30,
          credits_low_threshold: 3,
          preferred_send_hour: 9,
          timezone: 'Europe/Rome'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Errore creazione preferenze:', insertError)
        return NextResponse.json({ error: 'Errore creazione preferenze' }, { status: 500 })
      }

      preferences = newPrefs
    } else if (error) {
      console.error('Errore recupero preferenze:', error)
      return NextResponse.json({ error: 'Errore recupero preferenze' }, { status: 500 })
    }

    // Recupera anche newsletter_subscribed dalla tabella users
    const { data: userData } = await getSupabaseAdmin()
      .from('users')
      .select('newsletter_subscribed')
      .eq('id', user.id)
      .single()

    // Trasforma in formato camelCase per frontend
    const response = {
      id: preferences.id,
      userId: preferences.user_id,
      emailDigestEnabled: preferences.email_digest_enabled,
      emailDigestFrequency: preferences.email_digest_frequency,
      notifyNewLeads: preferences.notify_new_leads,
      notifyHighScoreLeads: preferences.notify_high_score_leads,
      notifyCreditsLow: preferences.notify_credits_low,
      notifyCreditsReset: preferences.notify_credits_reset,
      notifyFollowUpReminder: preferences.notify_follow_up_reminder,
      notifySavedSearchMatch: preferences.notify_saved_search_match,
      highScoreThreshold: preferences.high_score_threshold,
      creditsLowThreshold: preferences.credits_low_threshold,
      preferredSendHour: preferences.preferred_send_hour,
      timezone: preferences.timezone,
      createdAt: preferences.created_at,
      updatedAt: preferences.updated_at,
      newsletterSubscribed: userData?.newsletter_subscribed ?? true
    }

    return NextResponse.json({ success: true, data: response })

  } catch (error) {
    console.error('Errore API preferences GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const body = await request.json()

    // Mappa camelCase a snake_case
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }

    if (body.emailDigestEnabled !== undefined) updateData.email_digest_enabled = body.emailDigestEnabled
    if (body.emailDigestFrequency !== undefined) updateData.email_digest_frequency = body.emailDigestFrequency
    if (body.notifyNewLeads !== undefined) updateData.notify_new_leads = body.notifyNewLeads
    if (body.notifyHighScoreLeads !== undefined) updateData.notify_high_score_leads = body.notifyHighScoreLeads
    if (body.notifyCreditsLow !== undefined) updateData.notify_credits_low = body.notifyCreditsLow
    if (body.notifyCreditsReset !== undefined) updateData.notify_credits_reset = body.notifyCreditsReset
    if (body.notifyFollowUpReminder !== undefined) updateData.notify_follow_up_reminder = body.notifyFollowUpReminder
    if (body.notifySavedSearchMatch !== undefined) updateData.notify_saved_search_match = body.notifySavedSearchMatch
    if (body.highScoreThreshold !== undefined) updateData.high_score_threshold = body.highScoreThreshold
    if (body.creditsLowThreshold !== undefined) updateData.credits_low_threshold = body.creditsLowThreshold
    if (body.preferredSendHour !== undefined) updateData.preferred_send_hour = body.preferredSendHour
    if (body.timezone !== undefined) updateData.timezone = body.timezone

    const { data, error } = await getSupabaseAdmin()
      .from('notification_preferences')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Errore aggiornamento preferenze:', error)
      return NextResponse.json({ error: 'Errore aggiornamento preferenze' }, { status: 500 })
    }

    // Aggiorna newsletter_subscribed nella tabella users (campo separato)
    if (body.newsletterSubscribed !== undefined) {
      const { error: userError } = await getSupabaseAdmin()
        .from('users')
        .update({
          newsletter_subscribed: body.newsletterSubscribed,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (userError) {
        console.error('Errore aggiornamento newsletter:', userError)
        // Non blocchiamo, il resto è stato salvato
      }
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Errore API preferences PUT:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
