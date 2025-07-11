/**
 * Analytics Service
 * Servizio per il recupero e l'aggregazione dei dati di analytics
 * 
 * Utilizzato da: componenti analytics dashboard
 * Dipende da: Supabase client, types/analytics
 */

import { createClient } from '@supabase/supabase-js'

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
      // Prova prima con la vista materializzata se esiste
      const { data: viewData, error: viewError } = await this.supabase
        .from('analytics_overview')
        .select('*')
        .maybeSingle()

      if (viewData && !viewError) {
        return {
          totalLeads: Number(viewData.total_leads) || 0,
          totalConversions: Number(viewData.total_conversions) || 0,
          conversionRate: Number(viewData.conversion_rate) || 0,
          totalRevenue: Number(viewData.total_revenue) || 0,
          averageROI: Number(viewData.average_roi) || 0,
          weeklyGrowth: Number(viewData.weekly_growth) || 0,
        }
      }

      // Fallback con query dirette se vista non esiste o è vuota
      const { data: leadsData, error: leadsError } = await this.supabase
        .from('leads')
        .select('id, created_at, analysis, score')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (leadsError) {
        console.error('Error fetching leads data:', leadsError)
        throw leadsError
      }

      const { data: conversionsData, error: conversionsError } = await this.supabase
        .from('lead_conversions')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (conversionsError) {
        console.warn('Error fetching conversions data:', conversionsError)
        // Non bloccare se le conversioni non esistono ancora
      }

      const totalLeads = leadsData?.length || 0
      const totalConversions = conversionsData?.length || 0
      const conversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0

      // Calcola settimana corrente vs precedente per growth
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const currentWeekLeads = leadsData?.filter((lead: any) => 
        new Date(lead.created_at) >= oneWeekAgo
      ).length || 0
      const previousWeekLeads = totalLeads - currentWeekLeads
      const weeklyGrowth = previousWeekLeads > 0 ? ((currentWeekLeads - previousWeekLeads) / previousWeekLeads) * 100 : 0

      return {
        totalLeads,
        totalConversions,
        conversionRate,
        totalRevenue: totalConversions * 50, // Stima revenue per conversione
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
      // Prova prima con la vista aggregata se esiste
      const { data: viewData, error: viewError } = await this.supabase
        .from('lead_geography_aggregated')
        .select('*')
        .order('lead_count', { ascending: false })

      if (viewData && viewData.length > 0) {
        return viewData.map((item: any) => ({
          city: String(item.city || 'Unknown'),
          region: String(item.region || 'Unknown'),
          lat: Number(item.lat) || 0,
          lng: Number(item.lng) || 0,
          leadCount: Number(item.lead_count) || 0,
          conversionCount: Number(item.conversion_count) || 0,
          score: Number(item.avg_score) || 0,
        }))
      }

      // Fallback con query diretta su leads
      const { data: leadsData, error: leadsError } = await this.supabase
        .from('leads')
        .select('city, analysis')
        .not('city', 'is', null)

      if (leadsData) {
        // Aggrega i dati manualmente
        const cityMap = new Map<string, { count: number; totalScore: number }>()
        
        leadsData.forEach((lead: any) => {
          const city = String(lead.city || 'Unknown')
          const score = Number(lead.analysis?.score) || 0
          
          if (cityMap.has(city)) {
            const existing = cityMap.get(city)!
            existing.count += 1
            existing.totalScore += score
          } else {
            cityMap.set(city, { count: 1, totalScore: score })
          }
        })

        return Array.from(cityMap.entries()).map(([city, data]) => ({
          city,
          region: 'Unknown',
          lat: 0,
          lng: 0,
          leadCount: data.count,
          conversionCount: 0,
          score: data.totalScore / data.count,
        }))
      }

      return []
    } catch (error) {
      console.error('Error fetching geographic data:', error)
      return []
    }
  }

  async getConversionData(period: '7d' | '30d' | '90d' = '30d'): Promise<ConversionData[]> {
    try {
      // Prova prima con la vista se esiste
      const { data: viewData, error: viewError } = await this.supabase
        .from('conversion_funnel_daily')
        .select('*')
        .gte('date', this.getDateRange(period))
        .order('date', { ascending: true })

      if (viewData && viewData.length > 0) {
        return viewData.map((item: any) => ({
          date: String(item.date),
          leads: Number(item.leads_count) || 0,
          conversions: Number(item.conversions_count) || 0,
          conversionRate: Number(item.conversion_rate) || 0,
          revenue: Number(item.revenue) || 0,
        }))
      }

      // Fallback con aggregazione manuale
      const { data: leadsData, error: leadsError } = await this.supabase
        .from('leads')
        .select('created_at, analysis')
        .gte('created_at', this.getDateRange(period))
        .order('created_at', { ascending: true })

      if (leadsData) {
        // Aggrega per giorno
        const dailyMap = new Map<string, { leads: number; conversions: number }>()
        
        leadsData.forEach((lead: any) => {
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

  async getROIData(period: '7d' | '30d' | '90d' = '30d'): Promise<ROIData[]> {
    try {
      // Prova prima con la vista se esiste
      const { data: viewData, error: viewError } = await this.supabase
        .from('roi_metrics_daily')
        .select('*')
        .gte('date', this.getDateRange(period))
        .order('date', { ascending: true })

      if (viewData && viewData.length > 0) {
        return viewData.map((item: any) => ({
          period: String(item.date),
          investment: Number(item.total_investment) || 0,
          revenue: Number(item.total_revenue) || 0,
          roi: Number(item.roi_percentage) || 0,
          profit: Number(item.profit) || 0,
        }))
      }

      // Fallback con calcolo manuale
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

  async exportReport(format: 'csv' | 'pdf' | 'json', period: '7d' | '30d' | '90d' = '30d'): Promise<Blob> {
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

  private getDateRange(period: '7d' | '30d' | '90d'): string {
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
