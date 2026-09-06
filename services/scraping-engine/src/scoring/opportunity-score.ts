/**
 * Opportunity Score v2 — il punteggio che il prodotto vende.
 *
 * CONVENZIONE (v2): 0-100, ALTO = MIGLIORE opportunità di vendita.
 * (La v1 salvava un "health score" del sito: alto = sito sano = lead peggiore,
 * con l'API che ordinava ASC e la RPC che ordinava DESC — split brain.)
 *
 * Principi:
 * - Solo difetti CONFERMATI contribuiscono (mai default di moduli falliti:
 *   il chiamante non deve nemmeno chiamarci se l'analisi è inaffidabile,
 *   ma in ogni caso qui i segnali unverifiable valgono zero).
 * - Subscore per SERVIZIO vendibile: un lead ottimo per UNA proposta concreta
 *   è un ottimo lead -> overall = media pesata dei 2 subscore migliori.
 * - Contattabilità: senza un contatto il lead non è azionabile -> cap.
 * - Solidità del business: un'attività con molte recensioni può pagare -> bonus.
 *
 * Funzione PURA e deterministica: nessun I/O, nessun LLM.
 * Parte del modulo services/scraping-engine.
 */

import type { EnhancedWebsiteAnalysis } from '../analyzers/enhanced-website-analyzer'

/**
 * Vocabolario servizi UNICO, allineato a apps/frontend-app/lib/types/services.ts
 * (SERVICE_CONFIGS). ⚠️ Tenere in sync finché non viene estratto in libs/types.
 */
export type ServiceType =
  | 'seo'
  | 'gdpr'
  | 'analytics'
  | 'mobile'
  | 'performance'
  | 'development'
  | 'design'
  | 'social'

export const SERVICE_TYPES: ServiceType[] = [
  'seo', 'gdpr', 'analytics', 'mobile', 'performance', 'development', 'design', 'social'
]

/** Mappa verso il vocabolario legacy needed_roles (colonna ancora letta dal frontend) */
export const SERVICE_TO_LEGACY_ROLE: Record<ServiceType, string> = {
  development: 'developer',
  design: 'designer',
  seo: 'seo',
  social: 'social',
  gdpr: 'gdpr',
  analytics: 'social',
  mobile: 'developer',
  performance: 'developer'
}

export interface OpportunityBusinessInput {
  hasWebsite: boolean
  phone?: string | null
  email?: string | null
  rating?: number | null
  reviewsCount?: number | null
}

export interface OpportunityResult {
  /** 0-100, alto = migliore opportunità */
  score: number
  /** subscore 0-100 per servizio vendibile */
  subscores: Record<ServiceType, number>
  /** servizi con subscore >= 40, ordinati dal più forte */
  neededServices: ServiceType[]
  /** vocabolario legacy per la colonna needed_roles */
  neededRoles: string[]
  /** motivazioni leggibili (per debug/UI) */
  reasons: string[]
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))

/**
 * Calcola l'opportunity score.
 * @param analysis analisi del sito (null/undefined = business senza sito)
 * @param business dati del business dallo scraping
 * @param options.confirmedAbsence true se l'assenza del sito è CONFERMATA
 *        (DNS/refused/parked). Un timeout NON è assenza confermata.
 */
export function computeOpportunityScore(
  analysis: EnhancedWebsiteAnalysis | null | undefined,
  business: OpportunityBusinessInput,
  options: { confirmedAbsence?: boolean } = {}
): OpportunityResult {
  const sub: Record<ServiceType, number> = {
    seo: 0, gdpr: 0, analytics: 0, mobile: 0,
    performance: 0, development: 0, design: 0, social: 0
  }
  const reasons: string[] = []

  const failed = new Set(analysis?.reliability?.failedModules || [])
  const ok = (module: string) => !failed.has(module)

  if (!business.hasWebsite || !analysis) {
    // Business SENZA sito: è l'opportunità "sviluppo" per eccellenza,
    // ma solo se l'assenza è confermata.
    if (options.confirmedAbsence ?? true) {
      sub.development = 95
      sub.design = 60
      reasons.push('Nessun sito web: opportunità di sviluppo da zero')
    }
  } else if (!analysis.isAccessible) {
    if (options.confirmedAbsence || analysis.reachabilityVerdict === 'offline_confirmed') {
      sub.development = 90
      reasons.push('Sito confermato offline/parcheggiato: rifacimento necessario')
    }
    // offline sospetto: nessun punteggio (il lead è comunque in quarantena)
  } else {
    // ---- SEO ----
    if (ok('seo')) {
      let s = 0
      if (!analysis.seo.hasTitle) { s += 40; reasons.push('Manca il title') }
      if (!analysis.seo.hasMetaDescription) { s += 30; reasons.push('Manca la meta description') }
      if (!analysis.seo.hasH1) s += 15
      if (!analysis.seo.hasStructuredData) s += 10
      if (!analysis.seo.hasSitemap) s += 5
      sub.seo = clamp(s)
    }

    // ---- Analytics/tracking (solo assenza CONFERMATA) ----
    if (ok('tracking') && analysis.tracking.detectionConfidence === 'confirmed') {
      const noAnalytics = !analysis.tracking.googleAnalytics && !analysis.tracking.googleTagManager
      if (noAnalytics) {
        sub.analytics = 80
        reasons.push('Nessun sistema di analytics (assenza confermata)')
      } else if (!analysis.tracking.facebookPixel && !analysis.tracking.googleAdsConversion) {
        sub.analytics = 30
      }
    }

    // ---- GDPR (solo assenza banner CONFERMATA) ----
    if (ok('gdpr')) {
      let s = 0
      const bannerConfirmedAbsent =
        !analysis.gdpr.hasCookieBanner && analysis.gdpr.cookieBannerConfidence === 'confirmed'
      if (bannerConfirmedAbsent && (analysis.tracking?.trackingScore || 0) > 0) {
        s += 70
        reasons.push('Tracking attivo senza cookie banner')
      } else if (bannerConfirmedAbsent) {
        s += 40
      }
      if (!analysis.gdpr.hasPrivacyPolicy) s += 25
      sub.gdpr = clamp(s)
    }

    // ---- Mobile ----
    if (ok('mobile') && !analysis.mobile.isMobileFriendly) {
      let s = 65
      if (analysis.mobile.hasHorizontalScroll) s += 15
      if (!analysis.mobile.hasViewportMeta) s += 10
      sub.mobile = clamp(s)
      reasons.push('Sito non ottimizzato per mobile')
    }

    // ---- Performance ----
    if (ok('performance')) {
      const speed = analysis.performance.speedScore
      if (speed < 30) { sub.performance = 80; reasons.push('Prestazioni molto scarse') }
      else if (speed < 50) sub.performance = 60
      else if (speed < 70) sub.performance = 35
    }

    // ---- Development (problemi tecnici hard) ----
    if (analysis.hasSSL === false) {
      sub.development = Math.max(sub.development, 70)
      reasons.push('Sito senza HTTPS')
    }
    if (ok('images') && analysis.images.broken > 2) {
      sub.development = Math.max(sub.development, 45)
    }
    if (analysis.security?.vulnerabilities?.hasOutdatedJquery) {
      sub.development = Math.max(sub.development, 40)
    }

    // ---- Design (proxy: mobile + contenuti poveri) ----
    if (ok('mobile') && ok('content')) {
      if (!analysis.mobile.hasResponsiveCss && analysis.content.wordCount < 300) {
        sub.design = 55
      } else if (!analysis.mobile.hasResponsiveCss) {
        sub.design = 40
      }
    }

    // ---- Social ----
    if (ok('content') && !analysis.content.hasSocialLinks) {
      sub.social = 60
      reasons.push('Nessun profilo social collegato al sito')
    }
  }

  // Overall = media pesata dei 2 subscore migliori (un lead forte su UNA
  // proposta concreta è un lead forte)
  const sorted = (Object.entries(sub) as Array<[ServiceType, number]>)
    .sort((a, b) => b[1] - a[1])
  const [top1, top2] = [sorted[0]?.[1] ?? 0, sorted[1]?.[1] ?? 0]
  let score = top1 * 0.7 + top2 * 0.3

  // Contattabilità: senza contatti il lead non è azionabile
  const hasContact = !!(business.phone || business.email)
  if (!hasContact) {
    score = Math.min(score, 40)
    reasons.push('Nessun contatto diretto disponibile (cap applicato)')
  }

  // Solidità del business: recensioni = capacità/di spesa e attività reale
  const reviews = business.reviewsCount || 0
  if (reviews >= 80) score += 10
  else if (reviews >= 20) score += 5

  const neededServices = sorted.filter(([, v]) => v >= 40).map(([k]) => k)
  const neededRoles = [...new Set(neededServices.map(s => SERVICE_TO_LEGACY_ROLE[s]))]

  return {
    score: clamp(score),
    subscores: sub,
    neededServices,
    neededRoles,
    reasons
  }
}
