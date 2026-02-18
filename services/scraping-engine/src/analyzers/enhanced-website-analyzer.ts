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
import type { AnalysisReliability } from '../types/LeadAnalysis'

// Nuovi analyzer integrati
import { SecurityAnalyzer, SecurityAnalysis } from './security-analyzer'
import { ContentQualityAnalyzer, ContentQualityAnalysis } from './content-quality-analyzer'
import { AccessibilityAnalyzer, AccessibilityAnalysis } from './accessibility-analyzer'

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
    // Nuovi pixel aggiunti
    tiktokPixel: boolean
    linkedInInsightTag: boolean
    snapchatPixel: boolean
    pinterestTag: boolean
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

  // Nuove analisi avanzate
  security?: SecurityAnalysis
  contentQuality?: ContentQualityAnalysis
  accessibility?: AccessibilityAnalysis

  // Overall Scores
  overallScore: number // 0-100
  businessValue: number // 0-100
  technicalHealth: number // 0-100

  // Analysis Reliability - indica quanto sono attendibili i risultati
  reliability?: AnalysisReliability

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
  // Nuovi analyzer
  private securityAnalyzer: SecurityAnalyzer
  private contentQualityAnalyzer: ContentQualityAnalyzer
  private accessibilityAnalyzer: AccessibilityAnalyzer

  constructor() {
    this.browserManager = BrowserManager.getInstance()
    this.statusChecker = new WebsiteStatusChecker()
    this.techDetector = new TechStackDetector()
    this.performanceAnalyzer = new PerformanceAnalyzer()
    this.contactParser = new BusinessContactParser()
    // Nuovi analyzer
    this.securityAnalyzer = new SecurityAnalyzer()
    this.contentQualityAnalyzer = new ContentQualityAnalyzer()
    this.accessibilityAnalyzer = new AccessibilityAnalyzer()
  }

  /**
   * Attesa intelligente per JS frameworks - sostituisce wait hardcoded
   * Rileva React, Vue, Angular, Next.js e attende hydration completa
   */
  private async waitForJSFrameworks(page: Page, maxWait = 10000): Promise<{ frameworkDetected: string | null, waitStrategy: string }> {
    const startTime = Date.now()

    // 1. Attendi che il documento sia completamente caricato
    try {
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: maxWait })
    } catch {
      // Timeout, procedi comunque
    }

    // 2. Rileva framework JavaScript
    const frameworkInfo = await page.evaluate(() => {
      // React
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector('[data-reactroot]') || document.querySelector('[data-react-root]')) {
        return { framework: 'react', needsHydration: true }
      }
      // Next.js (React-based SSR)
      if ((window as any).__NEXT_DATA__) {
        return { framework: 'nextjs', needsHydration: true }
      }
      // Vue
      if ((window as any).__VUE__ || document.querySelector('[data-v-]') || (window as any).Vue) {
        return { framework: 'vue', needsHydration: true }
      }
      // Nuxt (Vue-based SSR)
      if ((window as any).__NUXT__) {
        return { framework: 'nuxt', needsHydration: true }
      }
      // Angular
      if ((window as any).ng || document.querySelector('[ng-version]') || document.querySelector('[ng-app]')) {
        return { framework: 'angular', needsHydration: true }
      }
      // Svelte
      if (document.querySelector('[data-svelte-h]') || document.querySelector('.svelte-')) {
        return { framework: 'svelte', needsHydration: true }
      }
      return { framework: null, needsHydration: false }
    })

    let waitStrategy = 'standard'

    if (frameworkInfo.needsHydration) {
      waitStrategy = `${frameworkInfo.framework}-hydration`

      // Attendi hydration (2-3 secondi per framework SPA)
      const hydrationWait = Math.min(3000, maxWait - (Date.now() - startTime))
      if (hydrationWait > 0) {
        await page.waitForTimeout(hydrationWait)
      }

      // Attendi che non ci siano più richieste network pendenti
      try {
        const remainingTime = Math.max(2000, maxWait - (Date.now() - startTime))
        await page.waitForLoadState('networkidle', { timeout: remainingTime })
      } catch {
        // Timeout networkidle, procedi comunque
      }
    } else {
      // Sito tradizionale - attesa minima 1 secondo per JS asincrono
      const elapsed = Date.now() - startTime
      if (elapsed < 1000) {
        await page.waitForTimeout(1000 - elapsed)
      }
    }

    return {
      frameworkDetected: frameworkInfo.framework,
      waitStrategy
    }
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
        // Nuove analisi avanzate
        security: browserAnalysis.security,
        contentQuality: browserAnalysis.contentQuality,
        accessibility: browserAnalysis.accessibility,
        // Affidabilità analisi
        reliability: browserAnalysis.reliability,
        analysisDate: new Date(),
        analysisTime: Date.now() - startTime,
        version: '2.2.0'
      }
      
    } catch (error) {
      console.error(`❌ Errore durante analisi di ${url}:`, error)
      return this.createErrorAnalysis(url, error, startTime)
    } finally {
      await this.cleanup()
    }
  }

  /**
   * Analisi dettagliata con browser - versione migliorata con tracking affidabilità
   */
  private async performBrowserAnalysis(url: string): Promise<Partial<EnhancedWebsiteAnalysis> & { reliability?: AnalysisReliability }> {
    const browserId = `analyzer-${Date.now()}`;
    const analysisStartTime = Date.now()
    const { browser, context } = await this.browserManager.getBrowser(browserId);
    const page = await context.newPage();

    // Tracking affidabilità
    const failedModules: string[] = []
    const partialModules: string[] = []
    const warnings: string[] = []

    try {
      // Configura pagina
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
      await page.setViewportSize({ width: 1920, height: 1080 })

      // Carica pagina
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded', // Cambiato da networkidle per migliore affidabilità
        timeout: 30000
      })

      if (!response) {
        throw new Error('Impossibile caricare la pagina')
      }

      // Attendi rendering JS framework (sostituisce waitForTimeout hardcoded)
      const { frameworkDetected, waitStrategy } = await this.waitForJSFrameworks(page, 10000)

      // Raccogli HTML e metadata
      const htmlContent = await page.content()
      const pageTitle = await page.title()

      // Analisi parallele con tracking errori individuali
      const moduleResults = await Promise.allSettled([
        this.analyzeSEO(page, htmlContent),
        this.analyzeImages(page),
        this.analyzeTracking(page, htmlContent),
        this.analyzeGDPR(page, htmlContent),
        this.analyzeMobileCompatibility(page),
        this.analyzeContent(page, htmlContent),
        this.performanceAnalyzer.analyzePerformance(page, url),
        this.techDetector.detectTechStack(htmlContent, response.headers() as Record<string, string>),
        this.securityAnalyzer.analyzeSecurityFromHtml(url, htmlContent, response.headers() as Record<string, string>),
        this.contentQualityAnalyzer.analyzeContentQuality(page, url, htmlContent),
        this.accessibilityAnalyzer.analyzeAccessibility(page, url)
      ])

      // Estrai risultati con tracking fallimenti
      const moduleNames = ['seo', 'images', 'tracking', 'gdpr', 'mobile', 'content', 'performance', 'techStack', 'security', 'contentQuality', 'accessibility']

      const seoAnalysis = this.extractResultOrDefault(moduleResults[0], 'seo', this.getDefaultSEO(), failedModules, warnings)
      const imagesAnalysis = this.extractResultOrDefault(moduleResults[1], 'images', this.getDefaultImages(), failedModules, warnings)
      const trackingAnalysis = this.extractResultOrDefault(moduleResults[2], 'tracking', this.getDefaultTracking(), failedModules, warnings)
      const gdprAnalysis = this.extractResultOrDefault(moduleResults[3], 'gdpr', this.getDefaultGDPR(), failedModules, warnings)
      const mobileAnalysis = this.extractResultOrDefault(moduleResults[4], 'mobile', this.getDefaultMobile(), failedModules, warnings)
      const contentAnalysis = this.extractResultOrDefault(moduleResults[5], 'content', this.getDefaultContent(), failedModules, warnings)
      const performanceMetrics = this.extractResultOrDefault(moduleResults[6], 'performance', this.performanceAnalyzer['getDefaultMetrics'](), failedModules, warnings)
      const techStackInfo = this.extractResultOrDefault(moduleResults[7], 'techStack', this.getDefaultTechStack(), failedModules, warnings)
      const securityAnalysis = moduleResults[8].status === 'fulfilled' ? moduleResults[8].value : null
      const contentQualityAnalysis = moduleResults[9].status === 'fulfilled' ? moduleResults[9].value : null
      const accessibilityAnalysis = moduleResults[10].status === 'fulfilled' ? moduleResults[10].value : null

      // Moduli opzionali falliti (non critici)
      if (moduleResults[8].status === 'rejected') partialModules.push('security')
      if (moduleResults[9].status === 'rejected') partialModules.push('contentQuality')
      if (moduleResults[10].status === 'rejected') partialModules.push('accessibility')

      // Identifica problemi
      const issues = this.identifyIssues({
        seo: seoAnalysis,
        images: imagesAnalysis,
        tracking: trackingAnalysis,
        gdpr: gdprAnalysis,
        mobile: mobileAnalysis,
        performance: performanceMetrics,
        techStack: techStackInfo,
        security: securityAnalysis,
        contentQuality: contentQualityAnalysis,
        accessibility: accessibilityAnalysis
      })

      // Calcola confidence score
      const coreModulesCount = 8 // seo, images, tracking, gdpr, mobile, content, performance, techStack
      const coreModulesFailed = failedModules.filter(m =>
        ['seo', 'images', 'tracking', 'gdpr', 'mobile', 'content', 'performance', 'techStack'].includes(m)
      ).length
      const successRate = (coreModulesCount - coreModulesFailed) / coreModulesCount
      const overallConfidence = Math.round(successRate * 100)

      // Determina metodo di analisi
      let analysisMethod: 'full' | 'partial' | 'fallback' | 'unavailable' = 'full'
      if (coreModulesFailed === coreModulesCount) {
        analysisMethod = 'unavailable'
      } else if (coreModulesFailed >= 3) {
        analysisMethod = 'fallback'
      } else if (coreModulesFailed > 0 || partialModules.length > 0) {
        analysisMethod = 'partial'
      }

      // Costruisci oggetto reliability
      const reliability: AnalysisReliability = {
        overallConfidence,
        failedModules,
        partialModules,
        analysisMethod,
        warnings,
        timestamp: new Date().toISOString(),
        analysisDuration: Date.now() - analysisStartTime,
        frameworkDetected: frameworkDetected || undefined,
        pageLoadStrategy: waitStrategy
      }

      return {
        seo: seoAnalysis,
        images: imagesAnalysis,
        tracking: trackingAnalysis,
        gdpr: gdprAnalysis,
        mobile: mobileAnalysis,
        content: contentAnalysis,
        performance: performanceMetrics || this.performanceAnalyzer['getDefaultMetrics'](),
        techStack: techStackInfo,
        issues,
        security: securityAnalysis || undefined,
        contentQuality: contentQualityAnalysis || undefined,
        accessibility: accessibilityAnalysis || undefined,
        reliability
      }

    } finally {
      await page.close()
      await this.browserManager.releaseBrowser(browserId)
    }
  }

  /**
   * Helper per estrarre risultato da Promise.allSettled con tracking errori
   */
  private extractResultOrDefault<T>(
    result: PromiseSettledResult<T>,
    moduleName: string,
    defaultValue: T,
    failedModules: string[],
    warnings: string[]
  ): T {
    if (result.status === 'fulfilled') {
      return result.value
    }
    failedModules.push(moduleName)
    const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
    warnings.push(`Modulo ${moduleName} fallito: ${errorMsg.substring(0, 100)}`)
    return defaultValue
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

    // Verifica structured data con parsing JSON-LD MIGLIORATO
    const structuredDataResult = await this.analyzeStructuredData(page, html)

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
      hasStructuredData: structuredDataResult.hasStructuredData,
      hasOpenGraph: seoData.hasOpenGraph,
      hasTwitterCard: seoData.hasTwitterCard,
      hasSitemap,
      hasRobotsTxt
    }
  }

  /**
   * Analisi dettagliata Structured Data (JSON-LD, microdata)
   */
  private async analyzeStructuredData(page: Page, html: string): Promise<{
    hasStructuredData: boolean
    schemaCount: number
    schemaTypes: string[]
    hasLocalBusiness: boolean
    hasOrganization: boolean
    isValid: boolean
  }> {
    try {
      const result = await page.evaluate(() => {
        const details = {
          hasStructuredData: false,
          schemaCount: 0,
          schemaTypes: [] as string[],
          hasLocalBusiness: false,
          hasOrganization: false,
          isValid: true
        }

        // Cerca script JSON-LD
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')

        if (jsonLdScripts.length === 0) {
          // Fallback: cerca microdata
          const microdataElements = document.querySelectorAll('[itemscope]')
          if (microdataElements.length > 0) {
            details.hasStructuredData = true
            details.schemaCount = microdataElements.length
            microdataElements.forEach(el => {
              const itemtype = el.getAttribute('itemtype')
              if (itemtype) {
                const type = itemtype.split('/').pop() || ''
                if (type && !details.schemaTypes.includes(type)) {
                  details.schemaTypes.push(type)
                }
              }
            })
          }
          return details
        }

        details.hasStructuredData = true
        details.schemaCount = jsonLdScripts.length

        // Lista di tipi LocalBusiness e sottotipi
        const localBusinessTypes = [
          'LocalBusiness', 'Restaurant', 'Store', 'ProfessionalService',
          'HealthAndBeautyBusiness', 'LegalService', 'RealEstateAgent',
          'Dentist', 'Physician', 'Attorney', 'Hotel', 'Pharmacy',
          'BarOrPub', 'CafeOrCoffeeShop', 'FastFoodRestaurant',
          'Bakery', 'FoodEstablishment', 'AutoRepair', 'HairSalon',
          'BeautySalon', 'DaySpa', 'TattooParlor', 'NightClub'
        ]

        const organizationTypes = [
          'Organization', 'Corporation', 'NGO', 'EducationalOrganization',
          'GovernmentOrganization', 'MedicalOrganization', 'NewsMediaOrganization'
        ]

        jsonLdScripts.forEach((script) => {
          try {
            const content = script.textContent || ''
            const data = JSON.parse(content)

            // Funzione ricorsiva per estrarre @type
            const extractTypes = (obj: any): string[] => {
              const types: string[] = []

              if (!obj || typeof obj !== 'object') return types

              if (obj['@type']) {
                const typeValue = obj['@type']
                if (Array.isArray(typeValue)) {
                  types.push(...typeValue)
                } else {
                  types.push(typeValue)
                }
              }

              // Gestisci @graph (array di oggetti)
              if (obj['@graph'] && Array.isArray(obj['@graph'])) {
                obj['@graph'].forEach((item: any) => {
                  types.push(...extractTypes(item))
                })
              }

              return types
            }

            const types = extractTypes(data)
            types.forEach(type => {
              if (type && !details.schemaTypes.includes(type)) {
                details.schemaTypes.push(type)
              }

              // Verifica tipi specifici
              if (localBusinessTypes.includes(type)) {
                details.hasLocalBusiness = true
              }
              if (organizationTypes.includes(type)) {
                details.hasOrganization = true
              }
            })

          } catch (e) {
            // JSON non valido
            details.isValid = false
          }
        })

        return details
      })

      return result
    } catch (error) {
      // Fallback a regex semplice
      const hasStructuredData = /application\/ld\+json|itemscope/i.test(html)
      return {
        hasStructuredData,
        schemaCount: 0,
        schemaTypes: [],
        hasLocalBusiness: false,
        hasOrganization: false,
        isValid: false
      }
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
   * Include: GA4, GTM, Facebook, TikTok, LinkedIn, Snapchat, Pinterest
   * MIGLIORATO: Verifica anche dataLayer e oggetti window per rilevare GA4 via GTM
   */
  private async analyzeTracking(page: Page, html: string): Promise<EnhancedWebsiteAnalysis['tracking']> {
    // Pattern più robusti per rilevamento HTML
    const patterns = {
      googleAnalytics: [
        /gtag\s*\(/i,
        /google-analytics\.com/i,
        /googletagmanager\.com\/gtag\/js/i,
        /UA-\d{4,10}-\d{1,4}/i,
        /G-[A-Z0-9]{10,}/i,
        /analytics\.js/i,
        /gtag\/js\?id=/i,
        /__gaTracker/i,
        /GoogleAnalyticsObject/i
      ],
      googleTagManager: [
        /googletagmanager\.com\/gtm\.js/i,
        /GTM-[A-Z0-9]{6,}/i,
        /gtm\.start/i,
        /googletagmanager\.com\/ns\.html/i
      ],
      facebookPixel: [
        /connect\.facebook\.net.*fbevents/i,
        /fbq\s*\(/i,
        /facebook\.com\/tr/i,
        /_fbp/i,
        /pixel\.facebook\.com/i,
        /_fbc/i,
        /fbevents\.js/i,
        /fb-pixel/i,
        /facebook\.net\/en_US\/fbevents/i
      ],
      googleAds: [
        /googleadservices\.com/i,
        /google\.com\/ads/i,
        /AW-\d+/i,
        /conversion\.js/i,
        /gtag.*config.*AW-/i
      ],
      hotjar: [
        /static\.hotjar\.com/i,
        /hj\s*\(/i,
        /hotjar\.com\/c\/hotjar/i
      ],
      clarity: [
        /clarity\.ms/i,
        /clarity\s*\(/i,
        /microsoft\/clarity/i
      ],
      tiktokPixel: [
        /ttq\s*\(/i,
        /analytics\.tiktok\.com/i,
        /tiktok\.com\/i18n\/pixel/i,
        /TiktokAnalyticsObject/i
      ],
      linkedInInsightTag: [
        /snap\.licdn\.com/i,
        /linkedin\.com\/px/i,
        /linkedin\.com\/insight/i,
        /_linkedin_data_partner_id/i,
        /lintrk\s*\(/i
      ],
      snapchatPixel: [
        /sc-static\.net/i,
        /snaptr\s*\(/i,
        /tr\.snapchat\.com/i,
        /SnapchatPixel/i
      ],
      pinterestTag: [
        /pintrk\s*\(/i,
        /pinterest\.com\/tag/i,
        /ct\.pinterest\.com/i,
        /PinterestTag/i
      ]
    }

    const results = {
      googleAnalytics: false,
      googleTagManager: false,
      facebookPixel: false,
      googleAdsConversion: false,
      hotjar: false,
      clarity: false,
      tiktokPixel: false,
      linkedInInsightTag: false,
      snapchatPixel: false,
      pinterestTag: false,
      customPixels: [] as string[],
      trackingScore: 0
    }

    // Fase 1: Controlla pattern nell'HTML
    for (const [key, patternList] of Object.entries(patterns)) {
      const found = patternList.some(pattern => pattern.test(html))
      if (found && key in results) {
        (results as any)[key] = true
      }
    }

    // Fase 2: NUOVA - Verifica oggetti window e dataLayer per rilevamento più affidabile
    try {
      const windowTracking = await page.evaluate(() => {
        const w = window as any
        const tracking = {
          // Google Analytics - gtag o ga object
          hasGtag: typeof w.gtag === 'function',
          hasGa: typeof w.ga === 'function' || typeof w.GoogleAnalyticsObject === 'string',
          // Google Tag Manager - dataLayer
          hasDataLayer: Array.isArray(w.dataLayer),
          dataLayerHasGtm: Array.isArray(w.dataLayer) &&
            w.dataLayer.some((item: any) => item['gtm.start'] || item.event === 'gtm.js'),
          dataLayerHasGa: Array.isArray(w.dataLayer) &&
            w.dataLayer.some((item: any) =>
              item.event === 'gtm.load' ||
              (item[0] === 'config' && typeof item[1] === 'string' && /^G-|^UA-/.test(item[1]))
            ),
          // Facebook Pixel
          hasFbq: typeof w.fbq === 'function',
          hasFbPixelId: typeof w._fbp === 'string' || typeof w._fbc === 'string',
          // Hotjar
          hasHj: typeof w.hj === 'function',
          // Microsoft Clarity
          hasClarity: typeof w.clarity === 'function',
          // TikTok
          hasTtq: typeof w.ttq === 'object',
          // LinkedIn
          hasLintrk: typeof w.lintrk === 'function',
          // Pinterest
          hasPintrk: typeof w.pintrk === 'function'
        }
        return tracking
      })

      // Aggiorna risultati con rilevamento window object
      if (windowTracking.hasGtag || windowTracking.hasGa || windowTracking.dataLayerHasGa) {
        results.googleAnalytics = true
      }
      if (windowTracking.hasDataLayer && windowTracking.dataLayerHasGtm) {
        results.googleTagManager = true
      }
      if (windowTracking.hasFbq || windowTracking.hasFbPixelId) {
        results.facebookPixel = true
      }
      if (windowTracking.hasHj) {
        results.hotjar = true
      }
      if (windowTracking.hasClarity) {
        results.clarity = true
      }
      if (windowTracking.hasTtq) {
        results.tiktokPixel = true
      }
      if (windowTracking.hasLintrk) {
        results.linkedInInsightTag = true
      }
      if (windowTracking.hasPintrk) {
        results.pinterestTag = true
      }
    } catch (e) {
      // Errore nell'evaluate - usa solo rilevamento HTML
      console.warn('Tracking detection: window evaluate failed, using HTML-only detection')
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
               !src.includes('clarity') &&
               !src.includes('tiktok') &&
               !src.includes('linkedin') &&
               !src.includes('snapchat') &&
               !src.includes('pinterest') &&
               (src.includes('track') || src.includes('analytic') || src.includes('pixel'))
      })
      .map(script => script.match(/src=["']([^"']+)["']/)?.[1] || '')
      .filter(Boolean)

    results.customPixels = customScripts

    // Calcola punteggio tracking
    let score = 0
    if (results.googleAnalytics) score += 25
    if (results.googleTagManager) score += 20
    if (results.facebookPixel) score += 15
    if (results.googleAdsConversion) score += 10
    if (results.hotjar || results.clarity) score += 10
    if (results.tiktokPixel) score += 5
    if (results.linkedInInsightTag) score += 5
    if (results.snapchatPixel) score += 5
    if (results.pinterestTag) score += 5

    results.trackingScore = Math.min(score, 100)

    return results
  }

  /**
   * Analisi GDPR e privacy - MIGLIORATA con selettori DOM specifici
   */
  private async analyzeGDPR(page: Page, html: string): Promise<EnhancedWebsiteAnalysis['gdpr']> {
    const gdprData = await page.evaluate(() => {
      // Cookie banner detection MIGLIORATA - cerca elementi DOM specifici
      const cookieBannerSelectors = [
        // ID comuni
        '#cookie-banner', '#cookie-notice', '#cookie-consent',
        '#cookiebanner', '#cookie-law-info-bar', '#cookie-policy-banner',
        '#gdpr-banner', '#privacy-banner', '#consent-banner',
        '#CybotCookiebotDialog', '#onetrust-banner-sdk', '#onetrust-consent-sdk',
        '#cookieConsent', '#cookie_notice', '#cookie-popup',
        '#tarteaucitronRoot', '#cc-main', '#cc_div',
        // Classi comuni
        '.cookie-banner', '.cookie-notice', '.cookie-consent',
        '.cookieconsent', '.cookie-law-info-bar', '.cc-banner',
        '.gdpr-banner', '.privacy-banner', '.consent-banner',
        '.cookie-popup', '.cookie-modal', '.cookie-overlay',
        '.cc-window', '.cc-revoke', '.cc-compliance',
        // CMP comuni (Consent Management Platforms)
        '.iubenda-cs-container', '.iubenda-cs-visible',
        '.termly-cookie-banner', '.termly-consent-banner',
        '.cookiebot', '.CookieConsent',
        '.osano-cm-window', '.osano-cm-widget',
        '.quantcast-consent-banner', '.qc-cmp2-container',
        '.truste-consent-track', '.evidon-consent-button',
        // Data attributes
        '[data-cookie-banner]', '[data-consent-banner]',
        '[data-cookieconsent]', '[data-gdpr]',
        '[data-cc-banner]', '[data-cookie-notice]',
        '[role="dialog"][aria-label*="cookie"]',
        '[role="banner"][aria-label*="privacy"]'
      ]

      let hasCookieBannerElement = false
      let cookieBannerMethod: 'banner' | 'popup' | 'interstitial' | 'none' = 'none'

      // 1. Prima cerca elementi con selettori specifici
      for (const selector of cookieBannerSelectors) {
        try {
          const element = document.querySelector(selector)
          if (element) {
            // Verifica che l'elemento sia visibile
            const style = window.getComputedStyle(element)
            const rect = element.getBoundingClientRect()
            const isVisible = style.display !== 'none' &&
                             style.visibility !== 'hidden' &&
                             style.opacity !== '0' &&
                             rect.height > 0

            if (isVisible) {
              hasCookieBannerElement = true
              // Determina il tipo
              if (style.position === 'fixed') {
                if (rect.top <= 50) cookieBannerMethod = 'banner' // Top banner
                else if (rect.bottom >= window.innerHeight - 50) cookieBannerMethod = 'banner' // Bottom banner
                else cookieBannerMethod = 'popup'
              } else if (style.position === 'absolute' && rect.width > window.innerWidth * 0.8) {
                cookieBannerMethod = 'interstitial'
              } else {
                cookieBannerMethod = 'banner'
              }
              break
            }
          }
        } catch {
          // Ignora errori di selettori non validi
        }
      }

      // 2. Se non trovato con selettori, cerca elementi fixed con testo specifico
      if (!hasCookieBannerElement) {
        const fixedElements = Array.from(document.querySelectorAll('*'))
        for (const el of fixedElements) {
          const style = window.getComputedStyle(el)
          if (style.position === 'fixed' || style.position === 'sticky') {
            const text = el.textContent?.toLowerCase() || ''
            // Richiede sia "cookie" E un'azione di consenso
            if (
              (text.includes('cookie') || text.includes('privacy')) &&
              (text.includes('accett') || text.includes('accept') ||
               text.includes('consent') || text.includes('rifiut') ||
               text.includes('reject') || text.includes('preferenz') ||
               text.includes('preference') || text.includes('agree'))
            ) {
              hasCookieBannerElement = true
              const rect = el.getBoundingClientRect()
              cookieBannerMethod = rect.height > 200 ? 'popup' : 'banner'
              break
            }
          }
        }
      }

      const hasCookieBanner = hasCookieBannerElement
      
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
      const bodyText = document.body?.textContent || ''
      const hasContactInfo = /contact|contatt|email|phone|telefono/i.test(bodyText)
      
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

    // Security issues (nuovi analyzer)
    if (analysisData.security) {
      if (analysisData.security.overallSecurityScore < 30) {
        issues.critical.push('Gravi problemi di sicurezza')
      } else if (analysisData.security.overallSecurityScore < 50) {
        issues.high.push('Security headers mancanti o insufficienti')
      }
      if (analysisData.security.vulnerabilities?.hasOutdatedJquery) {
        issues.high.push('jQuery obsoleta con vulnerabilità note')
      }
      if (analysisData.security.vulnerabilities?.hasExposedSensitiveFiles) {
        issues.critical.push('File sensibili esposti (.git, .env, etc)')
      }
      if (analysisData.security.vulnerabilities?.hasMixedContent) {
        issues.medium.push('Mixed content (HTTP/HTTPS)')
      }
      if (analysisData.security.ssl?.daysToExpiry < 30) {
        issues.high.push(`Certificato SSL in scadenza (${analysisData.security.ssl.daysToExpiry} giorni)`)
      }
    }

    // Content Quality issues (nuovi analyzer)
    if (analysisData.contentQuality) {
      if (analysisData.contentQuality.contentScore < 30) {
        issues.high.push('Contenuti scarsi o non aggiornati')
      }
      if (analysisData.contentQuality.blog?.exists && analysisData.contentQuality.blog?.daysSinceUpdate > 180) {
        issues.medium.push(`Blog non aggiornato da ${analysisData.contentQuality.blog.daysSinceUpdate} giorni`)
      }
      if (analysisData.contentQuality.freshness?.copyrightYear &&
          analysisData.contentQuality.freshness.copyrightYear < new Date().getFullYear() - 1) {
        issues.low.push('Copyright non aggiornato')
      }
    }

    // Accessibility issues (nuovi analyzer)
    if (analysisData.accessibility) {
      if (analysisData.accessibility.wcagScore < 40) {
        issues.high.push('Gravi problemi di accessibilità (WCAG)')
      } else if (analysisData.accessibility.wcagScore < 60) {
        issues.medium.push('Accessibilità da migliorare')
      }
      if (analysisData.accessibility.images?.withoutAlt > 5) {
        issues.medium.push(`${analysisData.accessibility.images.withoutAlt} immagini senza alt text`)
      }
      if (analysisData.accessibility.structure?.headingHierarchyValid === false) {
        issues.low.push('Struttura heading non corretta (H1-H6)')
      }
      if (analysisData.accessibility.forms?.withoutLabels > 0) {
        issues.medium.push(`${analysisData.accessibility.forms.withoutLabels} campi form senza label`)
      }
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

    // Security opportunities (nuovi analyzer)
    if (analysisData.security) {
      if (analysisData.security.overallSecurityScore < 60) {
        neededServices.push('Audit sicurezza e hardening')
        neededRoles.push('developer', 'security')
        estimatedValue = Math.max(estimatedValue, 5)
      }
      if (analysisData.security.securityHeaders?.score < 50) {
        quickWins.push('Configurare security headers (CSP, HSTS)')
      }
      if (analysisData.security.vulnerabilities?.hasOutdatedJquery) {
        quickWins.push('Aggiornare jQuery alla versione più recente')
      }
    }

    // Content Quality opportunities (nuovi analyzer)
    if (analysisData.contentQuality) {
      if (analysisData.contentQuality.contentScore < 50) {
        neededServices.push('Content strategy e copywriting')
        neededRoles.push('copywriter', 'content')
        estimatedValue = Math.max(estimatedValue, 4)
      }
      if (!analysisData.contentQuality.blog?.exists) {
        quickWins.push('Creare sezione blog/news')
      } else if (analysisData.contentQuality.blog?.daysSinceUpdate > 90) {
        quickWins.push('Aggiornare contenuti blog')
      }
      if (!analysisData.contentQuality.depth?.hasTestimonials) {
        quickWins.push('Aggiungere testimonianze clienti')
      }
      if (!analysisData.contentQuality.depth?.hasCaseStudies) {
        quickWins.push('Creare case studies')
      }
    }

    // Accessibility opportunities (nuovi analyzer)
    if (analysisData.accessibility) {
      if (analysisData.accessibility.wcagScore < 70) {
        neededServices.push('Miglioramento accessibilità (WCAG)')
        neededRoles.push('developer', 'designer')
        estimatedValue = Math.max(estimatedValue, 4)
      }
      if (analysisData.accessibility.images?.withoutAlt > 0) {
        quickWins.push('Aggiungere alt text descrittivi alle immagini')
      }
      if (!analysisData.accessibility.structure?.hasSkipLink) {
        quickWins.push('Aggiungere skip link per navigazione')
      }
      if (analysisData.accessibility.forms?.withoutLabels > 0) {
        quickWins.push('Associare label ai campi form')
      }
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
   * Calcola punteggi finali (aggiornato con nuovi analyzer)
   */
  private calculateScores(analysisData: any): Pick<EnhancedWebsiteAnalysis, 'overallScore' | 'businessValue' | 'technicalHealth'> {
    // Security score (fallback a 50 se non disponibile)
    const securityScore = analysisData.security?.overallSecurityScore ?? 50

    // Accessibility score (fallback a 50 se non disponibile)
    const accessibilityScore = analysisData.accessibility?.wcagScore ?? 50

    // Content quality score from new analyzer (fallback a content score originale)
    const contentQualityScore = analysisData.contentQuality?.contentScore ??
                                 analysisData.content?.contentQualityScore ?? 50

    // Technical Health (media pesata di vari aspetti - aggiornata con security)
    const technicalHealth = Math.round(
      (analysisData.performance.speedScore * 0.25) +
      (analysisData.mobile.mobileScore * 0.20) +
      ((analysisData.seo.hasTitle && analysisData.seo.hasMetaDescription ? 80 : 40) * 0.15) +
      (analysisData.tracking.trackingScore * 0.10) +
      (analysisData.gdpr.gdprScore * 0.10) +
      (securityScore * 0.10) +
      (accessibilityScore * 0.10)
    )

    // Business Value (quanto il sito è efficace per il business - aggiornato con content quality)
    const businessValue = Math.round(
      (contentQualityScore * 0.25) +
      (analysisData.tracking.trackingScore * 0.20) +
      (analysisData.gdpr.gdprScore * 0.15) +
      (analysisData.mobile.mobileScore * 0.20) +
      (accessibilityScore * 0.10) +
      (securityScore * 0.10)
    )

    // Overall Score (media pesata dei punteggi)
    const overallScore = Math.round((technicalHealth * 0.6) + (businessValue * 0.4))

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
      tiktokPixel: false,
      linkedInInsightTag: false,
      snapchatPixel: false,
      pinterestTag: false,
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
