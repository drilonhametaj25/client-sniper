/**
 * CRON JOB: Event Triggers - Behavioral Email Triggers
 * Eseguito OGNI 15 MINUTI via GitHub Actions
 *
 * Responsabilità:
 * 1. First Unlock → Invia congratulazioni + tips
 * 2. First Contact → Invia tips negoziazione
 * 3. First Deal → Celebrazione + badge
 * 4. Milestones (5, 10 leads) → Email milestone
 * 5. Streak celebration (7, 14, 30 days) → Streak email
 * 6. Level Up → Congratulazioni livello
 * 7. Elite Status (top 10%) → Welcome to elite
 *
 * Usato da: GitHub Actions workflow event-triggers.yml
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { smtpEmail } from '@/lib/services/smtp-email'
import { stopSequenceOnAction } from '@/lib/services/email-sequences'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface TriggerResults {
  firstUnlock: { sent: number; skipped: number }
  firstContact: { sent: number; skipped: number }
  firstDeal: { sent: number; skipped: number }
  milestone5: { sent: number; skipped: number }
  milestone10: { sent: number; skipped: number }
  streak: { sent: number; skipped: number }
  levelUp: { sent: number; skipped: number }
  eliteStatus: { sent: number; skipped: number }
  errors: string[]
}

export async function POST(request: NextRequest) {
  return runEventTriggersCron(request)
}

export async function GET(request: NextRequest) {
  // Supporto per Vercel Cron
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')

  if (isVercelCron) {
    return runEventTriggersCron(request)
  }

  // Info endpoint
  return NextResponse.json({
    service: 'event-triggers-cron',
    status: 'ready',
    description: 'Processa trigger comportamentali (first unlock, deals, milestones, streaks)',
    frequency: 'every 15 minutes',
    timestamp: new Date().toISOString()
  })
}

async function runEventTriggersCron(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

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
      console.warn('⚠️ Event triggers cron: Accesso non autorizzato')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('\n⚡ ========================================')
    console.log('⚡ STARTING EVENT TRIGGERS CRON')
    console.log(`⚡ Timestamp: ${new Date().toISOString()}`)
    console.log('⚡ ========================================\n')

    const results: TriggerResults = {
      firstUnlock: { sent: 0, skipped: 0 },
      firstContact: { sent: 0, skipped: 0 },
      firstDeal: { sent: 0, skipped: 0 },
      milestone5: { sent: 0, skipped: 0 },
      milestone10: { sent: 0, skipped: 0 },
      streak: { sent: 0, skipped: 0 },
      levelUp: { sent: 0, skipped: 0 },
      eliteStatus: { sent: 0, skipped: 0 },
      errors: []
    }

    // Finestra temporale: ultimi 30 minuti (overlap per sicurezza)
    const windowStart = new Date()
    windowStart.setMinutes(windowStart.getMinutes() - 30)

    // =====================================================
    // TRIGGER 1: First Unlock
    // =====================================================
    console.log('📧 [TRIGGER 1] Checking First Unlocks...')
    await processFirstUnlocks(results, windowStart)

    // =====================================================
    // TRIGGER 2: First Contact
    // =====================================================
    console.log('\n📧 [TRIGGER 2] Checking First Contacts...')
    await processFirstContacts(results, windowStart)

    // =====================================================
    // TRIGGER 3: First Deal / Deal Won
    // =====================================================
    console.log('\n📧 [TRIGGER 3] Checking Deals Won...')
    await processDealsWon(results, windowStart)

    // =====================================================
    // TRIGGER 4: Milestones (5, 10 leads)
    // =====================================================
    console.log('\n📧 [TRIGGER 4] Checking Milestones...')
    await processMilestones(results)

    // =====================================================
    // TRIGGER 5: Streak Celebrations
    // =====================================================
    console.log('\n📧 [TRIGGER 5] Checking Streaks...')
    await processStreaks(results)

    // =====================================================
    // TRIGGER 6: Level Ups
    // =====================================================
    console.log('\n📧 [TRIGGER 6] Checking Level Ups...')
    await processLevelUps(results, windowStart)

    // =====================================================
    // TRIGGER 7: Elite Status (Top 10%)
    // =====================================================
    console.log('\n📧 [TRIGGER 7] Checking Elite Status...')
    await processEliteStatus(results)

    // =====================================================
    // SUMMARY
    // =====================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const totalSent =
      results.firstUnlock.sent +
      results.firstContact.sent +
      results.firstDeal.sent +
      results.milestone5.sent +
      results.milestone10.sent +
      results.streak.sent +
      results.levelUp.sent +
      results.eliteStatus.sent

    console.log('\n📊 ========================================')
    console.log('📊 EVENT TRIGGERS CRON SUMMARY')
    console.log('📊 ========================================')
    console.log(`📧 First Unlock:  sent=${results.firstUnlock.sent}, skipped=${results.firstUnlock.skipped}`)
    console.log(`📧 First Contact: sent=${results.firstContact.sent}, skipped=${results.firstContact.skipped}`)
    console.log(`📧 Deals Won:     sent=${results.firstDeal.sent}, skipped=${results.firstDeal.skipped}`)
    console.log(`📧 Milestone 5:   sent=${results.milestone5.sent}, skipped=${results.milestone5.skipped}`)
    console.log(`📧 Milestone 10:  sent=${results.milestone10.sent}, skipped=${results.milestone10.skipped}`)
    console.log(`📧 Streak:        sent=${results.streak.sent}, skipped=${results.streak.skipped}`)
    console.log(`📧 Level Up:      sent=${results.levelUp.sent}, skipped=${results.levelUp.skipped}`)
    console.log(`📧 Elite Status:  sent=${results.eliteStatus.sent}, skipped=${results.eliteStatus.skipped}`)
    console.log(`📧 TOTALE:        ${totalSent} email inviate`)
    console.log(`⏱️  Durata:       ${duration}s`)
    console.log(`❌ Errori:       ${results.errors.length}`)
    console.log('📊 ========================================\n')

    return NextResponse.json({
      success: true,
      ...results,
      totalSent,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🚨 CRITICAL ERROR event-triggers cron:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// =====================================================
// HELPER: Check if event already triggered
// =====================================================
async function hasEventBeenTriggered(
  userId: string,
  eventType: string
): Promise<boolean> {
  const { data } = await getSupabase()
    .from('email_event_triggers')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .eq('email_sent', true)
    .single()

  return !!data
}

async function markEventTriggered(
  userId: string,
  eventType: string,
  entityId?: string
): Promise<void> {
  await getSupabase().from('email_event_triggers').upsert({
    user_id: userId,
    event_type: eventType,
    entity_id: entityId,
    email_sent: true,
    email_sent_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,event_type'
  })
}

async function getUserForEmail(userId: string): Promise<{
  email: string
  unsubscribe_token: string
  newsletter_subscribed: boolean
} | null> {
  const { data } = await getSupabase()
    .from('users')
    .select('email, unsubscribe_token, newsletter_subscribed')
    .eq('id', userId)
    .single()

  return data
}

// =====================================================
// TRIGGER PROCESSORS
// =====================================================

async function processFirstUnlocks(
  results: TriggerResults,
  windowStart: Date
): Promise<void> {
  // Trova utenti con esattamente 1 unlock recente
  const { data: recentUnlocks, error } = await getSupabase()
    .from('user_unlocked_leads')
    .select(`
      user_id,
      lead_id,
      unlocked_at,
      leads (
        business_name
      )
    `)
    .gte('unlocked_at', windowStart.toISOString())

  if (error || !recentUnlocks) return

  // Raggruppa per utente
  const userUnlocks = new Map<string, any[]>()
  for (const unlock of recentUnlocks) {
    if (!userUnlocks.has(unlock.user_id)) {
      userUnlocks.set(unlock.user_id, [])
    }
    userUnlocks.get(unlock.user_id)!.push(unlock)
  }

  for (const [userId, unlocks] of userUnlocks) {
    try {
      // Verifica se è davvero il primo unlock (conta totale)
      const { count } = await getSupabase()
        .from('user_unlocked_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (count !== 1) {
        results.firstUnlock.skipped++
        continue
      }

      // Verifica se già inviato
      if (await hasEventBeenTriggered(userId, 'first_unlock')) {
        results.firstUnlock.skipped++
        continue
      }

      const user = await getUserForEmail(userId)
      if (!user || !user.newsletter_subscribed) {
        results.firstUnlock.skipped++
        continue
      }

      // Ottieni nome lead
      const leadName = (unlocks[0].leads as any)?.business_name || 'il tuo primo lead'

      // Invia email
      const success = await smtpEmail.sendFirstUnlock(
        user.email,
        user.unsubscribe_token,
        leadName
      )

      if (success) {
        results.firstUnlock.sent++
        await markEventTriggered(userId, 'first_unlock', unlocks[0].lead_id)
        // Ferma sequenza welcome
        await stopSequenceOnAction(userId, 'first_unlock')
        await logNotification(userId, 'first_unlock', 'Primo lead sbloccato!')
        console.log(`   ✅ First unlock email sent to user ${userId}`)
      } else {
        results.firstUnlock.skipped++
      }
    } catch (err) {
      results.errors.push(`First unlock ${userId}: ${err}`)
    }
  }
}

async function processFirstContacts(
  results: TriggerResults,
  windowStart: Date
): Promise<void> {
  // Trova CRM entries con status "contacted" create di recente
  const { data: recentContacts, error } = await getSupabase()
    .from('crm_entries')
    .select('user_id, id')
    .eq('status', 'contacted')
    .gte('updated_at', windowStart.toISOString())

  if (error || !recentContacts) return

  const processedUsers = new Set<string>()

  for (const contact of recentContacts) {
    if (processedUsers.has(contact.user_id)) continue
    processedUsers.add(contact.user_id)

    try {
      // Verifica se è il primo contatto
      const { count } = await getSupabase()
        .from('crm_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', contact.user_id)
        .eq('status', 'contacted')

      if (count !== 1) {
        results.firstContact.skipped++
        continue
      }

      if (await hasEventBeenTriggered(contact.user_id, 'first_contact')) {
        results.firstContact.skipped++
        continue
      }

      const user = await getUserForEmail(contact.user_id)
      if (!user || !user.newsletter_subscribed) {
        results.firstContact.skipped++
        continue
      }

      const success = await smtpEmail.sendFirstContact(
        user.email,
        user.unsubscribe_token
      )

      if (success) {
        results.firstContact.sent++
        await markEventTriggered(contact.user_id, 'first_contact', contact.id)
        await logNotification(contact.user_id, 'first_contact', 'Primo contatto effettuato!')
        console.log(`   ✅ First contact email sent to user ${contact.user_id}`)
      } else {
        results.firstContact.skipped++
      }
    } catch (err) {
      results.errors.push(`First contact ${contact.user_id}: ${err}`)
    }
  }
}

async function processDealsWon(
  results: TriggerResults,
  windowStart: Date
): Promise<void> {
  // Trova CRM entries chiuse positivamente di recente
  const { data: recentDeals, error } = await getSupabase()
    .from('crm_entries')
    .select('user_id, id, deal_value')
    .eq('status', 'closed_won')
    .gte('updated_at', windowStart.toISOString())

  if (error || !recentDeals) return

  for (const deal of recentDeals) {
    try {
      // Conta i deal totali dell'utente
      const { count: totalDeals } = await getSupabase()
        .from('crm_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', deal.user_id)
        .eq('status', 'closed_won')

      const isFirstDeal = totalDeals === 1

      // Verifica se già inviato per questo deal specifico
      const { data: existingTrigger } = await getSupabase()
        .from('email_event_triggers')
        .select('id')
        .eq('user_id', deal.user_id)
        .eq('event_type', isFirstDeal ? 'first_deal' : 'deal_won')
        .eq('entity_id', deal.id)
        .single()

      if (existingTrigger) {
        results.firstDeal.skipped++
        continue
      }

      const user = await getUserForEmail(deal.user_id)
      if (!user || !user.newsletter_subscribed) {
        results.firstDeal.skipped++
        continue
      }

      let success = false
      if (isFirstDeal) {
        success = await smtpEmail.sendFirstDeal(
          user.email,
          user.unsubscribe_token,
          deal.deal_value || undefined
        )
      } else {
        success = await smtpEmail.sendDealWonCelebration(
          user.email,
          user.unsubscribe_token,
          deal.deal_value || 0,
          totalDeals || 1
        )
      }

      if (success) {
        results.firstDeal.sent++
        await markEventTriggered(
          deal.user_id,
          isFirstDeal ? 'first_deal' : 'deal_won',
          deal.id
        )
        await logNotification(
          deal.user_id,
          isFirstDeal ? 'first_deal' : 'deal_won',
          isFirstDeal ? 'Primo deal chiuso!' : `Deal #${totalDeals} chiuso!`
        )
        console.log(`   ✅ Deal email sent to user ${deal.user_id}`)
      } else {
        results.firstDeal.skipped++
      }
    } catch (err) {
      results.errors.push(`Deal ${deal.user_id}: ${err}`)
    }
  }
}

async function processMilestones(results: TriggerResults): Promise<void> {
  // Trova utenti con esattamente 5 o 10 leads sbloccati
  const { data: users, error } = await getSupabase()
    .from('users')
    .select('id, email, unsubscribe_token, newsletter_subscribed')
    .eq('newsletter_subscribed', true)
    .eq('status', 'active')

  if (error || !users) return

  for (const user of users) {
    try {
      const { count } = await getSupabase()
        .from('user_unlocked_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Milestone 5 leads
      if (count === 5) {
        if (await hasEventBeenTriggered(user.id, 'milestone_5_leads')) {
          results.milestone5.skipped++
        } else {
          const success = await smtpEmail.sendMilestone5Leads(
            user.email,
            user.unsubscribe_token
          )
          if (success) {
            results.milestone5.sent++
            await markEventTriggered(user.id, 'milestone_5_leads')
            await logNotification(user.id, 'milestone_5_leads', '5 lead sbloccati!')
            console.log(`   ✅ Milestone 5 email sent to user ${user.id}`)
          }
        }
      }

      // Milestone 10 leads
      if (count === 10) {
        if (await hasEventBeenTriggered(user.id, 'milestone_10_leads')) {
          results.milestone10.skipped++
        } else {
          const success = await smtpEmail.sendMilestone10Leads(
            user.email,
            user.unsubscribe_token
          )
          if (success) {
            results.milestone10.sent++
            await markEventTriggered(user.id, 'milestone_10_leads')
            await logNotification(user.id, 'milestone_10_leads', '10 lead sbloccati!')
            console.log(`   ✅ Milestone 10 email sent to user ${user.id}`)
          }
        }
      }
    } catch (err) {
      results.errors.push(`Milestone ${user.id}: ${err}`)
    }
  }
}

async function processStreaks(results: TriggerResults): Promise<void> {
  // Trova utenti con streak di 7, 14, o 30 giorni
  const { data: gamificationData, error } = await getSupabase()
    .from('user_gamification')
    .select(`
      user_id,
      current_streak,
      users (
        email,
        unsubscribe_token,
        newsletter_subscribed
      )
    `)
    .in('current_streak', [7, 14, 30])

  if (error || !gamificationData) return

  for (const gam of gamificationData) {
    try {
      const user = gam.users as any
      if (!user || !user.newsletter_subscribed) {
        results.streak.skipped++
        continue
      }

      const eventType = `streak_${gam.current_streak}`
      if (await hasEventBeenTriggered(gam.user_id, eventType)) {
        results.streak.skipped++
        continue
      }

      const success = await smtpEmail.sendStreakCelebration(
        user.email,
        user.unsubscribe_token,
        gam.current_streak
      )

      if (success) {
        results.streak.sent++
        await markEventTriggered(gam.user_id, eventType)
        await logNotification(gam.user_id, eventType, `Streak di ${gam.current_streak} giorni!`)
        console.log(`   ✅ Streak ${gam.current_streak} email sent to user ${gam.user_id}`)
      } else {
        results.streak.skipped++
      }
    } catch (err) {
      results.errors.push(`Streak ${gam.user_id}: ${err}`)
    }
  }
}

async function processLevelUps(
  results: TriggerResults,
  windowStart: Date
): Promise<void> {
  // Trova utenti che hanno fatto level up di recente
  const { data: levelUps, error } = await getSupabase()
    .from('user_gamification')
    .select(`
      user_id,
      level,
      updated_at,
      users (
        email,
        unsubscribe_token,
        newsletter_subscribed
      )
    `)
    .gte('updated_at', windowStart.toISOString())
    .gt('level', 1)

  if (error || !levelUps) return

  for (const gam of levelUps) {
    try {
      const user = gam.users as any
      if (!user || !user.newsletter_subscribed) {
        results.levelUp.skipped++
        continue
      }

      const eventType = `level_up_${gam.level}`
      if (await hasEventBeenTriggered(gam.user_id, eventType)) {
        results.levelUp.skipped++
        continue
      }

      const success = await smtpEmail.sendLevelUp(
        user.email,
        user.unsubscribe_token,
        gam.level
      )

      if (success) {
        results.levelUp.sent++
        await markEventTriggered(gam.user_id, eventType)
        await logNotification(gam.user_id, eventType, `Livello ${gam.level} raggiunto!`)
        console.log(`   ✅ Level up to ${gam.level} email sent to user ${gam.user_id}`)
      } else {
        results.levelUp.skipped++
      }
    } catch (err) {
      results.errors.push(`Level up ${gam.user_id}: ${err}`)
    }
  }
}

async function processEliteStatus(results: TriggerResults): Promise<void> {
  // Calcola top 10% degli utenti per XP
  const { data: allUsers, error } = await getSupabase()
    .from('user_gamification')
    .select(`
      user_id,
      total_xp,
      users (
        email,
        unsubscribe_token,
        newsletter_subscribed
      )
    `)
    .order('total_xp', { ascending: false })

  if (error || !allUsers || allUsers.length < 10) return

  // Top 10%
  const top10PercentCount = Math.ceil(allUsers.length * 0.1)
  const eliteUsers = allUsers.slice(0, top10PercentCount)

  for (const gam of eliteUsers) {
    try {
      const user = gam.users as any
      if (!user || !user.newsletter_subscribed) {
        results.eliteStatus.skipped++
        continue
      }

      if (await hasEventBeenTriggered(gam.user_id, 'elite_status')) {
        results.eliteStatus.skipped++
        continue
      }

      const success = await smtpEmail.sendEliteStatus(
        user.email,
        user.unsubscribe_token
      )

      if (success) {
        results.eliteStatus.sent++
        await markEventTriggered(gam.user_id, 'elite_status')
        await logNotification(gam.user_id, 'elite_status', 'Sei nel top 10%!')
        console.log(`   ✅ Elite status email sent to user ${gam.user_id}`)
      } else {
        results.eliteStatus.skipped++
      }
    } catch (err) {
      results.errors.push(`Elite status ${gam.user_id}: ${err}`)
    }
  }
}

// =====================================================
// LOGGING
// =====================================================

async function logNotification(
  userId: string,
  type: string,
  subject: string
): Promise<void> {
  try {
    await getSupabase().from('notification_logs').insert({
      user_id: userId,
      notification_type: `trigger_${type}`,
      channel: 'email',
      subject,
      status: 'sent'
    })
  } catch (err) {
    console.error('⚠️ Error logging notification:', err)
  }
}
