/**
 * API per analytics CRM avanzate
 * Fornisce metriche di conversione, pipeline, tempo medio per stato
 * Solo per utenti PRO autenticati
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Stima valore medio per lead (in euro) - configurabile
const ESTIMATED_VALUE_PER_LEAD = {
  closed_positive: 500, // Valore medio deal chiuso
  in_negotiation: 300,  // Valore potenziale in trattativa
  to_contact: 100,      // Valore potenziale da contattare
  follow_up: 150,       // Valore potenziale follow-up
  on_hold: 50,          // Valore basso in attesa
  closed_negative: 0    // Nessun valore
}

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verifica piano PRO
    const { data: userData } = await getSupabaseAdmin()
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (!userData || !isStarterOrHigher(userData.plan || '')) {
      return NextResponse.json({
        error: 'Piano PRO richiesto per analytics'
      }, { status: 403 })
    }

    // Parametri di query
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // giorni
    const periodDays = Math.min(parseInt(period), 365)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Query tutte le entry CRM dell'utente
    const { data: entries, error: entriesError } = await getSupabaseAdmin()
      .from('crm_entries')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        follow_up_date,
        leads!crm_entries_lead_id_fkey (
          score,
          category,
          city
        )
      `)
      .eq('user_id', user.id)

    if (entriesError) {
      console.error('Analytics query error:', entriesError)
      return NextResponse.json({ error: 'Errore recupero dati' }, { status: 500 })
    }

    const allEntries = entries || []

    // Filtra entries nel periodo per alcune metriche
    const recentEntries = allEntries.filter(e =>
      new Date(e.created_at) >= startDate
    )

    // === CALCOLO METRICHE ===

    // 1. Distribuzione per stato
    const statusDistribution: Record<string, number> = {
      to_contact: 0,
      in_negotiation: 0,
      closed_positive: 0,
      closed_negative: 0,
      on_hold: 0,
      follow_up: 0
    }

    allEntries.forEach(e => {
      if (statusDistribution.hasOwnProperty(e.status)) {
        statusDistribution[e.status]++
      }
    })

    // 2. Conversion rate
    const totalContacted = statusDistribution.in_negotiation +
      statusDistribution.closed_positive +
      statusDistribution.closed_negative +
      statusDistribution.follow_up

    const conversionRate = allEntries.length > 0
      ? (statusDistribution.closed_positive / allEntries.length) * 100
      : 0

    const contactRate = allEntries.length > 0
      ? (totalContacted / allEntries.length) * 100
      : 0

    // 3. Pipeline value
    let pipelineValue = 0
    let closedValue = 0

    allEntries.forEach(e => {
      const value = ESTIMATED_VALUE_PER_LEAD[e.status as keyof typeof ESTIMATED_VALUE_PER_LEAD] || 0
      if (e.status === 'closed_positive') {
        closedValue += value
      } else {
        pipelineValue += value
      }
    })

    // 4. Tempo medio per stato (in giorni)
    const statusDurations: Record<string, number[]> = {}
    const now = new Date()

    allEntries.forEach(e => {
      const created = new Date(e.created_at)
      const updated = new Date(e.updated_at)
      const daysInStatus = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

      if (!statusDurations[e.status]) {
        statusDurations[e.status] = []
      }
      statusDurations[e.status].push(daysInStatus)
    })

    const avgTimePerStatus: Record<string, number> = {}
    Object.entries(statusDurations).forEach(([status, durations]) => {
      avgTimePerStatus[status] = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0
    })

    // 5. Follow-up scaduti
    const overdueFollowUps = allEntries.filter(e =>
      e.follow_up_date && new Date(e.follow_up_date) < now
    ).length

    const upcomingFollowUps = allEntries.filter(e => {
      if (!e.follow_up_date) return false
      const followUp = new Date(e.follow_up_date)
      const in7Days = new Date()
      in7Days.setDate(in7Days.getDate() + 7)
      return followUp >= now && followUp <= in7Days
    }).length

    // 6. Attività nel periodo (entries create per settimana)
    const activityByWeek: Record<string, number> = {}
    recentEntries.forEach(e => {
      const date = new Date(e.created_at)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]

      activityByWeek[weekKey] = (activityByWeek[weekKey] || 0) + 1
    })

    // 7. Top categorie
    const categoryCount: Record<string, number> = {}
    allEntries.forEach(e => {
      const category = (e.leads as any)?.category || 'Altro'
      categoryCount[category] = (categoryCount[category] || 0) + 1
    })

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // 8. Top città
    const cityCount: Record<string, number> = {}
    allEntries.forEach(e => {
      const city = (e.leads as any)?.city || 'Altro'
      cityCount[city] = (cityCount[city] || 0) + 1
    })

    const topCities = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // 9. Score medio per stato
    const scoreByStatus: Record<string, { total: number; count: number }> = {}
    allEntries.forEach(e => {
      const score = (e.leads as any)?.score || 0
      if (!scoreByStatus[e.status]) {
        scoreByStatus[e.status] = { total: 0, count: 0 }
      }
      scoreByStatus[e.status].total += score
      scoreByStatus[e.status].count++
    })

    const avgScoreByStatus: Record<string, number> = {}
    Object.entries(scoreByStatus).forEach(([status, data]) => {
      avgScoreByStatus[status] = data.count > 0
        ? Math.round(data.total / data.count)
        : 0
    })

    // === RISPOSTA ===
    return NextResponse.json({
      period: {
        days: periodDays,
        from: startDate.toISOString(),
        to: new Date().toISOString()
      },
      summary: {
        totalEntries: allEntries.length,
        newInPeriod: recentEntries.length,
        conversionRate: Math.round(conversionRate * 10) / 10,
        contactRate: Math.round(contactRate * 10) / 10,
        pipelineValue,
        closedValue,
        overdueFollowUps,
        upcomingFollowUps
      },
      distribution: statusDistribution,
      avgTimePerStatus,
      avgScoreByStatus,
      activityByWeek,
      topCategories,
      topCities,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('CRM analytics error:', error)
    return NextResponse.json({
      error: 'Errore calcolo analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
