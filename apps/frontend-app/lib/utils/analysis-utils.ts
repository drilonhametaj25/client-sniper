/**
 * Utility functions per normalizzare e calcolare score delle analisi lead
 * Gestisce 3 formati diversi di analisi: Enhanced, Legacy, e Very Old
 * Elimina duplicazione di codice nella pagina lead detail
 */

import type {
  EnhancedWebsiteAnalysis,
  WebsiteAnalysis
} from '../types/analysis'

/**
 * Interfaccia normalizzata per analisi - formato unico per tutti i componenti
 */
export interface NormalizedAnalysis {
  // SEO
  seo: {
    score: number
    hasTitle: boolean
    titleLength: number
    title?: string
    hasMetaDescription: boolean
    metaDescriptionLength: number
    metaDescription?: string
    hasH1: boolean
    h1Count: number
    h1Text?: string[]
    hasStructuredData: boolean
    hasOpenGraph: boolean
    hasTwitterCard: boolean
    hasSitemap: boolean
    hasRobotsTxt: boolean
  }
  // Performance
  performance: {
    score: number
    loadTime: number
    ttfb?: number
    lcp?: number
    inp?: number // Nuovo Core Web Vital (sostituisce FID)
    fid?: number // Legacy, deprecato
    cls?: number
    fcp?: number
  }
  // Mobile
  mobile: {
    isMobileFriendly: boolean
    score: number
    hasViewportMeta: boolean
    hasResponsiveCss: boolean
  }
  // Tracking
  tracking: {
    hasGoogleAnalytics: boolean
    hasFacebookPixel: boolean
    hasGoogleTagManager: boolean
    hasHotjar: boolean
    hasClarity: boolean
    hasTikTokPixel: boolean
    hasLinkedInInsightTag: boolean
    hasSnapchatPixel: boolean
    hasPinterestTag: boolean
    score: number
  }
  // GDPR
  gdpr: {
    hasCookieBanner: boolean
    hasPrivacyPolicy: boolean
    hasTermsOfService: boolean
    hasVatNumber: boolean
    vatNumbers: string[]
    score: number
  }
  // Images
  images: {
    total: number
    withoutAlt: number
    broken: number
  }
  // Content
  content: {
    phoneNumbers: string[]
    emailAddresses: string[]
    hasContactForm: boolean
    wordCount: number
    hasSocialLinks: boolean
  }
  // Issues
  issues: {
    critical: string[]
    high: string[]
    medium: string[]
    low: string[]
  }
  // Overall
  overallScore: number
  businessValue: number
  technicalHealth: number
  // Meta
  isAccessible: boolean
  hasSSL: boolean
}

/**
 * Type guard per EnhancedWebsiteAnalysis
 */
export function isEnhancedAnalysis(analysis: any): analysis is EnhancedWebsiteAnalysis {
  return analysis &&
         typeof analysis === 'object' &&
         'seo' in analysis &&
         'tracking' in analysis &&
         typeof analysis.seo === 'object' &&
         'hasTitle' in analysis.seo
}

/**
 * Type guard per WebsiteAnalysis (legacy)
 */
export function isLegacyAnalysis(analysis: any): analysis is WebsiteAnalysis {
  return analysis &&
         typeof analysis === 'object' &&
         'seo' in analysis &&
         'performance' in analysis &&
         !('opportunities' in analysis) // Enhanced ha opportunities
}

/**
 * Normalizza qualsiasi formato di analisi in NormalizedAnalysis
 */
export function normalizeAnalysis(analysis: any): NormalizedAnalysis {
  if (!analysis) {
    return getDefaultNormalizedAnalysis()
  }

  // Prova Enhanced format
  if (isEnhancedAnalysis(analysis)) {
    return normalizeEnhancedAnalysis(analysis)
  }

  // Prova Legacy format
  if (isLegacyAnalysis(analysis)) {
    return normalizeLegacyAnalysis(analysis)
  }

  // Fallback: prova a estrarre dati comunque
  return normalizeGenericAnalysis(analysis)
}

/**
 * Normalizza EnhancedWebsiteAnalysis
 */
function normalizeEnhancedAnalysis(analysis: EnhancedWebsiteAnalysis): NormalizedAnalysis {
  const seoScore = calculateSEOScore(analysis.seo)
  const performanceScore = analysis.performance?.overallScore ||
                           calculatePerformanceScore(analysis.performance)
  const trackingScore = analysis.tracking?.trackingScore ||
                        calculateTrackingScore(analysis.tracking)
  const gdprScore = analysis.gdpr?.gdprScore ||
                    calculateGDPRScore(analysis.gdpr)
  const mobileScore = analysis.mobile?.mobileScore ||
                      calculateMobileScore(analysis.mobile)

  return {
    seo: {
      score: seoScore,
      hasTitle: analysis.seo?.hasTitle || false,
      titleLength: analysis.seo?.titleLength || 0,
      title: analysis.seo?.title,
      hasMetaDescription: analysis.seo?.hasMetaDescription || false,
      metaDescriptionLength: analysis.seo?.metaDescriptionLength || 0,
      metaDescription: analysis.seo?.metaDescription,
      hasH1: analysis.seo?.hasH1 || false,
      h1Count: analysis.seo?.h1Count || 0,
      h1Text: analysis.seo?.h1Text,
      hasStructuredData: analysis.seo?.hasStructuredData || false,
      hasOpenGraph: analysis.seo?.hasOpenGraph || false,
      hasTwitterCard: analysis.seo?.hasTwitterCard || false,
      hasSitemap: analysis.seo?.hasSitemap || false,
      hasRobotsTxt: analysis.seo?.hasRobotsTxt || false
    },
    performance: {
      score: performanceScore,
      loadTime: analysis.performance?.loadTime || 0,
      ttfb: analysis.performance?.ttfb,
      lcp: analysis.performance?.coreWebVitals?.lcp,
      inp: (analysis.performance as any)?.coreWebVitals?.inp,
      fid: analysis.performance?.coreWebVitals?.fid,
      cls: analysis.performance?.coreWebVitals?.cls,
      fcp: (analysis.performance as any)?.fcp
    },
    mobile: {
      isMobileFriendly: analysis.mobile?.isMobileFriendly || false,
      score: mobileScore,
      hasViewportMeta: analysis.mobile?.hasViewportMeta || false,
      hasResponsiveCss: analysis.mobile?.hasResponsiveCss || false
    },
    tracking: {
      hasGoogleAnalytics: analysis.tracking?.googleAnalytics ||
                          analysis.tracking?.hasGoogleAnalytics || false,
      hasFacebookPixel: analysis.tracking?.facebookPixel ||
                        analysis.tracking?.hasFacebookPixel || false,
      hasGoogleTagManager: analysis.tracking?.googleTagManager ||
                           analysis.tracking?.hasGoogleTagManager || false,
      hasHotjar: analysis.tracking?.hotjar ||
                 analysis.tracking?.hasHotjar || false,
      hasClarity: analysis.tracking?.clarity ||
                  analysis.tracking?.hasClarityMicrosoft || false,
      hasTikTokPixel: (analysis.tracking as any)?.tiktokPixel || false,
      hasLinkedInInsightTag: (analysis.tracking as any)?.linkedInInsightTag || false,
      hasSnapchatPixel: (analysis.tracking as any)?.snapchatPixel || false,
      hasPinterestTag: (analysis.tracking as any)?.pinterestTag || false,
      score: trackingScore
    },
    gdpr: {
      hasCookieBanner: analysis.gdpr?.hasCookieBanner || false,
      hasPrivacyPolicy: analysis.gdpr?.hasPrivacyPolicy || false,
      hasTermsOfService: analysis.gdpr?.hasTermsOfService || false,
      hasVatNumber: analysis.gdpr?.hasVatNumber || false,
      vatNumbers: analysis.gdpr?.vatNumbers || [],
      score: gdprScore
    },
    images: {
      total: analysis.images?.total || 0,
      withoutAlt: analysis.images?.withoutAlt || 0,
      broken: analysis.images?.broken || 0
    },
    content: {
      phoneNumbers: analysis.content?.phoneNumbers || [],
      emailAddresses: analysis.content?.emailAddresses || [],
      hasContactForm: analysis.content?.hasContactForm || false,
      wordCount: analysis.content?.wordCount || 0,
      hasSocialLinks: analysis.content?.hasSocialLinks || false
    },
    issues: {
      critical: analysis.issues?.critical || [],
      high: analysis.issues?.high || [],
      medium: analysis.issues?.medium || [],
      low: analysis.issues?.low || []
    },
    overallScore: analysis.overallScore || 0,
    businessValue: analysis.businessValue || 0,
    technicalHealth: analysis.technicalHealth || 0,
    isAccessible: analysis.isAccessible ?? true,
    hasSSL: analysis.hasSSL ?? false
  }
}

/**
 * Normalizza WebsiteAnalysis (legacy)
 */
function normalizeLegacyAnalysis(analysis: WebsiteAnalysis): NormalizedAnalysis {
  const seoScore = calculateSEOScore(analysis.seo)
  const performanceScore = calculatePerformanceScoreLegacy(analysis.performance)
  const trackingScore = calculateTrackingScoreLegacy(analysis.tracking)
  const gdprScore = calculateGDPRScoreLegacy(analysis.gdpr)

  return {
    seo: {
      score: seoScore,
      hasTitle: analysis.seo?.hasTitle || false,
      titleLength: analysis.seo?.titleLength || 0,
      hasMetaDescription: analysis.seo?.hasMetaDescription || false,
      metaDescriptionLength: analysis.seo?.metaDescriptionLength || 0,
      hasH1: analysis.seo?.hasH1 || false,
      h1Count: analysis.seo?.h1Count || 0,
      hasStructuredData: analysis.seo?.hasStructuredData || false,
      hasOpenGraph: false,
      hasTwitterCard: false,
      hasSitemap: false,
      hasRobotsTxt: false
    },
    performance: {
      score: performanceScore,
      loadTime: analysis.performance?.loadTime || 0,
      ttfb: undefined,
      lcp: undefined,
      inp: undefined,
      fid: undefined,
      cls: undefined,
      fcp: undefined
    },
    mobile: {
      isMobileFriendly: analysis.performance?.isResponsive || false,
      score: analysis.performance?.isResponsive ? 70 : 30,
      hasViewportMeta: false,
      hasResponsiveCss: analysis.performance?.isResponsive || false
    },
    tracking: {
      hasGoogleAnalytics: analysis.tracking?.hasGoogleAnalytics || false,
      hasFacebookPixel: analysis.tracking?.hasFacebookPixel || false,
      hasGoogleTagManager: analysis.tracking?.hasGoogleTagManager || false,
      hasHotjar: analysis.tracking?.hasHotjar || false,
      hasClarity: analysis.tracking?.hasClarityMicrosoft || false,
      hasTikTokPixel: false,
      hasLinkedInInsightTag: false,
      hasSnapchatPixel: false,
      hasPinterestTag: false,
      score: trackingScore
    },
    gdpr: {
      hasCookieBanner: analysis.gdpr?.hasCookieBanner || false,
      hasPrivacyPolicy: analysis.gdpr?.hasPrivacyPolicy || false,
      hasTermsOfService: analysis.gdpr?.hasTermsOfService || false,
      hasVatNumber: analysis.legal?.hasVisiblePartitaIva || false,
      vatNumbers: [],
      score: gdprScore
    },
    images: {
      total: analysis.performance?.totalImages || 0,
      withoutAlt: 0,
      broken: analysis.performance?.brokenImages || 0
    },
    content: {
      phoneNumbers: [],
      emailAddresses: [],
      hasContactForm: false,
      wordCount: 0,
      hasSocialLinks: analysis.social?.hasAnySocial || false
    },
    issues: {
      critical: extractCriticalIssues(analysis.issues),
      high: extractHighIssues(analysis.issues),
      medium: [],
      low: []
    },
    overallScore: analysis.overallScore || 0,
    businessValue: 0,
    technicalHealth: 0,
    isAccessible: analysis.isAccessible ?? true,
    hasSSL: (analysis.finalUrl || analysis.url || '').startsWith('https')
  }
}

/**
 * Normalizza formato generico/sconosciuto
 */
function normalizeGenericAnalysis(analysis: any): NormalizedAnalysis {
  const base = getDefaultNormalizedAnalysis()

  // Prova a estrarre dati comuni
  if (analysis.seo) {
    base.seo.hasTitle = analysis.seo.hasTitle ?? base.seo.hasTitle
    base.seo.hasMetaDescription = analysis.seo.hasMetaDescription ?? base.seo.hasMetaDescription
    base.seo.hasH1 = analysis.seo.hasH1 ?? base.seo.hasH1
    base.seo.hasStructuredData = analysis.seo.hasStructuredData ?? base.seo.hasStructuredData
  }

  if (analysis.tracking) {
    base.tracking.hasGoogleAnalytics = analysis.tracking.hasGoogleAnalytics ??
                                        analysis.tracking.googleAnalytics ?? false
    base.tracking.hasFacebookPixel = analysis.tracking.hasFacebookPixel ??
                                      analysis.tracking.facebookPixel ?? false
  }

  if (analysis.overallScore !== undefined) {
    base.overallScore = analysis.overallScore
  }

  return base
}

/**
 * Calcola SEO score
 */
export function calculateSEOScore(seo: any): number {
  if (!seo) return 0

  let score = 0
  if (seo.hasTitle) score += 20
  if (seo.titleLength >= 30 && seo.titleLength <= 60) score += 10
  if (seo.hasMetaDescription) score += 20
  if (seo.metaDescriptionLength >= 120 && seo.metaDescriptionLength <= 160) score += 10
  if (seo.hasH1) score += 15
  if (seo.hasStructuredData) score += 10
  if (seo.hasOpenGraph) score += 5
  if (seo.hasTwitterCard) score += 5
  if (seo.hasSitemap) score += 5

  return Math.min(100, score)
}

/**
 * Calcola Performance score
 */
export function calculatePerformanceScore(perf: any): number {
  if (!perf) return 0

  let score = 100

  const loadTime = perf.loadTime || 0
  if (loadTime > 3000) score -= 20
  if (loadTime > 5000) score -= 20
  if (loadTime > 8000) score -= 20

  const lcp = perf.coreWebVitals?.lcp || perf.lcp || 0
  if (lcp > 2500) score -= 15
  if (lcp > 4000) score -= 15

  const cls = perf.coreWebVitals?.cls || perf.cls || 0
  if (cls > 0.1) score -= 10
  if (cls > 0.25) score -= 10

  return Math.max(0, score)
}

/**
 * Calcola Performance score (formato legacy)
 */
function calculatePerformanceScoreLegacy(perf: any): number {
  if (!perf) return 0

  let score = 100

  const loadTime = perf.loadTime || 0
  if (loadTime > 3000) score -= 25
  if (loadTime > 5000) score -= 25
  if (loadTime > 8000) score -= 25

  if (perf.brokenImages > 0) score -= 10
  if (!perf.isResponsive) score -= 15

  return Math.max(0, score)
}

/**
 * Calcola Tracking score
 */
export function calculateTrackingScore(tracking: any): number {
  if (!tracking) return 0

  let score = 0
  if (tracking.googleAnalytics || tracking.hasGoogleAnalytics) score += 25
  if (tracking.googleTagManager || tracking.hasGoogleTagManager) score += 20
  if (tracking.facebookPixel || tracking.hasFacebookPixel) score += 15
  if (tracking.googleAdsConversion) score += 10
  if (tracking.hotjar || tracking.hasHotjar || tracking.clarity || tracking.hasClarityMicrosoft) score += 10
  if (tracking.tiktokPixel) score += 5
  if (tracking.linkedInInsightTag) score += 5
  if (tracking.snapchatPixel) score += 5
  if (tracking.pinterestTag) score += 5

  return Math.min(100, score)
}

/**
 * Calcola Tracking score (formato legacy)
 */
function calculateTrackingScoreLegacy(tracking: any): number {
  if (!tracking) return 0

  let score = 0
  if (tracking.hasGoogleAnalytics) score += 30
  if (tracking.hasGoogleTagManager) score += 25
  if (tracking.hasFacebookPixel) score += 20
  if (tracking.hasHotjar) score += 10
  if (tracking.hasClarityMicrosoft) score += 10

  return Math.min(100, score)
}

/**
 * Calcola GDPR score
 */
export function calculateGDPRScore(gdpr: any): number {
  if (!gdpr) return 0

  let score = 0
  if (gdpr.hasCookieBanner) score += 30
  if (gdpr.hasPrivacyPolicy) score += 30
  if (gdpr.hasTermsOfService) score += 15
  if (gdpr.hasVatNumber) score += 15
  if (gdpr.hasContactInfo) score += 10

  return Math.min(100, score)
}

/**
 * Calcola GDPR score (formato legacy)
 */
function calculateGDPRScoreLegacy(gdpr: any): number {
  if (!gdpr) return 0

  let score = 0
  if (gdpr.hasCookieBanner) score += 35
  if (gdpr.hasPrivacyPolicy) score += 35
  if (gdpr.hasTermsOfService) score += 20

  return Math.min(100, score)
}

/**
 * Calcola Mobile score
 */
export function calculateMobileScore(mobile: any): number {
  if (!mobile) return 0

  let score = 100
  if (!mobile.isMobileFriendly) score -= 30
  if (!mobile.hasViewportMeta) score -= 20
  if (!mobile.hasResponsiveCss) score -= 20
  if (mobile.hasHorizontalScroll) score -= 15
  if (!mobile.touchTargetsOk) score -= 10
  if (!mobile.textReadable) score -= 10

  return Math.max(0, score)
}

/**
 * Estrae critical issues dal formato legacy
 */
function extractCriticalIssues(issues: any): string[] {
  if (!issues) return []
  const critical: string[] = []

  if (issues.missingTitle) critical.push('Manca il tag title')
  if (issues.slowLoading) critical.push('Caricamento lento')
  if (issues.httpsIssues) critical.push('Problemi SSL/HTTPS')

  return critical
}

/**
 * Estrae high priority issues dal formato legacy
 */
function extractHighIssues(issues: any): string[] {
  if (!issues) return []
  const high: string[] = []

  if (issues.missingMetaDescription) high.push('Manca la meta description')
  if (issues.noTracking) high.push('Nessun sistema di tracking')
  if (issues.noCookieConsent) high.push('Manca il cookie consent')

  return high
}

/**
 * Ritorna analisi normalizzata di default
 */
export function getDefaultNormalizedAnalysis(): NormalizedAnalysis {
  return {
    seo: {
      score: 0,
      hasTitle: false,
      titleLength: 0,
      hasMetaDescription: false,
      metaDescriptionLength: 0,
      hasH1: false,
      h1Count: 0,
      hasStructuredData: false,
      hasOpenGraph: false,
      hasTwitterCard: false,
      hasSitemap: false,
      hasRobotsTxt: false
    },
    performance: {
      score: 0,
      loadTime: 0
    },
    mobile: {
      isMobileFriendly: false,
      score: 0,
      hasViewportMeta: false,
      hasResponsiveCss: false
    },
    tracking: {
      hasGoogleAnalytics: false,
      hasFacebookPixel: false,
      hasGoogleTagManager: false,
      hasHotjar: false,
      hasClarity: false,
      hasTikTokPixel: false,
      hasLinkedInInsightTag: false,
      hasSnapchatPixel: false,
      hasPinterestTag: false,
      score: 0
    },
    gdpr: {
      hasCookieBanner: false,
      hasPrivacyPolicy: false,
      hasTermsOfService: false,
      hasVatNumber: false,
      vatNumbers: [],
      score: 0
    },
    images: {
      total: 0,
      withoutAlt: 0,
      broken: 0
    },
    content: {
      phoneNumbers: [],
      emailAddresses: [],
      hasContactForm: false,
      wordCount: 0,
      hasSocialLinks: false
    },
    issues: {
      critical: [],
      high: [],
      medium: [],
      low: []
    },
    overallScore: 0,
    businessValue: 0,
    technicalHealth: 0,
    isAccessible: false,
    hasSSL: false
  }
}

/**
 * Ritorna colore CSS per score
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  if (score >= 40) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Ritorna colore background per score
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
  if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30'
  if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/30'
  return 'bg-red-100 dark:bg-red-900/30'
}

/**
 * Ritorna emoji per score
 */
export function getScoreEmoji(score: number): string {
  if (score >= 80) return '+'
  if (score >= 60) return '~'
  if (score >= 40) return '-'
  return '!'
}

/**
 * Formatta score come percentuale
 */
export function formatScore(score: number): string {
  return `${Math.round(score)}%`
}

/**
 * Genera raccomandazioni basate sull'analisi normalizzata
 */
export function generateRecommendations(analysis: NormalizedAnalysis): Array<{
  category: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
}> {
  const recommendations: Array<{
    category: string
    priority: 'critical' | 'high' | 'medium' | 'low'
    title: string
    description: string
  }> = []

  // SEO
  if (!analysis.seo.hasTitle) {
    recommendations.push({
      category: 'SEO',
      priority: 'critical',
      title: 'Aggiungi tag title',
      description: 'Il tag title e fondamentale per SEO e appare nei risultati di ricerca'
    })
  }

  if (!analysis.seo.hasMetaDescription) {
    recommendations.push({
      category: 'SEO',
      priority: 'high',
      title: 'Aggiungi meta description',
      description: 'La meta description migliora il CTR nei risultati di ricerca'
    })
  }

  if (!analysis.seo.hasH1) {
    recommendations.push({
      category: 'SEO',
      priority: 'medium',
      title: 'Aggiungi tag H1',
      description: 'Il tag H1 indica il tema principale della pagina ai motori di ricerca'
    })
  }

  if (!analysis.seo.hasStructuredData) {
    recommendations.push({
      category: 'SEO',
      priority: 'medium',
      title: 'Aggiungi dati strutturati',
      description: 'I dati strutturati (Schema.org) migliorano la visibilita nei risultati'
    })
  }

  // Performance
  if (analysis.performance.loadTime > 5000) {
    recommendations.push({
      category: 'Performance',
      priority: 'high',
      title: 'Ottimizza velocita di caricamento',
      description: 'Il sito impiega piu di 5 secondi a caricarsi. Ottimizza immagini e script'
    })
  }

  if (analysis.performance.lcp && analysis.performance.lcp > 2500) {
    recommendations.push({
      category: 'Performance',
      priority: 'high',
      title: 'Migliora Largest Contentful Paint',
      description: 'LCP elevato penalizza il ranking. Ottimizza immagini hero e font'
    })
  }

  // Mobile
  if (!analysis.mobile.isMobileFriendly) {
    recommendations.push({
      category: 'Mobile',
      priority: 'critical',
      title: 'Rendi il sito mobile-friendly',
      description: 'Google usa mobile-first indexing. Un sito non mobile e penalizzato'
    })
  }

  // Tracking
  if (!analysis.tracking.hasGoogleAnalytics) {
    recommendations.push({
      category: 'Marketing',
      priority: 'high',
      title: 'Installa Google Analytics',
      description: 'Senza analytics non puoi misurare traffico e conversioni'
    })
  }

  if (!analysis.tracking.hasFacebookPixel) {
    recommendations.push({
      category: 'Marketing',
      priority: 'medium',
      title: 'Installa Facebook Pixel',
      description: 'Il Pixel permette retargeting e tracking conversioni da Meta Ads'
    })
  }

  // GDPR
  if (!analysis.gdpr.hasCookieBanner && analysis.tracking.score > 0) {
    recommendations.push({
      category: 'Legale',
      priority: 'critical',
      title: 'Aggiungi cookie banner GDPR',
      description: 'Con tracking attivo senza consenso rischi sanzioni fino a 20M EUR'
    })
  }

  if (!analysis.gdpr.hasPrivacyPolicy) {
    recommendations.push({
      category: 'Legale',
      priority: 'high',
      title: 'Aggiungi Privacy Policy',
      description: 'La privacy policy e obbligatoria per legge in Italia e UE'
    })
  }

  // Images
  if (analysis.images.withoutAlt > 2) {
    recommendations.push({
      category: 'Accessibilita',
      priority: 'medium',
      title: 'Aggiungi alt text alle immagini',
      description: `${analysis.images.withoutAlt} immagini senza alt text. Penalizza SEO e accessibilita`
    })
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return recommendations
}
