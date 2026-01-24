/**
 * PricingEngine - Generazione automatica di preventivi basati sull'analisi del sito
 * Mappa i problemi identificati a servizi con prezzi personalizzati
 * Considera complessità, settore, e urgenza per calcolare il prezzo finale
 */

import type { EnhancedWebsiteAnalysis } from '../analyzers/enhanced-website-analyzer'

// Interfacce per i preventivi
export interface ServiceQuotation {
  service: string
  description: string
  basePrice: number
  adjustedPrice: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedDays: number
  roiEstimate: string
  category: 'seo' | 'performance' | 'security' | 'design' | 'content' | 'compliance' | 'marketing' | 'development'
}

export interface Quotation {
  leadId: string
  businessName: string
  websiteUrl: string
  services: ServiceQuotation[]
  subtotal: number
  discount?: {
    percentage: number
    reason: string
  }
  total: number
  validUntil: Date
  paymentTerms: string
  generatedAt: Date
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise'
  estimatedTotalDays: number
  roiSummary: string
}

export interface PricingContext {
  category?: string          // Categoria business (ecommerce, saas, etc.)
  cms?: string | null        // CMS rilevato
  urgency?: 'low' | 'normal' | 'high' | 'critical'
  bundleDiscount?: boolean   // Se applicare sconto pacchetto
  customMultiplier?: number  // Moltiplicatore personalizzato
}

// Moltiplicatori per complessità CMS
const CMS_COMPLEXITY_MULTIPLIERS: Record<string, number> = {
  'wordpress': 0.85,
  'wix': 0.80,
  'squarespace': 0.80,
  'shopify': 0.90,
  'prestashop': 1.0,
  'magento': 1.4,
  'drupal': 1.2,
  'joomla': 1.1,
  'custom': 1.3,
  'react': 1.2,
  'vue': 1.2,
  'angular': 1.3,
  'next.js': 1.15,
  'nuxt': 1.15,
  'laravel': 1.2,
  'django': 1.25,
  'rails': 1.2,
  'unknown': 1.0
}

// Moltiplicatori per categoria business
const CATEGORY_MULTIPLIERS: Record<string, number> = {
  'ecommerce': 1.3,
  'e-commerce': 1.3,
  'saas': 1.4,
  'software': 1.35,
  'fintech': 1.5,
  'healthcare': 1.4,
  'legal': 1.3,
  'b2b_services': 1.2,
  'consulting': 1.15,
  'agency': 1.2,
  'local_business': 0.9,
  'restaurant': 0.85,
  'hotel': 1.1,
  'retail': 1.0,
  'real_estate': 1.15,
  'education': 0.95,
  'nonprofit': 0.8,
  'default': 1.0
}

// Moltiplicatori per urgenza
const URGENCY_MULTIPLIERS: Record<string, number> = {
  'low': 0.9,
  'normal': 1.0,
  'high': 1.25,
  'critical': 1.5
}

// Prezzi base servizi (EUR)
const SERVICE_DEFINITIONS: Record<string, {
  basePrice: number
  days: number
  category: ServiceQuotation['category']
  roiTemplate: string
}> = {
  // SEO Services
  'seo_audit': {
    basePrice: 400,
    days: 5,
    category: 'seo',
    roiTemplate: 'Identificazione opportunità per +{percentage}% traffico organico'
  },
  'seo_optimization': {
    basePrice: 1500,
    days: 21,
    category: 'seo',
    roiTemplate: 'Aumento stimato traffico organico: +{percentage}%'
  },
  'seo_technical': {
    basePrice: 800,
    days: 10,
    category: 'seo',
    roiTemplate: 'Miglioramento indicizzazione e velocità crawling'
  },
  'seo_local': {
    basePrice: 600,
    days: 14,
    category: 'seo',
    roiTemplate: 'Visibilità locale aumentata: +{percentage}% ricerche locali'
  },
  'structured_data': {
    basePrice: 300,
    days: 3,
    category: 'seo',
    roiTemplate: 'Rich snippets per +{percentage}% CTR nei risultati'
  },

  // Performance Services
  'performance_optimization': {
    basePrice: 800,
    days: 14,
    category: 'performance',
    roiTemplate: 'Tempo caricamento ridotto del {percentage}%, -bounce rate'
  },
  'image_optimization': {
    basePrice: 300,
    days: 5,
    category: 'performance',
    roiTemplate: 'Riduzione peso pagina fino a {percentage}%'
  },
  'core_web_vitals': {
    basePrice: 600,
    days: 10,
    category: 'performance',
    roiTemplate: 'Miglioramento Core Web Vitals per ranking Google'
  },

  // Security Services
  'security_audit': {
    basePrice: 600,
    days: 7,
    category: 'security',
    roiTemplate: 'Identificazione vulnerabilità e piano remediation'
  },
  'security_hardening': {
    basePrice: 900,
    days: 10,
    category: 'security',
    roiTemplate: 'Protezione da attacchi comuni, riduzione rischio data breach'
  },
  'ssl_setup': {
    basePrice: 150,
    days: 1,
    category: 'security',
    roiTemplate: 'Certificato SSL attivo, trust badge, ranking boost'
  },
  'security_headers': {
    basePrice: 250,
    days: 2,
    category: 'security',
    roiTemplate: 'Protezione XSS, clickjacking, injection attacks'
  },

  // Design Services
  'mobile_optimization': {
    basePrice: 900,
    days: 14,
    category: 'design',
    roiTemplate: 'Conversioni mobile aumentate: +{percentage}%'
  },
  'ux_audit': {
    basePrice: 500,
    days: 7,
    category: 'design',
    roiTemplate: 'Identificazione friction points e opportunità conversione'
  },
  'redesign_landing': {
    basePrice: 1200,
    days: 14,
    category: 'design',
    roiTemplate: 'Conversion rate aumentato: +{percentage}%'
  },
  'redesign_full': {
    basePrice: 4000,
    days: 45,
    category: 'design',
    roiTemplate: 'Sito moderno, responsive, conversion-focused'
  },

  // Content Services
  'content_strategy': {
    basePrice: 800,
    days: 14,
    category: 'content',
    roiTemplate: 'Piano editoriale per +{percentage}% engagement'
  },
  'copywriting_seo': {
    basePrice: 400,
    days: 7,
    category: 'content',
    roiTemplate: 'Contenuti ottimizzati per {keywords} target keywords'
  },
  'blog_setup': {
    basePrice: 500,
    days: 5,
    category: 'content',
    roiTemplate: 'Blog per content marketing e lead generation'
  },

  // Compliance Services
  'gdpr_compliance': {
    basePrice: 500,
    days: 10,
    category: 'compliance',
    roiTemplate: 'Conformità GDPR, evitate sanzioni fino a 4% fatturato'
  },
  'cookie_banner': {
    basePrice: 200,
    days: 2,
    category: 'compliance',
    roiTemplate: 'Consenso cookie conforme a normativa EU'
  },
  'privacy_policy': {
    basePrice: 300,
    days: 3,
    category: 'compliance',
    roiTemplate: 'Documentazione legale completa'
  },
  'accessibility_audit': {
    basePrice: 500,
    days: 7,
    category: 'compliance',
    roiTemplate: 'Conformità WCAG 2.1 AA, audience +{percentage}%'
  },
  'accessibility_fix': {
    basePrice: 800,
    days: 14,
    category: 'compliance',
    roiTemplate: 'Sito accessibile a utenti con disabilità'
  },

  // Marketing Services
  'tracking_setup': {
    basePrice: 400,
    days: 5,
    category: 'marketing',
    roiTemplate: 'Tracciamento completo conversioni e comportamento'
  },
  'gtm_setup': {
    basePrice: 350,
    days: 3,
    category: 'marketing',
    roiTemplate: 'Google Tag Manager configurato con eventi chiave'
  },
  'facebook_pixel': {
    basePrice: 200,
    days: 2,
    category: 'marketing',
    roiTemplate: 'Remarketing Facebook/Instagram attivo'
  },
  'conversion_tracking': {
    basePrice: 300,
    days: 3,
    category: 'marketing',
    roiTemplate: 'Tracciamento goal e funnel di conversione'
  },

  // Development Services
  'bug_fixing': {
    basePrice: 400,
    days: 5,
    category: 'development',
    roiTemplate: 'Correzione errori critici identificati'
  },
  'update_dependencies': {
    basePrice: 350,
    days: 3,
    category: 'development',
    roiTemplate: 'Aggiornamento librerie per sicurezza e performance'
  },
  'api_integration': {
    basePrice: 800,
    days: 10,
    category: 'development',
    roiTemplate: 'Integrazione servizi esterni per automazione'
  }
}

export class PricingEngine {
  /**
   * Genera un preventivo completo basato sull'analisi del sito
   */
  generateQuotation(
    analysis: EnhancedWebsiteAnalysis,
    leadId: string,
    businessName: string,
    context: PricingContext = {}
  ): Quotation {
    // Determina complessità
    const complexity = this.determineComplexity(analysis, context)

    // Calcola moltiplicatore totale
    const totalMultiplier = this.calculateMultiplier(analysis, context, complexity)

    // Identifica servizi necessari basandosi sull'analisi
    const services = this.identifyNeededServices(analysis, totalMultiplier)

    // Calcola totali
    const subtotal = services.reduce((sum, s) => sum + s.adjustedPrice, 0)

    // Applica sconto pacchetto se richiesto e ci sono più servizi
    let discount: Quotation['discount'] | undefined
    if (context.bundleDiscount !== false && services.length >= 3) {
      const discountPercentage = Math.min(services.length * 3, 15) // Max 15%
      discount = {
        percentage: discountPercentage,
        reason: `Sconto pacchetto ${services.length} servizi`
      }
    }

    const total = discount
      ? Math.round(subtotal * (1 - discount.percentage / 100))
      : subtotal

    // Calcola giorni totali (con overlap)
    const estimatedTotalDays = this.calculateTotalDays(services)

    // Genera ROI summary
    const roiSummary = this.generateRoiSummary(analysis, services)

    return {
      leadId,
      businessName,
      websiteUrl: analysis.url,
      services,
      subtotal,
      discount,
      total,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni
      paymentTerms: this.getPaymentTerms(total),
      generatedAt: new Date(),
      complexity,
      estimatedTotalDays,
      roiSummary
    }
  }

  /**
   * Determina la complessità del progetto
   */
  private determineComplexity(
    analysis: EnhancedWebsiteAnalysis,
    context: PricingContext
  ): Quotation['complexity'] {
    let complexityScore = 0

    // CMS/Framework complexity
    const cms = context.cms || analysis.techStack?.cms || 'unknown'
    const cmsMultiplier = CMS_COMPLEXITY_MULTIPLIERS[cms.toLowerCase()] || 1.0
    if (cmsMultiplier >= 1.3) complexityScore += 2
    else if (cmsMultiplier >= 1.1) complexityScore += 1

    // Issues count
    const totalIssues =
      analysis.issues.critical.length * 3 +
      analysis.issues.high.length * 2 +
      analysis.issues.medium.length
    if (totalIssues >= 15) complexityScore += 2
    else if (totalIssues >= 8) complexityScore += 1

    // Score negativity
    if (analysis.overallScore < 30) complexityScore += 2
    else if (analysis.overallScore < 50) complexityScore += 1

    // Category complexity
    const categoryMultiplier = CATEGORY_MULTIPLIERS[context.category?.toLowerCase() || 'default'] || 1.0
    if (categoryMultiplier >= 1.3) complexityScore += 1

    // Map to complexity level
    if (complexityScore >= 5) return 'enterprise'
    if (complexityScore >= 3) return 'complex'
    if (complexityScore >= 1) return 'medium'
    return 'simple'
  }

  /**
   * Calcola il moltiplicatore di prezzo totale
   */
  private calculateMultiplier(
    analysis: EnhancedWebsiteAnalysis,
    context: PricingContext,
    complexity: Quotation['complexity']
  ): number {
    // CMS multiplier
    const cms = context.cms || analysis.techStack?.cms || 'unknown'
    const cmsMultiplier = CMS_COMPLEXITY_MULTIPLIERS[cms.toLowerCase()] || 1.0

    // Category multiplier
    const categoryMultiplier = CATEGORY_MULTIPLIERS[context.category?.toLowerCase() || 'default'] || 1.0

    // Urgency multiplier
    const urgencyMultiplier = URGENCY_MULTIPLIERS[context.urgency || 'normal']

    // Complexity multiplier
    const complexityMultipliers: Record<Quotation['complexity'], number> = {
      'simple': 0.9,
      'medium': 1.0,
      'complex': 1.15,
      'enterprise': 1.35
    }
    const complexityMultiplier = complexityMultipliers[complexity]

    // Custom multiplier
    const customMultiplier = context.customMultiplier || 1.0

    return cmsMultiplier * categoryMultiplier * urgencyMultiplier * complexityMultiplier * customMultiplier
  }

  /**
   * Identifica i servizi necessari basandosi sull'analisi
   */
  private identifyNeededServices(
    analysis: EnhancedWebsiteAnalysis,
    multiplier: number
  ): ServiceQuotation[] {
    const services: ServiceQuotation[] = []

    // === SEO Issues ===
    if (!analysis.seo.hasTitle || analysis.seo.titleLength < 30 || analysis.seo.titleLength > 65) {
      services.push(this.createService('seo_audit', 'high', multiplier))
    }

    if (!analysis.seo.hasMetaDescription || analysis.seo.metaDescriptionLength < 120) {
      if (!services.find(s => s.service === 'Audit SEO Completo')) {
        services.push(this.createService('seo_optimization', 'high', multiplier))
      }
    }

    if (!analysis.seo.hasStructuredData) {
      services.push(this.createService('structured_data', 'medium', multiplier))
    }

    if (!analysis.seo.hasSitemap || !analysis.seo.hasRobotsTxt) {
      services.push(this.createService('seo_technical', 'medium', multiplier))
    }

    // === Performance Issues ===
    if (analysis.performance.speedScore < 50) {
      services.push(this.createService('performance_optimization', 'critical', multiplier))
    } else if (analysis.performance.speedScore < 70) {
      services.push(this.createService('core_web_vitals', 'high', multiplier))
    }

    if (analysis.images.oversized > 3 || analysis.images.total > 20) {
      services.push(this.createService('image_optimization', 'medium', multiplier))
    }

    // === Security Issues ===
    if (!analysis.hasSSL) {
      services.push(this.createService('ssl_setup', 'critical', multiplier))
    }

    if (analysis.security) {
      if (analysis.security.overallSecurityScore < 40) {
        services.push(this.createService('security_audit', 'critical', multiplier))
        services.push(this.createService('security_hardening', 'critical', multiplier))
      } else if (analysis.security.overallSecurityScore < 60) {
        services.push(this.createService('security_headers', 'high', multiplier))
      }

      if (analysis.security.vulnerabilities?.hasOutdatedJquery) {
        services.push(this.createService('update_dependencies', 'high', multiplier))
      }
    }

    // === Mobile Issues ===
    if (!analysis.mobile.isMobileFriendly || analysis.mobile.mobileScore < 50) {
      services.push(this.createService('mobile_optimization', 'critical', multiplier))
    }

    // === Design/UX Issues ===
    if (analysis.overallScore < 30) {
      services.push(this.createService('redesign_full', 'critical', multiplier))
    } else if (analysis.overallScore < 50) {
      services.push(this.createService('redesign_landing', 'high', multiplier))
    } else if (analysis.businessValue < 50) {
      services.push(this.createService('ux_audit', 'medium', multiplier))
    }

    // === Content Issues ===
    if (analysis.contentQuality) {
      if (analysis.contentQuality.contentScore < 40) {
        services.push(this.createService('content_strategy', 'high', multiplier))
      }
      if (!analysis.contentQuality.blog?.exists) {
        services.push(this.createService('blog_setup', 'medium', multiplier))
      }
    }

    // === GDPR/Compliance Issues ===
    if (analysis.gdpr.gdprScore < 50) {
      services.push(this.createService('gdpr_compliance', 'high', multiplier))
    }

    if (!analysis.gdpr.hasCookieBanner && analysis.tracking.trackingScore > 0) {
      services.push(this.createService('cookie_banner', 'critical', multiplier))
    }

    if (!analysis.gdpr.hasPrivacyPolicy) {
      services.push(this.createService('privacy_policy', 'high', multiplier))
    }

    // === Accessibility Issues ===
    if (analysis.accessibility) {
      if (analysis.accessibility.wcagScore < 40) {
        services.push(this.createService('accessibility_audit', 'high', multiplier))
        services.push(this.createService('accessibility_fix', 'high', multiplier))
      } else if (analysis.accessibility.wcagScore < 60) {
        services.push(this.createService('accessibility_audit', 'medium', multiplier))
      }
    }

    // === Tracking/Marketing Issues ===
    if (!analysis.tracking.googleAnalytics && !analysis.tracking.googleTagManager) {
      services.push(this.createService('tracking_setup', 'high', multiplier))
    } else if (!analysis.tracking.googleTagManager) {
      services.push(this.createService('gtm_setup', 'medium', multiplier))
    }

    if (!analysis.tracking.facebookPixel) {
      services.push(this.createService('facebook_pixel', 'low', multiplier))
    }

    // Sort by priority
    const priorityOrder: Record<ServiceQuotation['priority'], number> = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3
    }

    return services.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  /**
   * Crea un singolo servizio con prezzo calcolato
   */
  private createService(
    serviceKey: string,
    priority: ServiceQuotation['priority'],
    multiplier: number
  ): ServiceQuotation {
    const definition = SERVICE_DEFINITIONS[serviceKey]

    if (!definition) {
      throw new Error(`Service definition not found: ${serviceKey}`)
    }

    // Calcola prezzo aggiustato
    const adjustedPrice = Math.round(definition.basePrice * multiplier)

    // Genera nome servizio human-readable
    const serviceName = this.getServiceName(serviceKey)

    // Genera descrizione
    const description = this.getServiceDescription(serviceKey)

    // Genera ROI estimate
    const roiEstimate = this.formatRoiTemplate(definition.roiTemplate, priority)

    return {
      service: serviceName,
      description,
      basePrice: definition.basePrice,
      adjustedPrice,
      priority,
      estimatedDays: definition.days,
      roiEstimate,
      category: definition.category
    }
  }

  /**
   * Converte service key in nome leggibile
   */
  private getServiceName(key: string): string {
    const names: Record<string, string> = {
      'seo_audit': 'Audit SEO Completo',
      'seo_optimization': 'Ottimizzazione SEO On-Page',
      'seo_technical': 'SEO Tecnico',
      'seo_local': 'Local SEO',
      'structured_data': 'Implementazione Dati Strutturati',
      'performance_optimization': 'Ottimizzazione Performance',
      'image_optimization': 'Ottimizzazione Immagini',
      'core_web_vitals': 'Miglioramento Core Web Vitals',
      'security_audit': 'Audit Sicurezza',
      'security_hardening': 'Hardening e Protezione',
      'ssl_setup': 'Configurazione SSL/HTTPS',
      'security_headers': 'Configurazione Security Headers',
      'mobile_optimization': 'Ottimizzazione Mobile',
      'ux_audit': 'Audit UX/UI',
      'redesign_landing': 'Redesign Landing Pages',
      'redesign_full': 'Redesign Completo Sito',
      'content_strategy': 'Strategia Contenuti',
      'copywriting_seo': 'Copywriting SEO',
      'blog_setup': 'Setup Sezione Blog',
      'gdpr_compliance': 'Compliance GDPR Completa',
      'cookie_banner': 'Implementazione Cookie Banner',
      'privacy_policy': 'Redazione Privacy Policy',
      'accessibility_audit': 'Audit Accessibilità WCAG',
      'accessibility_fix': 'Correzione Problemi Accessibilità',
      'tracking_setup': 'Setup Analytics Completo',
      'gtm_setup': 'Configurazione Google Tag Manager',
      'facebook_pixel': 'Setup Facebook/Meta Pixel',
      'conversion_tracking': 'Tracking Conversioni',
      'bug_fixing': 'Correzione Bug Critici',
      'update_dependencies': 'Aggiornamento Dipendenze',
      'api_integration': 'Integrazione API'
    }
    return names[key] || key
  }

  /**
   * Genera descrizione servizio
   */
  private getServiceDescription(key: string): string {
    const descriptions: Record<string, string> = {
      'seo_audit': 'Analisi completa SEO con report dettagliato e piano di azione',
      'seo_optimization': 'Ottimizzazione title, meta, heading e contenuti per keyword target',
      'seo_technical': 'Sitemap, robots.txt, canonical, redirect e struttura URL',
      'seo_local': 'Google My Business, citazioni locali, NAP consistency',
      'structured_data': 'Schema.org JSON-LD per rich snippets',
      'performance_optimization': 'Caching, minification, lazy loading, code splitting',
      'image_optimization': 'Compressione, WebP, lazy loading, responsive images',
      'core_web_vitals': 'LCP, FID, CLS ottimizzati per ranking Google',
      'security_audit': 'Penetration test base, vulnerability scanning',
      'security_hardening': 'Firewall, WAF, protezione brute force, backup',
      'ssl_setup': 'Certificato SSL, redirect HTTPS, HSTS',
      'security_headers': 'CSP, X-Frame-Options, X-XSS-Protection',
      'mobile_optimization': 'Layout responsive, touch-friendly, performance mobile',
      'ux_audit': 'Analisi user journey, heatmaps, conversion funnel',
      'redesign_landing': 'Riprogettazione pagine chiave per conversione',
      'redesign_full': 'Nuovo design completo, responsive, moderno',
      'content_strategy': 'Piano editoriale, keyword research, content calendar',
      'copywriting_seo': 'Testi ottimizzati per utenti e motori di ricerca',
      'blog_setup': 'Sezione blog con categorie, tags, e feed RSS',
      'gdpr_compliance': 'Cookie policy, consensi, registro trattamenti',
      'cookie_banner': 'Banner consenso con gestione preferenze',
      'privacy_policy': 'Informativa privacy conforme GDPR',
      'accessibility_audit': 'Test WCAG 2.1 AA con report violazioni',
      'accessibility_fix': 'Correzione contrast, focus, ARIA, semantica',
      'tracking_setup': 'Google Analytics 4, eventi, conversioni',
      'gtm_setup': 'Container GTM con trigger e variabili',
      'facebook_pixel': 'Pixel standard + eventi conversione',
      'conversion_tracking': 'Goal, eventi, e-commerce tracking',
      'bug_fixing': 'Debug e correzione errori JavaScript/CSS',
      'update_dependencies': 'Aggiornamento framework, librerie, plugin',
      'api_integration': 'Connessione CRM, ERP, servizi terzi'
    }
    return descriptions[key] || ''
  }

  /**
   * Formatta template ROI con valori appropriati
   */
  private formatRoiTemplate(template: string, priority: ServiceQuotation['priority']): string {
    // Assegna percentuali basate su priorità
    const percentages: Record<ServiceQuotation['priority'], number> = {
      'critical': 40,
      'high': 25,
      'medium': 15,
      'low': 10
    }

    return template
      .replace('{percentage}', String(percentages[priority]))
      .replace('{keywords}', '10-15')
  }

  /**
   * Calcola giorni totali considerando overlap lavori
   */
  private calculateTotalDays(services: ServiceQuotation[]): number {
    if (services.length === 0) return 0

    // Raggruppa per categoria
    const byCategory: Record<string, ServiceQuotation[]> = {}
    services.forEach(s => {
      if (!byCategory[s.category]) {
        byCategory[s.category] = []
      }
      byCategory[s.category].push(s)
    })

    // Per ogni categoria, somma i giorni (lavoro sequenziale)
    // Tra categorie diverse, considera overlap del 50%
    const categoryDays = Object.values(byCategory).map(
      categoryServices => categoryServices.reduce((sum, s) => sum + s.estimatedDays, 0)
    )

    if (categoryDays.length === 1) {
      return categoryDays[0]
    }

    // Calcola con overlap
    const sortedDays = categoryDays.sort((a, b) => b - a)
    const longestTrack = sortedDays[0]
    const parallelTracks = sortedDays.slice(1)

    // I track paralleli contribuiscono al 50%
    const additionalDays = parallelTracks.reduce((sum, d) => sum + d * 0.5, 0)

    return Math.ceil(longestTrack + additionalDays)
  }

  /**
   * Genera sommario ROI
   */
  private generateRoiSummary(
    analysis: EnhancedWebsiteAnalysis,
    services: ServiceQuotation[]
  ): string {
    const criticalCount = services.filter(s => s.priority === 'critical').length
    const highCount = services.filter(s => s.priority === 'high').length

    const currentScore = analysis.overallScore
    const potentialScore = Math.min(100, currentScore + (criticalCount * 15) + (highCount * 8))

    if (currentScore < 30) {
      return `Intervento urgente necessario. Con le ottimizzazioni proposte il sito può passare da score ${currentScore}/100 a circa ${potentialScore}/100, migliorando significativamente visibilità e conversioni.`
    } else if (currentScore < 50) {
      return `Opportunità di miglioramento concrete. Le ottimizzazioni possono portare lo score da ${currentScore}/100 a ${potentialScore}/100, con impatto diretto su traffico e lead.`
    } else if (currentScore < 70) {
      return `Sito con buone basi. Gli interventi proposti possono perfezionare le performance e portare lo score a ${potentialScore}/100.`
    } else {
      return `Sito già performante. Gli interventi sono di fine-tuning per massimizzare i risultati e mantenere il vantaggio competitivo.`
    }
  }

  /**
   * Determina termini di pagamento
   */
  private getPaymentTerms(total: number): string {
    if (total <= 500) {
      return '100% alla firma del contratto'
    } else if (total <= 2000) {
      return '50% alla firma, 50% alla consegna'
    } else if (total <= 5000) {
      return '30% alla firma, 40% a metà lavori, 30% alla consegna'
    } else {
      return '20% alla firma, 30% milestone 1, 30% milestone 2, 20% alla consegna'
    }
  }

  /**
   * Genera preventivo semplificato con solo servizi prioritari
   */
  generateQuickQuote(
    analysis: EnhancedWebsiteAnalysis,
    maxServices: number = 3
  ): { services: string[]; estimatedTotal: number; priority: string } {
    const quotation = this.generateQuotation(analysis, 'quick', 'Quick Quote')

    const topServices = quotation.services.slice(0, maxServices)

    return {
      services: topServices.map(s => s.service),
      estimatedTotal: topServices.reduce((sum, s) => sum + s.adjustedPrice, 0),
      priority: topServices[0]?.priority || 'medium'
    }
  }
}

export default PricingEngine
