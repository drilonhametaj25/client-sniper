/**
 * API per ottenere lo stato del sistema di scraping
 * Restituisce statistiche su zone, job completati e log recenti
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

    // Verifica che sia admin (opzionale - puoi rimuovere per dare accesso a tutti)
    const { data: userData } = await getSupabaseAdmin()
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
      getSupabaseAdmin()
        .from('zones_to_scrape')
        .select('*', { count: 'exact', head: true }),

      // Job completati oggi
      getSupabaseAdmin()
        .from('scrape_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')
        .gte('created_at', today.toISOString()),

      // Job falliti oggi
      getSupabaseAdmin()
        .from('scrape_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', today.toISOString()),

      // Job completati questa settimana
      getSupabaseAdmin()
        .from('scrape_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')
        .gte('created_at', weekAgo.toISOString()),

      // Log recenti (ultimi 10)
      getSupabaseAdmin()
        .from('scrape_logs')
        .select('id, source, category, location_name, status, leads_found, created_at, error_message')
        .order('created_at', { ascending: false })
        .limit(10),

      // Ultimo job
      getSupabaseAdmin()
        .from('scrape_logs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    ])

    // Lead totali generati (per admin)
    let totalLeads = 0
    if (isAdmin) {
      const { count } = await getSupabaseAdmin()
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
