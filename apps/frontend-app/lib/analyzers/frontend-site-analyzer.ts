/**
 * Versione semplificata del SiteAnalyzer per uso nel frontend
 * Esegue le stesse analisi del scraping engine ma ottimizzata per API calls singole
 * Riutilizza la logica di analisi già sviluppata
 */

import { chromium, Page } from 'playwright'
import type { WebsiteAnalysis, PerformanceMetrics, SEOAnalysis, TrackingAnalysis, GDPRCompliance, LegalCompliance, SocialPresence, TechnicalIssues } from '../types/analysis'

export class FrontendSiteAnalyzer {
  private page: Page
  private startTime: number = 0

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Analizza completamente un sito web
   */
  async analyzeSite(url: string): Promise<WebsiteAnalysis> {
    this.startTime = Date.now()
    
    try {
      // Naviga al sito con timeout
      const response = await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      if (!response) {
        return this.createFailedAnalysis(url, 0)
      }

      const httpStatus = response.status()
      const finalUrl = this.page.url()

      if (httpStatus >= 400) {
        return this.createFailedAnalysis(url, httpStatus)
      }

      // Aspetta che la pagina sia caricata
      try {
        await this.page.waitForTimeout(2000) // Aspetta 2s per contenuto dinamico
      } catch {
        // Continua anche se timeout
      }
      
      // Esegui tutte le analisi
      const [performance, seo, tracking, gdpr, legal, social] = await Promise.all([
        this.analyzePerformance(),
        this.analyzeSEO(),
        this.analyzeTracking(),
        this.analyzeGDPR(),
        this.analyzeLegal(),
        this.analyzeSocialPresence()
      ])

      const issues = await this.identifyIssues(performance, seo, tracking, gdpr, legal, social)
      const overallScore = this.calculateScore(performance, seo, tracking, gdpr, legal, social, issues)

      return {
        url,
        finalUrl,
        isAccessible: true,
        httpStatus,
        redirectChain: [url, finalUrl],
        performance,
        seo,
        tracking,
        gdpr,
        legal,
        social,
        issues,
        overallScore,
        analysisDate: new Date(),
        analysisTime: Date.now() - this.startTime
      }

    } catch (error) {
      console.error('Errore durante analisi sito:', error)
      return this.createFailedAnalysis(url, 0)
    }
  }

  private async analyzePerformance(): Promise<PerformanceMetrics> {
    try {
      const loadTime = await this.page.evaluate(() => {
        const timing = performance.timing
        return timing.loadEventEnd - timing.navigationStart
      })

      const images = await this.page.$$('img')
      const totalImages = images.length

      const brokenImages = await this.page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'))
        return imgs.filter(img => !img.complete || img.naturalWidth === 0).length
      })

      const isResponsive = await this.page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]')
        return !!viewport
      })

      return {
        loadTime: loadTime || 0,
        totalImages,
        brokenImages,
        isResponsive
      }
    } catch {
      return {
        loadTime: 0,
        totalImages: 0,
        brokenImages: 0,
        isResponsive: false
      }
    }
  }

  private async analyzeSEO(): Promise<SEOAnalysis> {
    try {
      const title = await this.page.title()
      const metaDescription = await this.page.locator('meta[name="description"]').getAttribute('content') || ''
      const h1Elements = await this.page.$$('h1')
      
      const hasStructuredData = await this.page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        return scripts.length > 0
      })

      return {
        hasTitle: !!title,
        titleLength: title.length,
        hasMetaDescription: !!metaDescription,
        metaDescriptionLength: metaDescription.length,
        hasH1: h1Elements.length > 0,
        h1Count: h1Elements.length,
        hasStructuredData
      }
    } catch {
      return {
        hasTitle: false,
        titleLength: 0,
        hasMetaDescription: false,
        metaDescriptionLength: 0,
        hasH1: false,
        h1Count: 0,
        hasStructuredData: false
      }
    }
  }

  private async analyzeTracking(): Promise<TrackingAnalysis> {
    try {
      const pageContent = await this.page.content()
      
      return {
        hasGoogleAnalytics: /gtag\(|ga\(|google-analytics|GoogleAnalyticsObject/i.test(pageContent),
        hasFacebookPixel: /fbq\(|facebook\.com\/tr/i.test(pageContent),
        hasGoogleTagManager: /googletagmanager\.com\/gtm|gtm\(/i.test(pageContent),
        hasHotjar: /hotjar|hjid/i.test(pageContent),
        hasClarityMicrosoft: /clarity\.ms|microsoft.*clarity/i.test(pageContent),
        customTracking: this.extractCustomTracking(pageContent)
      }
    } catch {
      return {
        hasGoogleAnalytics: false,
        hasFacebookPixel: false,
        hasGoogleTagManager: false,
        hasHotjar: false,
        hasClarityMicrosoft: false,
        customTracking: []
      }
    }
  }

  private async analyzeGDPR(): Promise<GDPRCompliance> {
    try {
      const pageContent = await this.page.content()
      
      const hasCookieBanner = await this.page.evaluate(() => {
        const keywords = ['cookie', 'privacy', 'consenso', 'accetta', 'rifiuta']
        const elements = document.querySelectorAll('div, section, footer, header')
        return Array.from(elements).some(el => 
          keywords.some(keyword => 
            el.textContent?.toLowerCase().includes(keyword) &&
            (el.textContent?.toLowerCase().includes('accetta') || 
             el.textContent?.toLowerCase().includes('cookie'))
          )
        )
      })

      const hasPrivacyPolicy = /privacy.*policy|informativa.*privacy|politica.*privacy/i.test(pageContent)
      const hasTermsOfService = /terms.*service|termini.*condizioni|terms.*conditions/i.test(pageContent)

      return {
        hasCookieBanner,
        hasPrivacyPolicy,
        hasTermsOfService,
        cookieConsentMethod: hasCookieBanner ? 'banner' : 'none',
        riskyEmbeds: []
      }
    } catch {
      return {
        hasCookieBanner: false,
        hasPrivacyPolicy: false,
        hasTermsOfService: false,
        cookieConsentMethod: 'none',
        riskyEmbeds: []
      }
    }
  }

  private async analyzeLegal(): Promise<LegalCompliance> {
    try {
      const pageContent = await this.page.content()
      
      const hasVisiblePartitaIva = /p\.?\s*i\.?v\.?a\.?|partita\s+iva|vat\s+number|cod\.?\s*fisc/i.test(pageContent)
      const hasBusinessAddress = /via\s+|corso\s+|piazza\s+|viale\s+|address|indirizzo/i.test(pageContent)
      const hasContactInfo = /@|tel|phone|telefono|email|contatto|contact/i.test(pageContent)

      let complianceScore = 0
      if (hasVisiblePartitaIva) complianceScore += 40
      if (hasBusinessAddress) complianceScore += 30
      if (hasContactInfo) complianceScore += 30

      return {
        hasVisiblePartitaIva,
        hasBusinessAddress,
        hasContactInfo,
        complianceScore
      }
    } catch {
      return {
        hasVisiblePartitaIva: false,
        hasBusinessAddress: false,
        hasContactInfo: false,
        complianceScore: 0
      }
    }
  }

  private async analyzeSocialPresence(): Promise<SocialPresence> {
    try {
      const pageContent = await this.page.content()
      
      const social = {
        facebook: /facebook\.com\/[^\/\s"']+/i.exec(pageContent)?.[0],
        instagram: /instagram\.com\/[^\/\s"']+/i.exec(pageContent)?.[0],
        linkedin: /linkedin\.com\/[^\/\s"']+/i.exec(pageContent)?.[0],
        twitter: /twitter\.com\/[^\/\s"']+/i.exec(pageContent)?.[0],
        youtube: /youtube\.com\/[^\/\s"']+/i.exec(pageContent)?.[0],
        tiktok: /tiktok\.com\/[^\/\s"']+/i.exec(pageContent)?.[0]
      }

      const socialCount = Object.values(social).filter(Boolean).length
      
      return {
        ...social,
        hasAnySocial: socialCount > 0,
        socialCount
      }
    } catch {
      return {
        hasAnySocial: false,
        socialCount: 0
      }
    }
  }

  private async identifyIssues(
    performance: PerformanceMetrics,
    seo: SEOAnalysis,
    tracking: TrackingAnalysis,
    gdpr: GDPRCompliance,
    legal: LegalCompliance,
    social: SocialPresence
  ): Promise<TechnicalIssues> {
    const currentUrl = this.page.url()
    const httpsIssues = !currentUrl.startsWith('https://')

    return {
      missingTitle: !seo.hasTitle,
      shortTitle: seo.hasTitle && seo.titleLength < 30,
      missingMetaDescription: !seo.hasMetaDescription,
      shortMetaDescription: seo.hasMetaDescription && seo.metaDescriptionLength < 50,
      missingH1: !seo.hasH1,
      brokenImages: performance.brokenImages > 0,
      slowLoading: performance.loadTime > 3000,
      noTracking: !tracking.hasGoogleAnalytics && !tracking.hasFacebookPixel && !tracking.hasGoogleTagManager,
      noCookieConsent: !gdpr.hasCookieBanner && gdpr.riskyEmbeds.length > 0,
      missingPartitaIva: !legal.hasVisiblePartitaIva,
      noSocialPresence: !social.hasAnySocial,
      httpsIssues
    }
  }

  private calculateScore(
    performance: PerformanceMetrics,
    seo: SEOAnalysis,
    tracking: TrackingAnalysis,
    gdpr: GDPRCompliance,
    legal: LegalCompliance,
    social: SocialPresence,
    issues: TechnicalIssues
  ): number {
    let score = 100 // Inizia con 100 (perfetto)

    // Sottrai punti per problemi SEO GRAVI
    if (issues.missingTitle) score -= 20
    if (issues.missingMetaDescription) score -= 15
    if (issues.missingH1) score -= 15

    // Sottrai punti per problemi SEO MINORI
    if (issues.shortTitle) score -= 5
    if (issues.shortMetaDescription) score -= 5

    // Sottrai punti per problemi di performance
    if (issues.slowLoading) score -= 15
    if (issues.brokenImages) score -= 10

    // Sottrai punti per mancanza di tracking
    if (issues.noTracking) score -= 20

    // Sottrai punti per problemi GDPR
    if (issues.noCookieConsent) score -= 10

    // Sottrai punti per problemi legali
    if (issues.missingPartitaIva) score -= 15

    // Sottrai punti per mancanza di presenza social
    if (issues.noSocialPresence) score -= 10

    // Sottrai punti se il sito non è responsive
    if (!performance.isResponsive) score -= 10

    // Sottrai punti per problemi HTTPS
    if (issues.httpsIssues) score -= 15

    return Math.max(0, Math.min(100, score))
  }

  private extractCustomTracking(content: string): string[] {
    const tracking: string[] = []
    
    if (/mixpanel/i.test(content)) tracking.push('Mixpanel')
    if (/amplitude/i.test(content)) tracking.push('Amplitude')
    if (/segment/i.test(content)) tracking.push('Segment')
    if (/crisp/i.test(content)) tracking.push('Crisp')
    if (/intercom/i.test(content)) tracking.push('Intercom')
    if (/zendesk/i.test(content)) tracking.push('Zendesk')
    
    return tracking
  }

  private createFailedAnalysis(url: string, httpStatus: number): WebsiteAnalysis {
    return {
      url,
      finalUrl: undefined,
      isAccessible: false,
      httpStatus,
      redirectChain: [url],
      performance: {
        loadTime: 0,
        totalImages: 0,
        brokenImages: 0,
        isResponsive: false
      },
      seo: {
        hasTitle: false,
        titleLength: 0,
        hasMetaDescription: false,
        metaDescriptionLength: 0,
        hasH1: false,
        h1Count: 0,
        hasStructuredData: false
      },
      tracking: {
        hasGoogleAnalytics: false,
        hasFacebookPixel: false,
        hasGoogleTagManager: false,
        hasHotjar: false,
        hasClarityMicrosoft: false,
        customTracking: []
      },
      gdpr: {
        hasCookieBanner: false,
        hasPrivacyPolicy: false,
        hasTermsOfService: false,
        cookieConsentMethod: 'none',
        riskyEmbeds: []
      },
      legal: {
        hasVisiblePartitaIva: false,
        hasBusinessAddress: false,
        hasContactInfo: false,
        complianceScore: 0
      },
      social: {
        hasAnySocial: false,
        socialCount: 0
      },
      issues: {
        missingTitle: true,
        shortTitle: false,
        missingMetaDescription: true,
        shortMetaDescription: false,
        missingH1: true,
        brokenImages: false,
        slowLoading: false,
        noTracking: true,
        noCookieConsent: false,
        missingPartitaIva: true,
        noSocialPresence: true,
        httpsIssues: httpStatus === 0
      },
      overallScore: 10, // Score basso = molti problemi = buona opportunità
      analysisDate: new Date(),
      analysisTime: Date.now() - this.startTime
    }
  }
}

/**
 * Funzione helper per creare e usare l'analyzer
 */
export async function analyzeSiteUrl(url: string): Promise<WebsiteAnalysis> {
  let browser
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; ClientSniper/1.0; +https://clientsniper.com)'
    })
    
    const page = await context.newPage()
    const analyzer = new FrontendSiteAnalyzer(page)
    
    return await analyzer.analyzeSite(url)
    
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
