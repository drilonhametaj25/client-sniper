/**
 * CRON JOB: Drip Campaigns - Email Sequences Processor
 * Eseguito OGNI ORA via GitHub Actions
 *
 * Responsabilità:
 * 1. Processa sequenze drip in attesa (welcome, reengagement)
 * 2. Avvia sequenze welcome per nuovi utenti
 * 3. Traccia statistiche e risultati
 *
 * Usato da: GitHub Actions workflow drip-campaigns.yml
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  getPendingSequences,
  processSequenceStep,
  startWelcomeForNewUsers,
  getSequenceStats,
  startSequence
} from '@/lib/services/email-sequences'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CronResults {
  sequences: {
    processed: number
    sent: number
    stopped: number
    failed: number
    completed: number
  }
  newWelcome: number
  newReengagement: number
  errors: string[]
}

export async function POST(request: NextRequest) {
  return runDripCron(request)
}

export async function GET(request: NextRequest) {
  // Supporto per Vercel Cron
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')

  if (isVercelCron) {
    return runDripCron(request)
  }

  // Info endpoint per test
  const stats = await getSequenceStats()
  return NextResponse.json({
    service: 'drip-campaigns-cron',
    status: 'ready',
    description: 'Processa sequenze email drip (welcome, reengagement)',
    frequency: 'every hour',
    stats,
    timestamp: new Date().toISOString()
  })
}

async function runDripCron(request: NextRequest): Promise<NextResponse> {
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
      console.warn('⚠️ Drip cron: Accesso non autorizzato')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('\n🌊 ========================================')
    console.log('🌊 STARTING DRIP CAMPAIGNS CRON')
    console.log(`🌊 Timestamp: ${new Date().toISOString()}`)
    console.log('🌊 ========================================\n')

    const results: CronResults = {
      sequences: {
        processed: 0,
        sent: 0,
        stopped: 0,
        failed: 0,
        completed: 0
      },
      newWelcome: 0,
      newReengagement: 0,
      errors: []
    }

    // =====================================================
    // STEP 1: Processa sequenze in attesa
    // =====================================================
    console.log('📧 [STEP 1] Processing pending sequences...')

    const pendingSequences = await getPendingSequences()
    console.log(`   Found ${pendingSequences.length} pending sequences`)

    for (const sequence of pendingSequences) {
      try {
        results.sequences.processed++
        const result = await processSequenceStep(sequence)

        if (result.success) {
          if (result.action.startsWith('sent_')) {
            results.sequences.sent++
            console.log(`   ✅ Sent ${result.action.replace('sent_', '')} to user ${sequence.user_id}`)
          } else if (result.action.includes('stopped')) {
            results.sequences.stopped++
            console.log(`   ⏹️  Stopped sequence for user ${sequence.user_id}: ${result.action}`)
          } else if (result.action === 'completed') {
            results.sequences.completed++
            console.log(`   ✓  Completed sequence for user ${sequence.user_id}`)
          }
        } else {
          results.sequences.failed++
          results.errors.push(`Sequence ${sequence.id}: ${result.action}`)
          console.log(`   ❌ Failed ${sequence.id}: ${result.action}`)
        }
      } catch (err) {
        results.sequences.failed++
        results.errors.push(`Sequence ${sequence.id}: ${err}`)
        console.error(`   ❌ Error processing sequence ${sequence.id}:`, err)
      }
    }

    // =====================================================
    // STEP 2: Avvia welcome per nuovi utenti
    // =====================================================
    console.log('\n📧 [STEP 2] Starting welcome sequences for new users...')

    try {
      results.newWelcome = await startWelcomeForNewUsers()
      console.log(`   ✅ Started ${results.newWelcome} new welcome sequences`)
    } catch (err) {
      results.errors.push(`Start welcome: ${err}`)
      console.error('   ❌ Error starting welcome sequences:', err)
    }

    // =====================================================
    // STEP 3: Avvia reengagement per utenti inattivi
    // =====================================================
    console.log('\n📧 [STEP 3] Checking for inactive users to re-engage...')

    try {
      const reengagementCount = await startReengagementSequences()
      results.newReengagement = reengagementCount
      console.log(`   ✅ Started ${reengagementCount} new reengagement sequences`)
    } catch (err) {
      results.errors.push(`Start reengagement: ${err}`)
      console.error('   ❌ Error starting reengagement sequences:', err)
    }

    // =====================================================
    // SUMMARY
    // =====================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const stats = await getSequenceStats()

    console.log('\n📊 ========================================')
    console.log('📊 DRIP CAMPAIGNS CRON SUMMARY')
    console.log('📊 ========================================')
    console.log(`📧 Processed:   ${results.sequences.processed}`)
    console.log(`📧 Sent:        ${results.sequences.sent}`)
    console.log(`📧 Stopped:     ${results.sequences.stopped}`)
    console.log(`📧 Completed:   ${results.sequences.completed}`)
    console.log(`📧 Failed:      ${results.sequences.failed}`)
    console.log(`📧 New Welcome: ${results.newWelcome}`)
    console.log(`📧 New Reengage:${results.newReengagement}`)
    console.log(`⏱️  Durata:     ${duration}s`)
    console.log(`❌ Errori:     ${results.errors.length}`)
    console.log('📊 ----------------------------------------')
    console.log(`📊 Active Welcome:      ${stats.active.welcome}`)
    console.log(`📊 Active Reengagement: ${stats.active.reengagement}`)
    console.log('📊 ========================================\n')

    return NextResponse.json({
      success: true,
      ...results,
      stats,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('🚨 CRITICAL ERROR drip-campaigns cron:', error)
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
 * Trova utenti inattivi e avvia sequenza reengagement
 */
async function startReengagementSequences(): Promise<number> {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  // Trova utenti che hanno sbloccato lead ma sono inattivi da 3+ giorni
  const { data: inactiveUsers, error } = await supabase
    .from('users')
    .select(`
      id,
      newsletter_subscribed,
      status,
      user_unlocked_leads (
        id,
        unlocked_at
      )
    `)
    .eq('newsletter_subscribed', true)
    .eq('status', 'active')

  if (error || !inactiveUsers) {
    console.error('Error fetching inactive users:', error)
    return 0
  }

  let started = 0

  for (const user of inactiveUsers) {
    // Deve avere almeno 1 unlock
    const unlocks = user.user_unlocked_leads as any[]
    if (!unlocks || unlocks.length === 0) continue

    // Ordina per ultimo unlock
    const sortedUnlocks = unlocks.sort(
      (a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
    )
    const lastUnlockDate = new Date(sortedUnlocks[0].unlocked_at)

    // Se inattivo da più di 3 giorni
    if (lastUnlockDate < threeDaysAgo) {
      // Verifica che non abbia già una sequenza reengagement attiva
      const { data: existingSeq } = await supabase
        .from('email_sequences')
        .select('id')
        .eq('user_id', user.id)
        .eq('sequence_type', 'reengagement')
        .is('completed_at', null)
        .single()

      if (!existingSeq) {
        const result = await startSequence(user.id, 'reengagement', {
          reason: 'inactivity_detected',
          last_activity: sortedUnlocks[0].unlocked_at
        })
        if (result.success) started++
      }
    }
  }

  return started
}
