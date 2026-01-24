/**
 * CRON JOB: Newsletter Settimanale TrovaMi
 * Eseguito ogni Martedi ore 10:00 CET via GitHub Actions
 *
 * Segmenti:
 * 1. NUOVI: credits = 5 AND mai sbloccato lead
 * 2. DORMIENTI: ha sbloccato >= 1 lead MA last_activity > 7 giorni
 * 3. ATTIVI: ha sbloccato >= 1 lead AND last_activity <= 7 giorni
 *
 * Usato da: GitHub Actions workflow newsletter.yml
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { smtpEmail } from '@/lib/services/smtp-email'
import {
  getUserPreferences,
  getPersonalizedLeads,
  getCompetitionMetrics,
  getSampleLeads,
  getUserWeeklyStats,
  getUserGamification
} from '@/lib/services/newsletter-personalization'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Tipo per i risultati
interface NewsletterResults {
  nuovi: { sent: number; failed: number }
  dormienti: { sent: number; failed: number }
  attivi: { sent: number; failed: number }
  skipped: number
  errors: string[]
}

export async function POST(request: NextRequest) {
  return runNewsletterCron(request)
}

export async function GET(request: NextRequest) {
  // Supporto per Vercel Cron
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')

  if (isVercelCron) {
    return runNewsletterCron(request)
  }

  // Info endpoint per test
  return NextResponse.json({
    service: 'newsletter-cron',
    status: 'ready',
    description: 'Newsletter settimanale TrovaMi',
    segments: ['nuovi', 'dormienti', 'attivi'],
    timestamp: new Date().toISOString()
  })
}

async function runNewsletterCron(request: NextRequest): Promise<NextResponse> {
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
      console.warn('⚠️ Newsletter cron: Accesso non autorizzato')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('\n📬 ========================================')
    console.log('📬 STARTING WEEKLY NEWSLETTER CRON')
    console.log(`📬 Timestamp: ${new Date().toISOString()}`)
    console.log('📬 ========================================\n')

    const results: NewsletterResults = {
      nuovi: { sent: 0, failed: 0 },
      dormienti: { sent: 0, failed: 0 },
      attivi: { sent: 0, failed: 0 },
      skipped: 0,
      errors: []
    }

    // Metriche condivise (calcolate una volta sola)
    const competitionMetrics = await getCompetitionMetrics()
    const sampleLeads = await getSampleLeads(3)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // =====================================================
    // SEGMENT 1: NUOVI (Mai usato crediti)
    // =====================================================
    console.log('\n📧 [NUOVI] Processing segment...')

    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, unsubscribe_token, credits_remaining')
      .eq('newsletter_subscribed', true)
      .eq('status', 'active')
      .not('email', 'is', null)

    if (usersError) {
      results.errors.push(`Query utenti fallita: ${usersError.message}`)
      console.error('❌ Errore query utenti:', usersError)
    } else {
      // Filtra NUOVI: credits = 5 e mai sbloccato
      for (const user of allUsers || []) {
        if (user.credits_remaining !== 5) continue

        const { count } = await supabase
          .from('user_unlocked_leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if (count === 0) {
          try {
            const success = await smtpEmail.sendNewsletterNuovi(
              user.email,
              user.unsubscribe_token,
              {
                usersStartedThisWeek: competitionMetrics.usersActiveThisWeek,
                sampleLeads
              }
            )

            if (success) {
              results.nuovi.sent++
              await logNewsletter(user.id, 'newsletter_nuovi')
              console.log(`  ✅ NUOVI: ${user.email}`)
            } else {
              results.nuovi.failed++
            }
          } catch (err) {
            results.nuovi.failed++
            results.errors.push(`NUOVI ${user.email}: ${err}`)
            console.error(`  ❌ NUOVI: ${user.email}`, err)
          }
        }
      }
    }

    // =====================================================
    // SEGMENT 2: DORMIENTI (Inattivi > 7 giorni)
    // =====================================================
    console.log('\n📧 [DORMIENTI] Processing segment...')

    for (const user of allUsers || []) {
      // Salta se già processato come NUOVI
      if (user.credits_remaining === 5) {
        const { count } = await supabase
          .from('user_unlocked_leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if (count === 0) continue
      }

      // Verifica ultimo unlock
      const { data: lastUnlock } = await supabase
        .from('user_unlocked_leads')
        .select('unlocked_at')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(1)
        .single()

      // Se ha unlock E ultimo unlock > 7 giorni fa = DORMIENTE
      if (lastUnlock && new Date(lastUnlock.unlocked_at) < sevenDaysAgo) {
        try {
          const preferences = await getUserPreferences(user.id)
          const { leads, newLeadsCount } = await getPersonalizedLeads(user.id, preferences, 4)

          const success = await smtpEmail.sendNewsletterDormienti(
            user.email,
            user.unsubscribe_token,
            {
              personalizedLeads: leads,
              preferredCategories: preferences.categories,
              preferredCities: preferences.cities,
              leadsUnlockedByOthersInArea: competitionMetrics.unlockedByOthers,
              newLeadsMatchingPreferences: newLeadsCount || leads.length
            }
          )

          if (success) {
            results.dormienti.sent++
            await logNewsletter(user.id, 'newsletter_dormienti')
            console.log(`  ✅ DORMIENTI: ${user.email}`)
          } else {
            results.dormienti.failed++
          }
        } catch (err) {
          results.dormienti.failed++
          results.errors.push(`DORMIENTI ${user.email}: ${err}`)
          console.error(`  ❌ DORMIENTI: ${user.email}`, err)
        }
      }
    }

    // =====================================================
    // SEGMENT 3: ATTIVI (Attivi negli ultimi 7 giorni)
    // =====================================================
    console.log('\n📧 [ATTIVI] Processing segment...')

    for (const user of allUsers || []) {
      // Salta NUOVI
      if (user.credits_remaining === 5) {
        const { count } = await supabase
          .from('user_unlocked_leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        if (count === 0) continue
      }

      // Verifica ultimo unlock
      const { data: lastUnlock } = await supabase
        .from('user_unlocked_leads')
        .select('unlocked_at')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(1)
        .single()

      // Se ha unlock E ultimo unlock <= 7 giorni fa = ATTIVO
      if (lastUnlock && new Date(lastUnlock.unlocked_at) >= sevenDaysAgo) {
        try {
          const weeklyStats = await getUserWeeklyStats(user.id)
          const gamification = await getUserGamification(user.id)

          const success = await smtpEmail.sendNewsletterAttivi(
            user.email,
            user.unsubscribe_token,
            {
              weeklyStats,
              gamification,
              successStory: {
                title: 'Marco ha chiuso 3 deal questa settimana!',
                summary: 'Concentrandosi sui ristoranti senza Google Analytics, Marco ha proposto audit gratuiti e convertito 3 clienti.'
              },
              newFeatures: []
            }
          )

          if (success) {
            results.attivi.sent++
            await logNewsletter(user.id, 'newsletter_attivi')
            console.log(`  ✅ ATTIVI: ${user.email}`)
          } else {
            results.attivi.failed++
          }
        } catch (err) {
          results.attivi.failed++
          results.errors.push(`ATTIVI ${user.email}: ${err}`)
          console.error(`  ❌ ATTIVI: ${user.email}`, err)
        }
      }
    }

    // =====================================================
    // SUMMARY
    // =====================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const totalSent = results.nuovi.sent + results.dormienti.sent + results.attivi.sent
    const totalFailed = results.nuovi.failed + results.dormienti.failed + results.attivi.failed

    console.log('\n📊 ========================================')
    console.log('📊 NEWSLETTER CRON SUMMARY')
    console.log('📊 ========================================')
    console.log(`📧 NUOVI:     sent=${results.nuovi.sent}, failed=${results.nuovi.failed}`)
    console.log(`📧 DORMIENTI: sent=${results.dormienti.sent}, failed=${results.dormienti.failed}`)
    console.log(`📧 ATTIVI:    sent=${results.attivi.sent}, failed=${results.attivi.failed}`)
    console.log(`📧 TOTALE:    sent=${totalSent}, failed=${totalFailed}`)
    console.log(`⏱️  Durata: ${duration}s`)
    console.log(`❌ Errori: ${results.errors.length}`)
    console.log('📊 ========================================\n')

    return NextResponse.json({
      success: true,
      ...results,
      totals: { sent: totalSent, failed: totalFailed },
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🚨 CRITICAL ERROR newsletter cron:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Log invio newsletter nel database
 */
async function logNewsletter(userId: string, type: string): Promise<void> {
  try {
    // Log in notification_logs
    await supabase.from('notification_logs').insert({
      user_id: userId,
      notification_type: type,
      channel: 'email',
      subject: `Newsletter ${type.replace('newsletter_', '')}`,
      status: 'sent'
    })

    // Aggiorna timestamp ultimo invio
    await supabase
      .from('users')
      .update({ newsletter_last_sent_at: new Date().toISOString() })
      .eq('id', userId)
  } catch (err) {
    console.error('⚠️ Errore logging newsletter:', err)
  }
}
