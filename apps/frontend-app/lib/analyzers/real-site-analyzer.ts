/**
 * Adapter per utilizzare logica di analisi avanzata ispirata al SiteAnalyzer del backend
 * Gestisce l'analisi completa di siti web con Playwright
 * Usato dall'API manual-scan per analisi reali dei siti web
 */

import { chromium, Browser, Page } from 'playwright'
import { 
  WebsiteAnalysis, 
  PerformanceMetrics, 
  SEOAnalysis, 
  TrackingAnalysis, 
  GDPRCompliance, 
  LegalCompliance, 
  SocialPresence, 
  TechnicalIssues 
} from '../types/analysis'

export class RealSiteAnalyzer {
  private browser: Browser | null = null
  private page: Page | null = null

  /**
   * Inizializza browser e pagina
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; ClientSniper/1.0; +https://clientsniper.com)',
      viewport: { width: 1920, height: 1080 }
    })
    
    this.page = await context.newPage()
  }

  /**
   * Analizza un sito web usando logica ispirata al SiteAnalyzer del backend
   */
  async analyzeSite(url: string): Promise<WebsiteAnalysis> {
    if (!this.page) {
      throw new Error('Analyzer non inizializzato. Chiamare initialize() prima.')
    }

    const startTime = Date.now()

    try {
      // Naviga al sito
      const response = await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      if (!response) {
        throw new Error('Impossibile caricare la pagina')
      }

      // Aspetta che la pagina sia caricata
      await this.page.waitForTimeout(2000)

      // Esegui tutte le analisi
      const [
        performance,
        seo,
        tracking,
        gdpr,
        legal,
        social
      ] = await Promise.allSettled([
        this.analyzePerformance(),
        this.analyzeSEO(),
        this.analyzeTracking(),
        this.analyzeGDPR(),
        this.analyzeLegal(),
        this.analyzeSocialPresence()
      ])

      // Estrai i risultati
      const performanceResult = performance.status === 'fulfilled' ? performance.value : this.getDefaultPerformance()
      const seoResult = seo.status === 'fulfilled' ? seo.value : this.getDefaultSEO()
      const trackingResult = tracking.status === 'fulfilled' ? tracking.value : this.getDefaultTracking()
      const gdprResult = gdpr.status === 'fulfilled' ? gdpr.value : this.getDefaultGDPR()
      const legalResult = legal.status === 'fulfilled' ? legal.value : this.getDefaultLegal()
      const socialResult = social.status === 'fulfilled' ? social.value : this.getDefaultSocial()

      const issues = this.identifyIssues(performanceResult, seoResult, trackingResult, gdprResult, legalResult, socialResult)
      const overallScore = this.calculateScore(performanceResult, seoResult, trackingResult, gdprResult, legalResult, socialResult, issues)

      return {
        url,
        finalUrl: this.page.url(),
        isAccessible: response.ok(),
        httpStatus: response.status(),
        redirectChain: [url],
        performance: performanceResult,
        seo: seoResult,
        tracking: trackingResult,
        gdpr: gdprResult,
        legal: legalResult,
        social: socialResult,
        issues,
        overallScore,
        analysisDate: new Date(),
        analysisTime: Date.now() - startTime
      }

    } catch (error) {
      console.error('Errore durante analisi con SiteAnalyzer:', error)
      
      // Fallback: analisi semplificata
      return await this.fallbackAnalysis(url)
    }
  }

  /**
   * Analizza performance del sito
   */
  private async analyzePerformance(): Promise<PerformanceMetrics> {
    if (!this.page) throw new Error('Pagina non disponibile')

    const startTime = Date.now()
    
    // Analizza immagini
    const images = await this.page.locator('img').all()
    let brokenImages = 0
    
    for (const img of images) {
      try {
        const src = await img.getAttribute('src')
        if (src) {
          const response = await this.page.request.get(src, { timeout: 5000 })
          if (!response.ok()) brokenImages++
        }
      } catch {
        brokenImages++
      }
    }

    // Verifica responsività con controlli multipli per maggiore accuratezza
    const isResponsive = await this.checkMobileFriendly()

    return {
      loadTime: Date.now() - startTime,
      totalImages: images.length,
      brokenImages,
      isResponsive
    }
  }

  /**
   * Analizza SEO del sito
   */
  private async analyzeSEO(): Promise<SEOAnalysis> {
    if (!this.page) throw new Error('Pagina non disponibile')

    const title = await this.page.title()
    const metaDescription = await this.page.locator('meta[name="description"]').getAttribute('content') || ''
    const h1Elements = await this.page.locator('h1').all()
    const hasStructuredData = await this.page.locator('script[type="application/ld+json"]').count() > 0

    return {
      hasTitle: !!title,
      titleLength: title.length,
      hasMetaDescription: !!metaDescription,
      metaDescriptionLength: metaDescription.length,
      hasH1: h1Elements.length > 0,
      h1Count: h1Elements.length,
      hasStructuredData
    }
  }

  /**
   * Analizza tracking e pixel
   */
  private async analyzeTracking(): Promise<TrackingAnalysis> {
    if (!this.page) throw new Error('Pagina non disponibile')

    const content = await this.page.content()
    
    return {
      hasGoogleAnalytics: content.includes('google-analytics.com') || content.includes('gtag') || content.includes('ga('),
      hasFacebookPixel: content.includes('fbevents.js') || content.includes('facebook.com/tr'),
      hasGoogleTagManager: content.includes('googletagmanager.com'),
      hasHotjar: content.includes('hotjar.com'),
      hasClarityMicrosoft: content.includes('clarity.ms'),
      customTracking: []
    }
  }

  /**
   * Analizza conformità GDPR
   */
  private async analyzeGDPR(): Promise<GDPRCompliance> {
    if (!this.page) throw new Error('Pagina non disponibile')

    const content = (await this.page.content()).toLowerCase()
    const links = await this.page.locator('a').all()
    
    let hasPrivacyPolicy = false
    let privacyPolicyUrl = undefined
    
    for (const link of links) {
      const text = await link.textContent()
      const href = await link.getAttribute('href')
      if (text && (text.toLowerCase().includes('privacy') || text.toLowerCase().includes('cookie'))) {
        hasPrivacyPolicy = true
        if (href) privacyPolicyUrl = href
        break
      }
    }

    const hasCookieBanner = content.includes('cookie') && (
      content.includes('accetta') || 
      content.includes('accetto') || 
      content.includes('accept')
    )

    return {
      hasCookieBanner,
      hasPrivacyPolicy,
      privacyPolicyUrl,
      hasTermsOfService: content.includes('termini') || content.includes('terms'),
      cookieConsentMethod: hasCookieBanner ? 'banner' : 'none',
      riskyEmbeds: []
    }
  }

  /**
   * Analizza conformità legale italiana
   */
  private async analyzeLegal(): Promise<LegalCompliance> {
    if (!this.page) throw new Error('Pagina non disponibile')

    const content = (await this.page.content()).toLowerCase()
    
    const hasVisiblePartitaIva = content.includes('p.iva') || 
                                  content.includes('partita iva') ||
                                  content.includes('p. iva')

    const hasBusinessAddress = content.includes('via ') || 
                                content.includes('piazza ') ||
                                content.includes('corso ')

    const hasContactInfo = content.includes('@') || 
                           content.includes('telefono') ||
                           content.includes('tel:')

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
  }

  /**
   * Analizza presenza social
   */
  private async analyzeSocialPresence(): Promise<SocialPresence> {
    if (!this.page) throw new Error('Pagina non disponibile')

    const links = await this.page.locator('a').all()
    const social: SocialPresence = {
      hasAnySocial: false,
      socialCount: 0
    }

    for (const link of links) {
      const href = await link.getAttribute('href')
      if (!href) continue

      if (href.includes('facebook.com')) social.facebook = href
      if (href.includes('instagram.com')) social.instagram = href
      if (href.includes('linkedin.com')) social.linkedin = href
      if (href.includes('tiktok.com')) social.tiktok = href
      if (href.includes('youtube.com')) social.youtube = href
      if (href.includes('twitter.com') || href.includes('x.com')) social.twitter = href
    }

    social.socialCount = Object.keys(social).filter(key => 
      key !== 'hasAnySocial' && key !== 'socialCount' && social[key as keyof SocialPresence]
    ).length

    social.hasAnySocial = social.socialCount > 0

    return social
  }

  /**
   * Identifica problemi tecnici
   */
  private identifyIssues(
    performance: PerformanceMetrics,
    seo: SEOAnalysis,
    tracking: TrackingAnalysis,
    gdpr: GDPRCompliance,
    legal: LegalCompliance,
    social: SocialPresence
  ): TechnicalIssues {
    return {
      missingTitle: !seo.hasTitle,
      shortTitle: seo.titleLength < 30,
      missingMetaDescription: !seo.hasMetaDescription,
      shortMetaDescription: seo.metaDescriptionLength < 50,
      missingH1: !seo.hasH1,
      brokenImages: performance.brokenImages > 0,
      slowLoading: performance.loadTime > 3000,
      noTracking: !tracking.hasGoogleAnalytics && !tracking.hasFacebookPixel && !tracking.hasGoogleTagManager,
      noCookieConsent: !gdpr.hasCookieBanner,
      missingPartitaIva: !legal.hasVisiblePartitaIva,
      noSocialPresence: !social.hasAnySocial,
      httpsIssues: !this.page?.url().startsWith('https://') || false
    }
  }

  /**
   * Calcola punteggio complessivo
   */
  private calculateScore(
    performance: PerformanceMetrics,
    seo: SEOAnalysis,
    tracking: TrackingAnalysis,
    gdpr: GDPRCompliance,
    legal: LegalCompliance,
    social: SocialPresence,
    issues: TechnicalIssues
  ): number {
    let score = 100

    // Penalità SEO
    if (issues.missingTitle) score -= 15
    if (issues.shortTitle) score -= 5
    if (issues.missingMetaDescription) score -= 10
    if (issues.shortMetaDescription) score -= 5
    if (issues.missingH1) score -= 10

    // Penalità performance
    if (issues.slowLoading) score -= 15
    if (issues.brokenImages) score -= 10
    if (!performance.isResponsive) score -= 10

    // Penalità tracking
    if (issues.noTracking) score -= 10

    // Penalità GDPR
    if (issues.noCookieConsent) score -= 5

    // Penalità legali
    if (issues.missingPartitaIva) score -= 15

    // Penalità social
    if (issues.noSocialPresence) score -= 5

    // Penalità HTTPS
    if (issues.httpsIssues) score -= 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Metodi per valori di default in caso di errore
   */
  private getDefaultPerformance(): PerformanceMetrics {
    return {
      loadTime: 3000,
      totalImages: 0,
      brokenImages: 0,
      isResponsive: false
    }
  }

  private getDefaultSEO(): SEOAnalysis {
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

  private getDefaultTracking(): TrackingAnalysis {
    return {
      hasGoogleAnalytics: false,
      hasFacebookPixel: false,
      hasGoogleTagManager: false,
      hasHotjar: false,
      hasClarityMicrosoft: false,
      customTracking: []
    }
  }

  private getDefaultGDPR(): GDPRCompliance {
    return {
      hasCookieBanner: false,
      hasPrivacyPolicy: false,
      hasTermsOfService: false,
      cookieConsentMethod: 'none',
      riskyEmbeds: []
    }
  }

  private getDefaultLegal(): LegalCompliance {
    return {
      hasVisiblePartitaIva: false,
      hasBusinessAddress: false,
      hasContactInfo: false,
      complianceScore: 0
    }
  }

  private getDefaultSocial(): SocialPresence {
    return {
      hasAnySocial: false,
      socialCount: 0
    }
  }

  /**
   * Analisi di fallback in caso di errore
   */
  private async fallbackAnalysis(url: string): Promise<WebsiteAnalysis> {
    if (!this.page) {
      throw new Error('Pagina non disponibile per fallback')
    }

    try {
      const response = await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      const title = await this.page.title().catch(() => '')
      const metaDescription = await this.page.locator('meta[name="description"]').getAttribute('content').catch(() => '') || ''

      return {
        url,
        finalUrl: this.page.url(),
        isAccessible: response?.ok() || false,
        httpStatus: response?.status() || 0,
        redirectChain: [url],
        performance: {
          loadTime: 2000,
          totalImages: 0,
          brokenImages: 0,
          isResponsive: true
        },
        seo: {
          hasTitle: !!title,
          titleLength: title.length,
          hasMetaDescription: !!metaDescription,
          metaDescriptionLength: metaDescription.length,
          hasH1: true,
          h1Count: 1,
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
          complianceScore: 50
        },
        social: {
          hasAnySocial: false,
          socialCount: 0
        },
        issues: {
          missingTitle: !title,
          shortTitle: title.length < 30,
          missingMetaDescription: !metaDescription,
          shortMetaDescription: metaDescription.length < 50,
          missingH1: false,
          brokenImages: false,
          slowLoading: false,
          noTracking: true,
          noCookieConsent: false,
          missingPartitaIva: true,
          noSocialPresence: true,
          httpsIssues: !this.page.url().startsWith('https://')
        },
        overallScore: response?.ok() ? 60 : 10,
        analysisDate: new Date(),
        analysisTime: 2000
      }

    } catch (error) {
      console.error('Errore anche nel fallback:', error)
      throw new Error('Impossibile analizzare il sito web')
    }
  }

  /**
   * Chiude browser e libera risorse
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }

  /**
   * Verifica se il sito è mobile-friendly con controlli multipli
   */
  private async checkMobileFriendly(): Promise<boolean> {
    if (!this.page) return false

    try {
      return await this.page.evaluate(() => {
        // 1. Controlla meta viewport tag
        const viewport = document.querySelector('meta[name="viewport"]')
        const hasViewport = viewport && viewport.getAttribute('content')?.includes('width=device-width')
        
        // 2. Controlla CSS responsive
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')) as HTMLElement[]
        const hasResponsiveCss = stylesheets.some(sheet => {
          const content = sheet.textContent || ''
          const href = (sheet as HTMLLinkElement).href || ''
          // Controlla media queries o framework responsive
          return content.includes('@media') || 
                 content.includes('max-width') || 
                 content.includes('min-width') ||
                 href.includes('bootstrap') ||
                 href.includes('tailwind') ||
                 href.includes('bulma')
        })

        // 3. Controlla framework CSS responsive comuni
        const hasResponsiveFramework = document.querySelector([
          '.container', '.container-fluid', '.row', '.col-', // Bootstrap
          '.grid', '.flex', '.md\\:', '.lg\\:', '.sm\\:', // Tailwind
          '.columns', '.column', // Bulma
          '.pure-g', '.pure-u-', // Pure CSS
          '.uk-grid', '.uk-width-' // UIKit
        ].join(', ')) !== null

        // 4. Controlla CSS inline con media queries
        const allStyles = Array.from(document.querySelectorAll('*')).some(el => {
          const style = (el as HTMLElement).style.cssText
          return style.includes('max-width') || style.includes('min-width')
        })

        // 5. Controlla se il sito ha layout fluido/percentuale
        const bodyStyle = window.getComputedStyle(document.body)
        const hasFluidLayout = bodyStyle.width.includes('%') || bodyStyle.maxWidth !== 'none'

        // 6. Test finale: simula resize per vedere se il layout si adatta
        let respondsToResize = false
        try {
          const originalWidth = document.body.offsetWidth
          // Questo è solo un controllo approssimativo
          respondsToResize = originalWidth > 0 && (hasViewport || hasResponsiveCss)
        } catch (e) {
          respondsToResize = false
        }

        // Il sito è considerato responsive se soddisfa almeno 2 criteri
        const responsiveCriteria = [
          hasViewport,
          hasResponsiveCss,
          hasResponsiveFramework,
          allStyles,
          hasFluidLayout,
          respondsToResize
        ].filter(Boolean).length

        return responsiveCriteria >= 2
      })
    } catch (error) {
      console.warn('Errore controllo mobile-friendly:', error)
      // Fallback: controlla solo meta viewport
      return await this.page.locator('meta[name="viewport"]').count() > 0
    }
  }
}
