/**
 * Competitor Intelligence Analyzer
 * Analizza posizionamento competitivo: confronto con competitor locali,
 * benchmark di settore, gap analysis, market position
 */

import { createClient } from '@supabase/supabase-js'

export interface CompetitorInfo {
  id: string
  name: string
  url?: string
  category: string
  city: string
  overallScore: number
  breakdown: {
    seo: number
    performance: number
    mobile: number
    tracking: number
    gdpr: number
    content: number
  }
  strengths: string[]
  weaknesses: string[]
}

export interface BenchmarkMetric {
  metric: string
  metricLabel: string
  leadValue: number
  avgValue: number
  topValue: number
  bottomValue: number
  percentile: number // Where the lead stands (0-100)
  trend: 'above' | 'average' | 'below'
}

export interface CompetitiveGap {
  area: string
  gap: number // Difference from top competitor
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
}

export interface MarketOpportunity {
  type: string
  description: string
  competitorsDoing: number // How many competitors have this
  potentialImpact: 'high' | 'medium' | 'low'
}

export interface CompetitorAnalysis {
  // Lead info
  leadId: string
  leadScore: number
  leadCategory: string
  leadCity: string

  // Competitors
  competitors: CompetitorInfo[]
  competitorCount: number
  analyzedCompetitors: number

  // Market Position
  marketPosition: 'leader' | 'challenger' | 'follower' | 'nicher'
  marketPositionScore: number // 0-100
  ranking: number // Position among competitors
  totalInMarket: number

  // Benchmarks
  benchmarks: BenchmarkMetric[]
  overallBenchmarkScore: number // 0-100

  // Gaps
  competitiveGaps: CompetitiveGap[]
  totalGapScore: number // Sum of all gaps

  // Opportunities
  opportunities: MarketOpportunity[]

  // Summary
  summary: {
    strongerThan: number // % of competitors
    weakerThan: number // % of competitors
    mainStrength: string
    mainWeakness: string
    quickWinOpportunity: string
  }
}

export class CompetitorAnalyzer {
  private supabase

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  async analyze(
    leadId: string,
    leadCategory: string,
    leadCity: string,
    leadAnalysis: any,
    maxCompetitors: number = 10
  ): Promise<CompetitorAnalysis> {
    // Get competitors from same category and city
    const competitors = await this.getCompetitors(leadCategory, leadCity, leadId, maxCompetitors)

    // Calculate lead's breakdown scores
    const leadBreakdown = this.calculateBreakdown(leadAnalysis)
    const leadScore = this.calculateOverallScore(leadBreakdown)

    // Calculate competitor scores
    const competitorInfos = competitors.map(comp => this.processCompetitor(comp))

    // Calculate benchmarks
    const benchmarks = this.calculateBenchmarks(leadBreakdown, competitorInfos)

    // Determine market position
    const { marketPosition, marketPositionScore, ranking } = this.determineMarketPosition(
      leadScore,
      competitorInfos
    )

    // Find competitive gaps
    const competitiveGaps = this.findCompetitiveGaps(leadBreakdown, competitorInfos)

    // Identify opportunities
    const opportunities = this.identifyOpportunities(leadAnalysis, competitors)

    // Generate summary
    const summary = this.generateSummary(
      leadScore,
      competitorInfos,
      competitiveGaps,
      opportunities
    )

    return {
      leadId,
      leadScore,
      leadCategory,
      leadCity,
      competitors: competitorInfos,
      competitorCount: competitors.length,
      analyzedCompetitors: competitorInfos.length,
      marketPosition,
      marketPositionScore,
      ranking,
      totalInMarket: competitorInfos.length + 1,
      benchmarks,
      overallBenchmarkScore: this.calculateOverallBenchmarkScore(benchmarks),
      competitiveGaps,
      totalGapScore: competitiveGaps.reduce((sum, gap) => sum + gap.gap, 0),
      opportunities,
      summary
    }
  }

  private async getCompetitors(
    category: string,
    city: string,
    excludeLeadId: string,
    limit: number
  ): Promise<any[]> {
    try {
      // First try exact match
      let { data: competitors, error } = await this.supabase
        .from('leads')
        .select('id, business_name, website_url, category, city, score, analysis')
        .eq('category', category)
        .eq('city', city)
        .neq('id', excludeLeadId)
        .not('analysis', 'is', null)
        .order('score', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching competitors:', error)
        return []
      }

      // If not enough competitors, expand to nearby cities or same category
      if (!competitors || competitors.length < 3) {
        const { data: moreCompetitors } = await this.supabase
          .from('leads')
          .select('id, business_name, website_url, category, city, score, analysis')
          .eq('category', category)
          .neq('id', excludeLeadId)
          .not('analysis', 'is', null)
          .order('score', { ascending: false })
          .limit(limit * 2)

        if (moreCompetitors) {
          // Combine and dedupe
          const existingIds = new Set(competitors?.map(c => c.id) || [])
          const additional = moreCompetitors.filter(c => !existingIds.has(c.id))
          competitors = [...(competitors || []), ...additional].slice(0, limit)
        }
      }

      return competitors || []
    } catch (error) {
      console.error('Error in getCompetitors:', error)
      return []
    }
  }

  private processCompetitor(competitor: any): CompetitorInfo {
    const breakdown = this.calculateBreakdown(competitor.analysis)
    const overallScore = this.calculateOverallScore(breakdown)

    const strengths: string[] = []
    const weaknesses: string[] = []

    // Determine strengths and weaknesses
    Object.entries(breakdown).forEach(([key, value]) => {
      const label = this.getMetricLabel(key)
      if (value < 30) {
        strengths.push(`${label} ottimizzato`)
      } else if (value > 70) {
        weaknesses.push(`${label} carente`)
      }
    })

    return {
      id: competitor.id,
      name: competitor.business_name,
      url: competitor.website_url,
      category: competitor.category,
      city: competitor.city,
      overallScore,
      breakdown,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3)
    }
  }

  private calculateBreakdown(analysis: any): CompetitorInfo['breakdown'] {
    if (!analysis) {
      return { seo: 50, performance: 50, mobile: 50, tracking: 50, gdpr: 50, content: 50 }
    }

    return {
      seo: this.calculateSeoScore(analysis.seo),
      performance: this.calculatePerfScore(analysis.performance),
      mobile: this.calculateMobileScore(analysis.mobile),
      tracking: this.calculateTrackingScore(analysis.tracking),
      gdpr: this.calculateGdprScore(analysis.gdpr),
      content: this.calculateContentScore(analysis.content)
    }
  }

  private calculateSeoScore(seo: any): number {
    if (!seo) return 50
    let score = 0
    if (!seo.hasTitle) score += 25
    if (!seo.hasMetaDescription) score += 20
    if (!seo.hasH1) score += 15
    if (!seo.hasCanonical) score += 10
    if (!seo.hasStructuredData) score += 15
    if (!seo.hasOpenGraph) score += 10
    if (!seo.hasSitemap) score += 5
    return Math.min(100, score)
  }

  private calculatePerfScore(perf: any): number {
    if (!perf) return 50
    let score = 0
    if ((perf.speedScore || 100) < 50) score += 30
    else if ((perf.speedScore || 100) < 70) score += 15
    if ((perf.optimizationScore || 100) < 50) score += 25
    if ((perf.loadComplete || 0) > 5000) score += 20
    if ((perf.totalSize || 0) > 3000000) score += 15
    return Math.min(100, score)
  }

  private calculateMobileScore(mobile: any): number {
    if (!mobile) return 50
    let score = 0
    if (!mobile.isMobileFriendly) score += 40
    if (!mobile.hasViewportMeta) score += 20
    if (!mobile.hasResponsiveCss) score += 20
    if (mobile.hasHorizontalScroll) score += 10
    if (!mobile.touchTargetsOk) score += 10
    return Math.min(100, score)
  }

  private calculateTrackingScore(tracking: any): number {
    if (!tracking) return 50
    let score = 0
    if (!tracking.googleAnalytics) score += 35
    if (!tracking.googleTagManager) score += 25
    if (!tracking.facebookPixel) score += 20
    if (!tracking.googleAdsConversion) score += 20
    return Math.min(100, score)
  }

  private calculateGdprScore(gdpr: any): number {
    if (!gdpr) return 50
    let score = 0
    if (!gdpr.hasCookieBanner) score += 30
    if (!gdpr.hasPrivacyPolicy) score += 30
    if (!gdpr.hasContactInfo) score += 20
    if (!gdpr.hasVatNumber) score += 20
    return Math.min(100, score)
  }

  private calculateContentScore(content: any): number {
    if (!content) return 50
    let score = 0
    if (!content.hasContactForm) score += 25
    if ((content.wordCount || 0) < 300) score += 25
    if (!content.hasSocialLinks) score += 15
    if (!content.hasBusinessHours) score += 15
    return Math.min(100, score)
  }

  private calculateOverallScore(breakdown: CompetitorInfo['breakdown']): number {
    const weights = {
      seo: 0.20,
      performance: 0.15,
      mobile: 0.15,
      tracking: 0.15,
      gdpr: 0.10,
      content: 0.25
    }

    return Math.round(
      breakdown.seo * weights.seo +
      breakdown.performance * weights.performance +
      breakdown.mobile * weights.mobile +
      breakdown.tracking * weights.tracking +
      breakdown.gdpr * weights.gdpr +
      breakdown.content * weights.content
    )
  }

  private calculateBenchmarks(
    leadBreakdown: CompetitorInfo['breakdown'],
    competitors: CompetitorInfo[]
  ): BenchmarkMetric[] {
    const metrics: (keyof CompetitorInfo['breakdown'])[] = [
      'seo', 'performance', 'mobile', 'tracking', 'gdpr', 'content'
    ]

    return metrics.map(metric => {
      const allValues = [leadBreakdown[metric], ...competitors.map(c => c.breakdown[metric])]
      const sortedValues = [...allValues].sort((a, b) => a - b)

      const leadValue = leadBreakdown[metric]
      const avgValue = Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length)
      const topValue = Math.min(...allValues) // Lower is better (opportunity score)
      const bottomValue = Math.max(...allValues)

      // Calculate percentile (lower score = better position for opportunity scores)
      const rank = sortedValues.indexOf(leadValue) + 1
      const percentile = Math.round((rank / allValues.length) * 100)

      let trend: 'above' | 'average' | 'below'
      if (leadValue < avgValue - 10) trend = 'above'
      else if (leadValue > avgValue + 10) trend = 'below'
      else trend = 'average'

      return {
        metric,
        metricLabel: this.getMetricLabel(metric),
        leadValue,
        avgValue,
        topValue,
        bottomValue,
        percentile,
        trend
      }
    })
  }

  private getMetricLabel(metric: string): string {
    const labels: Record<string, string> = {
      seo: 'SEO',
      performance: 'Performance',
      mobile: 'Mobile',
      tracking: 'Analytics',
      gdpr: 'GDPR',
      content: 'Contenuti'
    }
    return labels[metric] || metric
  }

  private determineMarketPosition(
    leadScore: number,
    competitors: CompetitorInfo[]
  ): { marketPosition: CompetitorAnalysis['marketPosition']; marketPositionScore: number; ranking: number } {
    const allScores = [leadScore, ...competitors.map(c => c.overallScore)]
      .sort((a, b) => a - b) // Lower is better (more opportunities)

    const ranking = allScores.indexOf(leadScore) + 1
    const totalCompetitors = allScores.length

    // Market position based on ranking
    let marketPosition: CompetitorAnalysis['marketPosition']
    let marketPositionScore: number

    if (ranking <= totalCompetitors * 0.25) {
      // Top 25% - This means they have MORE issues/opportunities than competitors
      marketPosition = 'nicher'
      marketPositionScore = 25
    } else if (ranking <= totalCompetitors * 0.5) {
      marketPosition = 'follower'
      marketPositionScore = 50
    } else if (ranking <= totalCompetitors * 0.75) {
      marketPosition = 'challenger'
      marketPositionScore = 75
    } else {
      // Bottom 25% - Less issues = better site
      marketPosition = 'leader'
      marketPositionScore = 100
    }

    return { marketPosition, marketPositionScore, ranking }
  }

  private findCompetitiveGaps(
    leadBreakdown: CompetitorInfo['breakdown'],
    competitors: CompetitorInfo[]
  ): CompetitiveGap[] {
    if (competitors.length === 0) return []

    const gaps: CompetitiveGap[] = []
    const metrics: (keyof CompetitorInfo['breakdown'])[] = [
      'seo', 'performance', 'mobile', 'tracking', 'gdpr', 'content'
    ]

    metrics.forEach(metric => {
      const leadValue = leadBreakdown[metric]
      const bestCompetitor = Math.min(...competitors.map(c => c.breakdown[metric]))
      const gap = leadValue - bestCompetitor

      if (gap > 0) {
        let priority: CompetitiveGap['priority']
        if (gap > 40) priority = 'critical'
        else if (gap > 25) priority = 'high'
        else if (gap > 10) priority = 'medium'
        else priority = 'low'

        gaps.push({
          area: this.getMetricLabel(metric),
          gap,
          priority,
          description: this.getGapDescription(metric, gap)
        })
      }
    })

    return gaps.sort((a, b) => b.gap - a.gap)
  }

  private getGapDescription(metric: string, gap: number): string {
    const descriptions: Record<string, string> = {
      seo: `Competitor hanno SEO più ottimizzato (gap: ${gap} punti). Focus su meta tag, structured data e contenuti.`,
      performance: `Siti competitor più veloci (gap: ${gap} punti). Ottimizzare caricamento e risorse.`,
      mobile: `Competitor più mobile-friendly (gap: ${gap} punti). Migliorare responsive design.`,
      tracking: `Competitor con analytics migliori (gap: ${gap} punti). Implementare tracking completo.`,
      gdpr: `Competitor più compliant GDPR (gap: ${gap} punti). Aggiungere cookie banner e privacy policy.`,
      content: `Contenuti competitor più completi (gap: ${gap} punti). Migliorare testi e form contatto.`
    }
    return descriptions[metric] || `Gap di ${gap} punti rispetto ai competitor`
  }

  private identifyOpportunities(
    leadAnalysis: any,
    competitors: any[]
  ): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = []

    // Check what competitors have that the lead doesn't
    const features = [
      { key: 'hasLiveChat', label: 'Live Chat', analysis: leadAnalysis?.content },
      { key: 'hasGoogleAnalytics', label: 'Google Analytics', analysis: leadAnalysis?.tracking, field: 'googleAnalytics' },
      { key: 'hasGoogleTagManager', label: 'Google Tag Manager', analysis: leadAnalysis?.tracking, field: 'googleTagManager' },
      { key: 'hasCookieBanner', label: 'Cookie Banner', analysis: leadAnalysis?.gdpr },
      { key: 'hasStructuredData', label: 'Schema.org', analysis: leadAnalysis?.seo },
      { key: 'hasContactForm', label: 'Form Contatto', analysis: leadAnalysis?.content },
      { key: 'hasSocialLinks', label: 'Link Social', analysis: leadAnalysis?.content }
    ]

    features.forEach(feature => {
      const leadHas = feature.field
        ? feature.analysis?.[feature.field]
        : feature.analysis?.[feature.key]

      if (!leadHas) {
        // Count how many competitors have this
        const competitorCount = competitors.filter(c => {
          const compAnalysis = c.analysis
          if (!compAnalysis) return false
          const checkField = feature.field || feature.key
          const category = feature.key.includes('tracking') ? 'tracking' :
            feature.key.includes('gdpr') || feature.key.includes('Cookie') ? 'gdpr' :
              feature.key.includes('seo') || feature.key.includes('Structured') ? 'seo' : 'content'
          return compAnalysis[category]?.[checkField]
        }).length

        const percentage = competitors.length > 0
          ? (competitorCount / competitors.length) * 100
          : 0

        if (percentage > 30) {
          opportunities.push({
            type: feature.label,
            description: `${Math.round(percentage)}% dei competitor ha ${feature.label}`,
            competitorsDoing: competitorCount,
            potentialImpact: percentage > 70 ? 'high' : percentage > 50 ? 'medium' : 'low'
          })
        }
      }
    })

    return opportunities.sort((a, b) => b.competitorsDoing - a.competitorsDoing)
  }

  private generateSummary(
    leadScore: number,
    competitors: CompetitorInfo[],
    gaps: CompetitiveGap[],
    opportunities: MarketOpportunity[]
  ): CompetitorAnalysis['summary'] {
    const strongerThan = competitors.filter(c => c.overallScore > leadScore).length
    const weakerThan = competitors.filter(c => c.overallScore < leadScore).length

    const strongerThanPct = competitors.length > 0
      ? Math.round((strongerThan / competitors.length) * 100)
      : 0
    const weakerThanPct = competitors.length > 0
      ? Math.round((weakerThan / competitors.length) * 100)
      : 0

    // Find main strength (lowest score area)
    const allAreas = gaps.length > 0 ? gaps : []
    const mainWeakness = gaps.length > 0 ? gaps[0].area : 'Non identificato'

    // Main strength is the area with smallest gap or best performance
    const mainStrength = gaps.length === 0 ? 'Performance generale' :
      gaps.length > 0 && gaps[gaps.length - 1].gap < 10 ? gaps[gaps.length - 1].area :
        'Da migliorare'

    const quickWinOpportunity = opportunities.length > 0
      ? opportunities[0].description
      : 'Implementare tracking analytics completo'

    return {
      strongerThan: strongerThanPct,
      weakerThan: weakerThanPct,
      mainStrength,
      mainWeakness,
      quickWinOpportunity
    }
  }

  private calculateOverallBenchmarkScore(benchmarks: BenchmarkMetric[]): number {
    if (benchmarks.length === 0) return 50

    // Score based on percentile position
    const avgPercentile = benchmarks.reduce((sum, b) => sum + b.percentile, 0) / benchmarks.length
    return Math.round(100 - avgPercentile) // Invert because lower opportunity score = better
  }
}
