/**
 * Scraper Google Maps Enterprise con analisi tecnica avanzata
 * Gestisce redirect, parsing contatti preciso, rilevamento tech stack, SEO e performance
 * Integra EnhancedWebsiteAnalyzer per valutazione enterprise completa
 * Distingue correttamente telefoni/P.IVA, verifica SSL, mobile friendly, GDPR
 * Evita falsi negativi e genera opportunità di business accurate
 * 
 * Features avanzate:
 * - WebsiteStatusChecker per verifica accessibilità
 * - BusinessContactParser per parsing contatti italiani
 * - TechStackDetector per rilevamento CMS/framework
 * - PerformanceAnalyzer per Core Web Vitals
 * - Analisi SEO, immagini, tracking, GDPR completa
 * 
 * Utilizzato dal Google Maps Scraper per lead generation enterprise
 * Parte del modulo services/scraping-engine
 */

import { chromium, Browser, Page } from 'playwright'
import { BusinessLead, ScrapingResult, ContactInfo } from '../types/LeadAnalysis'
import { SiteAnalyzer } from '../analyzers/site-analyzer'
import { ContactParser } from '../utils/contact-parser'
import { EnhancedWebsiteAnalyzer } from '../analyzers/enhanced-website-analyzer'
import { BusinessContactParser } from '../utils/business-contact-parser'
import { WebsiteStatusChecker } from '../utils/website-status-checker'

export interface GoogleMapsScrapingOptions {
  query: string
  location: string
  category: string
  maxResults?: number
  delayBetweenRequests?: number
  enableSiteAnalysis?: boolean
}

export class GoogleMapsScraper {
  private browser: Browser | null = null
  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ]

  constructor() {}

  /**
   * Scraping principale da Google Maps
   */
  async scrape(options: GoogleMapsScrapingOptions): Promise<ScrapingResult> {
    const startTime = Date.now()
    console.log(`🔍 Avvio scraping Google Maps: "${options.query}" in ${options.location}`)

    try {
      await this.initBrowser()
      
      const businessData = await this.scrapeBusinesses(options)
      const leads = await this.processBusinessData(businessData, options)

      const totalAnalyzed = leads.filter(lead => lead.websiteAnalysis?.isAccessible).length
      const avgAnalysisTime = totalAnalyzed > 0 
        ? leads.reduce((sum, lead) => sum + (lead.websiteAnalysis?.analysisTime || 0), 0) / totalAnalyzed 
        : 0

      console.log(`✅ Scraping completato: ${leads.length} lead trovati, ${totalAnalyzed} siti analizzati`)

      return {
        success: true,
        leads,
        errors: [],
        totalFound: businessData.length,
        totalAnalyzed,
        avgAnalysisTime,
        source: 'google_maps',
        query: options.query,
        location: options.location
      }

    } catch (error) {
      console.error('❌ Errore durante scraping Google Maps:', error)
      return {
        success: false,
        leads: [],
        errors: [error instanceof Error ? error.message : 'Errore sconosciuto'],
        totalFound: 0,
        totalAnalyzed: 0,
        avgAnalysisTime: 0,
        source: 'google_maps',
        query: options.query,
        location: options.location
      }
    } finally {
      await this.closeBrowser()
    }
  }

  /**
   * Inizializza il browser con configurazioni ottimizzate
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Velocizza il caricamento
        '--disable-javascript', // Disabilita JS non necessario
      ]
    })
  }

  /**
   * Estrae i dati business da Google Maps
   */
  private async scrapeBusinesses(options: GoogleMapsScrapingOptions): Promise<RawBusinessData[]> {
    if (!this.browser) throw new Error('Browser non inizializzato')

    const page = await this.browser.newPage()
    
    // Configura user agent casuale e viewport
    await page.setExtraHTTPHeaders({
      'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
    })
    await page.setViewportSize({ width: 1366, height: 768 })

    try {
      // Costruisci l'URL di ricerca Google Maps
      const searchQuery = `${options.query} ${options.location}`
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`
      
      console.log(`🌐 Navigazione a: ${searchUrl}`)
      
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 20000 })
      await this.randomDelay(2000, 4000)

      // Accetta i cookie se richiesto
      await this.handleCookieConsent(page)

      // Attendi il caricamento dei risultati con selettori alternativi
      await this.waitForSearchResults(page)
      
      // Scroll per caricare più risultati
      await this.scrollToLoadResults(page, options.maxResults || 20)

      // Estrai i dati dei business
      const businesses = await this.extractBusinessData(page, options.maxResults || 20)
      
      console.log(`📊 Estratti ${businesses.length} business da Google Maps`)
      return businesses

    } catch (error) {
      console.error('Errore durante estrazione da Google Maps:', error)
      return []
    } finally {
      await page.close()
    }
  }

  /**
   * Gestisce il consenso cookie di Google
   */
  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      // Prova diversi selettori per il consenso aggiornati 2024
      const acceptSelectors = [
        '#L2AGLb', // Button "Accetto" standard di Google
        'button[jsname="V67aGc"]', // Altro button Google
        'button:has-text("Accept all")',
        'button:has-text("Accetta tutto")',
        'button:has-text("I agree")',
        'button:has-text("Accetto")',
        'button[aria-label*="Accept"]',
        'button[aria-label*="Accetto"]',
        '[data-value="accept"]',
        'button[data-testid="accept-all"]'
      ]
      
      for (const selector of acceptSelectors) {
        try {
          const button = await page.$(selector)
          if (button) {
            await button.click()
            console.log(`✓ Cookie consent gestito con: ${selector}`)
            await this.randomDelay(1000, 2000)
            return
          }
        } catch {}
      }
      
      console.log('ℹ️ Nessun cookie consent trovato')
    } catch (error) {
      console.log('⚠️ Errore gestione cookie consent:', error)
    }
  }

  /**
   * Attendi che i risultati di ricerca siano caricati
   */
  private async waitForSearchResults(page: Page): Promise<void> {
    const selectors = [
      'div[role="feed"]', // Container feed principale
      '[data-value="Search results"]',
      '[role="main"]',
      '.m6QErb', // Container risultati
      'a[href*="/maps/place/"]', // Link diretti ai luoghi
      '.Nv2PK' // Lista risultati
    ]
    
    let found = false
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 8000 })
        console.log(`✓ Trovato selettore risultati: ${selector}`)
        found = true
        break
      } catch (error) {
        console.log(`⚠️ Selettore non trovato: ${selector}`)
      }
    }
    
    if (!found) {
      console.log('⚠️ Nessun selettore specifico trovato, attendo caricamento generico...')
      await page.waitForTimeout(5000)
    }
  }

  /**
   * Scroll per caricare più risultati
   */
  private async scrollToLoadResults(page: Page, maxResults: number): Promise<void> {
    const scrollSelectors = [
      '[data-value="Search results"]',
      '[role="main"]',
      '.m6QErb'
    ]
    
    let scrollContainer = null
    for (const selector of scrollSelectors) {
      scrollContainer = await page.$(selector)
      if (scrollContainer) break
    }
    
    if (!scrollContainer) {
      console.log('⚠️ Container scroll non trovato, uso scroll pagina')
      // Fallback: scroll della pagina
      for (let i = 0; i < Math.min(maxResults / 5, 5); i++) {
        await page.evaluate(() => window.scrollBy(0, 1000))
        await this.randomDelay(1500, 3000)
      }
      return
    }
    
    // Scroll del container specifico
    for (let i = 0; i < Math.min(maxResults / 5, 10); i++) {
      await page.evaluate((selector) => {
        const container = document.querySelector(selector)
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      }, scrollSelectors[0])
      
      await this.randomDelay(1500, 3000)
    }
  }

  /**
   * Estrae i dati dei business dalla pagina
   */
  private async extractBusinessData(page: Page, maxResults: number): Promise<RawBusinessData[]> {
    const businesses: RawBusinessData[] = []

    try {
      // Selettori aggiornati per Google Maps 2024
      const resultSelectors = [
        'div[role="feed"] a[href*="/maps/place/"]', // Link nei feed
        'a[data-cid]', // Link con ID business
        '.hfpxzc', // Nuovo formato container risultati
        '.Nv2PK .TFQHme a', // Container con link
        '[jsaction*="pane.selectResult"]',
        'a[href*="/maps/place/"]' // Fallback generico
      ]
      
      let resultItems: any[] = []
      for (const selector of resultSelectors) {
        resultItems = await page.$$(selector)
        if (resultItems.length > 0) {
          console.log(`✓ Trovati ${resultItems.length} risultati con selettore: ${selector}`)
          break
        }
      }
      
      if (resultItems.length === 0) {
        console.log('⚠️ Nessun risultato trovato, provo estrazione diretta dal DOM...')
        // Estratto direttamente i titoli e link visibili
        const directResults = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'))
          return links.slice(0, 20).map(link => ({
            href: (link as HTMLAnchorElement).href,
            text: link.textContent?.trim() || ''
          }))
        })
        
        console.log(`Estrazione diretta: trovati ${directResults.length} link`)
        
        for (let i = 0; i < Math.min(directResults.length, maxResults); i++) {
          const result = directResults[i]
          
          try {
            // Naviga direttamente al link del business
            console.log(`🔗 Navigazione diretta a: ${result.text}`)
            await page.goto(result.href, { waitUntil: 'networkidle', timeout: 15000 })
            await this.randomDelay(2000, 4000)
            
            // Estrai le informazioni dal pannello dei dettagli
            const businessData = await this.extractBusinessDetails(page)
            
            if (businessData) {
              businesses.push(businessData)
              console.log(`✓ Estratto direttamente: ${businessData.name}`)
            }

            await this.randomDelay(1000, 2000)

          } catch (error) {
            console.log(`⚠️ Errore durante navigazione diretta ${i + 1}:`, error)
            continue
          }
        }
        
        return businesses
      }
      
      for (let i = 0; i < Math.min(resultItems.length, maxResults); i++) {
        const item = resultItems[i]
        
        try {
          // Clicca sul risultato per aprire i dettagli
          await item.click()
          await this.randomDelay(3000, 5000) // Più tempo per il caricamento
          
          // Estrai le informazioni dal pannello dei dettagli
          const businessData = await this.extractBusinessDetails(page)
          
          if (businessData) {
            businesses.push(businessData)
            console.log(`✓ Estratto: ${businessData.name}`)
          } else {
            console.log(`⚠️ Nessun dato estratto per business ${i + 1}`)
          }

          await this.randomDelay(1000, 2000)

        } catch (error) {
          console.log(`⚠️ Errore durante estrazione business ${i + 1}:`, error)
          continue
        }
      }

    } catch (error) {
      console.error('Errore durante estrazione lista business:', error)
    }

    return businesses
  }

  /**
   * Estrae i dettagli di un singolo business
   */
  private async extractBusinessDetails(page: Page): Promise<RawBusinessData | null> {
    try {
      // Attendi che il pannello dei dettagli sia caricato con selettori multipli
      const panelSelectors = [
        'div[role="main"]', // Pannello principale
        '[data-section-id="pane"]',
        '.m6QErb',
        '.TFQHme' // Container dettagli
      ]
      
      let panelFound = false
      for (const selector of panelSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 })
          panelFound = true
          console.log(`✓ Pannello trovato con: ${selector}`)
          break
        } catch {}
      }
      
      if (!panelFound) {
        console.log('⚠️ Pannello dettagli non trovato, provo estrazione diretta...')
      }
      
      // Estrai il nome con selettori aggiornati 2024
      const nameSelectors = [
        'h1[data-attrid="title"]', // Nuovo formato 2024
        'h1.DUwDvf',
        'h1.fontHeadlineLarge',
        '[data-section-id="pane"] h1',
        'h1',
        '.x3AX1-LfntMc-header-title',
        '.qrShPb h1'
      ]
      let name = ''
      for (const selector of nameSelectors) {
        try {
          name = await page.$eval(selector, el => el.textContent?.trim() || '')
          if (name && name !== 'Risultati' && name.length > 2) {
            console.log(`✓ Nome trovato con ${selector}: ${name}`)
            break
          }
        } catch {}
      }
      
      // Fallback per il nome - prendi dal titolo della pagina
      if (!name || name === 'Risultati') {
        try {
          const pageTitle = await page.title()
          const titleParts = pageTitle.split(' - Google Maps')
          if (titleParts.length > 0 && titleParts[0].trim()) {
            name = titleParts[0].trim()
            console.log(`✓ Nome da titolo pagina: ${name}`)
          }
        } catch {}
      }
      
      if (!name || name === 'Risultati') {
        console.log('⚠️ Nome business non trovato o generico')
        return null
      }

      // Estrai indirizzo con selettori aggiornati
      let address = ''
      const addressSelectors = [
        'button[data-item-id="address"] .fontBodyMedium',
        'button[data-item-id="address"]',
        '[data-item-id="address"] .Io6YTe',
        '.Io6YTe.fontBodyMedium',
        '.rogA2c .Io6YTe',
        'div[jsaction*="address"] span'
      ]
      for (const selector of addressSelectors) {
        try {
          address = await page.$eval(selector, el => el.textContent?.trim() || '')
          if (address) {
            console.log(`✓ Indirizzo trovato con ${selector}: ${address}`)
            break
          }
        } catch {}
      }
      
      // Estrai telefono con selettori aggiornati
      let phone = ''
      const phoneSelectors = [
        'button[data-item-id="phone:tel"] .fontBodyMedium',
        'button[data-item-id="phone:tel"]',
        'a[href^="tel:"]',
        'button[data-value*="+"]', // Numero con prefisso
        '[data-item-id*="phone"] .Io6YTe',
        '.Io6YTe[href^="tel:"]'
      ]
      for (const selector of phoneSelectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            const href = await element.getAttribute('href')
            if (href && href.startsWith('tel:')) {
              phone = href.replace('tel:', '')
            } else {
              phone = await element.textContent() || ''
            }
            phone = phone.trim()
            if (phone) {
              console.log(`✓ Telefono trovato con ${selector}: ${phone}`)
              break
            }
          }
        } catch {}
      }
      
      // Estrai sito web con selettori aggiornati
      let website = ''
      const websiteSelectors = [
        'a[data-item-id="authority"]',
        'a[href*="http"]:not([href*="google"]):not([href*="maps"])',
        'button[data-item-id="authority"] + a',
        '.CsEnBe a[href^="http"]',
        'a[data-value*="http"]'
      ]
      for (const selector of websiteSelectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            website = await element.getAttribute('href') || ''
            if (website && !website.includes('google.com') && !website.includes('maps') && website.startsWith('http')) {
              console.log(`✓ Website trovato con ${selector}: ${website}`)
              break
            }
          }
        } catch {}
      }
      
      // Estrai rating e recensioni con selettori aggiornati
      let rating = 0
      const ratingSelectors = ['.MW4etd', '.ceNzKf', 'span[role="img"][aria-label*="stelle"]']
      for (const selector of ratingSelectors) {
        try {
          const ratingText = await page.$eval(selector, el => {
            // Controlla se ha aria-label con stelle
            const ariaLabel = el.getAttribute('aria-label')
            if (ariaLabel && ariaLabel.includes('stelle')) {
              const match = ariaLabel.match(/(\d+(?:,\d+)?)\s*stelle/)
              return match ? match[1].replace(',', '.') : ''
            }
            return el.textContent?.trim() || ''
          })
          if (ratingText) {
            rating = parseFloat(ratingText.replace(',', '.')) || 0
            if (rating > 0) break
          }
        } catch {}
      }
      
      let reviewsCount = 0
      const reviewsSelectors = ['.UY7F9', '.RDApEe .UY7F9', 'button[jsaction*="review"] span']
      for (const selector of reviewsSelectors) {
        try {
          const reviewsText = await page.$eval(selector, el => el.textContent?.trim() || '')
          if (reviewsText) {
            reviewsCount = parseInt(reviewsText.replace(/\D/g, '')) || 0
            if (reviewsCount > 0) break
          }
        } catch {}
      }

      // Estrai categoria con selettori aggiornati
      let category = ''
      const categorySelectors = [
        '.DkEaL',
        'button[jsaction*="category"]',
        '.mgr77e .DkEaL', 
        '.uxVSng .DkEaL'
      ]
      for (const selector of categorySelectors) {
        try {
          category = await page.$eval(selector, el => el.textContent?.trim() || '')
          if (category) break
        } catch {}
      }

      console.log(`📊 Dati estratti: ${name}, phone: ${phone || 'N/A'}, website: ${website || 'N/A'}, address: ${address || 'N/A'}`)

      return {
        name,
        address,
        phone,
        website,
        rating,
        reviewsCount,
        category
      }

    } catch (error) {
      console.log('⚠️ Errore durante estrazione dettagli business:', error)
      return null
    }
  }

  /**
   * Processa i dati grezzi in lead strutturati
   */
  private async processBusinessData(
    rawData: RawBusinessData[], 
    options: GoogleMapsScrapingOptions
  ): Promise<BusinessLead[]> {
    const leads: BusinessLead[] = []

    for (const [index, business] of rawData.entries()) {
      console.log(`🔄 Processando business ${index + 1}/${rawData.length}: ${business.name}`)

      try {
        const lead = await this.createBusinessLead(business, options)
        if (lead) {
          leads.push(lead)
        }
        
        // Delay tra le analisi per evitare rate limiting
        if (options.delayBetweenRequests && index < rawData.length - 1) {
          await this.randomDelay(options.delayBetweenRequests, options.delayBetweenRequests * 1.5)
        }

      } catch (error) {
        console.error(`❌ Errore processando ${business.name}:`, error)
      }
    }

    return leads
  }

  /**
   * Crea un lead strutturato da dati grezzi
   */
  private async createBusinessLead(
    business: RawBusinessData, 
    options: GoogleMapsScrapingOptions
  ): Promise<BusinessLead | null> {
    
    // Estrai e normalizza i contatti con il nuovo parser avanzato
    const allText = `${business.name} ${business.address} ${business.phone}`
    const contactParser = new BusinessContactParser()
    const parsedContacts = contactParser.parseContacts(allText)
    
    const contacts: ContactInfo = {
      phone: parsedContacts.phones[0] || business.phone,
      email: parsedContacts.emails[0],
      website: business.website,
      address: business.address,
      partitaIva: parsedContacts.vatNumbers[0] // Usa vatNumbers invece di partiteIva
    }

    // Estrai città dall'indirizzo
    const city = this.extractCityFromAddress(business.address || options.location)

    let websiteAnalysis
    let opportunities: string[] = []
    let suggestedRoles: ('web-developer' | 'seo-specialist' | 'designer' | 'marketing-specialist' | 'legal-consultant')[] = []

    // Analizza il sito web se presente e richiesto
    if (business.website && options.enableSiteAnalysis !== false) {
      try {
        console.log(`🌐 Analizzando sito con analyzer enterprise: ${business.website}`)
        
        // Pre-check con WebsiteStatusChecker per verificare accessibilità
        const statusChecker = new WebsiteStatusChecker()
        const statusCheck = await statusChecker.checkWebsiteStatus(business.website)
        
        if (statusCheck.isAccessible) {
          websiteAnalysis = await this.analyzeEnhancedWebsite(business.website)
        } else {
          console.log(`⚠️ Sito non accessibile: ${statusCheck.errorMessage}`)
          websiteAnalysis = {
            url: business.website,
            isAccessible: false,
            status: statusCheck.status,
            error: statusCheck.errorMessage,
            overallScore: 10,
            issues: { 
              websiteNotAccessible: true,
              httpStatus: statusCheck.httpCode !== 200
            },
            analysisTime: 0
          }
        }
        
        // Genera opportunità e ruoli suggeriti basati sull'analisi
        const analysisResult = this.generateOpportunities(websiteAnalysis)
        opportunities = analysisResult.opportunities
        suggestedRoles = analysisResult.roles
        
      } catch (error) {
        console.log(`⚠️ Errore analisi sito ${business.website}:`, error)
        websiteAnalysis = {
          url: business.website,
          isAccessible: false,
          overallScore: 10,
          issues: { analysisError: true },
          analysisTime: 0
        }
      }
    } else if (!business.website) {
      opportunities.push('Nessun sito web presente')
      suggestedRoles.push('web-developer', 'designer')
    }

    // Calcola il punteggio del lead
    const score = this.calculateLeadScore(websiteAnalysis, contacts, business)
    const priority = score < 40 ? 'high' : score < 70 ? 'medium' : 'low'

    return {
      businessName: business.name,
      category: business.category || options.category,
      city,
      source: 'google_maps',
      contacts,
      websiteAnalysis,
      score,
      priority,
      opportunities,
      suggestedRoles,
      scrapedAt: new Date(),
      lastAnalyzed: websiteAnalysis ? new Date() : undefined
    }
  }

  /**
   * Analizza un sito web
   */
  /**
   * Analizza il sito web con l'analyzer enterprise avanzato
   */
  private async analyzeEnhancedWebsite(url: string): Promise<any> {
    try {
      const analyzer = new EnhancedWebsiteAnalyzer()
      const analysis = await analyzer.analyzeWebsite(url)
      return analysis
    } catch (error) {
      console.log(`⚠️ Timeout analisi sito ${url}, fallback ad analisi base`)
      
      // Fallback con l'analyzer originale
      if (!this.browser) throw new Error('Browser non inizializzato')

      const page = await this.browser.newPage()
      await page.setExtraHTTPHeaders({
        'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
      })
      
      try {
        const analyzer = new SiteAnalyzer(page)
        const analysis = await analyzer.analyzeSite(url)
        return analysis
      } catch (fallbackError) {
        console.log(`⚠️ Anche analisi base fallita per ${url}`)
        // Ritorna un'analisi di base invece di fallire
        return {
          url,
          isAccessible: false,
          httpStatus: 0,
          overallScore: 10,
          issues: { slowLoading: true, analysisTimeout: true },
          analysisTime: 0
        }
      } finally {
        await page.close()
      }
    }
  }

  /**
   * Analizza il sito web (metodo legacy mantenuto per compatibilità)
   */
  private async analyzeSite(url: string): Promise<any> {
    return this.analyzeEnhancedWebsite(url)
  }

  /**
   * Genera opportunità e ruoli suggeriti dall'analisi del sito (versione migliorata)
   */
  private generateOpportunities(analysis: any): {
    opportunities: string[]
    roles: ('web-developer' | 'seo-specialist' | 'designer' | 'marketing-specialist' | 'legal-consultant')[]
  } {
    const opportunities: string[] = []
    const roles: ('web-developer' | 'seo-specialist' | 'designer' | 'marketing-specialist' | 'legal-consultant')[] = []

    if (!analysis.isAccessible) {
      opportunities.push('Sito web non accessibile o non funzionante')
      roles.push('web-developer')
      return { opportunities, roles }
    }

    // Nuova struttura per analisi EnhancedWebsiteAnalyzer
    if (analysis.seo) {
      if (!analysis.seo.hasTitle) {
        opportunities.push('Manca il titolo della pagina')
        roles.push('seo-specialist')
      }
      if (!analysis.seo.hasMetaDescription) {
        opportunities.push('Manca la meta description')
        roles.push('seo-specialist')
      }
      if (!analysis.seo.hasH1) {
        opportunities.push('Struttura HTML non ottimizzata (manca H1)')
        roles.push('seo-specialist', 'web-developer')
      }
      if (!analysis.seo.hasStructuredData) {
        opportunities.push('Mancano i dati strutturati per SEO')
        roles.push('seo-specialist')
      }
      if (!analysis.seo.hasSitemap) {
        opportunities.push('Manca la sitemap XML')
        roles.push('seo-specialist', 'web-developer')
      }
    }

    // Problemi di performance
    if (analysis.performance) {
      if (analysis.performance.overallScore < 50) {
        opportunities.push('Performance del sito web scadente')
        roles.push('web-developer')
      }
      if (analysis.performance.loadTime > 3) {
        opportunities.push('Tempi di caricamento lenti')
        roles.push('web-developer')
      }
    }

    // Problemi immagini
    if (analysis.images) {
      if (analysis.images.withoutAlt > 0) {
        opportunities.push('Immagini senza attributo alt per accessibilità')
        roles.push('web-developer', 'designer')
      }
      if (analysis.images.broken > 0) {
        opportunities.push('Immagini rotte o non funzionanti')
        roles.push('web-developer', 'designer')
      }
    }

    // Problemi di tracking e analytics
    if (analysis.tracking) {
      if (analysis.tracking.trackingScore < 30) {
        opportunities.push('Strumenti di analisi mancanti o incompleti')
        roles.push('marketing-specialist')
      }
      if (!analysis.tracking.googleAnalytics) {
        opportunities.push('Manca Google Analytics')
        roles.push('marketing-specialist')
      }
      if (!analysis.tracking.facebookPixel) {
        opportunities.push('Manca Facebook Pixel')
        roles.push('marketing-specialist')
      }
    }

    // Problemi GDPR
    if (analysis.gdpr) {
      if (!analysis.gdpr.hasCookieConsent) {
        opportunities.push('Non conforme al GDPR (manca gestione cookie)')
        roles.push('legal-consultant', 'web-developer')
      }
      if (!analysis.gdpr.hasPrivacyPolicy) {
        opportunities.push('Manca la privacy policy')
        roles.push('legal-consultant')
      }
    }

    // Problemi mobile
    if (analysis.mobile && !analysis.mobile.isMobileFriendly) {
      opportunities.push('Sito non ottimizzato per dispositivi mobili')
      roles.push('web-developer', 'designer')
    }

    // Problemi tecnologici
    if (analysis.techStack) {
      if (analysis.techStack.outdatedTech.length > 0) {
        opportunities.push('Tecnologie obsolete da aggiornare')
        roles.push('web-developer')
      }
      if (!analysis.techStack.hasAnalytics) {
        opportunities.push('Mancano strumenti di analisi web')
        roles.push('marketing-specialist')
      }
    }

    // Fallback per analisi legacy
    if (analysis.issues) {
      if (analysis.issues.missingTitle) {
        opportunities.push('Manca il titolo della pagina')
        roles.push('seo-specialist')
      }
      if (analysis.issues.missingMetaDescription) {
        opportunities.push('Manca la meta description')
        roles.push('seo-specialist')
      }
      if (analysis.issues.missingH1) {
        opportunities.push('Struttura HTML non ottimizzata')
        roles.push('seo-specialist', 'web-developer')
      }
      if (analysis.issues.slowLoading) {
        opportunities.push('Sito web lento da caricare')
        roles.push('web-developer')
      }
      if (analysis.issues.brokenImages) {
        opportunities.push('Immagini rotte o non funzionanti')
        roles.push('web-developer', 'designer')
      }
      if (analysis.issues.noTracking) {
        opportunities.push('Mancano strumenti di analisi (Google Analytics, Facebook Pixel)')
        roles.push('marketing-specialist')
      }
      if (analysis.issues.noCookieConsent) {
        opportunities.push('Non conforme al GDPR (manca gestione cookie)')
        roles.push('legal-consultant', 'web-developer')
      }
      if (analysis.issues.missingPartitaIva) {
        opportunities.push('Partita IVA non visibile sul sito')
        roles.push('legal-consultant')
      }
      if (analysis.issues.noSocialPresence) {
        opportunities.push('Assenza sui social media')
        roles.push('marketing-specialist', 'designer')
      }
    }

    // Rimuovi duplicati
    const uniqueRoles = [...new Set(roles)]
    return { opportunities, roles: uniqueRoles }
  }

  /**
   * Calcola il punteggio del lead (più basso = migliore opportunità)
   */
  private calculateLeadScore(analysis: any, contacts: ContactInfo, business: RawBusinessData): number {
    let score = 100 // Inizia perfetto

    // Penalità per sito non accessibile
    if (!analysis?.isAccessible) {
      return 10 // Ottima opportunità se non ha sito
    }

    // Usa il punteggio dell'analisi enhanced se disponibile
    if (analysis?.overallScore !== undefined) {
      score = analysis.overallScore
    } else if (analysis?.seo?.overallScore !== undefined) {
      // Se abbiamo l'analisi enhanced, combina i punteggi
      let combinedScore = 0
      let components = 0
      
      if (analysis.seo?.overallScore !== undefined) {
        combinedScore += analysis.seo.overallScore
        components++
      }
      
      if (analysis.performance?.overallScore !== undefined) {
        combinedScore += analysis.performance.overallScore
        components++
      }
      
      if (analysis.tracking?.trackingScore !== undefined) {
        combinedScore += analysis.tracking.trackingScore
        components++
      }
      
      if (analysis.gdpr?.complianceScore !== undefined) {
        combinedScore += analysis.gdpr.complianceScore
        components++
      }
      
      if (components > 0) {
        score = combinedScore / components
      }
    }

    // Bonus per presenza di contatti
    if (contacts.phone) score += 5
    if (contacts.email) score += 5
    if (contacts.partitaIva) score += 5

    // Bonus per rating alto (meno problemi = meno opportunità)
    if (business.rating && business.rating > 4.5) score += 10
    if (business.reviewsCount && business.reviewsCount > 50) score += 5

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Estrae la città dall'indirizzo
   */
  private extractCityFromAddress(address: string): string {
    if (!address) return ''
    
    // Pattern per estrarre città da indirizzi italiani
    const parts = address.split(',')
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim()
    }
    
    return address.split(' ').pop() || ''
  }

  /**
   * Delay casuale tra richieste
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * Chiude il browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

interface RawBusinessData {
  name: string
  address?: string
  phone?: string
  website?: string
  rating?: number
  reviewsCount?: number
  category?: string
}
