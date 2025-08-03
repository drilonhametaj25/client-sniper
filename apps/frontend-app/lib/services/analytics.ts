/**
 * Analytics Service
 * Servizio per il recupero e l'aggregazione dei dati di analytics
 * 
 * Utilizzato da: componenti analytics dashboard
 * Dipende da: Supabase client, types/analytics
 */

import { createClient } from '@supabase/supabase-js'
import { getCityCoordinates, getCityCoordinatesWithFallback } from '@/lib/data/italian-cities'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type SupabaseClient = ReturnType<typeof createClient>

export interface AnalyticsOverview {
  totalLeads: number
  totalConversions: number
  conversionRate: number
  totalRevenue: number
  averageROI: number
  weeklyGrowth: number
}

export interface GeographicData {
  city: string
  region: string
  lat: number
  lng: number
  leadCount: number
  conversionCount: number
  score: number
}

export interface ConversionData {
  date: string
  leads: number
  conversions: number
  conversionRate: number
  revenue: number
}

export interface ROIData {
  period: string
  investment: number
  revenue: number
  roi: number
  profit: number
}

export class AnalyticsService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    try {
      // SISTEMATO: Usa sempre query dirette per evitare errori di viste mancanti
      // SISTEMATO: Conta tutti i lead usando count() invece di select() per evitare il limite di 1000
      const { count: totalLeads, error: leadsCountError } = await this.supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      if (leadsCountError) {
        console.error('Error counting leads:', leadsCountError)
        throw leadsCountError
      }

      const { count: totalConversions, error: conversionsCountError } = await this.supabase
        .from('lead_conversions')
        .select('*', { count: 'exact', head: true })

      if (conversionsCountError) {
        console.warn('Error counting conversions:', conversionsCountError)
        // Non bloccare se le conversioni non esistono ancora
      }

      // Per il calcolo della crescita settimanale, prendiamo solo le date necessarie
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      
      const { count: currentWeekLeads, error: currentWeekError } = await this.supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString())

      const { count: previousWeekLeads, error: previousWeekError } = await this.supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', oneWeekAgo.toISOString())

      const weeklyGrowth = (previousWeekLeads && previousWeekLeads > 0) 
        ? (((currentWeekLeads || 0) - previousWeekLeads) / previousWeekLeads) * 100 
        : 0

      const totalLeadsCount = totalLeads || 0
      const totalConversionsCount = totalConversions || 0
      const conversionRate = totalLeadsCount > 0 ? (totalConversionsCount / totalLeadsCount) * 100 : 0

      console.log(`Analytics Overview: ${totalLeadsCount} lead totali, ${totalConversionsCount} conversioni`) // SISTEMATO: Log per debug

      return {
        totalLeads: totalLeadsCount,
        totalConversions: totalConversionsCount,
        conversionRate,
        totalRevenue: totalConversionsCount * 50, // Stima revenue per conversione
        averageROI: conversionRate > 0 ? conversionRate * 2 : 0, // Stima ROI
        weeklyGrowth,
      }
    } catch (error) {
      console.error('Error fetching analytics overview:', error)
      return {
        totalLeads: 0,
        totalConversions: 0,
        conversionRate: 0,
        totalRevenue: 0,
        averageROI: 0,
        weeklyGrowth: 0,
      }
    }
  }

  async getGeographicData(): Promise<GeographicData[]> {
    try {
      // SISTEMATO: Recupera TUTTI i lead usando paginazione se necessario
      let allLeads: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: leadsPage, error: leadsError } = await this.supabase
          .from('leads')
          .select('city, analysis, score')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (leadsError) {
          console.error('Error fetching geographic data:', leadsError)
          throw leadsError
        }

        if (leadsPage && leadsPage.length > 0) {
          allLeads = [...allLeads, ...leadsPage]
          hasMore = leadsPage.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      console.log(`Geographic Data: Recuperati ${allLeads.length} lead totali`) // SISTEMATO: Log per debug

      if (allLeads.length > 0) {
        // Aggrega i dati manualmente
        const cityMap = new Map<string, { count: number; totalScore: number }>()
        
        allLeads.forEach((lead: any) => {
          // Se non c'è città, usa "Località non specificata" 
          const city = String(lead.city || 'Località non specificata')
          const score = Number(lead.analysis?.score) || Number(lead.score) || 0
          
          if (cityMap.has(city)) {
            const existing = cityMap.get(city)!
            existing.count += 1
            existing.totalScore += score
          } else {
            cityMap.set(city, { count: 1, totalScore: score })
          }
        })

        return Array.from(cityMap.entries()).map(([city, data]) => {
          let coords: { lat: number; lng: number }
          let region: string
          
          if (city === 'Località non specificata') {
            // Usa coordinate del centro Italia per lead senza città
            coords = { lat: 41.9, lng: 12.5 }
            region = 'Italia'
          } else {
            coords = getCityCoordinatesWithFallback(city)
            const cityInfo = getCityCoordinates(city)
            region = cityInfo?.region || 'Unknown'
          }
          
          return {
            city,
            region,
            lat: coords.lat,
            lng: coords.lng,
            leadCount: data.count,
            conversionCount: 0,
            score: data.totalScore / data.count,
          }
        })
      }

      return []
    } catch (error) {
      console.error('Error fetching geographic data:', error)
      return []
    }
  }

  async getConversionData(period: '7d' | '30d' | '90d' | 'all' = '30d'): Promise<ConversionData[]> {
    try {
      // SISTEMATO: Recupera TUTTI i lead usando paginazione se necessario
      let allLeads: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        let leadsQuery = this.supabase
          .from('leads')
          .select('created_at, analysis')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          
        // Solo aggiunge filtro data se non è "all"
        if (period !== 'all') {
          leadsQuery = leadsQuery.gte('created_at', this.getDateRange(period))
        }
        
        const { data: leadsPage, error: leadsError } = await leadsQuery.order('created_at', { ascending: true })

        if (leadsError) {
          console.error('Error fetching conversion data:', leadsError)
          throw leadsError
        }

        if (leadsPage && leadsPage.length > 0) {
          allLeads = [...allLeads, ...leadsPage]
          hasMore = leadsPage.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      if (allLeads.length > 0) {
        // Aggrega per giorno
        const dailyMap = new Map<string, { leads: number; conversions: number }>()
        
        allLeads.forEach((lead: any) => {
          const date = new Date(lead.created_at).toISOString().split('T')[0]
          const isConverted = lead.analysis?.converted || false
          
          if (dailyMap.has(date)) {
            const existing = dailyMap.get(date)!
            existing.leads += 1
            if (isConverted) existing.conversions += 1
          } else {
            dailyMap.set(date, { leads: 1, conversions: isConverted ? 1 : 0 })
          }
        })

        return Array.from(dailyMap.entries()).map(([date, data]) => ({
          date,
          leads: data.leads,
          conversions: data.conversions,
          conversionRate: data.leads > 0 ? (data.conversions / data.leads) * 100 : 0,
          revenue: data.conversions * 50, // Stima revenue per conversione
        }))
      }

      return []
    } catch (error) {
      console.error('Error fetching conversion data:', error)
      return []
    }
  }

  async getROIData(period: '7d' | '30d' | '90d' | 'all' = '30d'): Promise<ROIData[]> {
    try {
      // SISTEMATO: Usa sempre query dirette per evitare errori di viste mancanti
      const conversionData = await this.getConversionData(period)
      return conversionData.map(item => {
        const investment = item.leads * 2 // Stima costo per lead
        const revenue = item.revenue
        const profit = revenue - investment
        const roi = investment > 0 ? (profit / investment) * 100 : 0

        return {
          period: item.date,
          investment,
          revenue,
          roi,
          profit,
        }
      })
    } catch (error) {
      console.error('Error fetching ROI data:', error)
      return []
    }
  }

  async trackEvent(eventType: string, metadata?: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('analytics_events')
        .insert({
          event_type: eventType,
          metadata: metadata || {},
          created_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (error) {
      console.error('Error tracking event:', error)
    }
  }

  async exportReport(format: 'csv' | 'pdf' | 'json', period: '7d' | '30d' | '90d' | 'all' = '30d'): Promise<Blob> {
    try {
      const [overview, geographic, conversion, roi] = await Promise.all([
        this.getAnalyticsOverview(),
        this.getGeographicData(),
        this.getConversionData(period),
        this.getROIData(period),
      ])

      const reportData = {
        overview,
        geographic,
        conversion,
        roi,
        exportedAt: new Date().toISOString(),
        period,
      }

      if (format === 'json') {
        return new Blob([JSON.stringify(reportData, null, 2)], {
          type: 'application/json',
        })
      }

      if (format === 'csv') {
        const csvContent = this.convertToCSV(reportData)
        return new Blob([csvContent], { type: 'text/csv' })
      }

      // PDF export would require additional library
      throw new Error('PDF export not implemented yet')
    } catch (error) {
      console.error('Error exporting report:', error)
      throw error
    }
  }

  private getDateRange(period: '7d' | '30d' | '90d' | 'all'): string {
    if (period === 'all') {
      // Restituisce una data molto antica per recuperare tutti i dati
      return '1900-01-01'
    }
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  private convertToCSV(data: any): string {
    const headers = ['Type', 'Date', 'Value', 'Description']
    const rows = [headers.join(',')]

    // Add overview data
    rows.push(`Overview,${new Date().toISOString().split('T')[0]},${data.overview.totalLeads},Total Leads`)
    rows.push(`Overview,${new Date().toISOString().split('T')[0]},${data.overview.totalConversions},Total Conversions`)
    rows.push(`Overview,${new Date().toISOString().split('T')[0]},${data.overview.conversionRate},Conversion Rate`)

    // Add conversion data
    data.conversion.forEach((item: ConversionData) => {
      rows.push(`Conversion,${item.date},${item.leads},Leads`)
      rows.push(`Conversion,${item.date},${item.conversions},Conversions`)
      rows.push(`Conversion,${item.date},${item.conversionRate},Conversion Rate`)
    })

    return rows.join('\n')
  }
}

export const analyticsService = new AnalyticsService()
