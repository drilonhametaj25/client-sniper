/**
 * Website Analyzer Enterprise - Versione migliorata con tutte le funzionalità avanzate
 * Integra tutti i miglioramenti richiesti: status checker, tech stack detector, performance analyzer
 * Risolve falsi negativi, migliora rilevamento SSL, mobile friendly, analytics
 * Aggiunge rilevamento CMS, GDPR compliance, e analisi dettagliate
 * 
 * Utilizzato dal Google Maps Scraper per analisi completa dei siti web
 * Parte del modulo services/scraping-engine
 */

import { chromium, Browser, Page } from 'playwright'
import { SocialAnalyzer } from './social-analyzer'
import { WebsiteStatusChecker, WebsiteStatus } from '../utils/website-status-checker'
import { TechStackDetector, TechStackInfo } from '../utils/tech-stack-detector'
import { PerformanceAnalyzer, PerformanceMetrics } from '../utils/performance-analyzer'
import { BusinessContactParser } from '../utils/business-contact-parser'
import { BrowserManager } from '../utils/browser-manager'
import type { SocialAnalysisResult } from './social-analyzer'

export interface EnhancedWebsiteAnalysis {
  // Basic Info
  url: string
  finalUrl: string
  websiteStatus: WebsiteStatus
  isAccessible: boolean
  httpStatusCode: number
  
  // SSL & Security
  hasSSL: boolean
  sslValid: boolean
  sslDetails?: {
    issuer: string
    expiryDate: Date
    daysToExpiry: number
  }
  
  // Performance
  performance: PerformanceMetrics
  
  // SEO Analysis
  seo: {
    hasTitle: boolean
    titleLength: number
    title?: string
    hasMetaDescription: boolean
    metaDescriptionLength: number
    metaDescription?: string
    hasH1: boolean
    h1Count: number
    h1Text?: string[]
    hasH2: boolean
    h2Count: number
    hasRobotsTag: boolean
    hasCanonical: boolean
    hasStructuredData: boolean
    hasOpenGraph: boolean
    hasTwitterCard: boolean
    hasSitemap: boolean
    hasRobotsTxt: boolean
  }
  
  // Images Analysis
  images: {
    total: number
    withoutAlt: number
    broken: number
    oversized: number
    averageSize: number
    formats: string[]
  }
  
  // Tracking & Analytics
  tracking: {
    googleAnalytics: boolean
    googleTagManager: boolean
    facebookPixel: boolean
    googleAdsConversion: boolean
    hotjar: boolean
    clarity: boolean
    customPixels: string[]
    trackingScore: number // 0-100
  }
  
  // GDPR & Privacy
  gdpr: {
    hasCookieBanner: boolean
    hasPrivacyPolicy: boolean
    privacyPolicyUrl?: string
    hasTermsOfService: boolean
    hasContactInfo: boolean
    hasBusinessAddress: boolean
    hasVatNumber: boolean
    vatNumbers: string[]
    gdprScore: number // 0-100
  }
  
  // Mobile & Responsiveness
  mobile: {
    isMobileFriendly: boolean
    hasViewportMeta: boolean
    hasResponsiveCss: boolean
    hasHorizontalScroll: boolean
    touchTargetsOk: boolean
    textReadable: boolean
    mobileScore: number // 0-100
  }
  
  // Technology Stack
  techStack: TechStackInfo
  
  // Content Analysis
  content: {
    wordCount: number
    hasContactForm: boolean
    hasPhoneNumbers: boolean
    phoneNumbers: string[]
    hasEmailAddresses: boolean
    emailAddresses: string[]
    hasSocialLinks: boolean
    socialLinks: string[]
    hasMapEmbedded: boolean
    hasBusinessHours: boolean
    contentQualityScore: number // 0-100
  }
  
  // Technical Issues
  issues: {
    critical: string[]
    high: string[]
    medium: string[]
    low: string[]
  }
  
  // Business Opportunities
  opportunities: {
    neededServices: string[] // SEO, web design, performance, etc.
    neededRoles: string[] // designer, developer, seo, copywriter, photographer, adv, social, gdpr
    priorityLevel: 'critical' | 'high' | 'medium' | 'low'
    estimatedValue: number // 1-10 scale
    quickWins: string[] // Easy improvements
  }
  
  social?: SocialAnalysisResult
  // Overall Scores
  overallScore: number // 0-100
  businessValue: number // 0-100
  technicalHealth: number // 0-100
  
  // Analysis Meta
  analysisDate: Date
  analysisTime: number // ms
  version: string
}

export class EnhancedWebsiteAnalyzer {
  private browserManager: BrowserManager
  private statusChecker: WebsiteStatusChecker
  private techDetector: TechStackDetector
  private performanceAnalyzer: PerformanceAnalyzer
  private contactParser: BusinessContactParser
  
  constructor() {
    this.browserManager = BrowserManager.getInstance()
    this.statusChecker = new WebsiteStatusChecker()
    this.techDetector = new TechStackDetector()
    this.performanceAnalyzer = new PerformanceAnalyzer()
    this.contactParser = new BusinessContactParser()
  }

  /**
   * Analisi completa e migliorata di un sito web
   */
  async analyzeWebsite(url: string): Promise<EnhancedWebsiteAnalysis> {
    const startTime = Date.now()
    console.log(`🔍 Analisi completa per: ${url}`)
    
    try {
      // Step 1: Verifica stato e accessibilità
      const statusResult = await this.statusChecker.checkWebsiteStatus(url)
      
      if (!statusResult.isAccessible) {
        return this.createFailedAnalysis(url, statusResult, startTime)
      }
      
      // Step 2: Analisi con browser
      const browserAnalysis = await this.performBrowserAnalysis(statusResult.finalUrl)
      // Step 2b: Analisi social
      let social: any = null
      try {
        const browser = await chromium.launch({ headless: true })
        const page = await browser.newPage()
        await page.goto(statusResult.finalUrl, { waitUntil: 'networkidle', timeout: 30000 })
        const socialAnalyzer = new SocialAnalyzer()
        social = await socialAnalyzer.analyzeSocials(page)
        await page.close()
        await browser.close()
      } catch (e) {
        social = { profiles: [], summary: ['Errore analisi social'] }
      }
      
      // Step 3: Calcola punteggi e opportunità
      const scores = this.calculateScores(browserAnalysis)
      const opportunities = this.identifyOpportunities(browserAnalysis, scores)
      
      return {
        url,
        finalUrl: statusResult.finalUrl,
        websiteStatus: statusResult.status,
        isAccessible: true,
        httpStatusCode: statusResult.httpCode,
        hasSSL: statusResult.finalUrl.startsWith('https://'),
        sslValid: statusResult.sslValid,
        sslDetails: statusResult.technicalDetails.sslCertificate ? {
          issuer: statusResult.technicalDetails.sslCertificate.issuer,
          expiryDate: statusResult.technicalDetails.sslCertificate.validTo,
          daysToExpiry: statusResult.technicalDetails.sslCertificate.daysToExpiry
        } : undefined,
        // Ensure all required fields are present
        seo: browserAnalysis.seo || this.getDefaultSEO(),
        images: browserAnalysis.images || this.getDefaultImages(),
        tracking: browserAnalysis.tracking || this.getDefaultTracking(),
        gdpr: browserAnalysis.gdpr || this.getDefaultGDPR(),
        mobile: browserAnalysis.mobile || this.getDefaultMobile(),
        content: browserAnalysis.content || this.getDefaultContent(),
        performance: browserAnalysis.performance || this.performanceAnalyzer['getDefaultMetrics'](),
        techStack: browserAnalysis.techStack || this.getDefaultTechStack(),
        issues: browserAnalysis.issues || { critical: [], high: [], medium: [], low: [] },
        ...scores,
        opportunities,
        social,
        analysisDate: new Date(),
        analysisTime: Date.now() - startTime,
        version: '2.0.0'
      }
      
    } catch (error) {
      console.error(`❌ Errore durante analisi di ${url}:`, error)
      return this.createErrorAnalysis(url, error, startTime)
    } finally {
      await this.cleanup()
    }
  }

  /**
   * Analisi dettagliata con browser
   */
  private async performBrowserAnalysis(url: string): Promise<Partial<EnhancedWebsiteAnalysis>> {
    const browserId = `analyzer-${Date.now()}`;
    const { browser, context } = await this.browserManager.getBrowser(browserId);
    const page = await context.newPage();
    
    try {
      // Configura pagina
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      // Carica pagina
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      })
      
      if (!response) {
        throw new Error('Impossibile caricare la pagina')
      }
      
      // Attendi rendering completo
      await page.waitForTimeout(3000)
      
      // Raccogli HTML e metadata
      const htmlContent = await page.content()
      const pageTitle = await page.title()
      
      // Analisi parallele con fallback
      const [
        seoAnalysis,
        imagesAnalysis,
        trackingAnalysis,
        gdprAnalysis,
        mobileAnalysis,
        contentAnalysis,
        performanceMetrics,
        techStackInfo
      ] = await Promise.all([
        this.analyzeSEO(page, htmlContent).catch(() => this.getDefaultSEO()),
        this.analyzeImages(page).catch(() => this.getDefaultImages()),
        this.analyzeTracking(page, htmlContent).catch(() => this.getDefaultTracking()),
        this.analyzeGDPR(page, htmlContent).catch(() => this.getDefaultGDPR()),
        this.analyzeMobileCompatibility(page).catch(() => this.getDefaultMobile()),
        this.analyzeContent(page, htmlContent).catch(() => this.getDefaultContent()),
        this.performanceAnalyzer.analyzePerformance(page, url).catch(() => this.performanceAnalyzer['getDefaultMetrics']()),
        this.techDetector.detectTechStack(htmlContent, response.headers() as Record<string, string>).catch(() => this.getDefaultTechStack())
      ])
      
      // Identifica problemi
      const issues = this.identifyIssues({
        seo: seoAnalysis,
        images: imagesAnalysis,
        tracking: trackingAnalysis,
        gdpr: gdprAnalysis,
        mobile: mobileAnalysis,
        performance: performanceMetrics,
        techStack: techStackInfo
      })
      
      return {
        seo: seoAnalysis,
        images: imagesAnalysis,
        tracking: trackingAnalysis,
        gdpr: gdprAnalysis,
        mobile: mobileAnalysis,
        content: contentAnalysis,
        performance: performanceMetrics || this.performanceAnalyzer['getDefaultMetrics'](),
        techStack: techStackInfo,
        issues
      }
      
    } finally {
      await page.close()
      await this.browserManager.releaseBrowser(browserId)
    }
  }

  /**
   * Analisi SEO migliorata
   */
  private async analyzeSEO(page: Page, html: string): Promise<EnhancedWebsiteAnalysis['seo']> {
    const seoData = await page.evaluate(() => {
      // Title
      const titleEl = document.querySelector('title')
      const title = titleEl?.textContent?.trim() || ''
      
      // Meta description
      const metaDesc = document.querySelector('meta[name="description"]')
      const description = metaDesc?.getAttribute('content')?.trim() || ''
      
      // H tags
      const h1Elements = Array.from(document.querySelectorAll('h1'))
      const h2Elements = Array.from(document.querySelectorAll('h2'))
      const h1Text = h1Elements.map(el => el.textContent?.trim() || '')
      
      // Other meta tags
      const robotsMeta = document.querySelector('meta[name="robots"]')
      const canonical = document.querySelector('link[rel="canonical"]')
      const ogTitle = document.querySelector('meta[property="og:title"]')
      const twitterCard = document.querySelector('meta[name="twitter:card"]')
      
      return {
        title,
        titleLength: title.length,
        description,
        descriptionLength: description.length,
        h1Text,
        h1Count: h1Elements.length,
        h2Count: h2Elements.length,
        hasRobotsTag: !!robotsMeta,
        hasCanonical: !!canonical,
        hasOpenGraph: !!ogTitle,
        hasTwitterCard: !!twitterCard
      }
    })
    
    // Verifica sitemap e robots.txt
    const [hasSitemap, hasRobotsTxt] = await Promise.all([
      this.checkSitemap(page),
      this.checkRobotsTxt(page)
    ])
    
    // Verifica structured data
    const hasStructuredData = /application\/ld\+json|microdata|rdfa/i.test(html)
    
    return {
      hasTitle: seoData.titleLength > 0,
      titleLength: seoData.titleLength,
      title: seoData.title,
      hasMetaDescription: seoData.descriptionLength > 0,
      metaDescriptionLength: seoData.descriptionLength,
      metaDescription: seoData.description,
      hasH1: seoData.h1Count > 0,
      h1Count: seoData.h1Count,
      h1Text: seoData.h1Text,
      hasH2: seoData.h2Count > 0,
      h2Count: seoData.h2Count,
      hasRobotsTag: seoData.hasRobotsTag,
      hasCanonical: seoData.hasCanonical,
      hasStructuredData,
      hasOpenGraph: seoData.hasOpenGraph,
      hasTwitterCard: seoData.hasTwitterCard,
      hasSitemap,
      hasRobotsTxt
    }
  }

  /**
   * Analisi immagini migliorata
   */
  private async analyzeImages(page: Page): Promise<EnhancedWebsiteAnalysis['images']> {
    return await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      const totalImages = images.length
      let withoutAlt = 0
      let broken = 0
      let oversized = 0
      const formats = new Set<string>()
      
      images.forEach(img => {
        // Alt attribute
        if (!img.alt || img.alt.trim() === '') {
          withoutAlt++
        }
        
        // Broken images (basic check)
        if (!img.complete || img.naturalHeight === 0) {
          broken++
        }
        
        // Oversized (basic check - se width è molto più grande del display)
        if (img.naturalWidth > 2000) {
          oversized++
        }
        
        // Format detection
        const src = img.src || img.getAttribute('data-src') || ''
        const format = src.split('.').pop()?.toLowerCase()
        if (format) {
          formats.add(format)
        }
      })
      
      return {
        total: totalImages,
        withoutAlt,
        broken,
        oversized,
        averageSize: 0, // Difficult to calculate without network info
        formats: Array.from(formats)
      }
    })
  }

  /**
   * Analisi tracking migliorata con rilevamento robusto
   */
  private async analyzeTracking(page: Page, html: string): Promise<EnhancedWebsiteAnalysis['tracking']> {
    // Pattern più robusti per rilevamento
    const patterns = {
      googleAnalytics: [
        /gtag\(/i,
        /google-analytics\.com/i,
        /UA-\d+-\d+/i,
        /G-[A-Z0-9]+/i,
        /analytics\.js/i
      ],
      googleTagManager: [
        /googletagmanager\.com/i,
        /GTM-[A-Z0-9]+/i,
        /dataLayer/i
      ],
      facebookPixel: [
        /connect\.facebook\.net/i,
        /fbq\(/i,
        /facebook\.com\/tr/i,
        /_fbp/i
      ],
      googleAds: [
        /googleadservices\.com/i,
        /google\.com\/ads/i,
        /AW-\d+/i
      ],
      hotjar: [
        /static\.hotjar\.com/i,
        /hj\(/i
      ],
      clarity: [
        /clarity\.ms/i,
        /clarity\(/i
      ]
    }
    
    const results = {
      googleAnalytics: false,
      googleTagManager: false,
      facebookPixel: false,
      googleAdsConversion: false,
      hotjar: false,
      clarity: false,
      customPixels: [] as string[],
      trackingScore: 0
    }
    
    // Controlla ogni pattern
    for (const [key, patternList] of Object.entries(patterns)) {
      const found = patternList.some(pattern => pattern.test(html))
      if (found && key in results) {
        (results as any)[key] = true
      }
    }
    
    // Cerca script personalizzati
    const scriptMatches = html.match(/<script[^>]*src=["'][^"']*["'][^>]*>/gi) || []
    const customScripts = scriptMatches
      .filter(script => {
        const src = script.match(/src=["']([^"']+)["']/)?.[1] || ''
        return src && 
               !src.includes('google') && 
               !src.includes('facebook') && 
               !src.includes('hotjar') &&
               src.includes('track') || src.includes('analytic')
      })
      .map(script => script.match(/src=["']([^"']+)["']/)?.[1] || '')
      .filter(Boolean)
    
    results.customPixels = customScripts
    
    // Calcola punteggio tracking
    let score = 0
    if (results.googleAnalytics) score += 30
    if (results.googleTagManager) score += 25
    if (results.facebookPixel) score += 20
    if (results.googleAdsConversion) score += 15
    if (results.hotjar || results.clarity) score += 10
    
    results.trackingScore = Math.min(score, 100)
    
    return results
  }

  /**
   * Analisi GDPR e privacy
   */
  private async analyzeGDPR(page: Page, html: string): Promise<EnhancedWebsiteAnalysis['gdpr']> {
    const gdprData = await page.evaluate(() => {
      // Cookie banner detection
      const cookiePatterns = [
        'cookie', 'privacy', 'consent', 'gdpr', 'policy',
        'accetto', 'accetta', 'accept', 'continue'
      ]
      
      const allText = document.body.textContent?.toLowerCase() || ''
      const hasCookieBanner = cookiePatterns.some(pattern => 
        allText.includes(pattern) && (
          allText.includes('cookie') || 
          allText.includes('privacy') ||
          allText.includes('consent')
        )
      )
      
      // Privacy policy link
      const privacyLinks = Array.from(document.querySelectorAll('a'))
        .filter(link => {
          const text = link.textContent?.toLowerCase() || ''
          const href = link.href?.toLowerCase() || ''
          return text.includes('privacy') || 
                 text.includes('policy') ||
                 href.includes('privacy')
        })
      
      // Terms of service
      const termsLinks = Array.from(document.querySelectorAll('a'))
        .filter(link => {
          const text = link.textContent?.toLowerCase() || ''
          return text.includes('terms') || 
                 text.includes('conditions') ||
                 text.includes('termini')
        })
      
      // Contact info
      const hasContactInfo = /contact|contatt|email|phone|telefono/i.test(allText)
      
      return {
        hasCookieBanner,
        privacyPolicyUrl: privacyLinks[0]?.href,
        hasPrivacyPolicy: privacyLinks.length > 0,
        hasTermsOfService: termsLinks.length > 0,
        hasContactInfo
      }
    })
    
    // Ricerca P.IVA nel contenuto
    const contacts = this.contactParser.parseContacts(html)
    const hasVatNumber = contacts.vatNumbers.length > 0
    const hasBusinessAddress = contacts.addresses.length > 0
    
    // Calcola punteggio GDPR
    let gdprScore = 0
    if (gdprData.hasCookieBanner) gdprScore += 25
    if (gdprData.hasPrivacyPolicy) gdprScore += 25
    if (gdprData.hasTermsOfService) gdprScore += 15
    if (hasVatNumber) gdprScore += 20
    if (gdprData.hasContactInfo) gdprScore += 15
    
    return {
      ...gdprData,
      hasBusinessAddress,
      hasVatNumber,
      vatNumbers: contacts.vatNumbers,
      gdprScore
    }
  }

  /**
   * Analisi mobile compatibility migliorata
   */
  private async analyzeMobileCompatibility(page: Page): Promise<EnhancedWebsiteAnalysis['mobile']> {
    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(1000)
    
    const desktopMetrics = await page.evaluate(() => ({
      hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
      contentWidth: document.body.scrollWidth,
      windowWidth: window.innerWidth
    }))
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(2000) // Attendi adattamento layout
    
    const mobileMetrics = await page.evaluate(() => {
      // Controlla scroll orizzontale
      const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth
      
      // Controlla testo leggibile
      const paragraphs = Array.from(document.querySelectorAll('p, div, span'))
      const smallText = paragraphs.filter(el => {
        const style = window.getComputedStyle(el)
        const fontSize = parseInt(style.fontSize)
        return fontSize < 12
      })
      const textReadable = smallText.length < paragraphs.length * 0.3
      
      // Controlla target touch
      const clickables = Array.from(document.querySelectorAll('a, button, input[type="submit"]'))
      const smallTargets = clickables.filter(el => {
        const rect = el.getBoundingClientRect()
        return rect.width < 44 || rect.height < 44
      })
      const touchTargetsOk = smallTargets.length < clickables.length * 0.2
      
      // Cerca media queries CSS
      let hasResponsiveCss = false
      try {
        const stylesheets = Array.from(document.styleSheets)
        for (const sheet of stylesheets) {
          const rules = Array.from(sheet.cssRules || [])
          for (const rule of rules) {
            if (rule.type === CSSRule.MEDIA_RULE) {
              hasResponsiveCss = true
              break
            }
          }
          if (hasResponsiveCss) break
        }
      } catch (e) {
        // Ignore CORS errors
      }
      
      return {
        hasHorizontalScroll,
        textReadable,
        touchTargetsOk,
        hasResponsiveCss
      }
    })
    
    // Calcola punteggio mobile
    let mobileScore = 100
    if (!desktopMetrics.hasViewportMeta) mobileScore -= 25
    if (mobileMetrics.hasHorizontalScroll) mobileScore -= 20
    if (!mobileMetrics.textReadable) mobileScore -= 15
    if (!mobileMetrics.touchTargetsOk) mobileScore -= 15
    if (!mobileMetrics.hasResponsiveCss) mobileScore -= 25
    
    const isMobileFriendly = mobileScore >= 70
    
    return {
      isMobileFriendly,
      hasViewportMeta: desktopMetrics.hasViewportMeta,
      hasResponsiveCss: mobileMetrics.hasResponsiveCss,
      hasHorizontalScroll: mobileMetrics.hasHorizontalScroll,
      touchTargetsOk: mobileMetrics.touchTargetsOk,
      textReadable: mobileMetrics.textReadable,
      mobileScore: Math.max(0, mobileScore)
    }
  }

  /**
   * Analisi contenuto
   */
  private async analyzeContent(page: Page, html: string): Promise<EnhancedWebsiteAnalysis['content']> {
    const contacts = this.contactParser.parseContacts(html)
    
    const contentData = await page.evaluate(() => {
      const text = document.body.textContent || ''
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
      
      // Contact form
      const hasContactForm = !!document.querySelector('form input[type="email"], form input[name*="email"], form input[name*="contact"]')
      
      // Map embedded
      const hasMapEmbedded = !!document.querySelector('iframe[src*="maps.google"], iframe[src*="openstreetmap"]')
      
      // Business hours
      const hasBusinessHours = /\b(lun|mar|mer|gio|ven|sab|dom|mon|tue|wed|thu|fri|sat|sun)\b.*\b\d{1,2}:\d{2}\b/i.test(text)
      
      return {
        wordCount,
        hasContactForm,
        hasMapEmbedded,
        hasBusinessHours
      }
    })
    
    // Calcola punteggio contenuto
    let contentScore = 0
    if (contentData.wordCount > 200) contentScore += 20
    if (contentData.wordCount > 500) contentScore += 20
    if (contacts.phones.length > 0) contentScore += 15
    if (contacts.emails.length > 0) contentScore += 15
    if (contacts.socialMedia.length > 0) contentScore += 10
    if (contentData.hasContactForm) contentScore += 10
    if (contentData.hasMapEmbedded) contentScore += 5
    if (contentData.hasBusinessHours) contentScore += 5
    
    return {
      wordCount: contentData.wordCount,
      hasContactForm: contentData.hasContactForm,
      hasPhoneNumbers: contacts.phones.length > 0,
      phoneNumbers: contacts.phones,
      hasEmailAddresses: contacts.emails.length > 0,
      emailAddresses: contacts.emails,
      hasSocialLinks: contacts.socialMedia.length > 0,
      socialLinks: contacts.socialMedia,
      hasMapEmbedded: contentData.hasMapEmbedded,
      hasBusinessHours: contentData.hasBusinessHours,
      contentQualityScore: Math.min(contentScore, 100)
    }
  }

  /**
   * Identifica problemi tecnici
   */
  private identifyIssues(analysisData: any): EnhancedWebsiteAnalysis['issues'] {
    const issues = {
      critical: [] as string[],
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[]
    }
    
    // Critical issues
    if (!analysisData.seo.hasTitle) {
      issues.critical.push('Manca il tag title')
    }
    if (analysisData.performance.speedScore < 30) {
      issues.critical.push('Prestazioni molto scarse')
    }
    if (!analysisData.mobile.isMobileFriendly) {
      issues.critical.push('Non ottimizzato per mobile')
    }
    
    // High priority issues
    if (!analysisData.seo.hasMetaDescription) {
      issues.high.push('Manca la meta description')
    }
    if (!analysisData.tracking.googleAnalytics && !analysisData.tracking.googleTagManager) {
      issues.high.push('Nessun sistema di tracciamento installato')
    }
    if (!analysisData.gdpr.hasCookieBanner && analysisData.tracking.trackingScore > 0) {
      issues.high.push('Tracking senza consenso GDPR')
    }
    
    // Medium priority issues
    if (!analysisData.seo.hasH1) {
      issues.medium.push('Manca il tag H1')
    }
    if (analysisData.images.withoutAlt > 0) {
      issues.medium.push(`${analysisData.images.withoutAlt} immagini senza attributo alt`)
    }
    if (!analysisData.gdpr.hasPrivacyPolicy) {
      issues.medium.push('Manca la privacy policy')
    }
    
    // Low priority issues
    if (!analysisData.seo.hasSitemap) {
      issues.low.push('Sitemap non trovata')
    }
    if (!analysisData.seo.hasStructuredData) {
      issues.low.push('Mancano i dati strutturati')
    }
    
    return issues
  }

  /**
   * Identifica opportunità di business
   */
  private identifyOpportunities(analysisData: any, scores: any): EnhancedWebsiteAnalysis['opportunities'] {
    const neededServices: string[] = []
    const neededRoles: string[] = []
    let estimatedValue = 1
    const quickWins: string[] = []
    
    // Identifica servizi necessari e ruoli correlati
    if (scores.overallScore < 40) {
      neededServices.push('Redesign completo')
      neededRoles.push('designer', 'developer')
      estimatedValue = Math.max(estimatedValue, 8)
    }
    
    if (!analysisData.seo.hasTitle || !analysisData.seo.hasMetaDescription) {
      neededServices.push('Ottimizzazione SEO')
      neededRoles.push('seo', 'copywriter')
      estimatedValue = Math.max(estimatedValue, 6)
      quickWins.push('Aggiungere title e meta description')
    }
    
    if (analysisData.performance.speedScore < 60) {
      neededServices.push('Ottimizzazione performance')
      neededRoles.push('developer')
      estimatedValue = Math.max(estimatedValue, 5)
    }
    
    if (!analysisData.mobile.isMobileFriendly) {
      neededServices.push('Ottimizzazione mobile')
      neededRoles.push('designer', 'developer')
      estimatedValue = Math.max(estimatedValue, 7)
    }
    
    if (analysisData.tracking.trackingScore < 50) {
      neededServices.push('Setup analytics e tracking')
      neededRoles.push('adv', 'social')
      estimatedValue = Math.max(estimatedValue, 4)
      quickWins.push('Installare Google Analytics')
    }
    
    if (analysisData.gdpr.gdprScore < 70) {
      neededServices.push('Compliance GDPR')
      neededRoles.push('gdpr')
      estimatedValue = Math.max(estimatedValue, 3)
      quickWins.push('Aggiungere cookie banner')
    }
    
    if (analysisData.images?.withoutAlt > 2 || analysisData.images?.oversized > 0) {
      neededServices.push('Ottimizzazione immagini')
      neededRoles.push('photographer', 'developer')
      estimatedValue = Math.max(estimatedValue, 3)
      quickWins.push('Aggiungere alt text alle immagini')
    }
    
    // Determina priorità
    let priorityLevel: 'critical' | 'high' | 'medium' | 'low' = 'low'
    if (scores.overallScore < 30) priorityLevel = 'critical'
    else if (scores.overallScore < 50) priorityLevel = 'high'
    else if (scores.overallScore < 70) priorityLevel = 'medium'
    
    return {
      neededServices,
      neededRoles: [...new Set(neededRoles)], // Rimuovi duplicati
      priorityLevel,
      estimatedValue,
      quickWins
    }
  }

  /**
   * Calcola punteggi finali
   */
  private calculateScores(analysisData: any): Pick<EnhancedWebsiteAnalysis, 'overallScore' | 'businessValue' | 'technicalHealth'> {
    // Technical Health (media pesata di vari aspetti)
    const technicalHealth = Math.round(
      (analysisData.performance.speedScore * 0.3) +
      (analysisData.mobile.mobileScore * 0.25) +
      ((analysisData.seo.hasTitle && analysisData.seo.hasMetaDescription ? 80 : 40) * 0.2) +
      (analysisData.tracking.trackingScore * 0.15) +
      (analysisData.gdpr.gdprScore * 0.1)
    )
    
    // Business Value (quanto il sito è efficace per il business)
    const businessValue = Math.round(
      (analysisData.content.contentQualityScore * 0.3) +
      (analysisData.tracking.trackingScore * 0.25) +
      (analysisData.gdpr.gdprScore * 0.2) +
      (analysisData.mobile.mobileScore * 0.25)
    )
    
    // Overall Score (media dei due)
    const overallScore = Math.round((technicalHealth + businessValue) / 2)
    
    return {
      technicalHealth,
      businessValue,
      overallScore
    }
  }

  /**
   * Verifica sitemap
   */
  private async checkSitemap(page: Page): Promise<boolean> {
    try {
      const currentUrl = page.url()
      const baseUrl = new URL(currentUrl).origin
      const sitemapUrl = `${baseUrl}/sitemap.xml`
      
      const response = await page.goto(sitemapUrl, { timeout: 5000 })
      return response ? response.status() === 200 : false
    } catch {
      return false
    }
  }

  /**
   * Verifica robots.txt
   */
  private async checkRobotsTxt(page: Page): Promise<boolean> {
    try {
      const currentUrl = page.url()
      const baseUrl = new URL(currentUrl).origin
      const robotsUrl = `${baseUrl}/robots.txt`
      
      const response = await page.goto(robotsUrl, { timeout: 5000 })
      return response ? response.status() === 200 : false
    } catch {
      return false
    }
  }

  /**
   * Cleanup risorse - AGGIORNATO per BrowserManager
   */
  private async cleanup(): Promise<void> {
    // Il cleanup è gestito automaticamente dal BrowserManager
    await this.statusChecker.closeBrowser()
  }

  /**
   * Crea analisi fallita per siti non accessibili
   */
  private createFailedAnalysis(url: string, statusResult: any, startTime: number): EnhancedWebsiteAnalysis {
    return {
      url,
      finalUrl: statusResult.finalUrl || url,
      websiteStatus: statusResult.status,
      isAccessible: false,
      httpStatusCode: statusResult.httpCode,
      hasSSL: url.startsWith('https://'),
      sslValid: false,
      performance: this.performanceAnalyzer['getDefaultMetrics'](),
      seo: this.getDefaultSEO(),
      images: this.getDefaultImages(),
      tracking: this.getDefaultTracking(),
      gdpr: this.getDefaultGDPR(),
      mobile: this.getDefaultMobile(),
      techStack: this.getDefaultTechStack(),
      content: this.getDefaultContent(),
      issues: {
        critical: ['Sito non accessibile'],
        high: [],
        medium: [],
        low: []
      },
      opportunities: {
        neededServices: ['Riparazione sito web', 'Sviluppo nuovo sito'],
        neededRoles: ['developer', 'designer'],
        priorityLevel: 'critical',
        estimatedValue: 10,
        quickWins: []
      },
      overallScore: 0,
      businessValue: 0,
      technicalHealth: 0,
      analysisDate: new Date(),
      analysisTime: Date.now() - startTime,
      version: '2.0.0'
    }
  }

  /**
   * Crea analisi di errore
   */
  private createErrorAnalysis(url: string, error: any, startTime: number): EnhancedWebsiteAnalysis {
    return this.createFailedAnalysis(url, {
      finalUrl: url,
      status: 'offline',
      httpCode: 0
    }, startTime)
  }

  // Default values per sezioni in caso di errore
  private getDefaultSEO() {
    return {
      hasTitle: false,
      titleLength: 0,
      hasMetaDescription: false,
      metaDescriptionLength: 0,
      hasH1: false,
      h1Count: 0,
      hasH2: false,
      h2Count: 0,
      hasRobotsTag: false,
      hasCanonical: false,
      hasStructuredData: false,
      hasOpenGraph: false,
      hasTwitterCard: false,
      hasSitemap: false,
      hasRobotsTxt: false
    }
  }

  private getDefaultImages() {
    return {
      total: 0,
      withoutAlt: 0,
      broken: 0,
      oversized: 0,
      averageSize: 0,
      formats: []
    }
  }

  private getDefaultTracking() {
    return {
      googleAnalytics: false,
      googleTagManager: false,
      facebookPixel: false,
      googleAdsConversion: false,
      hotjar: false,
      clarity: false,
      customPixels: [],
      trackingScore: 0
    }
  }

  private getDefaultGDPR() {
    return {
      hasCookieBanner: false,
      hasPrivacyPolicy: false,
      hasTermsOfService: false,
      hasContactInfo: false,
      hasBusinessAddress: false,
      hasVatNumber: false,
      vatNumbers: [],
      gdprScore: 0
    }
  }

  private getDefaultMobile() {
    return {
      isMobileFriendly: false,
      hasViewportMeta: false,
      hasResponsiveCss: false,
      hasHorizontalScroll: true,
      touchTargetsOk: false,
      textReadable: false,
      mobileScore: 0
    }
  }

  private getDefaultTechStack() {
    return {
      cms: null,
      framework: null,
      ecommerce: null,
      analytics: [],
      hosting: null,
      cdn: null,
      languages: [],
      libraries: [],
      plugins: [],
      confidence: 0
    }
  }

  private getDefaultContent() {
    return {
      wordCount: 0,
      hasContactForm: false,
      hasPhoneNumbers: false,
      phoneNumbers: [],
      hasEmailAddresses: false,
      emailAddresses: [],
      hasSocialLinks: false,
      socialLinks: [],
      hasMapEmbedded: false,
      hasBusinessHours: false,
      contentQualityScore: 0
    }
  }
}
