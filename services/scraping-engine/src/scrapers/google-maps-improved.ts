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
import { RobustWebsiteAnalyzer } from '../utils/robust-website-analyzer'
import { getScrapingConfig, ScrapingConfig } from '../config/scraping-config'
import { scrapingMonitor, ScrapingMetrics } from '../utils/scraping-monitor'
// New utilities for enhanced scraping
import { AntiBanManager } from '../utils/anti-ban-manager'
import { DomainClassifier } from '../utils/domain-classifier'
import { GMBDetector, GMBStatus } from '../utils/gmb-detector'
import { EmailScraper, EmailScrapingResult } from '../utils/email-scraper'

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
  private config: ScrapingConfig
  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ]

  private enhancedAnalyzer: EnhancedWebsiteAnalyzer
  private contactParser: BusinessContactParser
  private statusChecker: WebsiteStatusChecker
  private robustAnalyzer: RobustWebsiteAnalyzer

  // New enhanced utilities
  private antiBanManager: AntiBanManager
  private domainClassifier: DomainClassifier
  private gmbDetector: GMBDetector
  private emailScraper: EmailScraper

  constructor() {
    this.config = getScrapingConfig()
    this.enhancedAnalyzer = new EnhancedWebsiteAnalyzer()
    this.contactParser = new BusinessContactParser()
    this.statusChecker = new WebsiteStatusChecker()
    this.robustAnalyzer = new RobustWebsiteAnalyzer()

    // Initialize enhanced utilities
    this.antiBanManager = new AntiBanManager()
    this.domainClassifier = new DomainClassifier()
    this.gmbDetector = new GMBDetector()
    this.emailScraper = new EmailScraper()
  }

  /**
   * Scraping principale da Google Maps con sistema di retry e monitoraggio
   */
  async scrape(options: GoogleMapsScrapingOptions): Promise<ScrapingResult> {
    const startTime = Date.now()
    console.log(`🔍 Avvio scraping Google Maps: "${options.query}" in ${options.location}`)

    let lastError: Error | null = null
    const maxRetries = this.config.retry.maxAttempts
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now()
      let browserInitTime: number | undefined
      let pageLoadTime: number | undefined
      
      try {
        if (attempt > 1) {
          console.log(`🔄 Tentativo ${attempt}/${maxRetries} dopo errore: ${lastError?.message}`)
          // Attesa progressiva tra i tentativi
          const delay = Math.min(
            this.config.retry.baseDelay * Math.pow(this.config.retry.timeoutMultiplier, attempt - 1),
            this.config.retry.maxDelay
          )
          await this.randomDelay(delay * 0.8, delay * 1.2)
        }
        
        const browserStartTime = Date.now()
        await this.initBrowser()
        browserInitTime = Date.now() - browserStartTime
        
        const pageStartTime = Date.now()
        const businessData = await this.scrapeBusinesses(options)
        pageLoadTime = Date.now() - pageStartTime
        
        const leads = await this.processBusinessData(businessData, options)

        const totalAnalyzed = leads.filter(lead => lead.websiteAnalysis?.isAccessible).length
        const avgAnalysisTime = totalAnalyzed > 0 
          ? leads.reduce((sum, lead) => sum + (lead.websiteAnalysis?.analysisTime || 0), 0) / totalAnalyzed 
          : 0

        console.log(`✅ Scraping completato: ${leads.length} lead trovati, ${totalAnalyzed} siti analizzati`)

        // Registra successo nel monitor
        scrapingMonitor.recordAttempt({
          timestamp: new Date(),
          attempt,
          success: true,
          timing: {
            browserInit: browserInitTime,
            pageLoad: pageLoadTime,
            totalDuration: Date.now() - attemptStartTime
          },
          config: {
            maxRetries,
            timeouts: this.config.pageLoad.strategies.map(s => s.timeout),
            strategy: 'multi-strategy'
          }
        })

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
        lastError = error instanceof Error ? error : new Error('Errore sconosciuto')
        console.error(`❌ Tentativo ${attempt} fallito:`, lastError.message)
        
        // Registra fallimento nel monitor
        scrapingMonitor.recordAttempt({
          timestamp: new Date(),
          attempt,
          success: false,
          error: lastError.message,
          timing: {
            browserInit: browserInitTime,
            pageLoad: pageLoadTime,
            totalDuration: Date.now() - attemptStartTime
          },
          config: {
            maxRetries,
            timeouts: this.config.pageLoad.strategies.map(s => s.timeout),
            strategy: 'multi-strategy'
          }
        })
        
        // Chiudi browser in caso di errore per liberare risorse
        await this.closeBrowser()
        
        // Se è l'ultimo tentativo, restituisci l'errore
        if (attempt === maxRetries) {
          break
        }
      }
    }

    console.error('❌ Errore durante scraping Google Maps:', lastError)
    
    // Mostra raccomandazioni se disponibili
    const recommendations = scrapingMonitor.getOptimizationRecommendations()
    if (recommendations.length > 0) {
      console.log('💡 Raccomandazioni per ottimizzare:', recommendations.join(', '))
    }
    
    return {
      success: false,
      leads: [],
      errors: [lastError?.message || 'Errore sconosciuto dopo multipli tentativi'],
      totalFound: 0,
      totalAnalyzed: 0,
      avgAnalysisTime: 0,
      source: 'google_maps',
      query: options.query,
      location: options.location
    }
  }

  /**
   * Inizializza il browser con configurazioni ottimizzate per stabilità
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return

    this.browser = await chromium.launch({
      headless: this.config.browser.headless,
      args: this.config.browser.args,
      timeout: this.config.browser.launchTimeout
    })
  }

  /**
   * Verifica la salute del browser e lo riavvia se necessario
   */
  private async ensureBrowserHealth(): Promise<void> {
    try {
      if (!this.browser || !this.browser.isConnected()) {
        console.log('🔄 Browser disconnesso, riavvio...')
        await this.closeBrowser()
        await this.initBrowser()
        return
      }

      // Test con pagina temporanea per verificare funzionalità
      const testPage = await this.browser.newPage()
      await testPage.goto('data:text/html,<html><body>test</body></html>', { 
        timeout: this.config.pageLoad.healthCheckTimeout 
      })
      await testPage.close()
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto'
      console.log('⚠️ Browser health check fallito, riavvio necessario:', errorMessage)
      await this.closeBrowser()
      await this.initBrowser()
    }
  }

  /**
   * Gestisce il caricamento di una pagina con strategia di fallback multipla
   */
  private async robustPageLoad(page: Page, url: string): Promise<void> {
    const strategies = this.config.pageLoad.strategies
    let lastError: Error | null = null

    for (const [index, strategy] of strategies.entries()) {
      try {
        console.log(`🌐 Strategia ${index + 1}: ${strategy.description}`)
        await page.goto(url, { 
          waitUntil: strategy.waitUntil as any, 
          timeout: strategy.timeout 
        })

        // Verifica che la pagina sia effettivamente caricata
        const isPageReady = await page.evaluate(() => {
          return document.readyState !== 'loading' && 
                 document.querySelector('body') !== null
        })

        if (isPageReady) {
          console.log(`✅ Caricamento riuscito con strategia: ${strategy.description}`)
          return
        }

      } catch (error) {
        lastError = error as Error
        const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto'
        console.log(`⚠️ Strategia ${index + 1} fallita: ${errorMessage}`)
        
        if (index < strategies.length - 1) {
          await this.randomDelay(
            this.config.pageLoad.contentWaitMin, 
            this.config.pageLoad.contentWaitMax
          )
        }
      }
    }

    throw new Error(`Tutte le strategie di caricamento fallite. Ultimo errore: ${lastError?.message}`)
  }

  /**
   * Estrae i dati business da Google Maps con gestione robusta degli errori
   */
  private async scrapeBusinesses(options: GoogleMapsScrapingOptions): Promise<RawBusinessData[]> {
    if (!this.browser) throw new Error('Browser non inizializzato')

    // Verifica salute del browser prima di procedere
    await this.ensureBrowserHealth()

    // Check anti-ban status before proceeding
    const antiBanStatus = this.antiBanManager.shouldWait()
    if (antiBanStatus.wait) {
      console.log(`⏳ Anti-ban: Attesa ${antiBanStatus.delayMs}ms - ${antiBanStatus.reason}`)
      await this.randomDelay(antiBanStatus.delayMs * 0.9, antiBanStatus.delayMs * 1.1)
    }

    const page = await this.browser.newPage()

    try {
      // Configura user agent casuale e viewport
      await page.setExtraHTTPHeaders({
        'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
      })
      await page.setViewportSize({ width: 1366, height: 768 })

      // Costruisci l'URL di ricerca Google Maps
      const searchQuery = `${options.query} ${options.location}`
      const searchUrl = `${this.config.googleMaps.baseUrl}${encodeURIComponent(searchQuery)}`

      console.log(`🌐 Navigazione a: ${searchUrl}`)

      // Usa il nuovo metodo robusto per il caricamento
      const loadStartTime = Date.now()
      await this.robustPageLoad(page, searchUrl)
      const loadTime = Date.now() - loadStartTime

      // Calculate dynamic delay based on response time
      const dynamicDelay = this.antiBanManager.calculateDynamicDelay(loadTime)
      console.log(`⏱️ Tempo caricamento: ${loadTime}ms, delay dinamico: ${dynamicDelay}ms`)
      await this.randomDelay(dynamicDelay * 0.8, dynamicDelay * 1.2)

      // Check for blocking signals after page load
      const blockingSignal = await this.antiBanManager.detectBlockingSignals(page)
      if (blockingSignal.blocked) {
        console.log(`🚫 Rilevato blocco: ${blockingSignal.reason} - attesa suggerita: ${blockingSignal.waitMs}ms`)
        this.antiBanManager.onFailure()
        throw new Error(`Blocked by Google: ${blockingSignal.reason}`)
      }

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

      // Detect Google My Business status
      let gmbStatus: GMBStatus | undefined
      try {
        gmbStatus = await this.gmbDetector.detectGMBStatus(page)
        console.log(`🏢 GMB Status: claimed=${gmbStatus.isClaimed}, owner=${gmbStatus.hasOwnerBadge}, completeness=${gmbStatus.profileCompleteness}%`)
      } catch (gmbError) {
        console.log('⚠️ Errore rilevamento GMB:', gmbError)
      }

      console.log(`📊 Dati estratti: ${name}, phone: ${phone || 'N/A'}, website: ${website || 'N/A'}, address: ${address || 'N/A'}`)

      return {
        name,
        address,
        phone,
        website,
        rating,
        reviewsCount,
        category,
        gmbStatus
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

      // Check anti-ban status before each business analysis
      const antiBanStatus = this.antiBanManager.shouldWait()
      if (antiBanStatus.wait) {
        console.log(`⏳ Anti-ban delay: ${antiBanStatus.delayMs}ms - ${antiBanStatus.reason}`)
        await this.randomDelay(antiBanStatus.delayMs * 0.9, antiBanStatus.delayMs * 1.1)
      }

      try {
        const lead = await this.createBusinessLead(business, options)
        if (lead) {
          leads.push(lead)
          // Record success for anti-ban manager
          this.antiBanManager.onSuccess()
        }

        // Dynamic delay between analyses based on anti-ban manager
        if (index < rawData.length - 1) {
          const baseDelay = options.delayBetweenRequests || 2000
          const dynamicDelay = this.antiBanManager.calculateDynamicDelay()
          const finalDelay = Math.max(baseDelay, dynamicDelay)
          await this.randomDelay(finalDelay * 0.8, finalDelay * 1.2)
        }

      } catch (error) {
        console.error(`❌ Errore processando ${business.name}:`, error)
        // Record error for anti-ban manager
        this.antiBanManager.onFailure()
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

    // Classify website URL to filter directories/listings
    let proprietaryWebsite = business.website
    let websiteClassification: ReturnType<typeof this.domainClassifier.classify> | null = null
    let socialProfileUrl: string | undefined = undefined
    let websiteSource: 'gmb' | 'google_search' | undefined = undefined

    // Estrai città in anticipo per la ricerca Google
    const city = this.extractCityFromAddress(business.address || options.location)

    if (business.website) {
      websiteClassification = this.domainClassifier.classify(business.website)
      if (!websiteClassification.isAcceptable) {
        console.log(`🚫 URL filtrato (${websiteClassification.type}): ${business.website} -> ${websiteClassification.listingName || websiteClassification.domain}`)

        // Salva il profilo social per riferimento
        if (websiteClassification.type === 'social') {
          socialProfileUrl = business.website
          console.log(`📱 Profilo social salvato: ${socialProfileUrl}`)
        }

        // Cerca il sito reale su Google
        console.log(`🔍 Cerco sito web reale per: ${business.name}`)
        const realWebsite = await this.searchRealWebsite(business.name, city)

        if (realWebsite) {
          console.log(`✅ Sito reale trovato via Google: ${realWebsite}`)
          proprietaryWebsite = realWebsite
          websiteSource = 'google_search'
        } else {
          console.log(`❌ Nessun sito reale trovato per: ${business.name}`)
          proprietaryWebsite = undefined
        }
      } else {
        console.log(`✅ URL proprietario confermato: ${business.website}`)
        websiteSource = 'gmb'
      }
    }

    const contacts: ContactInfo = {
      phone: parsedContacts.phones[0] || business.phone,
      email: parsedContacts.emails[0],
      website: proprietaryWebsite,
      address: business.address,
      partitaIva: parsedContacts.vatNumbers[0] // Usa vatNumbers invece di partiteIva
    }

    let websiteAnalysis
    let opportunities: string[] = []
    let suggestedRoles: string[] = []
    let scrapedEmails: EmailScrapingResult | undefined

    // If we have a proprietary website but no email, try to scrape emails
    if (proprietaryWebsite && !contacts.email && this.browser) {
      try {
        console.log(`📧 Tentativo estrazione email da: ${proprietaryWebsite}`)
        scrapedEmails = await this.emailScraper.scrapeEmails(proprietaryWebsite, this.browser)
        if (scrapedEmails.primaryEmail) {
          contacts.email = scrapedEmails.primaryEmail
          const primaryEmail = scrapedEmails.primaryEmail
          const primarySource = scrapedEmails.sources.find(s => s.email === primaryEmail)
          console.log(`✅ Email trovata: ${contacts.email} (fonte: ${primarySource?.context || 'unknown'})`)
        } else if (scrapedEmails.emails.length > 0) {
          contacts.email = scrapedEmails.emails[0]
          const firstEmail = scrapedEmails.emails[0]
          const source = scrapedEmails.sources.find(s => s.email === firstEmail)
          console.log(`✅ Email trovata: ${contacts.email} (fonte: ${source?.context || 'unknown'})`)
        } else {
          console.log(`⚠️ Nessuna email trovata su ${proprietaryWebsite}`)
        }
      } catch (emailError) {
        console.log(`⚠️ Errore estrazione email:`, emailError)
      }
    }

    // Analizza il sito web se presente e richiesto
    if (proprietaryWebsite && options.enableSiteAnalysis !== false) {
      try {
        console.log(`🌐 Analizzando sito con analyzer enterprise: ${proprietaryWebsite}`)

        // Pre-check con WebsiteStatusChecker per verificare accessibilità
        const statusChecker = new WebsiteStatusChecker()
        const statusCheck = await statusChecker.checkWebsiteStatus(proprietaryWebsite)
        
        if (statusCheck.isAccessible) {
          websiteAnalysis = await this.analyzeEnhancedWebsitePrivate(proprietaryWebsite)
        } else {
          console.log(`⚠️ Sito non accessibile: ${statusCheck.errorMessage}`)
          websiteAnalysis = {
            url: proprietaryWebsite,
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
        const analysisResult = this.generateOpportunitiesInternal(websiteAnalysis)
        opportunities = analysisResult.opportunities
        suggestedRoles = analysisResult.roles
        
      } catch (error) {
        console.log(`⚠️ Errore analisi sito ${proprietaryWebsite}:`, error)
        websiteAnalysis = {
          url: proprietaryWebsite,
          isAccessible: false,
          overallScore: 10,
          issues: { analysisError: true },
          analysisTime: 0,
          error: error instanceof Error ? error.message : 'Errore sconosciuto'
        }
        
        // Genera opportunità anche per analisi fallite
        const fallbackResult = this.generateOpportunitiesInternal(websiteAnalysis)
        opportunities = fallbackResult.opportunities
        suggestedRoles = fallbackResult.roles
      }
    } else if (!proprietaryWebsite) {
      if (business.website && websiteClassification && !websiteClassification.isAcceptable) {
        // URL was filtered as social/directory - key business opportunity
        const platformName = websiteClassification.listingName || websiteClassification.domain || 'social'
        opportunities.push(`Usa solo ${platformName} come presenza online - potenziale cliente per realizzazione sito web`)
        suggestedRoles.push('developer', 'designer')
      } else {
        // No website at all
        opportunities.push('Nessuna presenza web - opportunità creazione sito da zero')
        suggestedRoles.push('developer', 'designer')
      }
    }

    // Calcola il punteggio del lead
    const score = this.calculateLeadScore(websiteAnalysis, contacts, business)
    const priority = score < 40 ? 'high' : score < 70 ? 'medium' : 'low'

    // Build the lead object with GMB status and additional metadata
    const lead: BusinessLead = {
      businessName: business.name,
      category: business.category || options.category,
      city,
      source: 'google_maps',
      contacts,
      websiteAnalysis: websiteAnalysis || undefined,
      score,
      priority,
      opportunities,
      suggestedRoles: suggestedRoles as any, // Cast per retrocompatibilità
      scrapedAt: new Date(),
      lastAnalyzed: websiteAnalysis ? new Date() : undefined
    }

    // Add website source tracking metadata
    if (websiteSource) {
      ;(lead as any).websiteSource = websiteSource
    }
    if (socialProfileUrl) {
      ;(lead as any).socialProfileUrl = socialProfileUrl
      // Note: opportunity already added above when no proprietary website found
      // This just ensures social role is suggested for managing their social presence
      if (!suggestedRoles.includes('social')) {
        suggestedRoles.push('social')
      }
    }

    // Add GMB status to the lead if available
    if (business.gmbStatus) {
      ;(lead as any).gmbStatus = {
        isClaimed: business.gmbStatus.isClaimed,
        hasOwnerBadge: business.gmbStatus.hasOwnerBadge,
        profileCompleteness: business.gmbStatus.profileCompleteness,
        ownerResponseRate: business.gmbStatus.ownerResponseRate,
        hasClaimButton: business.gmbStatus.hasClaimButton
      }

      // Add GMB-related opportunities
      if (!business.gmbStatus.isClaimed && business.gmbStatus.hasClaimButton) {
        opportunities.push('Profilo Google My Business non rivendicato')
        if (!suggestedRoles.includes('social')) {
          suggestedRoles.push('social')
        }
      }
      if (business.gmbStatus.profileCompleteness < 70) {
        opportunities.push(`Profilo GMB incompleto (${business.gmbStatus.profileCompleteness}%)`)
      }
      if (business.gmbStatus.ownerResponseRate != null && business.gmbStatus.ownerResponseRate < 50) {
        opportunities.push('Basso tasso di risposta alle recensioni')
      }
    }

    // Add email scraping metadata if available
    if (scrapedEmails) {
      ;(lead as any).emailScrapingResult = {
        totalFound: scrapedEmails.emails.length,
        sources: scrapedEmails.sources.map(s => s.context),
        pagesScraped: scrapedEmails.scrapedPages
      }
    }

    // Add domain classification metadata if URL was analyzed
    if (websiteClassification) {
      ;(lead as any).domainClassification = {
        isAcceptable: websiteClassification.isAcceptable,
        type: websiteClassification.type,
        originalUrl: business.website,
        reason: websiteClassification.reason
      }
    }

    return lead
  }

  /**
   * Analizza un sito web
   */
  /**
   * Analizza il sito web con approccio robusto e fallback intelligenti
   * VERSIONE PUBBLICA per test
   */
  async analyzeEnhancedWebsite(url: string): Promise<any> {
    return this.analyzeEnhancedWebsitePrivate(url)
  }

  /**
   * Genera opportunità e ruoli suggeriti dall'analisi del sito
   * VERSIONE PUBBLICA per test - AGGIORNATO per ruoli italiani
   */
  generateOpportunities(analysis: any): {
    opportunities: string[]
    roles: string[]
  } {
    return this.generateOpportunitiesInternal(analysis)
  }

  /**
   * Analizza il sito web con approccio robusto e fallback intelligenti
   */
  private async analyzeEnhancedWebsitePrivate(url: string): Promise<any> {
    console.log(`🔎 Analisi sito con approccio robusto: ${url}`)
    
    try {
      // TENTATIVO 1: Analisi standard avanzata
      console.log(`✨ Tentativo analisi standard per: ${url}`)
      const standardAnalysis = await this.enhancedAnalyzer.analyzeWebsite(url)
      
      if (standardAnalysis && standardAnalysis.isAccessible) {
        console.log(`✅ Analisi standard riuscita per: ${url}`)
        return standardAnalysis
      }
      
      throw new Error('Analisi standard fallita')
      
    } catch (standardError) {
      console.log(`⚠️ Analisi standard fallita per ${url}:`, standardError)
      
      // TENTATIVO 2: Analisi robusta con fallback
      try {
        console.log(`🛡️ Passaggio ad analisi robusta per: ${url}`)
        
        if (!this.browser) {
          throw new Error('Browser non disponibile per analisi robusta')
        }
        
        const robustResult = await this.robustAnalyzer.analyzeRobustly(url, this.browser)
        
        // Converte il risultato robusto nel formato atteso
        const convertedAnalysis = this.convertRobustToStandardFormat(robustResult)
        
        console.log(`🎯 Analisi robusta completata per ${url} - Confidenza: ${robustResult.confidenceLevel}`)
        return convertedAnalysis
        
      } catch (robustError) {
        console.log(`💥 Anche analisi robusta fallita per ${url}:`, robustError)
        
        // FALLBACK FINALE: Analisi di emergenza
        return this.createEmergencyAnalysis(url, robustError)
      }
    }
  }

  /**
   * Converte risultato robusto nel formato standard atteso
   */
  private convertRobustToStandardFormat(robustResult: any): any {
    // CONTROLLO SICUREZZA: Verifica che robustResult esista
    if (!robustResult) {
      console.log('⚠️ RobustResult non disponibile, creo struttura base')
      return {
        url: 'unknown',
        finalUrl: 'unknown',
        isAccessible: false,
        httpStatus: 0,
        error: 'Risultato analisi robusta non disponibile',
        analysisTime: Date.now(),
        confidence: 'very-low',
        seo: { score: 10, hasTitle: false, hasMetaDescription: false, hasH1: false },
        performance: { score: 10, metrics: {} },
        privacy: { score: 10, issues: {} },
        overallScore: 10,
        issues: { analysisError: true, errorMessage: 'Risultato analisi robusta non disponibile' }
      }
    }

    const baseAnalysis = {
      url: robustResult.url || 'unknown',
      finalUrl: robustResult.finalUrl || robustResult.url || 'unknown',
      isAccessible: robustResult.isAccessible || false,
      httpStatus: robustResult.httpStatus || 0,
      error: robustResult.error,
      analysisTime: Date.now(),
      confidence: robustResult.confidenceLevel || 'low'
    }

    // Se abbiamo analisi avanzata, la usiamo
    if (robustResult.advanced) {
      return {
        ...baseAnalysis,
        seo: robustResult.advanced.seo || { score: 30, hasTitle: false, hasMetaDescription: false, hasH1: false },
        performance: robustResult.advanced.performance || { score: 30, metrics: {} },
        privacy: robustResult.advanced.privacy || { score: 30, issues: {} },
        techStack: robustResult.advanced.techStack || { frameworks: [], cms: null, hosting: null },
        mobile: robustResult.advanced.mobile || { isMobileFriendly: false, score: 30 },
        tracking: robustResult.advanced.tracking || { hasGoogleAnalytics: false, hasFacebookPixel: false },
        overallScore: this.calculateOverallScore(robustResult.advanced),
        issues: this.extractIssuesFromRobust(robustResult)
      }
    }

    // Se non abbiamo analisi avanzata, creiamo una struttura base
    return {
      ...baseAnalysis,
      seo: { 
        score: (robustResult.basicCheck && robustResult.basicCheck.ssl) ? 40 : 20, 
        hasTitle: false, 
        hasMetaDescription: false, 
        hasH1: false,
        issues: { missingTitle: true, missingMetaDescription: true }
      },
      performance: { 
        score: robustResult.isAccessible ? 40 : 10, 
        metrics: {},
        issues: { slowLoading: !robustResult.isAccessible }
      },
      privacy: { 
        score: (robustResult.basicCheck && robustResult.basicCheck.ssl) ? 50 : 20, 
        issues: { noSSL: !(robustResult.basicCheck && robustResult.basicCheck.ssl) }
      },
      overallScore: robustResult.isAccessible ? 30 : 10,
      issues: this.extractIssuesFromRobust(robustResult)
    }
  }

  /**
   * Calcola score generale dall'analisi avanzata
   */
  private calculateOverallScore(advanced: any): number {
    if (!advanced) return 20
    
    const scores = []
    if (advanced.seo?.score) scores.push(advanced.seo.score)
    if (advanced.performance?.score) scores.push(advanced.performance.score)
    if (advanced.privacy?.score) scores.push(advanced.privacy.score)
    
    if (scores.length === 0) return 30
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }

  /**
   * Estrae problemi dal risultato robusto
   */
  private extractIssuesFromRobust(robustResult: any): any {
    const issues: any = {}
    
    // CONTROLLO SICUREZZA: Verifica che robustResult esista
    if (!robustResult) {
      console.log('⚠️ RobustResult non disponibile per estrazione issues')
      return { analysisError: true, errorMessage: 'Risultato analisi robusta non disponibile' }
    }
    
    if (!robustResult.isAccessible) {
      issues.websiteNotAccessible = true
    }
    
    if (robustResult.error) {
      issues.analysisError = true
      issues.errorMessage = robustResult.error
    }
    
    // CONTROLLO SICUREZZA: Verifica che basicCheck esista
    if (robustResult.basicCheck && !robustResult.basicCheck.ssl) {
      issues.noSSL = true
    }
    
    // CONTROLLO SICUREZZA: Verifica che estimatedIssues esista e sia un array
    if (robustResult.estimatedIssues && Array.isArray(robustResult.estimatedIssues) && robustResult.estimatedIssues.length > 0) {
      issues.estimatedProblems = robustResult.estimatedIssues
    }
    
    // Aggiungi problemi dalle analisi avanzate se disponibili
    if (robustResult.advanced && robustResult.advanced.seo) {
      issues.missingTitle = !robustResult.advanced.seo.hasTitle
      issues.missingMetaDescription = !robustResult.advanced.seo.hasMetaDescription
      issues.missingH1 = !robustResult.advanced.seo.hasH1
    }
    
    return issues
  }

  /**
   * Crea analisi di emergenza quando tutto fallisce
   */
  private createEmergencyAnalysis(url: string, error: any): any {
    console.log(`🆘 Creazione analisi di emergenza per: ${url}`)
    
    return {
      url,
      finalUrl: url,
      isAccessible: false,
      httpStatus: 0,
      error: error instanceof Error ? error.message : 'Analisi completamente fallita',
      overallScore: 5, // Score molto basso per indicare problemi gravi
      confidence: 'low',
      seo: { 
        score: 10, 
        hasTitle: false, 
        hasMetaDescription: false, 
        hasH1: false,
        issues: { analysisImpossible: true }
      },
      performance: { 
        score: 10, 
        metrics: {},
        issues: { analysisImpossible: true }
      },
      privacy: { 
        score: 10, 
        issues: { analysisImpossible: true }
      },
      issues: {
        websiteNotAccessible: true,
        analysisError: true,
        emergencyAnalysis: true,
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      },
      analysisTime: Date.now()
    }
  }

  /**
   * Analizza il sito web (metodo legacy mantenuto per compatibilità)
   */
  private async analyzeSite(url: string): Promise<any> {
    return this.analyzeEnhancedWebsitePrivate(url)
  }

  /**
   * Genera opportunità e ruoli suggeriti dall'analisi del sito (versione interna) - AGGIORNATO per ruoli italiani
   */
  private generateOpportunitiesInternal(analysis: any): {
    opportunities: string[]
    roles: string[]
  } {
    const opportunities: string[] = []
    const roles: string[] = []

    // CONTROLLO SICUREZZA: Verifica che l'analisi esista
    if (!analysis) {
      console.log('⚠️ Analisi non disponibile, uso fallback per opportunità')
      opportunities.push('Necessaria analisi tecnica del sito web')
      opportunities.push('Verifica funzionamento e accessibilità sito')
      roles.push('developer', 'seo')
      return { opportunities, roles }
    }

    // DEBUG: Log struttura analisi per debugging
    console.log('🔍 Struttura analisi ricevuta:', {
      isAccessible: analysis.isAccessible,
      hasSSL: analysis.hasSSL,
      hasSEO: !!analysis.seo,
      hasPerformance: !!analysis.performance,
      hasImages: !!analysis.images,
      hasGDPR: !!analysis.gdpr,
      hasTracking: !!analysis.tracking,
      hasMobile: !!analysis.mobile,
      hasIssues: !!analysis.issues
    })

    // CONTROLLO SICUREZZA: Sito non accessibile o con errori
    if (analysis.isAccessible === false || analysis.error || analysis.issues?.analysisError) {
      opportunities.push('Sito web non accessibile o non funzionante')
      if (analysis.issues?.websiteNotAccessible) {
        opportunities.push('Necessaria riparazione o creazione nuovo sito')
      }
      if (analysis.issues?.httpStatus) {
        opportunities.push('Problemi di hosting o configurazione server')
      }
      roles.push('developer')
      return { opportunities, roles }
    }

    // Analisi SEO - LOGICA MIGLIORATA
    if (analysis.seo) {
      console.log('🔍 Analisi SEO dettagliata:', {
        hasTitle: analysis.seo.hasTitle,
        titleLength: analysis.seo.titleLength,
        hasMetaDescription: analysis.seo.hasMetaDescription,
        metaDescriptionLength: analysis.seo.metaDescriptionLength,
        hasH1: analysis.seo.hasH1,
        h1Count: analysis.seo.h1Count
      })

      // Solo se il titolo è veramente mancante o vuoto
      if (!analysis.seo.hasTitle || analysis.seo.titleLength === 0) {
        opportunities.push('Missing page title')
        roles.push('seo')
      }
      
      // Solo se la meta description è veramente mancante o vuota
      if (!analysis.seo.hasMetaDescription || analysis.seo.metaDescriptionLength === 0) {
        opportunities.push('Missing meta description')
        roles.push('seo')
      }
      
      // Solo se H1 è veramente mancante
      if (!analysis.seo.hasH1 || analysis.seo.h1Count === 0) {
        opportunities.push('Missing H1 tag')
        roles.push('seo', 'developer')
      }
      
      // Controlli aggiuntivi solo se mancanti
      if (!analysis.seo.hasStructuredData) {
        opportunities.push('Mancano i dati strutturati per SEO')
        roles.push('seo')
      }
      
      // Solo se titolo troppo corto o troppo lungo
      if (analysis.seo.hasTitle && (analysis.seo.titleLength < 10 || analysis.seo.titleLength > 60)) {
        opportunities.push('Titolo pagina da ottimizzare (lunghezza non ideale)')
        roles.push('seo')
      }
      
      // Solo se meta description troppo corta o troppo lunga
      if (analysis.seo.hasMetaDescription && (analysis.seo.metaDescriptionLength < 120 || analysis.seo.metaDescriptionLength > 160)) {
        opportunities.push('Meta description da ottimizzare (lunghezza non ideale)')
        roles.push('seo')
      }
    }

    // Problemi di performance - LOGICA MIGLIORATA
    if (analysis.performance) {
      console.log('🔍 Analisi Performance:', {
        overallScore: analysis.performance.overallScore,
        loadTime: analysis.performance.loadTime,
        score: analysis.performance.score
      })

      // Solo se la performance è realmente scadente
      if (analysis.performance.overallScore && analysis.performance.overallScore < 40) {
        opportunities.push('Slow page load time')
        roles.push('developer')
      }
      
      // Solo se il tempo di caricamento è realmente lento (> 4 secondi)
      if (analysis.performance.loadTime && analysis.performance.loadTime > 4000) {
        opportunities.push('Page load time optimization needed')
        roles.push('developer')
      }
    }

    // Problemi immagini - LOGICA MIGLIORATA
    if (analysis.images) {
      console.log('🔍 Analisi Immagini:', {
        total: analysis.images.total,
        withoutAlt: analysis.images.withoutAlt,
        broken: analysis.images.broken
      })

      // Solo se ci sono realmente immagini rotte
      if (analysis.images.broken && analysis.images.broken > 0) {
        opportunities.push('Broken images detected')
        roles.push('developer', 'designer')
      }
      
      // Solo se ci sono molte immagini senza alt (> 20% del totale)
      if (analysis.images.withoutAlt && analysis.images.total && 
          (analysis.images.withoutAlt / analysis.images.total) > 0.2) {
        opportunities.push('Images missing alt text for accessibility')
        roles.push('developer', 'designer')
      }
    }

    // Problemi di tracking e analytics - LOGICA MIGLIORATA
    if (analysis.tracking) {
      console.log('🔍 Analisi Tracking:', {
        hasGoogleAnalytics: analysis.tracking.hasGoogleAnalytics,
        hasFacebookPixel: analysis.tracking.hasFacebookPixel,
        trackingScore: analysis.tracking.trackingScore
      })

      // Solo se manca completamente Google Analytics
      if (!analysis.tracking.hasGoogleAnalytics) {
        opportunities.push('No analytics tracking detected')
        roles.push('social')
      }
      
      // Facebook Pixel è opzionale, suggeriamo solo se mancano entrambi
      if (!analysis.tracking.hasGoogleAnalytics && !analysis.tracking.hasFacebookPixel) {
        opportunities.push('Missing conversion tracking tools')
        roles.push('social')
      }
    }

    // Problemi GDPR - LOGICA MIGLIORATA
    if (analysis.gdpr) {
      console.log('🔍 Analisi GDPR:', {
        hasCookieConsent: analysis.gdpr.hasCookieConsent,
        hasPrivacyPolicy: analysis.gdpr.hasPrivacyPolicy
      })

      // Solo se manca completamente il consenso cookie
      if (!analysis.gdpr.hasCookieConsent) {
        opportunities.push('Missing cookie consent banner')
        roles.push('gdpr', 'developer')
      }
      
      // Solo se manca completamente la privacy policy
      if (!analysis.gdpr.hasPrivacyPolicy) {
        opportunities.push('Missing privacy policy')
        roles.push('gdpr')
      }
    }

    // Problemi mobile - LOGICA MIGLIORATA
    if (analysis.mobile) {
      console.log('🔍 Analisi Mobile:', {
        isMobileFriendly: analysis.mobile.isMobileFriendly,
        score: analysis.mobile.score
      })

      // Solo se il sito è veramente non mobile-friendly
      if (analysis.mobile.isMobileFriendly === false) {
        opportunities.push('Not mobile-friendly')
        roles.push('developer', 'designer')
      }
    }

    // Problemi tecnologici - LOGICA MIGLIORATA
    if (analysis.techStack) {
      console.log('🔍 Analisi Tech Stack:', {
        hasOutdatedTech: analysis.techStack.outdatedTech?.length > 0,
        hasAnalytics: analysis.techStack.hasAnalytics
      })

      // Solo se ci sono realmente tecnologie obsolete
      if (analysis.techStack.outdatedTech && analysis.techStack.outdatedTech.length > 0) {
        opportunities.push('Outdated technology detected')
        roles.push('developer')
      }
    }

    // Fallback per analisi legacy - SOLO se non abbiamo analisi enhanced
    if (!analysis.seo && !analysis.performance && analysis.issues) {
      console.log('🔍 Usando fallback legacy per issues:', analysis.issues)
      
      if (analysis.issues.missingTitle) {
        opportunities.push('Missing page title')
        roles.push('seo')
      }
      if (analysis.issues.missingMetaDescription) {
        opportunities.push('Missing meta description')
        roles.push('seo')
      }
      if (analysis.issues.missingH1) {
        opportunities.push('Missing H1 tag')
        roles.push('seo', 'developer')
      }
      if (analysis.issues.slowLoading) {
        opportunities.push('Slow page load time')
        roles.push('developer')
      }
      if (analysis.issues.brokenImages) {
        opportunities.push('Broken images detected')
        roles.push('developer', 'designer')
      }
      if (analysis.issues.noTracking) {
        opportunities.push('No analytics tracking detected')
        roles.push('social')
      }
      if (analysis.issues.noCookieConsent) {
        opportunities.push('Missing cookie consent banner')
        roles.push('gdpr', 'developer')
      }
      if (analysis.issues.missingPartitaIva) {
        opportunities.push('Missing VAT number')
        roles.push('gdpr')
      }
    }

    // SICUREZZA: Se non abbiamo trovato problemi reali, aggiungiamo solo opportunità generiche
    if (opportunities.length === 0) {
      console.log('✅ Sito web sembra ben strutturato, genero opportunità generiche')
      
      // Opportunità generiche per lead di qualità
      opportunities.push('Website analysis and optimization consultation')
      opportunities.push('Digital marketing strategy consultation')
      roles.push('seo-specialist', 'marketing-specialist')
    }

    // Rimuovi duplicati
    const uniqueOpportunities = [...new Set(opportunities)]
    const uniqueRoles = [...new Set(roles)]

    console.log(`📊 Opportunità generate: ${uniqueOpportunities.length}, Ruoli: ${uniqueRoles.length}`)
    console.log(`🎯 Opportunità: ${uniqueOpportunities.join(', ')}`)

    return { 
      opportunities: uniqueOpportunities, 
      roles: uniqueRoles 
    }
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

    // Indirizzi italiani: "Via X, numero, CAP Città PROVINCIA"
    // Es: "Via Salvo d'Acquisto, 4, 81031 Aversa CE"

    // Cerca pattern con CAP (5 cifre) seguito da città
    const capCityMatch = address.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ\s]+?)(?:\s+[A-Z]{2})?$/i)
    if (capCityMatch) {
      // Rimuovi eventuale sigla provincia (2 lettere maiuscole alla fine)
      const city = capCityMatch[2].trim().replace(/\s+[A-Z]{2}$/, '')
      if (city) return city
    }

    // Fallback: prova con l'ultima parte dopo la virgola (escludendo sigle provincia)
    const parts = address.split(',')
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].trim()
      // Se contiene un CAP, estrai la città dopo di esso
      const capMatch = lastPart.match(/\d{5}\s+(.+?)(?:\s+[A-Z]{2})?$/)
      if (capMatch) {
        return capMatch[1].trim().replace(/\s+[A-Z]{2}$/, '')
      }
      // Altrimenti usa la parte come città se non è un numero
      if (!/^\d+$/.test(lastPart)) {
        return lastPart.replace(/\s+[A-Z]{2}$/, '').trim()
      }
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
   * Cerca il sito web reale di un business tramite Google Search
   * Usato quando il profilo GMB linka a social media invece del sito proprietario
   * @param businessName - Nome del business
   * @param city - Città del business
   * @returns URL del sito web proprietario trovato, o null se non trovato
   */
  private async searchRealWebsite(businessName: string, city: string): Promise<string | null> {
    if (!this.browser) {
      console.log('⚠️ Browser non disponibile per ricerca sito web')
      return null
    }

    const query = `"${businessName}" "${city}" sito`
    console.log(`🔍 Ricerca Google per sito reale: ${query}`)

    let page: Page | null = null

    try {
      // Rate limiting: attendi 2-3 secondi prima della ricerca
      await this.randomDelay(2000, 3000)

      page = await this.browser.newPage()
      await page.setViewportSize({ width: 1280, height: 720 })

      // Imposta user agent per sembrare un browser normale
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7'
      })

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=it&gl=it`
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })

      // Gestisci cookie consent di Google
      const consentSelectors = [
        'button:has-text("Accetta tutto")',
        'button:has-text("Accept all")',
        '[aria-label*="Accept"]',
        '#L2AGLb',
        'button[id*="agree"]'
      ]
      for (const selector of consentSelectors) {
        try {
          const consentBtn = await page.$(selector)
          if (consentBtn) {
            await consentBtn.click()
            console.log(`✓ Cookie consent Google gestito`)
            await page.waitForTimeout(1000)
            break
          }
        } catch {}
      }

      // Verifica se c'è un CAPTCHA
      const hasCaptcha = await page.evaluate(() => {
        return document.body.innerHTML.includes('recaptcha') ||
               document.body.innerHTML.includes('captcha-form') ||
               document.body.innerHTML.includes('unusual traffic')
      })

      if (hasCaptcha) {
        console.log('⚠️ Google ha mostrato un CAPTCHA - ricerca bloccata')
        return null
      }

      // Attendi che i risultati siano caricati
      await page.waitForSelector('#search, #rso, .g', { timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)

      // Estrai i link dei risultati di ricerca (primi 10)
      const searchResults = await page.evaluate(() => {
        const results: string[] = []

        // Prova vari selettori per i risultati Google
        const selectors = [
          '#search a[href^="http"]',
          '#rso a[href^="http"]',
          '.g a[href^="http"]',
          'a[jsname][href^="http"]',
          '[data-ved] a[href^="http"]'
        ]

        for (const selector of selectors) {
          const links = document.querySelectorAll(selector)
          links.forEach((link, index) => {
            if (results.length < 10) {
              const href = link.getAttribute('href')
              if (href &&
                  !href.includes('google.com') &&
                  !href.includes('webcache') &&
                  !href.includes('translate.google') &&
                  !results.includes(href)) {
                results.push(href)
              }
            }
          })
          if (results.length > 0) break
        }

        return results
      })

      console.log(`📋 Trovati ${searchResults.length} risultati da Google`)

      // Filtra i risultati usando il domain classifier per trovare siti proprietari
      for (const url of searchResults) {
        const classification = this.domainClassifier.classify(url)

        if (classification.isAcceptable) {
          console.log(`✅ Sito proprietario trovato via Google Search: ${url}`)
          return url
        } else {
          console.log(`   - Scartato (${classification.type}): ${url}`)
        }
      }

      console.log('❌ Nessun sito proprietario trovato nei risultati Google')
      return null

    } catch (error) {
      console.log('⚠️ Errore durante ricerca Google:', error instanceof Error ? error.message : 'Errore sconosciuto')
      return null
    } finally {
      if (page) {
        try {
          await page.close()
        } catch {}
      }
    }
  }

  /**
   * Chiude il browser e pulisce le risorse in modo sicuro
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        // Chiudi il browser direttamente
        await this.browser.close()
      } catch (error) {
        console.log('⚠️ Errore durante chiusura browser:', error instanceof Error ? error.message : 'Errore sconosciuto')
        // Forza la chiusura se necessario
        try {
          await this.browser.close()
        } catch {}
      } finally {
        this.browser = null
      }
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
  gmbStatus?: GMBStatus
}
