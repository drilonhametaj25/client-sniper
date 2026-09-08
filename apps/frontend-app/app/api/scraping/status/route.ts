/**
 * API per ottenere lo stato del sistema di scraping
 * Restituisce statistiche su zone, job completati e log recenti
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse
    const { user, admin } = auth

    // Verifica che sia admin (opzionale - puoi rimuovere per dare accesso a tutti)
    const { data: userData } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userData?.role === 'admin'

    // Calcola date per statistiche
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Query parallele per performance
    const [
      zonesResult,
      completedTodayResult,
      failedTodayResult,
      completedWeekResult,
      recentLogsResult,
      lastRunResult
    ] = await Promise.all([
      // Zone totali
      admin
        .from('zones_to_scrape')
        .select('*', { count: 'exact', head: true }),

      // Job completati oggi
      admin
        .from('scrape_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')
        .gte('created_at', today.toISOString()),

      // Job falliti oggi
      admin
        .from('scrape_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', today.toISOString()),

      // Job completati questa settimana
      admin
        .from('scrape_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')
        .gte('created_at', weekAgo.toISOString()),

      // Log recenti (ultimi 10)
      admin
        .from('scrape_logs')
        .select('id, source, category, location_name, status, leads_found, created_at, error_message')
        .order('created_at', { ascending: false })
        .limit(10),

      // Ultimo job
      admin
        .from('scrape_logs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    ])

    // Lead totali generati (per admin)
    let totalLeads = 0
    if (isAdmin) {
      const { count } = await admin
        .from('leads')
        .select('*', { count: 'exact', head: true })
      totalLeads = count || 0
    }

    return NextResponse.json({
      status: 'ok',
      stats: {
        totalZones: zonesResult.count || 0,
        completedToday: completedTodayResult.count || 0,
        failedToday: failedTodayResult.count || 0,
        completedThisWeek: completedWeekResult.count || 0,
        totalLeads: isAdmin ? totalLeads : undefined,
        lastRun: lastRunResult.data?.created_at || null
      },
      recentLogs: recentLogsResult.data || [],
      isAdmin
    })

  } catch (error) {
    console.error('Scraping status error:', error)
    return NextResponse.json({
      error: 'Failed to fetch scraping status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
