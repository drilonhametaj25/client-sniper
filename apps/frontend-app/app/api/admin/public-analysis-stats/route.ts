/**
 * API endpoint per statistiche admin sull'uso dell'analisi pubblica
 * Mostra utilizzo giornaliero, IP più attivi, paesi di origine, etc.
 * Accessibile solo agli amministratori
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/api/auth'

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

/**
 * Client anon usato SOLO per le query di lettura su public_analysis_usage.
 * Volutamente NON sostituito dal client service-role: le query qui sotto sono
 * aggregate globali e mantenerle sul ruolo anon preserva esattamente il
 * comportamento (e la visibilità RLS) precedente alla migrazione.
 * L'autenticazione è invece delegata a requireAdmin.
 */
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    // Verifica che l'utente sia admin (401 se non autenticato, 403 se non admin)
    const auth = await requireAdmin(request)
    if (auth.errorResponse) return auth.errorResponse

    // Recupera statistiche
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Analisi oggi
    const { data: todayStats, error: todayError } = await getSupabase()
      .from('public_analysis_usage')
      .select('*')
      .eq('analysis_date', today)

    // Analisi ultimi 7 giorni
    const { data: weekStats, error: weekError } = await getSupabase()
      .from('public_analysis_usage')
      .select('*')
      .gte('analysis_date', sevenDaysAgo)

    // Top IP per utilizzo
    const { data: topIPs, error: topIPsError } = await getSupabase()
      .from('public_analysis_usage')
      .select('ip_address')
      .gte('analysis_date', sevenDaysAgo)

    if (todayError || weekError || topIPsError) {
      console.error('Errore recupero statistiche:', { todayError, weekError, topIPsError })
      return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
    }

    // Elabora statistiche
    const ipCounts = (topIPs || []).reduce((acc, record) => {
      const ip = record.ip_address
      acc[ip] = (acc[ip] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sortedIPs = Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }))

    // Statistiche per giorno negli ultimi 7 giorni
    const dailyStats = (weekStats || []).reduce((acc, record) => {
      const date = record.analysis_date
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      today: {
        total: todayStats?.length || 0,
        uniqueIPs: new Set(todayStats?.map(r => r.ip_address) || []).size
      },
      lastWeek: {
        total: weekStats?.length || 0,
        uniqueIPs: new Set(weekStats?.map(r => r.ip_address) || []).size,
        dailyBreakdown: dailyStats
      },
      topIPs: sortedIPs,
      summary: {
        averagePerDay: Math.round((weekStats?.length || 0) / 7 * 10) / 10,
        conversionOpportunity: `${sortedIPs.filter(ip => ip.count >= 2).length} IP hanno usato 2+ analisi`
      }
    })

  } catch (error) {
    console.error('Errore statistiche pubbliche:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
