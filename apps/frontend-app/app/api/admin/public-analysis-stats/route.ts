/**
 * API endpoint per statistiche admin sull'uso dell'analisi pubblica
 * Mostra utilizzo giornaliero, IP più attivi, paesi di origine, etc.
 * Accessibile solo agli amministratori
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Verifica che l'utente sia admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Verifica ruolo admin
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    // Recupera statistiche
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Analisi oggi
    const { data: todayStats, error: todayError } = await supabase
      .from('public_analysis_usage')
      .select('*')
      .eq('analysis_date', today)

    // Analisi ultimi 7 giorni
    const { data: weekStats, error: weekError } = await supabase
      .from('public_analysis_usage')
      .select('*')
      .gte('analysis_date', sevenDaysAgo)

    // Top IP per utilizzo
    const { data: topIPs, error: topIPsError } = await supabase
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
