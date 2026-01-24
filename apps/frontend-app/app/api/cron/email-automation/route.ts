/**
 * CRON JOB: Email Automation & Retention
 * Eseguito giornalmente per tracciare eventi su Klaviyo
 *
 * EVENTI TRACCIATI:
 * 1. Utenti inattivi (3+ giorni) → Inactive User
 * 2. Utenti con crediti bassi (≤3) → Credits Low
 * 3. Utenti con crediti esauriti (0) → Credits Depleted
 * 4. Nuovi lead per saved searches → New Leads Available
 *
 * Klaviyo gestisce poi l'invio delle email tramite i Flow configurati
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { klaviyoServer } from '@/lib/services/klaviyo-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verifica autorizzazione
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'development-secret'
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')

    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` ||
      isVercelCron ||
      authHeader === cronSecret

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('\n📧 STARTING EMAIL AUTOMATION CRON')
    console.log(`Timestamp: ${new Date().toISOString()}`)

    const results = {
      inactiveUsers: 0,
      creditsLowUsers: 0,
      creditsDepletedUsers: 0,
      savedSearchAlerts: 0,
      errors: [] as string[]
    }

    // =====================================================
    // 1. UTENTI INATTIVI (3+ giorni)
    // =====================================================
    console.log('\n🔍 Cercando utenti inattivi...')

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { data: inactiveUsers, error: inactiveError } = await supabase
      .from('users')
      .select('id, email, plan, credits_remaining, last_login_at')
      .lt('last_login_at', threeDaysAgo.toISOString())
      .not('email', 'is', null)
      .eq('status', 'active')

    if (inactiveError) {
      console.error('Errore query utenti inattivi:', inactiveError)
      results.errors.push(`Inactive users query: ${inactiveError.message}`)
    } else if (inactiveUsers && inactiveUsers.length > 0) {
      console.log(`📋 Trovati ${inactiveUsers.length} utenti inattivi`)

      for (const user of inactiveUsers) {
        const daysSinceLogin = Math.floor(
          (Date.now() - new Date(user.last_login_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Evita di inviare troppi eventi allo stesso utente
        // Invia solo se sono passati esattamente 3, 7, 14 o 30 giorni
        if ([3, 7, 14, 30].includes(daysSinceLogin)) {
          const success = await klaviyoServer.trackInactiveUser(user.email, {
            daysSinceLastLogin: daysSinceLogin,
            lastLoginDate: user.last_login_at,
            creditsRemaining: user.credits_remaining || 0,
            plan: user.plan || 'free'
          })

          if (success) {
            results.inactiveUsers++
            console.log(`✅ Evento inattivo inviato per ${user.email} (${daysSinceLogin} giorni)`)
          }
        }
      }
    }

    // =====================================================
    // 2. UTENTI CON CREDITI BASSI (≤3, ma > 0)
    // =====================================================
    console.log('\n🔍 Cercando utenti con crediti bassi...')

    const { data: lowCreditUsers, error: lowCreditError } = await supabase
      .from('users')
      .select('id, email, plan, credits_remaining')
      .gt('credits_remaining', 0)
      .lte('credits_remaining', 3)
      .not('plan', 'eq', 'free') // Solo utenti a pagamento
      .not('email', 'is', null)

    if (lowCreditError) {
      console.error('Errore query crediti bassi:', lowCreditError)
      results.errors.push(`Low credits query: ${lowCreditError.message}`)
    } else if (lowCreditUsers && lowCreditUsers.length > 0) {
      console.log(`📋 Trovati ${lowCreditUsers.length} utenti con crediti bassi`)

      // Controlla se abbiamo già inviato questo evento di recente
      for (const user of lowCreditUsers) {
        const { data: recentNotification } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('notification_type', 'credits_low')
          .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Ultimi 7 giorni
          .single()

        if (!recentNotification) {
          const success = await klaviyoServer.trackCreditsLow(
            user.email,
            user.credits_remaining,
            user.plan
          )

          if (success) {
            results.creditsLowUsers++

            // Log della notifica
            await supabase.from('notification_logs').insert({
              user_id: user.id,
              notification_type: 'credits_low',
              channel: 'klaviyo',
              subject: 'Credits Low Alert',
              metadata: { credits_remaining: user.credits_remaining }
            })

            console.log(`✅ Evento crediti bassi inviato per ${user.email}`)
          }
        }
      }
    }

    // =====================================================
    // 3. UTENTI CON CREDITI ESAURITI (= 0)
    // =====================================================
    console.log('\n🔍 Cercando utenti con crediti esauriti...')

    const { data: depletedUsers, error: depletedError } = await supabase
      .from('users')
      .select('id, email, plan, credits_remaining')
      .eq('credits_remaining', 0)
      .not('plan', 'eq', 'free')
      .not('email', 'is', null)

    if (depletedError) {
      console.error('Errore query crediti esauriti:', depletedError)
      results.errors.push(`Depleted credits query: ${depletedError.message}`)
    } else if (depletedUsers && depletedUsers.length > 0) {
      console.log(`📋 Trovati ${depletedUsers.length} utenti con crediti esauriti`)

      for (const user of depletedUsers) {
        // Controlla notifica recente
        const { data: recentNotification } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('notification_type', 'credits_depleted')
          .gte('sent_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()) // Ultimi 3 giorni
          .single()

        if (!recentNotification) {
          const success = await klaviyoServer.trackCreditsDepleted(user.email, user.plan)

          if (success) {
            results.creditsDepletedUsers++

            await supabase.from('notification_logs').insert({
              user_id: user.id,
              notification_type: 'credits_depleted',
              channel: 'klaviyo',
              subject: 'Credits Depleted Alert'
            })

            console.log(`✅ Evento crediti esauriti inviato per ${user.email}`)
          }
        }
      }
    }

    // =====================================================
    // 4. SAVED SEARCHES - NUOVI LEAD DISPONIBILI
    // =====================================================
    console.log('\n🔍 Controllando saved searches per nuovi lead...')

    const { data: savedSearches, error: savedSearchError } = await supabase
      .from('saved_searches')
      .select(`
        id,
        user_id,
        name,
        categories,
        cities,
        score_min,
        score_max,
        alert_enabled,
        alert_frequency,
        last_alert_sent_at,
        users!inner(email, plan)
      `)
      .eq('alert_enabled', true)
      .eq('is_active', true)

    if (savedSearchError) {
      console.error('Errore query saved searches:', savedSearchError)
      results.errors.push(`Saved searches query: ${savedSearchError.message}`)
    } else if (savedSearches && savedSearches.length > 0) {
      console.log(`📋 Trovate ${savedSearches.length} saved searches attive`)

      for (const search of savedSearches) {
        // Verifica frequenza alert
        const shouldSendAlert = shouldSendSearchAlert(
          search.alert_frequency,
          search.last_alert_sent_at
        )

        if (!shouldSendAlert) continue

        // Trova nuovi lead che matchano i criteri
        let leadQuery = supabase
          .from('leads')
          .select('id, business_name, category, city, score, created_at')
          .gte('score', search.score_min || 0)
          .lte('score', search.score_max || 100)

        // Filtra per data (lead degli ultimi 7 giorni)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        leadQuery = leadQuery.gte('created_at', sevenDaysAgo.toISOString())

        // Filtra per categorie se specificate
        if (search.categories && search.categories.length > 0) {
          leadQuery = leadQuery.in('category', search.categories)
        }

        // Filtra per città se specificate
        if (search.cities && search.cities.length > 0) {
          leadQuery = leadQuery.in('city', search.cities)
        }

        leadQuery = leadQuery.limit(50)

        const { data: matchingLeads, error: leadsError } = await leadQuery

        if (leadsError) {
          console.error('Errore query leads:', leadsError)
          continue
        }

        if (matchingLeads && matchingLeads.length > 0) {
          const user = search.users as any

          // Calcola statistiche
          const categories = Array.from(new Set(matchingLeads.map(l => l.category))).slice(0, 3)
          const cities = Array.from(new Set(matchingLeads.map(l => l.city).filter(Boolean))).slice(0, 3)
          const bestScore = Math.min(...matchingLeads.map(l => l.score))

          const success = await klaviyoServer.trackNewLeadsAvailable(user.email, {
            count: matchingLeads.length,
            topCategories: categories,
            cities: cities as string[],
            bestScore
          })

          if (success) {
            results.savedSearchAlerts++

            // Aggiorna last_alert_sent_at
            await supabase
              .from('saved_searches')
              .update({
                last_alert_sent_at: new Date().toISOString(),
                matches_since_last_alert: matchingLeads.length
              })
              .eq('id', search.id)

            console.log(`✅ Alert saved search inviato per ${user.email} (${matchingLeads.length} lead)`)
          }
        }
      }
    }

    // =====================================================
    // RIEPILOGO
    // =====================================================
    console.log('\n📊 EMAIL AUTOMATION SUMMARY:')
    console.log(`- Utenti inattivi notificati: ${results.inactiveUsers}`)
    console.log(`- Utenti crediti bassi: ${results.creditsLowUsers}`)
    console.log(`- Utenti crediti esauriti: ${results.creditsDepletedUsers}`)
    console.log(`- Alert saved searches: ${results.savedSearchAlerts}`)
    console.log(`- Errori: ${results.errors.length}`)
    console.log('🏁 Email automation completata')

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🚨 ERRORE CRITICO email automation:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * Verifica se è il momento di inviare un alert in base alla frequenza
 */
function shouldSendSearchAlert(frequency: string, lastSentAt: string | null): boolean {
  if (!lastSentAt) return true

  const lastSent = new Date(lastSentAt)
  const now = new Date()
  const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)

  switch (frequency) {
    case 'realtime':
      return hoursSinceLastSent >= 1 // Max 1 email/ora
    case 'daily':
      return hoursSinceLastSent >= 24
    case 'weekly':
      return hoursSinceLastSent >= 168 // 7 giorni
    default:
      return hoursSinceLastSent >= 24
  }
}

// GET per verificare stato
export async function GET() {
  return NextResponse.json({
    service: 'email-automation',
    status: 'ready',
    klaviyoConfigured: !!process.env.KLAVIYO_PRIVATE_KEY,
    timestamp: new Date().toISOString()
  })
}
