/**
 * Sistema di Lead Scoring Avanzato
 * Calcola score composito, probabilità conversione, ROI stimato
 * Fornisce breakdown dettagliato e raccomandazioni prioritizzate
 */

import { EnhancedWebsiteAnalysis } from '../analyzers/enhanced-website-analyzer'

// Pesi per calcolo score (sommano a 100)
const SCORING_WEIGHTS = {
  seo: 20,
  performance: 15,
  mobile: 15,
  tracking: 15,
  gdpr: 10,
  content: 10,
  technical: 15
}

// Moltiplicatori per settore
const INDUSTRY_MULTIPLIERS: Record<string, number> = {
  // Settori con alta propensione alla spesa digitale
  'dentisti': 1.3,
  'avvocati': 1.25,
  'commercialisti': 1.2,
  'agenzie immobiliari': 1.2,
  'centri estetici': 1.15,
  'palestre fitness': 1.15,
  'ristoranti': 1.1,
  'pizzerie': 1.1,
  'hotel': 1.2,
  // Settori standard
  'default': 1.0
}

// Prezzi medi servizi (EUR) per calcolo ROI
const SERVICE_PRICES = {
  'website_redesign': 3000,
  'seo_optimization': 1500,
  'performance_optimization': 800,
  'gdpr_compliance': 500,
  'analytics_setup': 400,
  'mobile_optimization': 600,
  'content_creation': 1000,
  'social_media_setup': 800,
  'google_ads_setup': 600,
  'maintenance_monthly': 150
}

export interface LeadScoreBreakdown {
  seo: number          // 0-100
  performance: number  // 0-100
  mobile: number       // 0-100
  tracking: number     // 0-100
  gdpr: number         // 0-100
  content: number      // 0-100
  technical: number    // 0-100
}

export interface ServiceRecommendation {
  service: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedPrice: number
  impact: string
  description: string
}

export interface AdvancedLeadScore {
  // Score principale (0-100)
  overallScore: number

  // Breakdown per area
  breakdown: LeadScoreBreakdown

  // Qualità lead
  quality: 'hot' | 'warm' | 'cold' | 'unqualified'
  qualityLabel: string

  // Probabilità conversione (0-100%)
  conversionProbability: number

  // Valore potenziale
  estimatedDealValue: number
  estimatedMonthlyRevenue: number

  // ROI per il freelancer/agenzia
  roiPotential: 'excellent' | 'good' | 'moderate' | 'low'

  // Servizi raccomandati prioritizzati
  recommendations: ServiceRecommendation[]

  // Quick wins (miglioramenti facili da proporre)
  quickWins: string[]

  // Motivi per cui è un buon lead
  strengths: string[]

  // Aree critiche
  weaknesses: string[]

  // Punteggio urgenza (0-100)
  urgencyScore: number

  // Complessità progetto (1-5)
  projectComplexity: number

  // Tempo stimato vendita (giorni)
  estimatedSalesCycle: number
}

/**
 * Calcola lead score avanzato da analisi sito
 */
export function calculateAdvancedLeadScore(
  analysis: EnhancedWebsiteAnalysis,
  category?: string
): AdvancedLeadScore {

  // Calcola breakdown per area
  const breakdown = calculateBreakdown(analysis)

  // Calcola score pesato
  const weightedScore = calculateWeightedScore(breakdown)

  // Applica moltiplicatore settore
  const industryMultiplier = INDUSTRY_MULTIPLIERS[category || ''] || INDUSTRY_MULTIPLIERS['default']
  const adjustedScore = Math.min(100, Math.round(weightedScore * industryMultiplier))

  // Determina qualità lead
  const quality = determineQuality(adjustedScore, analysis)

  // Calcola probabilità conversione
  const conversionProbability = calculateConversionProbability(adjustedScore, analysis, quality)

  // Calcola valore stimato
  const { dealValue, monthlyRevenue } = calculateEstimatedValue(analysis, category)

  // Genera raccomandazioni
  const recommendations = generateRecommendations(analysis, breakdown)

  // Identifica quick wins
  const quickWins = identifyQuickWins(analysis)

  // Analizza punti di forza e debolezza
  const { strengths, weaknesses } = analyzeStrengthsWeaknesses(analysis, breakdown)

  // Calcola urgenza
  const urgencyScore = calculateUrgency(analysis, breakdown)

  // Stima complessità e ciclo vendita
  const projectComplexity = estimateProjectComplexity(recommendations)
  const estimatedSalesCycle = estimateSalesCycle(quality, projectComplexity)

  // Determina ROI potential
  const roiPotential = determineRoiPotential(dealValue, projectComplexity, conversionProbability)

  return {
    overallScore: adjustedScore,
    breakdown,
    quality: quality.level,
    qualityLabel: quality.label,
    conversionProbability,
    estimatedDealValue: dealValue,
    estimatedMonthlyRevenue: monthlyRevenue,
    roiPotential,
    recommendations,
    quickWins,
    strengths,
    weaknesses,
    urgencyScore,
    projectComplexity,
    estimatedSalesCycle
  }
}

/**
 * Calcola breakdown score per area
 */
function calculateBreakdown(analysis: EnhancedWebsiteAnalysis): LeadScoreBreakdown {
  // SEO Score
  let seoScore = 0
  if (!analysis.seo.hasTitle) seoScore += 25
  if (!analysis.seo.hasMetaDescription) seoScore += 20
  if (!analysis.seo.hasH1) seoScore += 15
  if (!analysis.seo.hasCanonical) seoScore += 10
  if (!analysis.seo.hasStructuredData) seoScore += 15
  if (!analysis.seo.hasOpenGraph) seoScore += 10
  if (!analysis.seo.hasSitemap) seoScore += 5
  seoScore = 100 - Math.min(100, seoScore) // Inverti: più problemi = score più alto per noi

  // Performance Score (basato su problemi)
  let perfScore = 0
  const perf = analysis.performance
  if (perf.speedScore < 50) perfScore += 30
  else if (perf.speedScore < 70) perfScore += 15
  if (perf.optimizationScore < 50) perfScore += 25
  if ((perf.loadComplete || 0) > 5000) perfScore += 20
  if ((perf.totalSize || 0) > 3000000) perfScore += 15
  if (perf.performanceIssues?.length > 3) perfScore += 10
  perfScore = Math.min(100, perfScore)

  // Mobile Score
  let mobileScore = 0
  if (!analysis.mobile.isMobileFriendly) mobileScore += 40
  if (!analysis.mobile.hasViewportMeta) mobileScore += 20
  if (!analysis.mobile.hasResponsiveCss) mobileScore += 20
  if (analysis.mobile.hasHorizontalScroll) mobileScore += 10
  if (!analysis.mobile.touchTargetsOk) mobileScore += 10
  mobileScore = Math.min(100, mobileScore)

  // Tracking Score (mancanza = opportunità)
  let trackingScore = 0
  if (!analysis.tracking.googleAnalytics) trackingScore += 35
  if (!analysis.tracking.googleTagManager) trackingScore += 25
  if (!analysis.tracking.facebookPixel) trackingScore += 20
  if (!analysis.tracking.googleAdsConversion) trackingScore += 20
  trackingScore = Math.min(100, trackingScore)

  // GDPR Score
  let gdprScore = 0
  if (!analysis.gdpr.hasCookieBanner) gdprScore += 30
  if (!analysis.gdpr.hasPrivacyPolicy) gdprScore += 30
  if (!analysis.gdpr.hasContactInfo) gdprScore += 20
  if (!analysis.gdpr.hasVatNumber) gdprScore += 20
  gdprScore = Math.min(100, gdprScore)

  // Content Score
  let contentScore = 0
  if (!analysis.content.hasContactForm) contentScore += 25
  if (analysis.content.wordCount < 300) contentScore += 25
  if (!analysis.content.hasSocialLinks) contentScore += 15
  if (!analysis.content.hasBusinessHours) contentScore += 15
  if (analysis.images.withoutAlt > 3) contentScore += 20
  contentScore = Math.min(100, contentScore)

  // Technical Score
  let techScore = 0
  if (!analysis.hasSSL) techScore += 30
  if (!analysis.sslValid) techScore += 20
  if (analysis.issues.critical.length > 0) techScore += 30
  if (analysis.issues.high.length > 2) techScore += 20
  techScore = Math.min(100, techScore)

  return {
    seo: seoScore,
    performance: perfScore,
    mobile: mobileScore,
    tracking: trackingScore,
    gdpr: gdprScore,
    content: contentScore,
    technical: techScore
  }
}

/**
 * Calcola score pesato
 */
function calculateWeightedScore(breakdown: LeadScoreBreakdown): number {
  return (
    breakdown.seo * (SCORING_WEIGHTS.seo / 100) +
    breakdown.performance * (SCORING_WEIGHTS.performance / 100) +
    breakdown.mobile * (SCORING_WEIGHTS.mobile / 100) +
    breakdown.tracking * (SCORING_WEIGHTS.tracking / 100) +
    breakdown.gdpr * (SCORING_WEIGHTS.gdpr / 100) +
    breakdown.content * (SCORING_WEIGHTS.content / 100) +
    breakdown.technical * (SCORING_WEIGHTS.technical / 100)
  )
}

/**
 * Determina qualità lead
 */
function determineQuality(score: number, analysis: EnhancedWebsiteAnalysis): { level: 'hot' | 'warm' | 'cold' | 'unqualified', label: string } {
  // Sito non accessibile = unqualified
  if (!analysis.isAccessible) {
    return { level: 'unqualified', label: 'Non Qualificato - Sito non accessibile' }
  }

  // Score alto + problemi critici = HOT
  if (score >= 70 && analysis.issues.critical.length > 0) {
    return { level: 'hot', label: 'Lead Caldo - Urgenza alta' }
  }

  // Score medio-alto = WARM
  if (score >= 50) {
    return { level: 'warm', label: 'Lead Tiepido - Buon potenziale' }
  }

  // Score basso = COLD
  if (score >= 30) {
    return { level: 'cold', label: 'Lead Freddo - Richiede nurturing' }
  }

  return { level: 'unqualified', label: 'Non Qualificato - Poche opportunità' }
}

/**
 * Calcola probabilità conversione
 */
function calculateConversionProbability(
  score: number,
  analysis: EnhancedWebsiteAnalysis,
  quality: { level: string }
): number {
  let baseProb = 0

  switch (quality.level) {
    case 'hot': baseProb = 35; break
    case 'warm': baseProb = 20; break
    case 'cold': baseProb = 8; break
    default: baseProb = 2
  }

  // Bonus/malus
  if (analysis.content.hasPhoneNumbers && analysis.content.phoneNumbers.length > 0) baseProb += 5
  if (analysis.content.hasEmailAddresses && analysis.content.emailAddresses.length > 0) baseProb += 3
  if (analysis.gdpr.hasVatNumber) baseProb += 5 // Azienda strutturata
  if (analysis.techStack.cms === 'WordPress') baseProb += 3 // Più facile da migliorare
  if (!analysis.hasSSL) baseProb += 5 // Urgenza sicurezza
  if (analysis.issues.critical.length > 2) baseProb += 5 // Molti problemi = più urgenza

  return Math.min(50, Math.round(baseProb))
}

/**
 * Calcola valore stimato deal
 */
function calculateEstimatedValue(
  analysis: EnhancedWebsiteAnalysis,
  category?: string
): { dealValue: number, monthlyRevenue: number } {
  let dealValue = 0

  // Stima basata su servizi necessari
  if (!analysis.isAccessible || analysis.issues.critical.length > 3) {
    dealValue += SERVICE_PRICES.website_redesign
  }

  if (!analysis.seo.hasTitle || !analysis.seo.hasMetaDescription) {
    dealValue += SERVICE_PRICES.seo_optimization
  }

  if (analysis.performance.speedScore < 50) {
    dealValue += SERVICE_PRICES.performance_optimization
  }

  if (!analysis.gdpr.hasCookieBanner || !analysis.gdpr.hasPrivacyPolicy) {
    dealValue += SERVICE_PRICES.gdpr_compliance
  }

  if (!analysis.tracking.googleAnalytics) {
    dealValue += SERVICE_PRICES.analytics_setup
  }

  if (!analysis.mobile.isMobileFriendly) {
    dealValue += SERVICE_PRICES.mobile_optimization
  }

  // Minimo deal value
  dealValue = Math.max(500, dealValue)

  // Revenue mensile stimato (manutenzione + servizi ricorrenti)
  const monthlyRevenue = Math.round(dealValue * 0.05) + SERVICE_PRICES.maintenance_monthly

  return { dealValue, monthlyRevenue }
}

/**
 * Genera raccomandazioni prioritizzate
 */
function generateRecommendations(
  analysis: EnhancedWebsiteAnalysis,
  breakdown: LeadScoreBreakdown
): ServiceRecommendation[] {
  const recommendations: ServiceRecommendation[] = []

  // SSL/Sicurezza
  if (!analysis.hasSSL || !analysis.sslValid) {
    recommendations.push({
      service: 'Certificato SSL',
      priority: 'critical',
      estimatedPrice: 100,
      impact: 'Sicurezza e fiducia utenti',
      description: 'Installazione certificato SSL per connessione sicura HTTPS'
    })
  }

  // Performance
  if (breakdown.performance > 50) {
    recommendations.push({
      service: 'Ottimizzazione Performance',
      priority: analysis.performance.speedScore < 30 ? 'critical' : 'high',
      estimatedPrice: SERVICE_PRICES.performance_optimization,
      impact: 'Velocità e conversioni +20%',
      description: 'Ottimizzazione immagini, caching, minificazione codice'
    })
  }

  // SEO
  if (breakdown.seo > 40) {
    recommendations.push({
      service: 'Ottimizzazione SEO',
      priority: 'high',
      estimatedPrice: SERVICE_PRICES.seo_optimization,
      impact: 'Visibilità Google +50%',
      description: 'Meta tag, struttura heading, schema markup, sitemap'
    })
  }

  // Mobile
  if (breakdown.mobile > 40) {
    recommendations.push({
      service: 'Ottimizzazione Mobile',
      priority: 'high',
      estimatedPrice: SERVICE_PRICES.mobile_optimization,
      impact: '60% traffico è mobile',
      description: 'Design responsive, touch-friendly, velocità mobile'
    })
  }

  // Analytics
  if (breakdown.tracking > 50) {
    recommendations.push({
      service: 'Setup Analytics & Tracking',
      priority: 'medium',
      estimatedPrice: SERVICE_PRICES.analytics_setup,
      impact: 'Dati per decisioni',
      description: 'Google Analytics 4, Tag Manager, conversioni'
    })
  }

  // GDPR
  if (breakdown.gdpr > 40) {
    recommendations.push({
      service: 'Adeguamento GDPR',
      priority: breakdown.gdpr > 60 ? 'high' : 'medium',
      estimatedPrice: SERVICE_PRICES.gdpr_compliance,
      impact: 'Evita sanzioni fino a 20M€',
      description: 'Cookie banner, privacy policy, gestione consensi'
    })
  }

  // Content
  if (breakdown.content > 50) {
    recommendations.push({
      service: 'Miglioramento Contenuti',
      priority: 'medium',
      estimatedPrice: SERVICE_PRICES.content_creation,
      impact: 'Engagement e SEO',
      description: 'Testi ottimizzati, call-to-action, form contatto'
    })
  }

  // Ordina per priorità
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return recommendations
}

/**
 * Identifica quick wins
 */
function identifyQuickWins(analysis: EnhancedWebsiteAnalysis): string[] {
  const quickWins: string[] = []

  if (!analysis.seo.hasTitle) quickWins.push('Aggiungere title tag')
  if (!analysis.seo.hasMetaDescription) quickWins.push('Aggiungere meta description')
  if (!analysis.tracking.googleAnalytics) quickWins.push('Installare Google Analytics')
  if (!analysis.gdpr.hasCookieBanner) quickWins.push('Aggiungere cookie banner')
  if (analysis.images.withoutAlt > 0) quickWins.push(`Aggiungere alt a ${analysis.images.withoutAlt} immagini`)
  if (!analysis.content.hasContactForm) quickWins.push('Aggiungere form di contatto')
  if (!analysis.mobile.hasViewportMeta) quickWins.push('Aggiungere viewport meta tag')

  return quickWins.slice(0, 5) // Max 5 quick wins
}

/**
 * Analizza punti di forza e debolezza
 */
function analyzeStrengthsWeaknesses(
  analysis: EnhancedWebsiteAnalysis,
  breakdown: LeadScoreBreakdown
): { strengths: string[], weaknesses: string[] } {
  const strengths: string[] = []
  const weaknesses: string[] = []

  // Strengths
  if (analysis.hasSSL && analysis.sslValid) strengths.push('Sito sicuro con SSL valido')
  if (analysis.mobile.isMobileFriendly) strengths.push('Sito mobile-friendly')
  if (analysis.tracking.googleAnalytics) strengths.push('Analytics attivo')
  if (analysis.gdpr.hasCookieBanner && analysis.gdpr.hasPrivacyPolicy) strengths.push('GDPR compliant')
  if (analysis.performance.speedScore > 70) strengths.push('Buone performance')
  if (analysis.content.hasContactForm) strengths.push('Form contatto presente')
  if (analysis.techStack.cms) strengths.push(`CMS: ${analysis.techStack.cms}`)

  // Weaknesses
  if (breakdown.seo > 60) weaknesses.push('SEO molto carente')
  if (breakdown.performance > 60) weaknesses.push('Performance critiche')
  if (breakdown.mobile > 60) weaknesses.push('Non ottimizzato per mobile')
  if (breakdown.tracking > 70) weaknesses.push('Nessun tracking/analytics')
  if (breakdown.gdpr > 60) weaknesses.push('Non conforme GDPR')
  if (breakdown.technical > 50) weaknesses.push('Problemi tecnici importanti')

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4)
  }
}

/**
 * Calcola score urgenza
 */
function calculateUrgency(
  analysis: EnhancedWebsiteAnalysis,
  breakdown: LeadScoreBreakdown
): number {
  let urgency = 0

  // SSL mancante = urgenza alta
  if (!analysis.hasSSL) urgency += 25

  // Problemi critici
  urgency += analysis.issues.critical.length * 15

  // GDPR non compliant
  if (breakdown.gdpr > 60) urgency += 20

  // Mobile non friendly (60% traffico è mobile)
  if (!analysis.mobile.isMobileFriendly) urgency += 15

  // Performance pessime
  if (analysis.performance.speedScore < 30) urgency += 15

  return Math.min(100, urgency)
}

/**
 * Stima complessità progetto (1-5)
 */
function estimateProjectComplexity(recommendations: ServiceRecommendation[]): number {
  const criticalCount = recommendations.filter(r => r.priority === 'critical').length
  const highCount = recommendations.filter(r => r.priority === 'high').length

  if (criticalCount >= 2 || recommendations.length >= 6) return 5
  if (criticalCount >= 1 || highCount >= 3) return 4
  if (highCount >= 2 || recommendations.length >= 4) return 3
  if (recommendations.length >= 2) return 2
  return 1
}

/**
 * Stima ciclo vendita (giorni)
 */
function estimateSalesCycle(
  quality: { level: string },
  complexity: number
): number {
  const baseDays: Record<string, number> = {
    hot: 7,
    warm: 21,
    cold: 45,
    unqualified: 90
  }

  const base = baseDays[quality.level] || 30
  return Math.round(base * (1 + (complexity - 1) * 0.2))
}

/**
 * Determina potenziale ROI
 */
function determineRoiPotential(
  dealValue: number,
  complexity: number,
  conversionProb: number
): 'excellent' | 'good' | 'moderate' | 'low' {
  const expectedValue = dealValue * (conversionProb / 100)
  const effortFactor = complexity * 500 // Costo stimato effort
  const roi = expectedValue / effortFactor

  if (roi > 2) return 'excellent'
  if (roi > 1) return 'good'
  if (roi > 0.5) return 'moderate'
  return 'low'
}

/**
 * Export utility per uso nel lead generator
 */
export const LeadScoringUtils = {
  calculateAdvancedLeadScore,
  SCORING_WEIGHTS,
  INDUSTRY_MULTIPLIERS,
  SERVICE_PRICES
}
