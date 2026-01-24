/**
 * MasterAnalyzer - Orchestratore centrale per tutte le analisi
 * Coordina tutti gli analyzer, gestisce browser pool, caching e parallelizzazione
 */

import { Page } from 'playwright'
import { BrowserPool, getGlobalBrowserPool } from '../utils/browser-pool'
import { AnalysisCache, getAnalysisCache } from '../utils/analysis-cache'

// Import analyzers
import { LocalSEOAnalyzer, LocalSEOAnalysis } from './local-seo-analyzer'
import { ConversionAnalyzer, ConversionAnalysis } from './conversion-analyzer'
import { CompetitorAnalyzer, CompetitorAnalysis } from './competitor-analyzer'
import { SocialAnalyzer, SocialAnalysisResult } from './social-analyzer'
import { EnhancedWebsiteAnalyzer } from './enhanced-website-analyzer'
import type { EnhancedWebsiteAnalysis } from './enhanced-website-analyzer'

export interface MasterAnalysisOptions {
  // Analysis modules to run
  includeLocalSEO: boolean
  includeConversion: boolean
  includeCompetitor: boolean
  includeSocial: boolean
  includeEnhanced: boolean

  // Caching
  useCache: boolean
  cacheTtlDays: number
  forceRefresh: boolean

  // Performance
  timeout: number
  parallel: boolean
}

export interface MasterAnalysisResult {
  // Meta
  url: string
  analyzedAt: Date
  durationMs: number
  cached: boolean
  errors: string[]

  // Business Info
  leadId?: string
  businessName?: string
  category?: string
  city?: string

  // Core Analysis
  enhanced?: EnhancedWebsiteAnalysis

  // Advanced Analysis
  localSEO?: LocalSEOAnalysis
  conversion?: ConversionAnalysis
  competitor?: CompetitorAnalysis
  social?: SocialAnalysisResult

  // Aggregated Scores
  scores: {
    overall: number
    seo: number
    localSEO: number
    performance: number
    mobile: number
    conversion: number
    trust: number
    content: number
    technical: number
    social: number
  }

  // Priority Actions
  priorityActions: PriorityAction[]

  // Business Value
  estimatedDealValue: number
  conversionProbability: number
  urgencyScore: number
}

export interface PriorityAction {
  priority: 'critical' | 'high' | 'medium' | 'low'
  area: string
  issue: string
  recommendation: string
  estimatedImpact: string
  estimatedCost: number
}

const DEFAULT_OPTIONS: MasterAnalysisOptions = {
  includeLocalSEO: true,
  includeConversion: true,
  includeCompetitor: false, // Requires DB access
  includeSocial: true,
  includeEnhanced: true,
  useCache: true,
  cacheTtlDays: 7,
  forceRefresh: false,
  timeout: 60000,
  parallel: true
}

export class MasterAnalyzer {
  private browserPool: BrowserPool
  private cache: AnalysisCache<MasterAnalysisResult>
  private options: MasterAnalysisOptions

  // Individual analyzers
  private enhancedAnalyzer: EnhancedWebsiteAnalyzer
  private conversionAnalyzer: ConversionAnalyzer
  private competitorAnalyzer: CompetitorAnalyzer
  private socialAnalyzer: SocialAnalyzer

  constructor(options: Partial<MasterAnalysisOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.browserPool = getGlobalBrowserPool({ maxBrowsers: 5 })
    this.cache = getAnalysisCache<MasterAnalysisResult>('master', {
      ttlDays: this.options.cacheTtlDays
    })

    // Initialize analyzers
    this.enhancedAnalyzer = new EnhancedWebsiteAnalyzer()
    this.conversionAnalyzer = new ConversionAnalyzer()
    this.competitorAnalyzer = new CompetitorAnalyzer()
    this.socialAnalyzer = new SocialAnalyzer()
  }

  /**
   * Run full analysis on a URL
   */
  async analyze(
    url: string,
    businessInfo?: {
      leadId?: string
      businessName?: string
      category?: string
      city?: string
      address?: string
      phone?: string
    },
    options?: Partial<MasterAnalysisOptions>
  ): Promise<MasterAnalysisResult> {
    const opts = { ...this.options, ...options }
    const startTime = Date.now()
    const errors: string[] = []

    // Check cache first
    if (opts.useCache && !opts.forceRefresh) {
      const cached = await this.cache.get(url, 'master')
      if (cached) {
        return { ...cached, cached: true }
      }
    }

    // Initialize browser pool
    await this.browserPool.initialize(2)

    let result: MasterAnalysisResult

    try {
      // Run analysis with browser from pool
      result = await this.browserPool.withPage(async (page) => {
        // Navigate to URL
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: opts.timeout
        })

        // Wait for initial content
        await page.waitForTimeout(2000)

        // Run analyses
        const analyses = await this.runAnalyses(page, url, businessInfo, opts, errors)

        return analyses
      })
    } catch (error) {
      errors.push(`Main analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`)

      // Return minimal result on error
      result = this.createEmptyResult(url, errors)
    }

    // Add meta info
    result.url = url
    result.analyzedAt = new Date()
    result.durationMs = Date.now() - startTime
    result.cached = false
    result.errors = errors
    result.leadId = businessInfo?.leadId
    result.businessName = businessInfo?.businessName
    result.category = businessInfo?.category
    result.city = businessInfo?.city

    // Calculate aggregated scores
    result.scores = this.calculateScores(result)

    // Generate priority actions
    result.priorityActions = this.generatePriorityActions(result)

    // Calculate business value
    const businessValue = this.calculateBusinessValue(result)
    result.estimatedDealValue = businessValue.dealValue
    result.conversionProbability = businessValue.conversionProbability
    result.urgencyScore = businessValue.urgencyScore

    // Cache result
    if (opts.useCache) {
      await this.cache.set(url, result, 'master', opts.cacheTtlDays)
    }

    return result
  }

  /**
   * Run individual analyses
   */
  private async runAnalyses(
    page: Page,
    url: string,
    businessInfo: any,
    opts: MasterAnalysisOptions,
    errors: string[]
  ): Promise<MasterAnalysisResult> {
    const result: Partial<MasterAnalysisResult> = {}

    if (opts.parallel) {
      // Run analyses in parallel where possible
      const promises: Promise<void>[] = []

      // Enhanced analysis (main)
      if (opts.includeEnhanced) {
        promises.push(
          this.enhancedAnalyzer.analyzeWebsite(url)
            .then((analysis: any) => { result.enhanced = analysis })
            .catch((e: any) => errors.push(`Enhanced: ${e.message}`))
        )
      }

      // Wait for enhanced to complete first (needed for some other analyses)
      await Promise.all(promises)

      // Now run the rest
      const secondaryPromises: Promise<void>[] = []

      // Conversion analysis
      if (opts.includeConversion) {
        secondaryPromises.push(
          this.conversionAnalyzer.analyze(page)
            .then(analysis => { result.conversion = analysis })
            .catch(e => errors.push(`Conversion: ${e.message}`))
        )
      }

      // Local SEO analysis
      if (opts.includeLocalSEO && businessInfo?.businessName && businessInfo?.city) {
        const localSeoAnalyzer = new LocalSEOAnalyzer(
          businessInfo.businessName,
          businessInfo.city,
          businessInfo.address,
          businessInfo.phone
        )
        secondaryPromises.push(
          localSeoAnalyzer.analyze(page, url)
            .then(analysis => { result.localSEO = analysis })
            .catch(e => errors.push(`LocalSEO: ${e.message}`))
        )
      }

      // Social analysis (from enhanced if available, otherwise separate)
      if (opts.includeSocial) {
        if (result.enhanced?.social) {
          result.social = result.enhanced.social
        } else {
          secondaryPromises.push(
            this.socialAnalyzer.analyzeSocials(page)
              .then(analysis => { result.social = analysis })
              .catch(e => errors.push(`Social: ${e.message}`))
          )
        }
      }

      await Promise.all(secondaryPromises)

      // Competitor analysis (requires DB, run separately)
      if (opts.includeCompetitor && businessInfo?.leadId && businessInfo?.category && businessInfo?.city) {
        try {
          result.competitor = await this.competitorAnalyzer.analyze(
            businessInfo.leadId,
            businessInfo.category,
            businessInfo.city,
            result.enhanced || {}
          )
        } catch (e) {
          errors.push(`Competitor: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }
    } else {
      // Run sequentially
      if (opts.includeEnhanced) {
        try {
          result.enhanced = await this.enhancedAnalyzer.analyzeWebsite(url)
        } catch (e) {
          errors.push(`Enhanced: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }

      if (opts.includeConversion) {
        try {
          result.conversion = await this.conversionAnalyzer.analyze(page)
        } catch (e) {
          errors.push(`Conversion: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }

      if (opts.includeLocalSEO && businessInfo?.businessName && businessInfo?.city) {
        try {
          const localSeoAnalyzer = new LocalSEOAnalyzer(
            businessInfo.businessName,
            businessInfo.city,
            businessInfo.address,
            businessInfo.phone
          )
          result.localSEO = await localSeoAnalyzer.analyze(page, url)
        } catch (e) {
          errors.push(`LocalSEO: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }

      if (opts.includeSocial) {
        try {
          result.social = result.enhanced?.social || await this.socialAnalyzer.analyzeSocials(page)
        } catch (e) {
          errors.push(`Social: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }

      if (opts.includeCompetitor && businessInfo?.leadId && businessInfo?.category && businessInfo?.city) {
        try {
          result.competitor = await this.competitorAnalyzer.analyze(
            businessInfo.leadId,
            businessInfo.category,
            businessInfo.city,
            result.enhanced || {}
          )
        } catch (e) {
          errors.push(`Competitor: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      }
    }

    return result as MasterAnalysisResult
  }

  /**
   * Calculate aggregated scores
   */
  private calculateScores(result: MasterAnalysisResult): MasterAnalysisResult['scores'] {
    const enhanced = result.enhanced
    const conversion = result.conversion
    const localSEO = result.localSEO
    const social = result.social

    // Get scores from enhanced analysis
    const seo = enhanced?.seo ? this.calculateSeoOpportunity(enhanced.seo) : 50
    const performance = enhanced?.performance?.speedScore || 50
    const mobile = enhanced?.mobile?.mobileScore || 50
    const content = enhanced?.content?.contentQualityScore || 50
    const technical = enhanced?.technicalHealth || 50

    // Conversion score
    const conversionScore = conversion?.conversionScore || 50

    // Local SEO score
    const localSEOScore = localSEO?.localSEOScore || 50

    // Trust score
    const trustScore = conversion?.trustSignals?.score || 50

    // Social score
    const socialScore = social?.brandHealth || 50

    // Overall weighted score
    const overall = Math.round(
      seo * 0.15 +
      localSEOScore * 0.15 +
      performance * 0.10 +
      mobile * 0.10 +
      conversionScore * 0.20 +
      trustScore * 0.10 +
      content * 0.10 +
      socialScore * 0.10
    )

    return {
      overall,
      seo,
      localSEO: localSEOScore,
      performance,
      mobile,
      conversion: conversionScore,
      trust: trustScore,
      content,
      technical,
      social: socialScore
    }
  }

  /**
   * Calculate SEO opportunity score (inverted - higher = more opportunity)
   */
  private calculateSeoOpportunity(seo: any): number {
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

  /**
   * Generate priority actions from all analyses
   */
  private generatePriorityActions(result: MasterAnalysisResult): PriorityAction[] {
    const actions: PriorityAction[] = []

    // From conversion analysis
    if (result.conversion?.recommendations) {
      result.conversion.recommendations.forEach(rec => {
        actions.push({
          priority: rec.type,
          area: rec.area,
          issue: rec.issue,
          recommendation: rec.recommendation,
          estimatedImpact: rec.impact,
          estimatedCost: this.estimateCost(rec.area)
        })
      })
    }

    // From local SEO analysis
    if (result.localSEO?.recommendations) {
      result.localSEO.recommendations.forEach(rec => {
        actions.push({
          priority: rec.type,
          area: 'Local SEO',
          issue: rec.issue,
          recommendation: rec.recommendation,
          estimatedImpact: rec.impact,
          estimatedCost: this.estimateCost('local-seo')
        })
      })
    }

    // From enhanced analysis
    if (result.enhanced?.issues) {
      result.enhanced.issues.critical?.forEach(issue => {
        actions.push({
          priority: 'critical',
          area: 'Technical',
          issue: issue,
          recommendation: `Risolvere: ${issue}`,
          estimatedImpact: 'Critico per funzionamento sito',
          estimatedCost: 500
        })
      })

      result.enhanced.issues.high?.slice(0, 3).forEach(issue => {
        actions.push({
          priority: 'high',
          area: 'Technical',
          issue: issue,
          recommendation: `Migliorare: ${issue}`,
          estimatedImpact: 'Significativo per conversioni',
          estimatedCost: 300
        })
      })
    }

    // From competitor analysis
    if (result.competitor?.competitiveGaps) {
      result.competitor.competitiveGaps.slice(0, 3).forEach(gap => {
        actions.push({
          priority: gap.priority,
          area: `Competitivo - ${gap.area}`,
          issue: gap.description,
          recommendation: `Colmare gap competitivo in ${gap.area}`,
          estimatedImpact: `Gap di ${gap.gap} punti rispetto ai competitor`,
          estimatedCost: this.estimateCost(gap.area.toLowerCase())
        })
      })
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return actions
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 10)
  }

  /**
   * Estimate cost for a service area
   */
  private estimateCost(area: string): number {
    const costs: Record<string, number> = {
      'cta': 300,
      'form': 400,
      'trust': 500,
      'above-fold': 600,
      'contact': 200,
      'general': 400,
      'local-seo': 800,
      'seo': 1500,
      'performance': 800,
      'mobile': 600,
      'tracking': 400,
      'gdpr': 500,
      'content': 1000,
      'technical': 700,
      'contenuti': 1000
    }
    return costs[area.toLowerCase()] || 500
  }

  /**
   * Calculate business value metrics
   */
  private calculateBusinessValue(result: MasterAnalysisResult): {
    dealValue: number
    conversionProbability: number
    urgencyScore: number
  } {
    let dealValue = 0
    let urgencyScore = 0

    // Calculate deal value from opportunities
    result.priorityActions.forEach(action => {
      dealValue += action.estimatedCost
    })

    // Adjust deal value based on scores
    if (result.scores.overall > 60) dealValue *= 1.3 // More opportunity
    if (result.scores.overall > 80) dealValue *= 1.2

    // Calculate urgency
    const criticalCount = result.priorityActions.filter(a => a.priority === 'critical').length
    const highCount = result.priorityActions.filter(a => a.priority === 'high').length
    urgencyScore = Math.min(100, criticalCount * 25 + highCount * 15)

    // Conversion probability based on quality indicators
    let conversionProbability = 10 // Base

    if (result.scores.overall > 70) conversionProbability += 20
    else if (result.scores.overall > 50) conversionProbability += 10

    if (result.conversion?.contactVisibility === 'excellent') conversionProbability += 10
    else if (result.conversion?.contactVisibility === 'good') conversionProbability += 5

    if (urgencyScore > 50) conversionProbability += 10

    return {
      dealValue: Math.round(dealValue),
      conversionProbability: Math.min(50, conversionProbability),
      urgencyScore
    }
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(url: string, errors: string[]): MasterAnalysisResult {
    return {
      url,
      analyzedAt: new Date(),
      durationMs: 0,
      cached: false,
      errors,
      scores: {
        overall: 0,
        seo: 0,
        localSEO: 0,
        performance: 0,
        mobile: 0,
        conversion: 0,
        trust: 0,
        content: 0,
        technical: 0,
        social: 0
      },
      priorityActions: [],
      estimatedDealValue: 0,
      conversionProbability: 0,
      urgencyScore: 0
    }
  }

  /**
   * Run single analysis type
   */
  async analyzeLocalSEO(
    url: string,
    businessName: string,
    city: string,
    address?: string,
    phone?: string
  ): Promise<LocalSEOAnalysis> {
    return this.browserPool.withPage(async (page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)

      const analyzer = new LocalSEOAnalyzer(businessName, city, address, phone)
      return analyzer.analyze(page, url)
    })
  }

  async analyzeConversion(url: string): Promise<ConversionAnalysis> {
    return this.browserPool.withPage(async (page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(2000)
      return this.conversionAnalyzer.analyze(page)
    })
  }

  async analyzeCompetitors(
    leadId: string,
    category: string,
    city: string,
    leadAnalysis: any
  ): Promise<CompetitorAnalysis> {
    return this.competitorAnalyzer.analyze(leadId, category, city, leadAnalysis)
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    browserPool: ReturnType<BrowserPool['getStats']>
    cache: Awaited<ReturnType<AnalysisCache['getStats']>>
  }> {
    return {
      browserPool: this.browserPool.getStats(),
      cache: await this.cache.getStats()
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.cache.cleanup()
  }
}

// Singleton instance
let masterAnalyzerInstance: MasterAnalyzer | null = null

export function getMasterAnalyzer(options?: Partial<MasterAnalysisOptions>): MasterAnalyzer {
  if (!masterAnalyzerInstance) {
    masterAnalyzerInstance = new MasterAnalyzer(options)
  }
  return masterAnalyzerInstance
}
