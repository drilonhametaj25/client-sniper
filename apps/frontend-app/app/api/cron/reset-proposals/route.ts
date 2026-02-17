/**
 * Cron Job - Reset Proposte TrovaMi
 *
 * Reset automatico delle proposte:
 * - FREE: 1 proposta ogni settimana (reset domenica)
 * - STARTER: 25 proposte ogni mese
 * - AGENCY: illimitate (nessun reset)
 *
 * Chiamato da: GitHub Actions (daily a mezzanotte UTC)
 * Autenticazione: CRON_SECRET header
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds timeout

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
    // Verifica autenticazione cron
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      console.log('Cron secret mismatch')
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const supabase = getSupabaseAdmin()
    const now = new Date()
    const results = {
      weeklyResets: 0,
      monthlyResets: 0,
      errors: [] as string[]
    }

    console.log(`[Reset Proposals] Inizio job: ${now.toISOString()}`)

    // ===================================================
    // RESET SETTIMANALE (Piano FREE)
    // Reset ogni domenica a mezzanotte
    // ===================================================
    const { data: weeklyUsers, error: weeklyError } = await supabase
      .from('users')
      .select('id, email, proposals_reset_date, proposals_reset_type')
      .eq('proposals_reset_type', 'weekly')
      .lte('proposals_reset_date', now.toISOString())

    if (weeklyError) {
      console.error('Errore fetch utenti weekly:', weeklyError)
      results.errors.push(`Weekly fetch: ${weeklyError.message}`)
    } else if (weeklyUsers && weeklyUsers.length > 0) {
      console.log(`[Weekly] Trovati ${weeklyUsers.length} utenti da resettare`)

      // Calcola prossima domenica
      const nextSunday = getNextSunday()

      const { error: updateError, count } = await supabase
        .from('users')
        .update({
          proposals_remaining: 1,
          proposals_reset_date: nextSunday.toISOString()
        })
        .eq('proposals_reset_type', 'weekly')
        .lte('proposals_reset_date', now.toISOString())

      if (updateError) {
        console.error('Errore update weekly:', updateError)
        results.errors.push(`Weekly update: ${updateError.message}`)
      } else {
        results.weeklyResets = count || weeklyUsers.length
        console.log(`[Weekly] Resettati ${results.weeklyResets} utenti`)
      }
    }

    // ===================================================
    // RESET MENSILE (Piano STARTER)
    // Reset al giorno di rinnovo di ciascun utente
    // ===================================================
    const { data: monthlyUsers, error: monthlyError } = await supabase
      .from('users')
      .select('id, email, plan, proposals_reset_date, proposals_reset_type')
      .eq('proposals_reset_type', 'monthly')
      .lte('proposals_reset_date', now.toISOString())

    if (monthlyError) {
      console.error('Errore fetch utenti monthly:', monthlyError)
      results.errors.push(`Monthly fetch: ${monthlyError.message}`)
    } else if (monthlyUsers && monthlyUsers.length > 0) {
      console.log(`[Monthly] Trovati ${monthlyUsers.length} utenti da resettare`)

      // Ottieni max_proposals dal piano
      const { data: planData } = await supabase
        .from('plans')
        .select('name, max_proposals')
        .in('name', ['starter_monthly', 'starter_annual'])

      const planProposals: Record<string, number> = {}
      planData?.forEach(p => {
        planProposals[p.name] = p.max_proposals || 25
      })

      // Reset ogni utente
      for (const user of monthlyUsers) {
        const maxProposals = planProposals[user.plan] || 25
        const nextResetDate = new Date(now)
        nextResetDate.setMonth(nextResetDate.getMonth() + 1)

        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            proposals_remaining: maxProposals,
            proposals_reset_date: nextResetDate.toISOString()
          })
          .eq('id', user.id)

        if (userUpdateError) {
          console.error(`Errore reset user ${user.id}:`, userUpdateError)
          results.errors.push(`User ${user.id}: ${userUpdateError.message}`)
        } else {
          results.monthlyResets++
        }
      }

      console.log(`[Monthly] Resettati ${results.monthlyResets} utenti`)
    }

    // ===================================================
    // LOG OPERAZIONE
    // ===================================================
    try {
      await supabase
        .from('cron_logs')
        .insert({
          job_name: 'reset-proposals',
          executed_at: now.toISOString(),
          results: {
            weekly_resets: results.weeklyResets,
            monthly_resets: results.monthlyResets,
            errors: results.errors
          },
          success: results.errors.length === 0
        })
    } catch (logError) {
      console.error('Errore log cron:', logError)
    }

    console.log(`[Reset Proposals] Completato: weekly=${results.weeklyResets}, monthly=${results.monthlyResets}`)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results: {
        weeklyResets: results.weeklyResets,
        monthlyResets: results.monthlyResets,
        errors: results.errors.length > 0 ? results.errors : undefined
      }
    })

  } catch (error) {
    console.error('Errore cron reset-proposals:', error)
    return NextResponse.json(
      {
        error: 'Errore interno',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST per trigger manuale (da admin)
export async function POST(request: NextRequest) {
  // Stessa logica di GET ma con auth diversa
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // Verifica che sia admin
  const token = authHeader.replace('Bearer ', '')
  const supabase = getSupabaseAdmin()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  // Crea fake request per GET
  const fakeRequest = new Request(request.url, {
    headers: { 'x-cron-secret': process.env.CRON_SECRET! }
  }) as NextRequest

  return GET(fakeRequest)
}

// Helper: prossima domenica
function getNextSunday(): Date {
  const now = new Date()
  const daysUntilSunday = 7 - now.getDay()
  const nextSunday = new Date(now)
  nextSunday.setDate(now.getDate() + (daysUntilSunday === 7 ? 7 : daysUntilSunday))
  nextSunday.setHours(0, 0, 0, 0)
  return nextSunday
}
