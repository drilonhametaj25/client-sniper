/**
 * Service Detection Algorithm
 *
 * Analizza i dati di un lead per rilevare quali servizi sono necessari
 * basandosi sui problemi identificati nell'analisi del sito web.
 */

import {
  ServiceType,
  ServiceTag,
  DetectedServices,
  SERVICE_CONFIGS
} from '@/lib/types/services'

/**
 * Mapping keywords per ogni servizio
 * Usato per identificare problemi dall'array issues
 */
const SERVICE_KEYWORDS: Record<ServiceType, string[]> = {
  seo: [
    'title',
    'meta_description',
    'meta_title',
    'h1',
    'h2',
    'heading',
    'sitemap',
    'robots',
    'canonical',
    'schema',
    'structured_data',
    'alt_text',
    'alt',
    'internal_link',
    'redirect',
    'seo',
    'index',
    'crawl'
  ],
  gdpr: [
    'privacy',
    'cookie',
    'gdpr',
    'terms',
    'consent',
    'data_protection',
    'policy',
    'legal',
    'vat',
    'p.iva',
    'partita iva'
  ],
  analytics: [
    'google_analytics',
    'ga4',
    'analytics',
    'facebook_pixel',
    'meta_pixel',
    'pixel',
    'tracking',
    'conversion',
    'tag_manager',
    'gtm',
    'hotjar',
    'clarity'
  ],
  mobile: [
    'mobile',
    'responsive',
    'viewport',
    'touch',
    'tablet',
    'smartphone'
  ],
  performance: [
    'performance',
    'speed',
    'loading',
    'slow',
    'cache',
    'caching',
    'optimization',
    'compress',
    'minif',
    'lazy',
    'cdn',
    'ttfb',
    'lcp',
    'fid',
    'cls',
    'core_web_vitals'
  ],
  development: [
    'ssl',
    'https',
    'http',
    'broken',
    '404',
    'error',
    'redesign',
    'rebuild',
    'migration',
    'security',
    'vulnerable'
  ],
  design: [
    'design',
    'ui',
    'ux',
    'layout',
    'visual',
    'branding',
    'logo',
    'image',
    'immagine'
  ],
  social: [
    'social',
    'facebook',
    'instagram',
    'linkedin',
    'twitter',
    'youtube',
    'tiktok'
  ]
}

/**
 * Tipo per l'analysis object (flessibile per legacy/modern format)
 */
interface AnalysisData {
  seo?: {
    hasTitle?: boolean
    hasMetaDescription?: boolean
    hasH1?: boolean
    hasH2?: boolean
    hasStructuredData?: boolean
    hasSitemap?: boolean
    hasRobotsTxt?: boolean
    hasCanonical?: boolean
    score?: number
  }
  gdpr?: {
    hasCookieBanner?: boolean
    hasPrivacyPolicy?: boolean
    hasTermsOfService?: boolean
    hasVatNumber?: boolean
    gdprScore?: number
  }
  tracking?: {
    googleAnalytics?: boolean
    hasGoogleAnalytics?: boolean
    googleTagManager?: boolean
    hasGoogleTagManager?: boolean
    facebookPixel?: boolean
    hasFacebookPixel?: boolean
    hotjar?: boolean
    clarity?: boolean
    trackingScore?: number
  }
  mobile?: {
    isMobileFriendly?: boolean
    hasViewportMeta?: boolean
    hasResponsiveCss?: boolean
    mobileScore?: number
  }
  performance?: {
    loadTime?: number
    ttfb?: number
    coreWebVitals?: {
      lcp?: number
      fid?: number
      cls?: number
    }
    overallScore?: number
  }
  images?: {
    broken?: number
    withoutAlt?: number
    oversized?: number
    total?: number
  }
  content?: {
    hasSocialLinks?: boolean
    socialLinks?: string[]
  }
  social?: {
    hasAnySocial?: boolean
    socialCount?: number
    platforms?: Record<string, string | boolean>
  }
  hasSSL?: boolean
  issues?: {
    critical?: string[]
    high?: string[]
    medium?: string[]
    low?: string[]
  }
  overallScore?: number
}

/**
 * Problema rilevato con priorità
 */
interface DetectedIssue {
  message: string
  priority: 'high' | 'medium' | 'low'
  service: ServiceType
}

/**
 * Rileva problemi SEO dall'analisi
 */
function detectSeoIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const seo = analysis.seo

  if (seo) {
    if (!seo.hasTitle) {
      issues.push({ message: 'Tag Title mancante', priority: 'high', service: 'seo' })
    }
    if (!seo.hasMetaDescription) {
      issues.push({ message: 'Meta Description mancante', priority: 'high', service: 'seo' })
    }
    if (!seo.hasH1) {
      issues.push({ message: 'Tag H1 mancante', priority: 'medium', service: 'seo' })
    }
    if (!seo.hasStructuredData) {
      issues.push({ message: 'Dati strutturati mancanti', priority: 'low', service: 'seo' })
    }
    if (!seo.hasSitemap) {
      issues.push({ message: 'Sitemap mancante', priority: 'medium', service: 'seo' })
    }
    if (!seo.hasRobotsTxt) {
      issues.push({ message: 'Robots.txt mancante', priority: 'low', service: 'seo' })
    }
    if (!seo.hasCanonical) {
      issues.push({ message: 'Tag Canonical mancante', priority: 'low', service: 'seo' })
    }
  }

  // Check images alt text
  if (analysis.images?.withoutAlt && analysis.images.withoutAlt > 0) {
    issues.push({
      message: `${analysis.images.withoutAlt} immagini senza alt text`,
      priority: 'medium',
      service: 'seo'
    })
  }

  return issues
}

/**
 * Rileva problemi GDPR dall'analisi
 */
function detectGdprIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const gdpr = analysis.gdpr

  if (gdpr) {
    if (!gdpr.hasCookieBanner) {
      issues.push({ message: 'Cookie Banner mancante', priority: 'high', service: 'gdpr' })
    }
    if (!gdpr.hasPrivacyPolicy) {
      issues.push({ message: 'Privacy Policy mancante', priority: 'high', service: 'gdpr' })
    }
    if (!gdpr.hasTermsOfService) {
      issues.push({ message: 'Termini di Servizio mancanti', priority: 'medium', service: 'gdpr' })
    }
    if (!gdpr.hasVatNumber) {
      issues.push({ message: 'P.IVA non visibile', priority: 'low', service: 'gdpr' })
    }
  }

  return issues
}

/**
 * Rileva problemi Analytics dall'analisi
 */
function detectAnalyticsIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const tracking = analysis.tracking

  if (tracking) {
    const hasGA = tracking.googleAnalytics || tracking.hasGoogleAnalytics
    const hasGTM = tracking.googleTagManager || tracking.hasGoogleTagManager
    const hasFB = tracking.facebookPixel || tracking.hasFacebookPixel

    if (!hasGA && !hasGTM) {
      issues.push({ message: 'Google Analytics non installato', priority: 'high', service: 'analytics' })
    }
    if (!hasGTM) {
      issues.push({ message: 'Google Tag Manager mancante', priority: 'medium', service: 'analytics' })
    }
    if (!hasFB) {
      issues.push({ message: 'Facebook Pixel mancante', priority: 'medium', service: 'analytics' })
    }
    if (!tracking.hotjar && !tracking.clarity) {
      issues.push({ message: 'Nessun tool di heatmap', priority: 'low', service: 'analytics' })
    }
  } else {
    // No tracking data at all
    issues.push({ message: 'Nessun sistema di tracking', priority: 'high', service: 'analytics' })
  }

  return issues
}

/**
 * Rileva problemi Mobile dall'analisi
 */
function detectMobileIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const mobile = analysis.mobile

  if (mobile) {
    if (!mobile.isMobileFriendly) {
      issues.push({ message: 'Sito non mobile-friendly', priority: 'high', service: 'mobile' })
    }
    if (!mobile.hasViewportMeta) {
      issues.push({ message: 'Viewport meta mancante', priority: 'high', service: 'mobile' })
    }
    if (!mobile.hasResponsiveCss) {
      issues.push({ message: 'CSS non responsive', priority: 'medium', service: 'mobile' })
    }
  }

  return issues
}

/**
 * Rileva problemi Performance dall'analisi
 */
function detectPerformanceIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const performance = analysis.performance

  if (performance) {
    if (performance.loadTime && performance.loadTime > 3000) {
      issues.push({
        message: `Sito lento (${(performance.loadTime / 1000).toFixed(1)}s)`,
        priority: 'high',
        service: 'performance'
      })
    }
    if (performance.loadTime && performance.loadTime > 5000) {
      issues.push({ message: 'Tempo di caricamento critico', priority: 'high', service: 'performance' })
    }

    const cwv = performance.coreWebVitals
    if (cwv) {
      if (cwv.lcp && cwv.lcp > 2500) {
        issues.push({ message: 'LCP scarso (>2.5s)', priority: 'medium', service: 'performance' })
      }
      if (cwv.cls && cwv.cls > 0.1) {
        issues.push({ message: 'CLS scarso (layout shift)', priority: 'medium', service: 'performance' })
      }
    }
  }

  // Oversized images
  if (analysis.images?.oversized && analysis.images.oversized > 0) {
    issues.push({
      message: `${analysis.images.oversized} immagini sovradimensionate`,
      priority: 'medium',
      service: 'performance'
    })
  }

  return issues
}

/**
 * Rileva problemi Development/Security dall'analisi
 */
function detectDevelopmentIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []

  if (analysis.hasSSL === false) {
    issues.push({ message: 'HTTPS non attivo', priority: 'high', service: 'development' })
  }

  if (analysis.images?.broken && analysis.images.broken > 0) {
    issues.push({
      message: `${analysis.images.broken} immagini rotte`,
      priority: 'medium',
      service: 'development'
    })
  }

  // Very low score suggests need for redesign
  if (analysis.overallScore !== undefined && analysis.overallScore < 20) {
    issues.push({ message: 'Sito richiede redesign completo', priority: 'high', service: 'development' })
  }

  return issues
}

/**
 * Rileva problemi Social dall'analisi
 */
function detectSocialIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []

  const hasSocial = analysis.social?.hasAnySocial ||
    (analysis.content?.hasSocialLinks) ||
    (analysis.content?.socialLinks && analysis.content.socialLinks.length > 0)

  if (!hasSocial) {
    issues.push({ message: 'Nessuna presenza social', priority: 'medium', service: 'social' })
  } else if (analysis.social?.socialCount !== undefined && analysis.social.socialCount < 2) {
    issues.push({ message: 'Pochi canali social collegati', priority: 'low', service: 'social' })
  }

  return issues
}

/**
 * Rileva problemi Design dall'analisi
 */
function detectDesignIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []

  // Design issues are harder to detect automatically
  // We infer from broken images and overall score
  if (analysis.images?.broken && analysis.images.broken > 2) {
    issues.push({ message: 'Problemi visivi (immagini mancanti)', priority: 'medium', service: 'design' })
  }

  // If score is medium-low but no specific technical issues, might be design
  if (analysis.overallScore !== undefined &&
      analysis.overallScore >= 20 &&
      analysis.overallScore < 40) {
    // Check if we already have development issues
    const hasDevelopmentIssues = analysis.hasSSL === false || (analysis.images?.broken || 0) > 0
    if (!hasDevelopmentIssues) {
      issues.push({ message: 'Miglioramenti UI/UX consigliati', priority: 'low', service: 'design' })
    }
  }

  return issues
}

/**
 * Processa issues array dall'analysis e li mappa ai servizi
 */
function processStructuredIssues(analysis: AnalysisData): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const structuredIssues = analysis.issues

  if (!structuredIssues) return issues

  const processIssueArray = (
    issueArray: string[] | undefined,
    priority: 'high' | 'medium' | 'low'
  ) => {
    if (!issueArray) return

    for (const issueText of issueArray) {
      const lowerText = issueText.toLowerCase()

      // Find which service this issue belongs to
      for (const [serviceType, keywords] of Object.entries(SERVICE_KEYWORDS)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          issues.push({
            message: issueText,
            priority,
            service: serviceType as ServiceType
          })
          break
        }
      }
    }
  }

  processIssueArray(structuredIssues.critical, 'high')
  processIssueArray(structuredIssues.high, 'high')
  processIssueArray(structuredIssues.medium, 'medium')
  processIssueArray(structuredIssues.low, 'low')

  return issues
}

/**
 * Normalizza un oggetto analysis nel formato strutturato atteso dai detector.
 *
 * I lead salvati nel DB (e restituiti da /api/leads) espongono la forma "legacy"
 * compatta (LegacyAnalysis: has_website, missing_meta_tags, has_tracking_pixel,
 * broken_images, gtm_installed, website_load_time, overall_score), mentre i
 * detector lavorano sulla forma moderna annidata (seo/tracking/performance/...).
 * Senza questa conversione i detector non trovano nessun sotto-oggetto e
 * rilevano solo "analytics"/"social" per OGNI lead, rendendo di fatto inutile il
 * filtro "Servizi Richiesti" (qualunque altro servizio → 0 risultati).
 *
 * Dai campi legacy possiamo derivare in modo affidabile: seo, analytics,
 * performance, development e design. gdpr/mobile/social non sono presenti nella
 * forma compatta: per questi assumiamo valori "presenti/sconosciuti" così da non
 * inventare difetti (falsi positivi). Per i lead che hanno la forma moderna
 * completa (website_analysis) restano disponibili tutti gli 8 servizi.
 */
function normalizeAnalysisShape(raw: any): AnalysisData {
  if (!raw || typeof raw !== 'object') return {}

  // Già in formato moderno (ha i sotto-oggetti annidati): nessuna conversione.
  if (raw.seo || raw.tracking || raw.mobile || raw.gdpr) {
    return raw as AnalysisData
  }

  // Riconosci la forma legacy compatta; se non lo è, restituisci invariato.
  const isLegacy =
    'missing_meta_tags' in raw ||
    'has_tracking_pixel' in raw ||
    'has_website' in raw ||
    'overall_score' in raw
  if (!isLegacy) return raw as AnalysisData

  const missing: string[] = Array.isArray(raw.missing_meta_tags)
    ? raw.missing_meta_tags.map((t: any) => String(t).toLowerCase())
    : []
  const isMissing = (...keys: string[]) => keys.some(k => missing.includes(k))

  const hasTracking = raw.has_tracking_pixel === true
  const hasGtm = raw.gtm_installed === true
  const loadTimeMs = typeof raw.website_load_time === 'number' ? raw.website_load_time : 0
  const brokenImages = raw.broken_images === true
  const overall = raw.has_website === false
    ? 0 // sito assente → opportunità di sviluppo/redesign completo
    : (typeof raw.overall_score === 'number' ? raw.overall_score : undefined)

  return {
    seo: {
      hasTitle: !isMissing('title'),
      hasMetaDescription: !isMissing('meta-description', 'meta_description', 'metadescription', 'description'),
      hasH1: !isMissing('h1'),
      hasCanonical: !isMissing('canonical'),
      // Non disponibili nella forma legacy: assumiamo presenti per basare il
      // rilevamento SEO solo sui meta tag realmente mancanti.
      hasH2: true,
      hasStructuredData: true,
      hasSitemap: true,
      hasRobotsTxt: true
    },
    tracking: {
      googleAnalytics: hasTracking,
      hasGoogleAnalytics: hasTracking,
      googleTagManager: hasGtm,
      hasGoogleTagManager: hasGtm,
      facebookPixel: hasTracking,
      hasFacebookPixel: hasTracking,
      // Sconosciuti: assumiamo presenti per non gonfiare il difetto "analytics".
      hotjar: true,
      clarity: true
    },
    performance: {
      loadTime: loadTimeMs
    },
    images: {
      broken: brokenImages ? 1 : 0,
      withoutAlt: 0,
      oversized: 0,
      total: 0
    },
    // Non rilevabili dalla forma legacy: evitiamo falsi positivi su social.
    social: { hasAnySocial: true },
    content: { hasSocialLinks: true },
    overallScore: overall
  }
}

/**
 * Funzione principale: Rileva i servizi necessari per un lead
 */
export function detectServices(analysis: any): DetectedServices {
  if (!analysis) {
    return {
      services: [],
      totalBudget: { min: 0, max: 0 },
      primaryService: null
    }
  }

  // Normalizza analysis: preferisci la forma moderna (website_analysis) e
  // converti la forma legacy compatta nello schema annidato atteso dai detector.
  const analysisData: AnalysisData = normalizeAnalysisShape(analysis.website_analysis || analysis)

  // Raccogli tutti i problemi rilevati
  const allIssues: DetectedIssue[] = [
    ...detectSeoIssues(analysisData),
    ...detectGdprIssues(analysisData),
    ...detectAnalyticsIssues(analysisData),
    ...detectMobileIssues(analysisData),
    ...detectPerformanceIssues(analysisData),
    ...detectDevelopmentIssues(analysisData),
    ...detectSocialIssues(analysisData),
    ...detectDesignIssues(analysisData),
    ...processStructuredIssues(analysisData)
  ]

  // Raggruppa per servizio
  const serviceMap = new Map<ServiceType, DetectedIssue[]>()

  for (const issue of allIssues) {
    const existing = serviceMap.get(issue.service) || []
    // Evita duplicati
    if (!existing.some(e => e.message === issue.message)) {
      existing.push(issue)
      serviceMap.set(issue.service, existing)
    }
  }

  // Converti in ServiceTag[]
  const services: ServiceTag[] = []

  for (const [serviceType, issues] of serviceMap.entries()) {
    const config = SERVICE_CONFIGS[serviceType]
    const highCount = issues.filter(i => i.priority === 'high').length
    const mediumCount = issues.filter(i => i.priority === 'medium').length

    // Determina priorità del servizio
    let priority: 'high' | 'medium' | 'low'
    if (highCount >= 2 || serviceType === 'gdpr') {
      priority = 'high'
    } else if (highCount >= 1 || mediumCount >= 2) {
      priority = 'medium'
    } else {
      priority = 'low'
    }

    // Calcola budget (moltiplicatore basato su numero issues)
    const multiplier = 1 + (issues.length * 0.15)

    services.push({
      type: serviceType,
      priority,
      issueCount: issues.length,
      estimatedBudget: {
        min: Math.round(config.baseBudget.min * multiplier / 100) * 100,
        max: Math.round(config.baseBudget.max * multiplier / 100) * 100
      },
      specificIssues: issues.map(i => i.message)
    })
  }

  // Ordina per priorità e numero issues
  services.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 }
    const aWeight = priorityWeight[a.priority] * 10 + a.issueCount
    const bWeight = priorityWeight[b.priority] * 10 + b.issueCount
    return bWeight - aWeight
  })

  // Calcola budget totale
  const totalBudget = services.reduce(
    (acc, service) => ({
      min: acc.min + service.estimatedBudget.min,
      max: acc.max + service.estimatedBudget.max
    }),
    { min: 0, max: 0 }
  )

  return {
    services,
    totalBudget,
    primaryService: services[0]?.type || null
  }
}

/**
 * Helper: Ottiene solo i servizi con priorità alta
 */
export function getHighPriorityServices(detected: DetectedServices): ServiceTag[] {
  return detected.services.filter(s => s.priority === 'high')
}

/**
 * Helper: Conta problemi totali
 */
export function getTotalIssueCount(detected: DetectedServices): number {
  return detected.services.reduce((sum, s) => sum + s.issueCount, 0)
}
