/**
 * Competitor Quick Wins Calculator per Client Sniper
 * Analizza i gap con i competitor e suggerisce le azioni più impattanti
 */

export interface QuickWin {
  id: string
  gap: string                      // "Manca Facebook Pixel"
  category: 'seo' | 'performance' | 'tracking' | 'gdpr' | 'mobile' | 'security' | 'content'
  effort: 'hours' | 'days' | 'weeks'
  effortHours: number              // Estimated hours
  impact: number                   // Score improvement (0-30)
  impactDescription: string        // "+15 punti SEO"
  requiredRole: 'developer' | 'marketer' | 'seo' | 'designer' | 'copywriter'
  estimatedCost: { min: number; max: number }
  priority: number                 // Calculated priority (impact / effort)
  actionItems: string[]            // Step-by-step checklist
  competitorReference?: string     // "Come fa Competitor X"
  technicalDetails?: string        // Technical implementation notes
}

export interface QuickWinsAnalysis {
  leadId: string
  leadScore: number
  quickWins: QuickWin[]
  topQuickWins: QuickWin[]         // Top 5 most impactful
  totalPotentialImprovement: number
  estimatedTotalCost: { min: number; max: number }
  estimatedTotalEffort: string     // "2-3 settimane"
  categories: QuickWinCategorySummary[]
}

export interface QuickWinCategorySummary {
  category: QuickWin['category']
  count: number
  totalImpact: number
  avgEffort: string
}

export interface LeadAnalysisData {
  seo?: {
    hasTitle?: boolean
    hasMetaDescription?: boolean
    hasH1?: boolean
    hasStructuredData?: boolean
    hasCanonical?: boolean
    hasOpenGraph?: boolean
    hasTwitterCard?: boolean
    hasSitemap?: boolean
    hasRobotsTxt?: boolean
  }
  tracking?: {
    googleAnalytics?: boolean
    googleTagManager?: boolean
    facebookPixel?: boolean
    tiktokPixel?: boolean
    linkedInInsightTag?: boolean
    hotjar?: boolean
    clarity?: boolean
  }
  performance?: {
    speedScore?: number
    loadComplete?: number
    lcp?: number
    fcp?: number
    cls?: number
    ttfb?: number
  }
  mobile?: {
    isMobileFriendly?: boolean
    hasViewportMeta?: boolean
    mobileScore?: number
  }
  gdpr?: {
    hasCookieBanner?: boolean
    hasPrivacyPolicy?: boolean
    hasTermsOfService?: boolean
    hasVatNumber?: boolean
  }
  security?: {
    hasSSL?: boolean
    hasHSTS?: boolean
    hasCSP?: boolean
  }
  content?: {
    hasBlog?: boolean
    hasFAQ?: boolean
    hasTestimonials?: boolean
  }
}

export interface CompetitorData {
  name: string
  website: string
  analysis: LeadAnalysisData
  score: number
}

// Quick Win templates with effort and cost estimates
const QUICK_WIN_TEMPLATES: Record<string, Omit<QuickWin, 'id' | 'competitorReference' | 'priority'>> = {
  // SEO Quick Wins
  missing_title: {
    gap: 'Manca Tag Title',
    category: 'seo',
    effort: 'hours',
    effortHours: 1,
    impact: 10,
    impactDescription: '+10 punti SEO',
    requiredRole: 'seo',
    estimatedCost: { min: 50, max: 100 },
    actionItems: [
      'Creare un title unico e descrittivo (50-60 caratteri)',
      'Includere keyword principale',
      'Aggiungere brand name alla fine',
      'Implementare nel <head> del sito'
    ],
    technicalDetails: '<title>Keyword Principale | Brand Name</title>'
  },

  missing_meta_description: {
    gap: 'Manca Meta Description',
    category: 'seo',
    effort: 'hours',
    effortHours: 1,
    impact: 8,
    impactDescription: '+8 punti SEO',
    requiredRole: 'seo',
    estimatedCost: { min: 50, max: 100 },
    actionItems: [
      'Scrivere descrizione accattivante (150-160 caratteri)',
      'Includere keyword principale',
      'Aggiungere call-to-action',
      'Implementare nel <head>'
    ],
    technicalDetails: '<meta name="description" content="...">'
  },

  missing_h1: {
    gap: 'Manca Tag H1',
    category: 'seo',
    effort: 'hours',
    effortHours: 1,
    impact: 7,
    impactDescription: '+7 punti SEO',
    requiredRole: 'developer',
    estimatedCost: { min: 30, max: 80 },
    actionItems: [
      'Identificare il titolo principale della pagina',
      'Convertire in tag <h1>',
      'Assicurarsi che ci sia un solo H1 per pagina',
      'Verificare gerarchia heading (H1 > H2 > H3)'
    ]
  },

  missing_structured_data: {
    gap: 'Mancano Dati Strutturati',
    category: 'seo',
    effort: 'hours',
    effortHours: 4,
    impact: 12,
    impactDescription: '+12 punti SEO + Rich Snippets',
    requiredRole: 'developer',
    estimatedCost: { min: 150, max: 300 },
    actionItems: [
      'Identificare tipo di schema appropriato (LocalBusiness, Organization, etc.)',
      'Creare JSON-LD con dati aziendali',
      'Includere: nome, indirizzo, telefono, orari',
      'Testare con Google Rich Results Test',
      'Implementare nel <head>'
    ],
    technicalDetails: 'Schema.org JSON-LD per LocalBusiness'
  },

  missing_open_graph: {
    gap: 'Manca Open Graph',
    category: 'seo',
    effort: 'hours',
    effortHours: 2,
    impact: 5,
    impactDescription: '+5 punti SEO + Condivisioni social migliori',
    requiredRole: 'seo',
    estimatedCost: { min: 50, max: 150 },
    actionItems: [
      'Creare immagine OG (1200x630px)',
      'Aggiungere og:title, og:description, og:image',
      'Testare con Facebook Sharing Debugger'
    ]
  },

  // Tracking Quick Wins
  missing_google_analytics: {
    gap: 'Manca Google Analytics',
    category: 'tracking',
    effort: 'hours',
    effortHours: 2,
    impact: 15,
    impactDescription: '+15 punti Tracking + Dati utenti',
    requiredRole: 'marketer',
    estimatedCost: { min: 100, max: 200 },
    actionItems: [
      'Creare account Google Analytics 4',
      'Configurare stream dati web',
      'Ottenere codice di tracciamento',
      'Implementare prima del </head>',
      'Configurare eventi base (scroll, click, form)',
      'Collegare a Google Search Console'
    ]
  },

  missing_facebook_pixel: {
    gap: 'Manca Facebook Pixel',
    category: 'tracking',
    effort: 'hours',
    effortHours: 2,
    impact: 12,
    impactDescription: '+12 punti Tracking + Retargeting',
    requiredRole: 'marketer',
    estimatedCost: { min: 80, max: 150 },
    actionItems: [
      'Creare pixel in Facebook Business Manager',
      'Ottenere codice pixel',
      'Implementare nel <head>',
      'Configurare eventi standard (PageView, Contact, etc.)',
      'Testare con Facebook Pixel Helper'
    ]
  },

  missing_gtm: {
    gap: 'Manca Google Tag Manager',
    category: 'tracking',
    effort: 'hours',
    effortHours: 3,
    impact: 10,
    impactDescription: '+10 punti Tracking + Gestione centralizzata',
    requiredRole: 'marketer',
    estimatedCost: { min: 150, max: 300 },
    actionItems: [
      'Creare account GTM',
      'Installare snippet GTM',
      'Migrare altri tag (GA, FB) in GTM',
      'Configurare trigger base',
      'Pubblicare container'
    ]
  },

  missing_tiktok_pixel: {
    gap: 'Manca TikTok Pixel',
    category: 'tracking',
    effort: 'hours',
    effortHours: 1,
    impact: 5,
    impactDescription: '+5 punti Tracking (se target giovane)',
    requiredRole: 'marketer',
    estimatedCost: { min: 50, max: 100 },
    actionItems: [
      'Creare TikTok Business Center',
      'Generare pixel code',
      'Implementare via GTM o direttamente'
    ]
  },

  missing_linkedin_insight: {
    gap: 'Manca LinkedIn Insight Tag',
    category: 'tracking',
    effort: 'hours',
    effortHours: 1,
    impact: 5,
    impactDescription: '+5 punti Tracking (B2B)',
    requiredRole: 'marketer',
    estimatedCost: { min: 50, max: 100 },
    actionItems: [
      'Accedere a LinkedIn Campaign Manager',
      'Generare Insight Tag',
      'Implementare prima del </body>'
    ]
  },

  // Performance Quick Wins
  slow_site: {
    gap: 'Sito Lento',
    category: 'performance',
    effort: 'days',
    effortHours: 16,
    impact: 20,
    impactDescription: '+20 punti Performance + UX',
    requiredRole: 'developer',
    estimatedCost: { min: 500, max: 1500 },
    actionItems: [
      'Analizzare con Lighthouse e WebPageTest',
      'Ottimizzare immagini (WebP, lazy loading)',
      'Abilitare caching browser',
      'Minificare CSS/JS',
      'Usare CDN per asset statici',
      'Ottimizzare font loading',
      'Implementare critical CSS'
    ]
  },

  poor_lcp: {
    gap: 'LCP Scarso (>2.5s)',
    category: 'performance',
    effort: 'days',
    effortHours: 8,
    impact: 15,
    impactDescription: '+15 punti Core Web Vitals',
    requiredRole: 'developer',
    estimatedCost: { min: 300, max: 800 },
    actionItems: [
      'Identificare elemento LCP',
      'Preload immagine hero',
      'Ottimizzare server response time',
      'Eliminare render-blocking resources'
    ]
  },

  // Mobile Quick Wins
  not_mobile_friendly: {
    gap: 'Non Mobile Friendly',
    category: 'mobile',
    effort: 'weeks',
    effortHours: 40,
    impact: 25,
    impactDescription: '+25 punti Mobile + SEO',
    requiredRole: 'developer',
    estimatedCost: { min: 1000, max: 3000 },
    actionItems: [
      'Implementare viewport meta tag',
      'Convertire a design responsive',
      'Testare su dispositivi reali',
      'Ottimizzare touch targets (48x48px min)',
      'Verificare font leggibili'
    ]
  },

  missing_viewport: {
    gap: 'Manca Viewport Meta',
    category: 'mobile',
    effort: 'hours',
    effortHours: 1,
    impact: 10,
    impactDescription: '+10 punti Mobile',
    requiredRole: 'developer',
    estimatedCost: { min: 30, max: 80 },
    actionItems: [
      'Aggiungere <meta name="viewport" content="width=device-width, initial-scale=1">',
      'Testare rendering mobile'
    ],
    technicalDetails: '<meta name="viewport" content="width=device-width, initial-scale=1">'
  },

  // GDPR Quick Wins
  missing_cookie_banner: {
    gap: 'Manca Cookie Banner',
    category: 'gdpr',
    effort: 'days',
    effortHours: 8,
    impact: 15,
    impactDescription: '+15 punti GDPR + Compliance',
    requiredRole: 'developer',
    estimatedCost: { min: 200, max: 500 },
    actionItems: [
      'Scegliere soluzione (Iubenda, CookieBot, Complianz)',
      'Configurare categorie cookie',
      'Implementare banner',
      'Bloccare script prima del consenso',
      'Testare funzionamento'
    ]
  },

  missing_privacy_policy: {
    gap: 'Manca Privacy Policy',
    category: 'gdpr',
    effort: 'days',
    effortHours: 8,
    impact: 12,
    impactDescription: '+12 punti GDPR + Trust',
    requiredRole: 'copywriter',
    estimatedCost: { min: 150, max: 400 },
    actionItems: [
      'Creare privacy policy completa GDPR',
      'Includere: titolare, finalità, base giuridica, diritti',
      'Pubblicare su /privacy-policy',
      'Linkare nel footer'
    ]
  },

  missing_vat_number: {
    gap: 'P.IVA Non Visibile',
    category: 'gdpr',
    effort: 'hours',
    effortHours: 1,
    impact: 5,
    impactDescription: '+5 punti GDPR + Trust',
    requiredRole: 'developer',
    estimatedCost: { min: 20, max: 50 },
    actionItems: [
      'Aggiungere P.IVA nel footer',
      'Verificare formato corretto (IT + 11 cifre)'
    ]
  },

  // Security Quick Wins
  missing_ssl: {
    gap: 'Manca HTTPS',
    category: 'security',
    effort: 'hours',
    effortHours: 4,
    impact: 25,
    impactDescription: '+25 punti Security + SEO',
    requiredRole: 'developer',
    estimatedCost: { min: 0, max: 100 },
    actionItems: [
      'Ottenere certificato SSL (Let\'s Encrypt gratuito)',
      'Installare sul server',
      'Redirect HTTP → HTTPS',
      'Aggiornare link interni',
      'Testare mixed content'
    ]
  },

  missing_hsts: {
    gap: 'Manca HSTS',
    category: 'security',
    effort: 'hours',
    effortHours: 1,
    impact: 5,
    impactDescription: '+5 punti Security',
    requiredRole: 'developer',
    estimatedCost: { min: 30, max: 80 },
    actionItems: [
      'Aggiungere header Strict-Transport-Security',
      'Impostare max-age di almeno 1 anno',
      'Considerare includeSubDomains e preload'
    ],
    technicalDetails: 'Strict-Transport-Security: max-age=31536000; includeSubDomains'
  }
}

export class QuickWinsCalculator {
  /**
   * Calcola i quick wins per un lead basandosi sull'analisi e i competitor
   */
  calculateQuickWins(
    leadId: string,
    leadAnalysis: LeadAnalysisData,
    leadScore: number,
    competitors?: CompetitorData[]
  ): QuickWinsAnalysis {
    const quickWins: QuickWin[] = []
    let idCounter = 1

    // Check each potential quick win
    const checks: Array<{
      condition: boolean
      templateKey: string
      competitor?: CompetitorData
    }> = []

    // SEO Checks
    if (!leadAnalysis.seo?.hasTitle) {
      checks.push({ condition: true, templateKey: 'missing_title' })
    }
    if (!leadAnalysis.seo?.hasMetaDescription) {
      checks.push({ condition: true, templateKey: 'missing_meta_description' })
    }
    if (!leadAnalysis.seo?.hasH1) {
      checks.push({ condition: true, templateKey: 'missing_h1' })
    }
    if (!leadAnalysis.seo?.hasStructuredData) {
      checks.push({ condition: true, templateKey: 'missing_structured_data' })
    }
    if (!leadAnalysis.seo?.hasOpenGraph) {
      checks.push({ condition: true, templateKey: 'missing_open_graph' })
    }

    // Tracking Checks
    if (!leadAnalysis.tracking?.googleAnalytics) {
      checks.push({ condition: true, templateKey: 'missing_google_analytics' })
    }
    if (!leadAnalysis.tracking?.facebookPixel) {
      checks.push({ condition: true, templateKey: 'missing_facebook_pixel' })
    }
    if (!leadAnalysis.tracking?.googleTagManager) {
      checks.push({ condition: true, templateKey: 'missing_gtm' })
    }
    if (!leadAnalysis.tracking?.tiktokPixel) {
      checks.push({ condition: true, templateKey: 'missing_tiktok_pixel' })
    }
    if (!leadAnalysis.tracking?.linkedInInsightTag) {
      checks.push({ condition: true, templateKey: 'missing_linkedin_insight' })
    }

    // Performance Checks
    if (leadAnalysis.performance?.speedScore !== undefined && leadAnalysis.performance.speedScore < 50) {
      checks.push({ condition: true, templateKey: 'slow_site' })
    }
    if (leadAnalysis.performance?.lcp !== undefined && leadAnalysis.performance.lcp > 2500) {
      checks.push({ condition: true, templateKey: 'poor_lcp' })
    }

    // Mobile Checks
    if (!leadAnalysis.mobile?.isMobileFriendly) {
      checks.push({ condition: true, templateKey: 'not_mobile_friendly' })
    }
    if (!leadAnalysis.mobile?.hasViewportMeta) {
      checks.push({ condition: true, templateKey: 'missing_viewport' })
    }

    // GDPR Checks
    if (!leadAnalysis.gdpr?.hasCookieBanner) {
      checks.push({ condition: true, templateKey: 'missing_cookie_banner' })
    }
    if (!leadAnalysis.gdpr?.hasPrivacyPolicy) {
      checks.push({ condition: true, templateKey: 'missing_privacy_policy' })
    }
    if (!leadAnalysis.gdpr?.hasVatNumber) {
      checks.push({ condition: true, templateKey: 'missing_vat_number' })
    }

    // Security Checks
    if (!leadAnalysis.security?.hasSSL) {
      checks.push({ condition: true, templateKey: 'missing_ssl' })
    }
    if (leadAnalysis.security?.hasSSL && !leadAnalysis.security?.hasHSTS) {
      checks.push({ condition: true, templateKey: 'missing_hsts' })
    }

    // Find competitor references
    const competitorRefs = this.findCompetitorReferences(leadAnalysis, competitors || [])

    // Create QuickWin objects
    for (const check of checks) {
      if (check.condition) {
        const template = QUICK_WIN_TEMPLATES[check.templateKey]
        if (template) {
          const priority = template.impact / template.effortHours

          quickWins.push({
            id: `qw_${idCounter++}`,
            ...template,
            priority,
            competitorReference: competitorRefs[check.templateKey]
          })
        }
      }
    }

    // Sort by priority (highest first)
    quickWins.sort((a, b) => b.priority - a.priority)

    // Calculate totals
    const totalPotentialImprovement = quickWins.reduce((sum, qw) => sum + qw.impact, 0)
    const totalMinCost = quickWins.reduce((sum, qw) => sum + qw.estimatedCost.min, 0)
    const totalMaxCost = quickWins.reduce((sum, qw) => sum + qw.estimatedCost.max, 0)
    const totalHours = quickWins.reduce((sum, qw) => sum + qw.effortHours, 0)

    // Category summary
    const categories = this.calculateCategorySummary(quickWins)

    return {
      leadId,
      leadScore,
      quickWins,
      topQuickWins: quickWins.slice(0, 5),
      totalPotentialImprovement: Math.min(100 - leadScore, totalPotentialImprovement),
      estimatedTotalCost: { min: totalMinCost, max: totalMaxCost },
      estimatedTotalEffort: this.formatHoursToEffort(totalHours),
      categories
    }
  }

  /**
   * Find competitor references for each quick win
   */
  private findCompetitorReferences(
    leadAnalysis: LeadAnalysisData,
    competitors: CompetitorData[]
  ): Record<string, string> {
    const refs: Record<string, string> = {}

    for (const comp of competitors) {
      // SEO
      if (!leadAnalysis.seo?.hasStructuredData && comp.analysis.seo?.hasStructuredData) {
        refs['missing_structured_data'] = refs['missing_structured_data'] ||
          `${comp.name} usa dati strutturati`
      }

      // Tracking
      if (!leadAnalysis.tracking?.googleAnalytics && comp.analysis.tracking?.googleAnalytics) {
        refs['missing_google_analytics'] = refs['missing_google_analytics'] ||
          `${comp.name} traccia i visitatori`
      }
      if (!leadAnalysis.tracking?.facebookPixel && comp.analysis.tracking?.facebookPixel) {
        refs['missing_facebook_pixel'] = refs['missing_facebook_pixel'] ||
          `${comp.name} fa remarketing su Facebook`
      }

      // Mobile
      if (!leadAnalysis.mobile?.isMobileFriendly && comp.analysis.mobile?.isMobileFriendly) {
        refs['not_mobile_friendly'] = refs['not_mobile_friendly'] ||
          `${comp.name} ha un sito mobile-friendly`
      }

      // GDPR
      if (!leadAnalysis.gdpr?.hasCookieBanner && comp.analysis.gdpr?.hasCookieBanner) {
        refs['missing_cookie_banner'] = refs['missing_cookie_banner'] ||
          `${comp.name} è GDPR compliant`
      }
    }

    return refs
  }

  /**
   * Calculate category summary
   */
  private calculateCategorySummary(quickWins: QuickWin[]): QuickWinCategorySummary[] {
    const categoryMap = new Map<QuickWin['category'], QuickWin[]>()

    for (const qw of quickWins) {
      const existing = categoryMap.get(qw.category) || []
      existing.push(qw)
      categoryMap.set(qw.category, existing)
    }

    const summaries: QuickWinCategorySummary[] = []

    for (const [category, wins] of categoryMap) {
      const totalHours = wins.reduce((sum, qw) => sum + qw.effortHours, 0)
      summaries.push({
        category,
        count: wins.length,
        totalImpact: wins.reduce((sum, qw) => sum + qw.impact, 0),
        avgEffort: this.formatHoursToEffort(totalHours / wins.length)
      })
    }

    return summaries.sort((a, b) => b.totalImpact - a.totalImpact)
  }

  /**
   * Format hours to human-readable effort
   */
  private formatHoursToEffort(hours: number): string {
    if (hours <= 4) return `${hours}h`
    if (hours <= 8) return '1 giorno'
    if (hours <= 16) return '2 giorni'
    if (hours <= 40) return '1 settimana'
    if (hours <= 80) return '2 settimane'
    return `${Math.ceil(hours / 40)} settimane`
  }
}

// Singleton
let globalQuickWinsCalculator: QuickWinsCalculator | null = null

export function getGlobalQuickWinsCalculator(): QuickWinsCalculator {
  if (!globalQuickWinsCalculator) {
    globalQuickWinsCalculator = new QuickWinsCalculator()
  }
  return globalQuickWinsCalculator
}
