// Questo file analizza i siti web per identificare problemi tecnici
// È parte del modulo services/scraping-engine
// Viene chiamato dall'orchestratore per ogni sito web scoperto durante lo scraping
// ⚠️ Aggiornare se si aggiungono nuovi controlli o si modifica il sistema di scoring

import { chromium, Browser, Page } from 'playwright'
import { Logger } from '../utils/logger'

export interface TechnicalAnalysis {
  url: string
  load_time: number
  status_code: number
  has_ssl: boolean
  meta_tags: {
    title?: string
    description?: string
    keywords?: string
  }
  h_tags: {
    h1: string[]
    h2: string[]
  }
  images: {
    total: number
    without_alt: number
    broken: number
  }
  tracking: {
    google_analytics: boolean
    google_tag_manager: boolean
    facebook_pixel: boolean
  }
  performance: {
    page_size: number
    requests_count: number
    speed_score: number
  }
  mobile_friendly: boolean
  // NEW FEATURES: Extended analysis fields
  email_analysis: {
    has_generic_email: boolean
    found_emails: string[]
  }
  footer_analysis: {
    has_old_year: boolean
    found_year?: number
    current_year: number
  }
  gdpr_compliance: {
    has_cookie_banner: boolean
    has_privacy_policy: boolean
    has_vat_number: boolean
    found_vat?: string
  }
  branding_consistency: {
    domain_social_mismatch: boolean
    social_links: string[]
  }
  cms_analysis: {
    is_wordpress: boolean
    uses_default_theme: boolean
    theme_name?: string
    uses_page_builder: boolean
  }
  content_quality: {
    has_generic_content: boolean
    has_stock_images: boolean
    content_length: number
  }
  // NEW FEATURE: Required professional roles
  needed_roles: string[]
  // Enhanced issues tracking
  issues: string[]
  overall_score: number
}

export class WebsiteAnalyzer {
  private logger: Logger
  private browser: Browser | null = null

  constructor() {
    this.logger = new Logger('WebAnalyzer')
  }

  async analyze(url: string): Promise<TechnicalAnalysis> {
    this.logger.debug(`🔍 Analisi sito: ${url}`)
    
    const startTime = Date.now()
    
    try {
      await this.initBrowser()
      const analysis = await this.performAnalysis(url)
      
      const duration = Date.now() - startTime
      const score = this.calculateScore(analysis)
      analysis.overall_score = score
      
      this.logger.debug(`✅ Analisi completata in ${duration}ms - Score: ${score}`)
      
      return analysis
      
    } catch (error) {
      this.logger.warn(`⚠️  Errore analisi ${url}:`, error)
      
      // Ritorna analisi base in caso di errore
      return this.getFailedAnalysis(url)
    } finally {
      await this.closeBrowser()
    }
  }

  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-images', // Velocizza il caricamento
          '--disable-plugins',
          '--disable-extensions',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ]
      })
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private async performAnalysis(url: string): Promise<TechnicalAnalysis> {
    if (!this.browser) throw new Error('Browser non inizializzato')

    const page = await this.browser.newPage()
    const analysis: TechnicalAnalysis = {
      url,
      load_time: 0,
      status_code: 0,
      has_ssl: url.startsWith('https://'),
      meta_tags: {},
      h_tags: { h1: [], h2: [] },
      images: { total: 0, without_alt: 0, broken: 0 },
      tracking: {
        google_analytics: false,
        google_tag_manager: false,
        facebook_pixel: false
      },
      performance: { page_size: 0, requests_count: 0, speed_score: 0 },
      mobile_friendly: false,
      // NEW FEATURES: Initialize extended analysis fields
      email_analysis: {
        has_generic_email: false,
        found_emails: []
      },
      footer_analysis: {
        has_old_year: false,
        current_year: new Date().getFullYear()
      },
      gdpr_compliance: {
        has_cookie_banner: false,
        has_privacy_policy: false,
        has_vat_number: false
      },
      branding_consistency: {
        domain_social_mismatch: false,
        social_links: []
      },
      cms_analysis: {
        is_wordpress: false,
        uses_default_theme: false,
        uses_page_builder: false
      },
      content_quality: {
        has_generic_content: false,
        has_stock_images: false,
        content_length: 0
      },
      needed_roles: [],
      issues: [],
      overall_score: 0
    }

    try {
      // Configura timeouts e headers
      page.setDefaultTimeout(15000)
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
      })

      // Misura tempo di caricamento
      const loadStart = Date.now()
      
      try {
        const response = await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 20000 
        })
        
        analysis.load_time = (Date.now() - loadStart) / 1000
        
        if (response) {
          analysis.status_code = response.status()
        }

        // Attendi che la pagina si stabilizzi
        await page.waitForLoadState('networkidle', { timeout: 8000 })

      } catch (error) {
        this.logger.warn(`⚠️  Errore caricamento pagina ${url}:`, error)
        analysis.status_code = 0
        analysis.load_time = 30 // Timeout
      }

      // Esegui tutte le analisi in parallelo per velocizzare
      const [metaTags, hTags, images, tracking, mobileFriendly, performance, emailAnalysis, footerAnalysis, gdprCompliance, brandingConsistency, cmsAnalysis, contentQuality] = await Promise.allSettled([
        this.extractMetaTags(page),
        this.extractHTags(page),
        this.analyzeImages(page),
        this.detectTracking(page),
        this.checkMobileFriendly(page),
        this.calculatePerformance(page, analysis.load_time),
        // NEW RULES: Extended analysis methods
        this.analyzeEmails(page),
        this.analyzeFooter(page),
        this.analyzeGdprCompliance(page),
        this.analyzeBrandingConsistency(page, url),
        this.analyzeCms(page),
        this.analyzeContentQuality(page)
      ])

      // Assegna i risultati gestendo i fallimenti
      analysis.meta_tags = metaTags.status === 'fulfilled' ? metaTags.value : {}
      analysis.h_tags = hTags.status === 'fulfilled' ? hTags.value : { h1: [], h2: [] }
      analysis.images = images.status === 'fulfilled' ? images.value : { total: 0, without_alt: 0, broken: 0 }
      analysis.tracking = tracking.status === 'fulfilled' ? tracking.value : { google_analytics: false, google_tag_manager: false, facebook_pixel: false }
      analysis.mobile_friendly = mobileFriendly.status === 'fulfilled' ? mobileFriendly.value : false
      analysis.performance = performance.status === 'fulfilled' ? performance.value : { page_size: 0, requests_count: 0, speed_score: 0 }
      
      // NEW RULES: Assign extended analysis results
      analysis.email_analysis = emailAnalysis.status === 'fulfilled' ? emailAnalysis.value : { has_generic_email: false, found_emails: [] }
      analysis.footer_analysis = footerAnalysis.status === 'fulfilled' ? footerAnalysis.value : { has_old_year: false, current_year: new Date().getFullYear() }
      analysis.gdpr_compliance = gdprCompliance.status === 'fulfilled' ? gdprCompliance.value : { has_cookie_banner: false, has_privacy_policy: false, has_vat_number: false }
      analysis.branding_consistency = brandingConsistency.status === 'fulfilled' ? brandingConsistency.value : { domain_social_mismatch: false, social_links: [] }
      analysis.cms_analysis = cmsAnalysis.status === 'fulfilled' ? cmsAnalysis.value : { is_wordpress: false, uses_default_theme: false, uses_page_builder: false }
      analysis.content_quality = contentQuality.status === 'fulfilled' ? contentQuality.value : { has_generic_content: false, has_stock_images: false, content_length: 0 }

      // NEW FEATURE: Infer needed professional roles
      analysis.needed_roles = this.inferNeededRoles(analysis)
      
      // NEW FEATURE: Collect all issues
      analysis.issues = this.collectIssues(analysis)

    } catch (error) {
      this.logger.warn(`⚠️  Errore durante analisi dettagliata di ${url}:`, error)
    } finally {
      await page.close()
    }

    return analysis
  }

  private async extractMetaTags(page: Page): Promise<{ title?: string; description?: string; keywords?: string }> {
    try {
      return await page.evaluate(() => {
        const title = document.querySelector('title')?.textContent?.trim()
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
        const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.trim()

        return {
          title: title || undefined,
          description: description || undefined,
          keywords: keywords || undefined
        }
      })
    } catch (error) {
      return {}
    }
  }

  private async extractHTags(page: Page): Promise<{ h1: string[]; h2: string[] }> {
    try {
      return await page.evaluate(() => {
        const h1Elements = Array.from(document.querySelectorAll('h1')) as HTMLElement[]
        const h2Elements = Array.from(document.querySelectorAll('h2')) as HTMLElement[]

        return {
          h1: h1Elements.map(el => el.textContent?.trim()).filter(Boolean) as string[],
          h2: h2Elements.map(el => el.textContent?.trim()).filter(Boolean) as string[]
        }
      })
    } catch (error) {
      return { h1: [], h2: [] }
    }
  }

  private async analyzeImages(page: Page): Promise<{ total: number; without_alt: number; broken: number }> {
    try {
      return await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[]
        const total = images.length
        const without_alt = images.filter(img => !img.alt || img.alt.trim() === '').length

        // Verifica immagini rotte
        const broken = images.filter(img => 
          img.naturalWidth === 0 && img.complete === true
        ).length

        return {
          total,
          without_alt,
          broken
        }
      })
    } catch (error) {
      return { total: 0, without_alt: 0, broken: 0 }
    }
  }

  private async detectTracking(page: Page): Promise<{ google_analytics: boolean; google_tag_manager: boolean; facebook_pixel: boolean }> {
    try {
      return await page.evaluate(() => {
        const html = document.documentElement.innerHTML.toLowerCase()
        const scripts = Array.from(document.querySelectorAll('script')) as HTMLScriptElement[]
        const scriptTexts = scripts.map(s => s.textContent?.toLowerCase() || '').join(' ')
        
        const allContent = (html + ' ' + scriptTexts).toLowerCase()
        
        return {
          google_analytics: allContent.includes('google-analytics') || 
                           allContent.includes('gtag') || 
                           allContent.includes('ga(') ||
                           allContent.includes('googletagmanager.com/gtag'),
          google_tag_manager: allContent.includes('googletagmanager') || 
                             allContent.includes('gtm') ||
                             allContent.includes('google-tag-manager'),
          facebook_pixel: allContent.includes('facebook') && allContent.includes('pixel') ||
                         allContent.includes('fbq(') ||
                         allContent.includes('connect.facebook.net')
        }
      })
    } catch (error) {
      return { google_analytics: false, google_tag_manager: false, facebook_pixel: false }
    }
  }

  private async checkMobileFriendly(page: Page): Promise<boolean> {
    try {
      return await page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]')
        const hasViewport = viewport && viewport.getAttribute('content')?.includes('width=device-width')
        
        // Verifica presenza di CSS responsive
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')) as HTMLElement[]
        const hasResponsiveCss = stylesheets.some(sheet => {
          const content = sheet.textContent || ''
          return content.includes('@media') || content.includes('max-width') || content.includes('min-width')
        })

        // Verifica Bootstrap o altri framework responsive
        const hasBootstrap = document.querySelector('.container, .container-fluid, .row, .col-') !== null

        return Boolean(hasViewport || hasResponsiveCss || hasBootstrap)
      })
    } catch (error) {
      return false
    }
  }

  private async calculatePerformance(page: Page, loadTime: number): Promise<{ page_size: number; requests_count: number; speed_score: number }> {
    try {
      const metrics = await page.evaluate(() => {
        try {
          const resourceEntries = performance.getEntriesByType('resource')
          const requestsCount = resourceEntries.length
          
          // Calcola dimensione pagina approssimativa
          const transferSizes = resourceEntries
            .map((entry: any) => entry.transferSize || entry.encodedBodySize || 0)
            .filter(size => size > 0)
          
          const pageSize = transferSizes.reduce((total, size) => total + size, 0)

          return {
            requests_count: requestsCount,
            page_size: pageSize
          }
        } catch (error) {
          return {
            requests_count: 0,
            page_size: 0
          }
        }
      })

      // Calcola speed score in base ai tempi di caricamento
      const speedScore = this.calculateSpeedScore(loadTime)

      return {
        page_size: metrics.page_size,
        requests_count: metrics.requests_count,
        speed_score: speedScore
      }
    } catch (error) {
      return {
        page_size: 0,
        requests_count: 0,
        speed_score: 50
      }
    }
  }

  private calculateSpeedScore(loadTime: number): number {
    // Score basato sui Core Web Vitals
    if (loadTime < 1.5) return 95 // Eccellente
    if (loadTime < 2.5) return 85 // Molto buono
    if (loadTime < 4.0) return 70 // Buono
    if (loadTime < 6.0) return 50 // Medio
    if (loadTime < 10.0) return 30 // Scarso
    return 10 // Pessimo
  }

  private calculateScore(analysis: TechnicalAnalysis): number {
    let score = 100

    // Penalità per problemi tecnici (sistema di scoring migliorato)
    if (analysis.status_code === 0) score -= 100 // Sito non raggiungibile
    else if (analysis.status_code !== 200) score -= 30 // Altri errori HTTP
    
    if (!analysis.has_ssl) score -= 15 // Mancanza HTTPS
    if (!analysis.meta_tags.title) score -= 20 // Mancanza title
    if (!analysis.meta_tags.description) score -= 15 // Mancanza description
    if (analysis.h_tags.h1.length === 0) score -= 12 // Mancanza H1
    if (analysis.h_tags.h1.length > 1) score -= 5 // Troppi H1
    
    // Penalità per immagini
    if (analysis.images.total > 0) {
      const altRatio = analysis.images.without_alt / analysis.images.total
      if (altRatio > 0.7) score -= 15 // Molte immagini senza alt
      else if (altRatio > 0.3) score -= 8
      
      if (analysis.images.broken > 0) score -= 12 // Immagini rotte
    }
    
    // Penalità per tracking mancante
    if (!analysis.tracking.google_analytics && !analysis.tracking.google_tag_manager) score -= 12
    if (!analysis.tracking.facebook_pixel) score -= 8
    
    // Penalità per performance
    if (analysis.load_time > 3) score -= 20
    else if (analysis.load_time > 2) score -= 10
    
    if (!analysis.mobile_friendly) score -= 15 // Non mobile friendly
    
    // NEW RULES: Extended scoring penalties
    
    // Email penalties
    if (analysis.email_analysis.has_generic_email) score -= 8 // Generic emails show weak branding
    
    // Footer penalties
    if (analysis.footer_analysis.has_old_year) score -= 10 // Outdated site maintenance
    
    // GDPR compliance penalties
    if (!analysis.gdpr_compliance.has_cookie_banner) score -= 12 // Missing GDPR compliance
    if (!analysis.gdpr_compliance.has_privacy_policy) score -= 8 // Missing privacy policy
    if (!analysis.gdpr_compliance.has_vat_number) score -= 5 // Missing business info
    
    // Branding consistency penalties
    if (analysis.branding_consistency.domain_social_mismatch) score -= 10 // Inconsistent branding
    if (analysis.branding_consistency.social_links.length === 0) score -= 8 // No social presence
    
    // CMS and technical penalties
    if (analysis.cms_analysis.uses_default_theme) score -= 15 // Default theme shows lack of customization
    if (analysis.cms_analysis.uses_page_builder) score -= 5 // Page builders can slow sites
    
    // Content quality penalties
    if (analysis.content_quality.has_generic_content) score -= 20 // Generic content is very bad
    if (analysis.content_quality.has_stock_images) score -= 8 // Stock images show lack of original content
    if (analysis.content_quality.content_length < 300) score -= 12 // Very little content
    
    // Bonus for performance eccellente
    if (analysis.performance.speed_score > 90) score += 5
    
    // Bonus for good GDPR compliance
    if (analysis.gdpr_compliance.has_cookie_banner && 
        analysis.gdpr_compliance.has_privacy_policy && 
        analysis.gdpr_compliance.has_vat_number) score += 3

    return Math.max(0, Math.min(100, score))
  }

  private getFailedAnalysis(url: string): TechnicalAnalysis {
    return {
      url,
      load_time: 0,
      status_code: 0,
      has_ssl: url.startsWith('https://'),
      meta_tags: {},
      h_tags: { h1: [], h2: [] },
      images: { total: 0, without_alt: 0, broken: 0 },
      tracking: {
        google_analytics: false,
        google_tag_manager: false,
        facebook_pixel: false
      },
      performance: { page_size: 0, requests_count: 0, speed_score: 0 },
      mobile_friendly: false,
      // NEW FEATURES: Initialize failed analysis extended fields
      email_analysis: {
        has_generic_email: false,
        found_emails: []
      },
      footer_analysis: {
        has_old_year: false,
        current_year: new Date().getFullYear()
      },
      gdpr_compliance: {
        has_cookie_banner: false,
        has_privacy_policy: false,
        has_vat_number: false
      },
      branding_consistency: {
        domain_social_mismatch: false,
        social_links: []
      },
      cms_analysis: {
        is_wordpress: false,
        uses_default_theme: false,
        uses_page_builder: false
      },
      content_quality: {
        has_generic_content: false,
        has_stock_images: false,
        content_length: 0
      },
      needed_roles: ['developer', 'designer', 'seo'], // Default roles for failed sites
      issues: ['Site not accessible', 'Technical issues detected'],
      overall_score: 0
    }
  }

  // =============================================
  // NEW RULES: Extended Analysis Methods
  // =============================================

  /**
   * NEW RULE: Analyzes email addresses found on the page
   */
  private async analyzeEmails(page: Page): Promise<{ has_generic_email: boolean; found_emails: string[] }> {
    try {
      return await page.evaluate(() => {
        const pageText = document.body.textContent || ''
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        const foundEmails = Array.from(new Set(pageText.match(emailRegex) || []))
        
        const genericEmails = ['info@', 'admin@', 'contact@', 'support@', 'hello@', 'mail@']
        const hasGenericEmail = foundEmails.some(email => 
          genericEmails.some(generic => email.toLowerCase().startsWith(generic))
        )

        return {
          has_generic_email: hasGenericEmail,
          found_emails: foundEmails
        }
      })
    } catch (error) {
      return { has_generic_email: false, found_emails: [] }
    }
  }

  /**
   * NEW RULE: Analyzes footer for old year/copyright
   */
  private async analyzeFooter(page: Page): Promise<{ has_old_year: boolean; found_year?: number; current_year: number }> {
    try {
      return await page.evaluate(() => {
        const currentYear = new Date().getFullYear()
        const footer = document.querySelector('footer')?.textContent || ''
        const pageText = document.body.textContent || ''
        
        // Cerca pattern di copyright
        const yearRegex = /(?:copyright|©|\(c\))\s*(\d{4})/gi
        const matches = [...footer.matchAll(yearRegex), ...pageText.matchAll(yearRegex)]
        
        if (matches.length > 0) {
          const foundYear = parseInt(matches[0][1])
          return {
            has_old_year: foundYear < currentYear - 2,
            found_year: foundYear,
            current_year: currentYear
          }
        }

        return { has_old_year: false, current_year: currentYear }
      })
    } catch (error) {
      return { has_old_year: false, current_year: new Date().getFullYear() }
    }
  }

  /**
   * NEW RULE: Analyzes GDPR compliance elements
   */
  private async analyzeGdprCompliance(page: Page): Promise<{ has_cookie_banner: boolean; has_privacy_policy: boolean; has_vat_number: boolean; found_vat?: string }> {
    try {
      return await page.evaluate(() => {
        const pageText = document.body.textContent || ''
        const pageHtml = document.body.innerHTML || ''
        
        // Cookie banner detection
        const cookieSelectors = [
          '[id*="cookie"]', '[class*="cookie"]', '[id*="gdpr"]', '[class*="gdpr"]',
          '[data-cookiebot]', '[data-iubenda]', '[data-cookieyes]'
        ]
        const hasCookieBanner = cookieSelectors.some(selector => 
          document.querySelector(selector) !== null
        )

        // Privacy policy detection
        const privacyLinks = document.querySelectorAll('a[href*="privacy"], a[href*="cookie"], a:contains("privacy")')
        const hasPrivacyPolicy = privacyLinks.length > 0 || /privacy policy|informativa privacy|cookie policy/i.test(pageText)

        // VAT number detection (Italian patterns)
        const vatRegex = /(?:P\.?\s*IVA|partita\s+iva|VAT)\s*:?\s*([A-Z]{2}[0-9]{11}|[0-9]{11})/gi
        const vatMatch = pageText.match(vatRegex)
        const hasVatNumber = vatMatch !== null

        return {
          has_cookie_banner: hasCookieBanner,
          has_privacy_policy: hasPrivacyPolicy,
          has_vat_number: hasVatNumber,
          found_vat: vatMatch ? vatMatch[0] : undefined
        }
      })
    } catch (error) {
      return { has_cookie_banner: false, has_privacy_policy: false, has_vat_number: false }
    }
  }

  /**
   * NEW RULE: Analyzes branding consistency between domain and social links
   */
  private async analyzeBrandingConsistency(page: Page, url: string): Promise<{ domain_social_mismatch: boolean; social_links: string[] }> {
    try {
      const domain = new URL(url).hostname.replace('www.', '').split('.')[0]
      
      return await page.evaluate((domainName) => {
        const socialSelectors = [
          'a[href*="facebook.com"]', 'a[href*="instagram.com"]', 
          'a[href*="twitter.com"]', 'a[href*="linkedin.com"]',
          'a[href*="youtube.com"]', 'a[href*="tiktok.com"]'
        ]
        
        const socialLinks: string[] = []
        let hasMismatch = false

        socialSelectors.forEach(selector => {
          const links = document.querySelectorAll(selector)
          links.forEach(link => {
            const href = (link as HTMLAnchorElement).href
            socialLinks.push(href)
            
            // Check if social handle matches domain
            const socialHandle = href.split('/').pop()?.toLowerCase()
            if (socialHandle && !socialHandle.includes(domainName.toLowerCase()) && 
                !domainName.toLowerCase().includes(socialHandle)) {
              hasMismatch = true
            }
          })
        })

        return {
          domain_social_mismatch: hasMismatch,
          social_links: [...new Set(socialLinks)]
        }
      }, domain)
    } catch (error) {
      return { domain_social_mismatch: false, social_links: [] }
    }
  }

  /**
   * NEW RULE: Analyzes CMS and theme usage
   */
  private async analyzeCms(page: Page): Promise<{ is_wordpress: boolean; uses_default_theme: boolean; theme_name?: string; uses_page_builder: boolean }> {
    try {
      return await page.evaluate(() => {
        const pageHtml = document.documentElement.innerHTML
        
        // WordPress detection
        const isWordPress = /wp-content|wp-includes|wordpress/i.test(pageHtml) ||
                           document.querySelector('meta[name="generator"][content*="WordPress"]') !== null

        // Default theme detection
        const defaultThemes = ['astra', 'hello-elementor', 'twentytwenty', 'twentyone', 'twentytwo', 'twentythree']
        let usesDefaultTheme = false
        let themeName: string | undefined

        if (isWordPress) {
          defaultThemes.forEach(theme => {
            if (pageHtml.includes(`themes/${theme}/`) || pageHtml.includes(`theme-${theme}`)) {
              usesDefaultTheme = true
              themeName = theme
            }
          })
        }

        // Page builder detection
        const pageBuilders = ['elementor', 'divi', 'beaver-builder', 'visual-composer', 'wpbakery']
        const usesPageBuilder = pageBuilders.some(builder => 
          pageHtml.includes(builder) || pageHtml.includes(`data-${builder}`)
        )

        return {
          is_wordpress: isWordPress,
          uses_default_theme: usesDefaultTheme,
          theme_name: themeName,
          uses_page_builder: usesPageBuilder
        }
      })
    } catch (error) {
      return { is_wordpress: false, uses_default_theme: false, uses_page_builder: false }
    }
  }

  /**
   * NEW RULE: Analyzes content quality
   */
  private async analyzeContentQuality(page: Page): Promise<{ has_generic_content: boolean; has_stock_images: boolean; content_length: number }> {
    try {
      return await page.evaluate(() => {
        const pageText = document.body.textContent || ''
        const contentLength = pageText.replace(/\s+/g, ' ').trim().length

        // Generic content detection
        const genericPhrases = [
          'lorem ipsum', 'placeholder text', 'sample text', 'default content',
          'coming soon', 'under construction', 'your content here'
        ]
        const hasGenericContent = genericPhrases.some(phrase => 
          pageText.toLowerCase().includes(phrase)
        )

        // Stock images detection (common stock photo domains)
        const images = document.querySelectorAll('img')
        const stockDomains = ['shutterstock', 'unsplash', 'pexels', 'pixabay', 'getty']
        let hasStockImages = false

        images.forEach(img => {
          const src = (img as HTMLImageElement).src.toLowerCase()
          if (stockDomains.some(domain => src.includes(domain))) {
            hasStockImages = true
          }
        })

        return {
          has_generic_content: hasGenericContent,
          has_stock_images: hasStockImages,
          content_length: contentLength
        }
      })
    } catch (error) {
      return { has_generic_content: false, has_stock_images: false, content_length: 0 }
    }
  }

  /**
   * NEW FEATURE: Infers needed professional roles based on analysis
   */
  private inferNeededRoles(analysis: TechnicalAnalysis): string[] {
    const roles: string[] = []

    // Designer needs
    if (analysis.cms_analysis.uses_default_theme || 
        analysis.content_quality.has_stock_images ||
        (!analysis.meta_tags.title || !analysis.meta_tags.description)) {
      roles.push('designer')
    }

    // Developer needs
    if (!analysis.has_ssl || 
        analysis.status_code >= 400 ||
        analysis.load_time > 3 ||
        analysis.cms_analysis.uses_page_builder ||
        !analysis.mobile_friendly) {
      roles.push('developer')
    }

    // SEO specialist needs
    if (!analysis.meta_tags.title || 
        !analysis.meta_tags.description ||
        analysis.h_tags.h1.length === 0 ||
        analysis.h_tags.h1.length > 1 ||
        analysis.images.without_alt > analysis.images.total * 0.5) {
      roles.push('seo')
    }

    // Copywriter needs
    if (analysis.content_quality.has_generic_content ||
        analysis.content_quality.content_length < 500 ||
        analysis.email_analysis.has_generic_email) {
      roles.push('copywriter')
    }

    // Photographer needs
    if (analysis.content_quality.has_stock_images ||
        analysis.images.broken > 0 ||
        analysis.images.total < 3) {
      roles.push('photographer')
    }

    // Digital marketing/advertising needs
    if (!analysis.tracking.google_analytics && 
        !analysis.tracking.google_tag_manager &&
        !analysis.tracking.facebook_pixel) {
      roles.push('adv')
    }

    // Social media manager needs
    if (analysis.branding_consistency.social_links.length === 0 ||
        analysis.branding_consistency.domain_social_mismatch) {
      roles.push('social')
    }

    // GDPR consultant needs
    if (!analysis.gdpr_compliance.has_cookie_banner ||
        !analysis.gdpr_compliance.has_privacy_policy ||
        !analysis.gdpr_compliance.has_vat_number) {
      roles.push('gdpr')
    }

    return [...new Set(roles)] // Remove duplicates
  }

  /**
   * NEW FEATURE: Collects all detected issues
   */
  private collectIssues(analysis: TechnicalAnalysis): string[] {
    const issues: string[] = []

    // SSL issues
    if (!analysis.has_ssl) issues.push('Missing HTTPS/SSL certificate')

    // SEO issues
    if (!analysis.meta_tags.title) issues.push('Missing page title')
    if (!analysis.meta_tags.description) issues.push('Missing meta description')
    if (analysis.h_tags.h1.length === 0) issues.push('Missing H1 tag')
    if (analysis.h_tags.h1.length > 1) issues.push('Multiple H1 tags detected')

    // Performance issues
    if (analysis.load_time > 3) issues.push('Slow page load time')
    if (!analysis.mobile_friendly) issues.push('Not mobile-friendly')

    // Content issues
    if (analysis.content_quality.has_generic_content) issues.push('Generic/placeholder content detected')
    if (analysis.content_quality.content_length < 300) issues.push('Very little content on page')

    // Image issues
    if (analysis.images.broken > 0) issues.push('Broken images detected')
    if (analysis.images.without_alt > analysis.images.total * 0.7) issues.push('Many images missing alt text')

    // Email issues
    if (analysis.email_analysis.has_generic_email) issues.push('Generic email addresses used')

    // Branding issues
    if (analysis.branding_consistency.domain_social_mismatch) issues.push('Inconsistent social media branding')

    // Technical issues
    if (analysis.cms_analysis.uses_default_theme) issues.push('Using default WordPress theme')
    if (analysis.footer_analysis.has_old_year) issues.push('Outdated copyright year in footer')

    // GDPR compliance issues
    if (!analysis.gdpr_compliance.has_cookie_banner) issues.push('Missing cookie consent banner')
    if (!analysis.gdpr_compliance.has_privacy_policy) issues.push('Missing privacy policy')
    if (!analysis.gdpr_compliance.has_vat_number) issues.push('Missing VAT number')

    // Tracking issues
    if (!analysis.tracking.google_analytics && !analysis.tracking.google_tag_manager) {
      issues.push('No analytics tracking detected')
    }

    return issues
  }
}
