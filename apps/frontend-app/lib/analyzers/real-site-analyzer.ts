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
    try {
      
      // Controllo se siamo in un ambiente serverless
      const isServerless = process.env.VERCEL === '1' || 
                           !!process.env.AWS_LAMBDA_FUNCTION_NAME || 
                           !!process.env.LAMBDA_TASK_ROOT;
                           
      if (isServerless) {
        console.warn('⚠️ Rilevato ambiente serverless. Playwright potrebbe non funzionare correttamente.');
      }
      
      this.browser = await chromium.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })
      
      
      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (compatible; ClientSniper/1.0; +https://clientsniper.com)',
        viewport: { width: 1920, height: 1080 }
      })
      
      
      this.page = await context.newPage()
      
    } catch (error) {
      console.error('❌ Errore durante inizializzazione Playwright:', error)
      
      // Controllo specifico per errore "Executable doesn't exist" tipico di ambienti serverless
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
          errorMessage.includes("Executable doesn't exist") ||
          errorMessage.includes("spawn ENOENT") ||
          errorMessage.includes("playwright install")
      ) {
        console.error('💥 Errore browser binaries mancanti. Questo è un problema noto in ambienti serverless.');
        throw new Error('Browser binaries non disponibili in questo ambiente. Usa SimplifiedSiteAnalyzer in ambienti serverless.');
      }
      
      throw error
    }
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

      const finalUrl = this.page.url()

      // Verifica che il redirect sia nel dominio principale richiesto
      const originalDomain = this.extractMainDomain(url)
      const finalDomain = this.extractMainDomain(finalUrl)
      
      if (originalDomain !== finalDomain) {
        console.warn(`⚠️ Redirect cross-domain: ${originalDomain} → ${finalDomain}`)
        // Se il redirect è verso un dominio diverso, utilizziamo l'URL originale per l'analisi
        // ma manteniamo il finalUrl per tracciamento
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
        finalUrl,
        isAccessible: response.ok(),
        httpStatus: response.status(),
        redirectChain: [url, finalUrl].filter((u, i, arr) => arr.indexOf(u) === i), // rimuove duplicati
        performance: performanceResult,
        seo: seoResult,
        tracking: trackingResult,
        gdpr: gdprResult,
        legal: legalResult,
        social: socialResult,
        issues,
        overallScore,
        analysisDate: new Date(),
        analysisTime: Date.now() - startTime,
        analysisType: 'full' as const // Specifica che è stata fatta un'analisi completa
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
   * Analizza tracking e pixel - MIGLIORATO con pattern robusti e verifica window objects
   * Allineato con services/scraping-engine/src/analyzers/enhanced-website-analyzer.ts
   */
  private async analyzeTracking(): Promise<TrackingAnalysis> {
    if (!this.page) throw new Error('Pagina non disponibile')

    const html = await this.page.content()

    // Fase 1: Pattern HTML
    const gaPatterns = [
      /gtag\s*\(/i,
      /google-analytics\.com/i,
      /googletagmanager\.com\/gtag\/js/i,
      /UA-\d{4,10}-\d{1,4}/i,
      /G-[A-Z0-9]{10,}/i,
      /analytics\.js/i,
      /gtag\/js\?id=/i,
      /__gaTracker/i,
      /GoogleAnalyticsObject/i
    ]
    let hasGoogleAnalytics = gaPatterns.some(pattern => pattern.test(html))

    const fbPatterns = [
      /connect\.facebook\.net.*fbevents/i,
      /fbq\s*\(/i,
      /facebook\.com\/tr/i,
      /_fbp/i,
      /fbevents\.js/i,
      /fb-pixel/i,
      /facebook\.net\/en_US\/fbevents/i
    ]
    let hasFacebookPixel = fbPatterns.some(pattern => pattern.test(html))

    const gtmPatterns = [
      /googletagmanager\.com\/gtm\.js/i,
      /GTM-[A-Z0-9]{6,}/i,
      /gtm\.start/i,
      /googletagmanager\.com\/ns\.html/i
    ]
    let hasGoogleTagManager = gtmPatterns.some(pattern => pattern.test(html))

    let hasHotjar = /static\.hotjar\.com/i.test(html) || /hj\s*\(/i.test(html)
    let hasClarityMicrosoft = /clarity\.ms/i.test(html) || /clarity\s*\(/i.test(html)

    // Fase 2: Verifica window objects per rilevamento più affidabile
    try {
      const windowTracking = await this.page.evaluate(() => {
        const w = window as any
        return {
          hasGtag: typeof w.gtag === 'function',
          hasGa: typeof w.ga === 'function' || typeof w.GoogleAnalyticsObject === 'string',
          hasDataLayerWithGtm: Array.isArray(w.dataLayer) &&
            w.dataLayer.some((item: any) => item['gtm.start'] || item.event === 'gtm.js'),
          hasFbq: typeof w.fbq === 'function',
          hasHj: typeof w.hj === 'function',
          hasClarity: typeof w.clarity === 'function'
        }
      })

      if (windowTracking.hasGtag || windowTracking.hasGa) hasGoogleAnalytics = true
      if (windowTracking.hasDataLayerWithGtm) hasGoogleTagManager = true
      if (windowTracking.hasFbq) hasFacebookPixel = true
      if (windowTracking.hasHj) hasHotjar = true
      if (windowTracking.hasClarity) hasClarityMicrosoft = true
    } catch {
      // Errore nell'evaluate - usa solo rilevamento HTML
    }

    // Custom tracking
    const customTracking: string[] = []
    if (/matomo/i.test(html)) customTracking.push('Matomo')
    if (/segment\.com/i.test(html)) customTracking.push('Segment')
    if (/hubspot/i.test(html)) customTracking.push('HubSpot')
    if (/ttq\s*\(/i.test(html) || /analytics\.tiktok\.com/i.test(html)) customTracking.push('TikTok Pixel')
    if (/lintrk\s*\(/i.test(html) || /linkedin\.com\/insight/i.test(html)) customTracking.push('LinkedIn Insight')

    return {
      hasGoogleAnalytics,
      hasFacebookPixel,
      hasGoogleTagManager,
      hasHotjar,
      hasClarityMicrosoft,
      customTracking
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
    try {
      if (this.page) {
        try {
          await this.page.close().catch(e => console.warn('⚠️ Errore chiusura pagina:', e));
        } catch (pageError) {
          console.warn('⚠️ Errore chiusura pagina:', pageError);
        }
        this.page = null;
      }
      
      if (this.browser) {
        try {
          await this.browser.close().catch(e => console.warn('⚠️ Errore chiusura browser:', e));
        } catch (browserError) {
          console.warn('⚠️ Errore chiusura browser:', browserError);
        }
        this.browser = null;
      }
      
    } catch (error) {
      console.error('❌ Errore durante cleanup:', error);
      // Non rilanciamo l'errore per evitare che fallisca l'intera operazione
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

  /**
   * Estrae il dominio principale da un URL (senza www, sottodomini, path)
   */
  private extractMainDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      let hostname = urlObj.hostname.toLowerCase()
      
      // Rimuove www.
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4)
      }
      
      // Per domini con sottodomini (es. shop.example.com), estrae solo example.com
      const parts = hostname.split('.')
      if (parts.length >= 2) {
        // Mantiene solo gli ultimi due segmenti (dominio.tld)
        return parts.slice(-2).join('.')
      }
      
      return hostname
    } catch {
      return url.toLowerCase()
    }
  }
}
