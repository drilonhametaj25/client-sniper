/**
 * Analizzatore completo di siti web per lead generation
 * Esegue analisi tecnica avanzata senza GPT per valutare opportunità di business
 * Include performance, SEO, GDPR, tracking, presenza social e conformità legale italiana
 */

import { Page } from 'playwright'
import { WebsiteAnalysis, PerformanceMetrics, SEOAnalysis, TrackingAnalysis, GDPRCompliance, LegalCompliance, SocialPresence, TechnicalIssues } from '../types/LeadAnalysis'
import { ContactParser } from '../utils/contact-parser'

export class SiteAnalyzer {
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
      // Segui i redirect e ottieni l'URL finale
      const navigationResult = await this.navigateWithRedirects(url)
      
      if (!navigationResult.success) {
        return this.createFailedAnalysis(url, navigationResult.httpStatus)
      }

      // Aspetta che la pagina sia caricata con strategia a più livelli
      try {
        // Prima prova con networkidle veloce
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 })
        await this.page.waitForTimeout(2000) // Aspetta 2s per contenuto dinamico
        
        // Prova networkidle con timeout ridotto
        try {
          await this.page.waitForLoadState('networkidle', { timeout: 10000 })
        } catch {
          // Se networkidle fallisce, procedi comunque
          console.log('⚠️ NetworkIdle timeout, procedo con analisi')
        }
      } catch (error) {
        console.log('⚠️ DOMContentLoaded timeout, procedo con analisi basic')
      }
      
      // Esegui tutte le analisi con timeout individuali
      const analysisPromises = [
        this.timeoutPromise(this.analyzePerformance(), 8000, 'performance'),
        this.timeoutPromise(this.analyzeSEO(), 5000, 'seo'),
        this.timeoutPromise(this.analyzeTracking(), 5000, 'tracking'),
        this.timeoutPromise(this.analyzeGDPR(), 5000, 'gdpr'),
        this.timeoutPromise(this.analyzeLegal(), 5000, 'legal'),
        this.timeoutPromise(this.analyzeSocialPresence(), 5000, 'social')
      ]

      const results = await Promise.allSettled(analysisPromises)
      
      // Estrai i risultati o usa default per quelli falliti
      const [
        performance,
        seo,
        tracking,
        gdpr,
        legal,
        social
      ] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          console.log(`⚠️ Analisi ${['performance', 'seo', 'tracking', 'gdpr', 'legal', 'social'][index]} fallita:`, result.reason)
          return this.getDefaultAnalysis(['performance', 'seo', 'tracking', 'gdpr', 'legal', 'social'][index])
        }
      })

      const issues = await this.identifyIssues(performance, seo, tracking, gdpr, legal, social)
      const overallScore = this.calculateScore(performance, seo, tracking, gdpr, legal, social, issues)

      return {
        url,
        finalUrl: navigationResult.finalUrl,
        isAccessible: true,
        httpStatus: navigationResult.httpStatus,
        redirectChain: navigationResult.redirectChain,
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

  /**
   * Naviga al sito seguendo i redirect
   */
  private async navigateWithRedirects(url: string): Promise<{
    success: boolean
    finalUrl?: string
    httpStatus: number
    redirectChain: string[]
  }> {
    const redirectChain: string[] = []
    let currentUrl = url

    try {
      // Assicurati che l'URL abbia il protocollo
      if (!currentUrl.startsWith('http')) {
        currentUrl = `https://${currentUrl}`
      }

      const response = await this.page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      })

      if (!response) {
        return { success: false, httpStatus: 0, redirectChain }
      }

      // Traccia la catena di redirect
      let currentResponse = response
      while (currentResponse) {
        redirectChain.push(currentResponse.url())
        const redirectedFrom = currentResponse.request().redirectedFrom()
        if (!redirectedFrom) break
        const nextResponse = await redirectedFrom.response()
        if (!nextResponse) break
        currentResponse = nextResponse
      }

      const finalUrl = this.page.url()
      const httpStatus = response.status()

      return {
        success: httpStatus < 400,
        finalUrl,
        httpStatus,
        redirectChain
      }

    } catch (error) {
      // Prova con HTTP se HTTPS fallisce
      if (currentUrl.startsWith('https://')) {
        try {
          const httpUrl = currentUrl.replace('https://', 'http://')
          const response = await this.page.goto(httpUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
          })

          return {
            success: response ? response.status() < 400 : false,
            finalUrl: this.page.url(),
            httpStatus: response?.status() || 0,
            redirectChain: [httpUrl, this.page.url()]
          }
        } catch (httpError) {
          return { success: false, httpStatus: 0, redirectChain }
        }
      }

      return { success: false, httpStatus: 0, redirectChain }
    }
  }

  /**
   * Analizza le performance del sito
   */
  private async analyzePerformance(): Promise<PerformanceMetrics> {
    try {
      // Misura il tempo di caricamento
      const loadTime = await this.page.evaluate(() => {
        const timing = performance.timing
        return timing.loadEventEnd - timing.navigationStart
      })

      // Conta le immagini
      const images = await this.page.$$('img')
      const totalImages = images.length

      // Verifica immagini rotte
      const brokenImages = await this.page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'))
        return imgs.filter(img => !img.complete || img.naturalWidth === 0).length
      })

      // Verifica responsività
      const isResponsive = await this.page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]')
        return !!viewport
      })

      // Conta richieste di rete
      const networkRequests = await this.page.evaluate(() => {
        return performance.getEntriesByType('resource').length
      })

      return {
        loadTime: loadTime || 0,
        totalImages,
        brokenImages,
        isResponsive,
        networkRequests
      }

    } catch (error) {
      return {
        loadTime: 0,
        totalImages: 0,
        brokenImages: 0,
        isResponsive: false
      }
    }
  }

  /**
   * Analizza SEO base
   */
  private async analyzeSEO(): Promise<SEOAnalysis> {
    try {
      const title = await this.page.$eval('title', el => el.textContent?.trim() || '').catch(() => '')
      const metaDescription = await this.page.$eval('meta[name="description"]', el => el.getAttribute('content') || '').catch(() => '')
      const h1Elements = await this.page.$$('h1')
      
      const hasStructuredData = await this.page.evaluate(() => {
        return !!document.querySelector('script[type="application/ld+json"]')
      })

      return {
        hasTitle: title.length > 0,
        titleLength: title.length,
        hasMetaDescription: metaDescription.length > 0,
        metaDescriptionLength: metaDescription.length,
        hasH1: h1Elements.length > 0,
        h1Count: h1Elements.length,
        hasStructuredData
      }

    } catch (error) {
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

  /**
   * Analizza script di tracking
   */
  private async analyzeTracking(): Promise<TrackingAnalysis> {
    try {
      const pageContent = await this.page.content()
      const scripts = await this.page.$$eval('script', scripts => 
        scripts.map(script => script.src || script.textContent || '')
      )

      const allContent = pageContent + scripts.join(' ')

      return {
        hasGoogleAnalytics: /gtag|google-analytics|UA-|G-|analytics\.js|ga\(/i.test(allContent),
        hasFacebookPixel: /fbevents|facebook\.com\/tr|fbq\(/i.test(allContent),
        hasGoogleTagManager: /googletagmanager|GTM-/i.test(allContent),
        hasHotjar: /hotjar|hjSiteSettings/i.test(allContent),
        hasClarityMicrosoft: /clarity\.ms|MicrosoftClarity/i.test(allContent),
        customTracking: this.extractCustomTracking(allContent)
      }

    } catch (error) {
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

  /**
   * Analizza conformità GDPR
   */
  private async analyzeGDPR(): Promise<GDPRCompliance> {
    try {
      const pageContent = (await this.page.content()).toLowerCase()
      
      const hasCookieBanner = /cookie|consenso|accetta|privacy|gdpr/i.test(pageContent)
      
      const privacyLinks = await this.page.$$eval('a[href*="privacy"], a[href*="cookie"]', links =>
        links.map(link => (link as HTMLAnchorElement).href)
      ).catch(() => [])

      const riskyEmbeds = await this.page.$$eval('iframe', iframes =>
        iframes
          .map(iframe => iframe.src)
          .filter(src => src && /youtube|vimeo|google|facebook/i.test(src))
      ).catch(() => [])

      return {
        hasCookieBanner,
        hasPrivacyPolicy: privacyLinks.length > 0,
        privacyPolicyUrl: privacyLinks[0],
        hasTermsOfService: /termini|terms/i.test(pageContent),
        cookieConsentMethod: hasCookieBanner ? 'banner' : 'none',
        riskyEmbeds
      }

    } catch (error) {
      return {
        hasCookieBanner: false,
        hasPrivacyPolicy: false,
        hasTermsOfService: false,
        cookieConsentMethod: 'none',
        riskyEmbeds: []
      }
    }
  }

  /**
   * Analizza conformità legale italiana
   */
  private async analyzeLegal(): Promise<LegalCompliance> {
    try {
      const pageContent = await this.page.content()
      const contacts = ContactParser.parseContacts(pageContent)
      
      const hasVisiblePartitaIva = contacts.partiteIva.length > 0
      
      // Determina dove si trova la P.IVA
      let partitaIvaLocation: 'footer' | 'header' | 'contact' | 'privacy' | undefined
      if (hasVisiblePartitaIva) {
        const footer = await this.page.$eval('footer', el => el.textContent || '').catch(() => '')
        const header = await this.page.$eval('header', el => el.textContent || '').catch(() => '')
        
        if (ContactParser.parseContacts(footer).partiteIva.length > 0) {
          partitaIvaLocation = 'footer'
        } else if (ContactParser.parseContacts(header).partiteIva.length > 0) {
          partitaIvaLocation = 'header'
        } else {
          partitaIvaLocation = 'contact'
        }
      }

      const hasBusinessAddress = /via|viale|piazza|corso|strada/i.test(pageContent) && contacts.hasContacts
      const hasContactInfo = contacts.phones.length > 0 || contacts.emails.length > 0

      let complianceScore = 0
      if (hasVisiblePartitaIva) complianceScore += 40
      if (hasBusinessAddress) complianceScore += 30
      if (hasContactInfo) complianceScore += 30

      return {
        hasVisiblePartitaIva,
        partitaIvaLocation,
        hasBusinessAddress,
        hasContactInfo,
        complianceScore
      }

    } catch (error) {
      return {
        hasVisiblePartitaIva: false,
        hasBusinessAddress: false,
        hasContactInfo: false,
        complianceScore: 0
      }
    }
  }

  /**
   * Analizza presenza sui social
   */
  private async analyzeSocialPresence(): Promise<SocialPresence> {
    try {
      const links = await this.page.$$eval('a[href]', links =>
        links.map(link => (link as HTMLAnchorElement).href.toLowerCase())
      )

      const social: SocialPresence = {
        hasAnySocial: false,
        socialCount: 0
      }

      // Cerca link ai social
      for (const link of links) {
        if (link.includes('facebook.com')) social.facebook = link
        if (link.includes('instagram.com')) social.instagram = link
        if (link.includes('linkedin.com')) social.linkedin = link
        if (link.includes('tiktok.com')) social.tiktok = link
        if (link.includes('youtube.com')) social.youtube = link
        if (link.includes('twitter.com') || link.includes('x.com')) social.twitter = link
      }

      social.socialCount = Object.keys(social).filter(key => 
        key !== 'hasAnySocial' && key !== 'socialCount' && social[key as keyof SocialPresence]
      ).length

      social.hasAnySocial = social.socialCount > 0

      return social

    } catch (error) {
      return {
        hasAnySocial: false,
        socialCount: 0
      }
    }
  }

  /**
   * Identifica problemi tecnici
   */
  private async identifyIssues(
    performance: PerformanceMetrics,
    seo: SEOAnalysis,
    tracking: TrackingAnalysis,
    gdpr: GDPRCompliance,
    legal: LegalCompliance,
    social: SocialPresence
  ): Promise<TechnicalIssues> {
    // Controlla se il sito usa HTTPS
    const currentUrl = this.page.url()
    const hasInsecureContent = await this.hasInsecureContent()
    const httpsIssues = !currentUrl.startsWith('https://') || hasInsecureContent

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

  /**
   * Controlla se ci sono contenuti misti (HTTP su pagina HTTPS)
   */
  private async hasInsecureContent(): Promise<boolean> {
    try {
      const insecureResources = await this.page.evaluate(() => {
        const resources: string[] = []
        
        // Controlla script con src HTTP
        document.querySelectorAll('script[src]').forEach(script => {
          const src = (script as HTMLScriptElement).src
          if (src && src.startsWith('http://')) {
            resources.push(src)
          }
        })
        
        // Controlla link CSS con href HTTP
        document.querySelectorAll('link[href]').forEach(link => {
          const href = (link as HTMLLinkElement).href
          if (href && href.startsWith('http://')) {
            resources.push(href)
          }
        })
        
        // Controlla immagini con src HTTP
        document.querySelectorAll('img[src]').forEach(img => {
          const src = (img as HTMLImageElement).src
          if (src && src.startsWith('http://')) {
            resources.push(src)
          }
        })
        
        // Controlla iframe con src HTTP
        document.querySelectorAll('iframe[src]').forEach(iframe => {
          const src = (iframe as HTMLIFrameElement).src
          if (src && src.startsWith('http://')) {
            resources.push(src)
          }
        })
        
        return resources.length > 0
      })
      
      return insecureResources
    } catch (error) {
      return false
    }
  }

  /**
   * Calcola il punteggio complessivo (più basso = più problemi = migliore opportunità)
   * Score va da 0 (molti problemi, ottima opportunità) a 100 (perfetto, nessun problema)
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

    // Sottrai punti per mancanza di tracking (opportunità di vendita!)
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

  /**
   * Estrae script di tracking personalizzati
   */
  private extractCustomTracking(content: string): string[] {
    const tracking: string[] = []
    
    // Pattern per altri servizi di tracking comuni
    if (/mixpanel/i.test(content)) tracking.push('Mixpanel')
    if (/amplitude/i.test(content)) tracking.push('Amplitude')
    if (/segment/i.test(content)) tracking.push('Segment')
    if (/intercom/i.test(content)) tracking.push('Intercom')
    if (/crisp/i.test(content)) tracking.push('Crisp')
    
    return tracking
  }

  /**
   * Crea un'analisi fallita
   */
  private createFailedAnalysis(url: string, httpStatus: number): WebsiteAnalysis {
    return {
      url,
      isAccessible: false,
      httpStatus,
      redirectChain: [],
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

  /**
   * Esegue una promessa con timeout
   */
  private async timeoutPromise<T>(
    promise: Promise<T>, 
    timeoutMs: number, 
    name: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout ${timeoutMs}ms per analisi ${name}`))
      }, timeoutMs)

      promise
        .then(result => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  /**
   * Restituisce analisi di default in caso di errore
   */
  private getDefaultAnalysis(type: string): any {
    switch (type) {
      case 'performance':
        return {
          loadTime: -1,
          totalImages: 0,
          brokenImages: 0,
          networkRequests: 0,
          isResponsive: false
        }
      
      case 'seo':
        return {
          hasTitle: false,
          titleLength: 0,
          hasMetaDescription: false,
          metaDescriptionLength: 0,
          hasH1: false,
          h1Count: 0,
          hasStructuredData: false
        }
      
      case 'tracking':
        return {
          hasGoogleAnalytics: false,
          hasFacebookPixel: false,
          hasGoogleTagManager: false,
          hasHotjar: false,
          hasClarityMicrosoft: false,
          customTracking: []
        }
      
      case 'gdpr':
        return {
          hasCookieBanner: false,
          hasPrivacyPolicy: false,
          privacyPolicyUrl: undefined,
          hasTermsOfService: false,
          cookieConsentMethod: 'none' as const,
          riskyEmbeds: []
        }
      
      case 'legal':
        return {
          hasVisiblePartitaIva: false,
          partitaIvaLocation: undefined,
          hasBusinessAddress: false,
          hasContactInfo: false,
          complianceScore: 0
        }
      
      case 'social':
        return {
          facebook: undefined,
          instagram: undefined,
          linkedin: undefined,
          tiktok: undefined,
          youtube: undefined,
          twitter: undefined,
          hasAnySocial: false,
          socialCount: 0
        }
      
      default:
        return {}
    }
  }
}
