// Questo file gestisce lo scraping da Google Maps
// È parte del modulo services/scraping-engine
// Viene chiamato dall'orchestratore per raccogliere dati aziendali da Google Maps
// ⚠️ Aggiornare se Google cambia la struttura delle pagine o implementa nuove protezioni

import { chromium, Browser, Page, ElementHandle } from 'playwright'
import { Logger } from '../utils/logger'

export interface ScrapingTarget {
  source: string
  query: string
  location: string
  category: string
}

export interface BusinessData {
  name: string
  website?: string
  phone?: string
  address?: string
  city: string
  category: string
  rating?: number
  reviews_count?: number
  source: string
}

export class GoogleMapsScraper {
  private logger: Logger
  private browser: Browser | null = null

  constructor() {
    this.logger = new Logger('GoogleMaps')
  }

  async scrape(target: ScrapingTarget): Promise<BusinessData[]> {
    this.logger.info(`🔍 Avvio scraping Google Maps: ${target.query} in ${target.location}`)
    
    try {
      await this.initBrowser()
      const businesses = await this.scrapeBusinesses(target)
      
      this.logger.info(`📊 Raccolte ${businesses.length} aziende da Google Maps`)
      return businesses
      
    } catch (error) {
      this.logger.error('❌ Errore durante scraping Google Maps:', error)
      return []
    } finally {
      await this.closeBrowser()
    }
  }

  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: process.env.NODE_ENV === 'production' ? true : false, // Visibile in sviluppo per debug
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
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

  private async scrapeBusinesses(target: ScrapingTarget): Promise<BusinessData[]> {
    if (!this.browser) throw new Error('Browser non inizializzato')

    const page = await this.browser.newPage()
    const businesses: BusinessData[] = []

    try {
      // Configura user agent e viewport per sembrare un browser reale
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      })
      await page.setViewportSize({ width: 1366, height: 768 })

      // Costruisci URL di ricerca Google Maps
      const searchQuery = `${target.query} ${target.location}`
      const encodedQuery = encodeURIComponent(searchQuery)
      const url = `https://www.google.com/maps/search/${encodedQuery}`

      this.logger.debug(`🌐 Navigazione verso: ${url}`)
      
      // Naviga con timeout più lungo
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })

      // Aspetta che la pagina carichi e gestisci eventuali cookie banners
      await this.handleCookieBanner(page)
      await this.delay(3000)

      // Aspetta che appaiano i risultati della ricerca
      const resultsLoaded = await this.waitForResults(page)
      if (!resultsLoaded) {
        this.logger.warn('⚠️  Nessun risultato trovato su Google Maps')
        return []
      }

      // Scorri per caricare più risultati
      await this.scrollToLoadResults(page)

      // Estrai i risultati usando selettori multipli
      const businessElements = await this.findBusinessElements(page)
      this.logger.debug(`📋 Trovati ${businessElements.length} business elements`)

      // Processa ogni business
      for (let i = 0; i < Math.min(businessElements.length, 20); i++) {
        try {
          const business = await this.extractBusinessInfo(page, businessElements[i], target, i)
          if (business) {
            businesses.push(business)
            this.logger.debug(`✅ Business estratto: ${business.name}`)
          }
          
          // Delay per evitare rate limiting
          await this.delay(1500)
        } catch (error) {
          this.logger.warn(`⚠️  Errore estrazione business ${i + 1}:`, error)
        }
      }

    } catch (error) {
      this.logger.error('❌ Errore durante scraping pagina:', error)
    } finally {
      await page.close()
    }

    return businesses
  }

  // Metodi di supporto per gestione cookie e risultati
  private async handleCookieBanner(page: Page): Promise<void> {
    try {
      // Aspetta un po' per vedere se appare il banner dei cookie
      await this.delay(2000)
      
      // Selettori comuni per i bottoni "Accetta" dei cookie
      const cookieSelectors = [
        'button[aria-label*="Accept"]',
        'button[aria-label*="Accetta"]',
        'button[id*="accept"]',
        'button:has-text("Accept all")',
        'button:has-text("Accetta tutto")',
        '[role="button"]:has-text("OK")'
      ]

      for (const selector of cookieSelectors) {
        try {
          const button = await page.$(selector)
          if (button) {
            await button.click()
            this.logger.debug('✅ Banner cookie gestito')
            await this.delay(1000)
            break
          }
        } catch (error) {
          // Continua con il prossimo selettore
        }
      }
    } catch (error) {
      this.logger.debug('⚠️  Nessun banner cookie trovato o errore nella gestione')
    }
  }

  private async waitForResults(page: Page): Promise<boolean> {
    try {
      // Aspetta che compaiano i risultati della ricerca
      const possibleContainers = [
        '[role="main"]',
        '[data-value="Search results"]',
        '.section-result',
        '[aria-label*="Results"]'
      ]

      for (const container of possibleContainers) {
        try {
          await page.waitForSelector(container, { timeout: 10000 })
          this.logger.debug(`✅ Container risultati trovato: ${container}`)
          return true
        } catch (error) {
          // Prova il prossimo selettore
        }
      }

      return false
    } catch (error) {
      this.logger.warn('⚠️  Timeout nell\'attesa dei risultati')
      return false
    }
  }

  private async findBusinessElements(page: Page): Promise<ElementHandle[]> {
    const possibleSelectors = [
      'div[data-result-index]',
      '[role="button"][data-result-index]',
      '.hfpxzc', // Selettore comune per i risultati business
      'a[data-cid]', // Risultati con data-cid
      '.section-result-content',
      '[jsaction*="pane"]'
    ]

    for (const selector of possibleSelectors) {
      try {
        const elements = await page.$$(selector)
        if (elements.length > 0) {
          this.logger.debug(`✅ Trovati ${elements.length} elementi con selettore: ${selector}`)
          return elements.slice(0, 20) // Limita a 20 risultati
        }
      } catch (error) {
        this.logger.debug(`⚠️  Selettore ${selector} non funziona`)
      }
    }

    this.logger.warn('⚠️  Nessun elemento business trovato con i selettori')
    return []
  }

  private async extractBusinessInfo(page: Page, element: ElementHandle, target: ScrapingTarget, index: number): Promise<BusinessData | null> {
    try {
      this.logger.debug(`🔍 Estrazione dati business ${index + 1}`)
      
      // PRIMA: estrai i dati dall'elemento della lista SENZA cliccare
      const basicData = await this.extractBasicDataFromListElement(element, target)
      if (!basicData || !basicData.name) {
        this.logger.debug(`⚠️  Impossibile estrarre dati di base per business ${index + 1}`)
        return null
      }

      this.logger.debug(`✅ Dati base estratti per: ${basicData.name}`)

      // SECONDO: clicca per aprire il pannello dettagli e ottieni dati aggiuntivi
      try {
        await element.click()
        await this.delay(2000)

        // Estrai dati aggiuntivi dal pannello laterale
        const additionalData = await this.extractAdditionalDataFromPanel(page)
        
        // Combina i dati
        const completeData: BusinessData = {
          name: basicData.name,
          website: additionalData.website || undefined,
          phone: additionalData.phone || undefined,
          address: additionalData.address || undefined,
          city: target.location.split(',')[0].trim(),
          category: target.category,
          rating: basicData.rating || additionalData.rating,
          reviews_count: basicData.reviews_count || additionalData.reviews_count,
          source: 'google_maps'
        }

        this.logger.debug(`✅ Dati completi estratti per: ${completeData.name}`)
        return completeData

      } catch (error) {
        this.logger.debug(`⚠️  Errore nell'aprire il pannello per ${basicData.name}, uso solo dati base`)
        return {
          name: basicData.name,
          website: undefined,
          phone: undefined,
          address: undefined,
          city: target.location.split(',')[0].trim(),
          category: target.category,
          rating: basicData.rating,
          reviews_count: basicData.reviews_count,
          source: 'google_maps'
        }
      }

    } catch (error) {
      this.logger.warn(`⚠️  Errore estrazione dati business ${index + 1}:`, error)
      return null
    }
  }

  private async extractBasicDataFromListElement(element: ElementHandle, target: ScrapingTarget): Promise<Partial<BusinessData> | null> {
    try {
      // Estrai dati dall'elemento della lista senza cliccare
      const elementData = await element.evaluate((el: Element) => {
        // Cerca il nome del business nell'elemento
        const nameSelectors = [
          '.fontHeadlineSmall',
          '.section-result-title',
          '[data-value="1"]',
          'h3',
          '.section-result-text-content h3',
          '.qBF1Pd',
          '.hfpxzc h3',
          '.hfpxzc .fontHeadlineSmall'
        ]
        
        let name = ''
        for (const selector of nameSelectors) {
          const nameEl = el.querySelector(selector)
          if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
            name = nameEl.textContent.trim()
            break
          }
        }

        // Se non trova il nome con i selettori, prova con aria-label
        if (!name) {
          const ariaLabel = el.getAttribute('aria-label')
          if (ariaLabel) {
            // L'aria-label spesso contiene il nome del business
            const parts = ariaLabel.split('.')
            if (parts.length > 0) {
              name = parts[0].trim()
            }
          }
        }

        // Estrai rating e recensioni se presenti
        let rating: number | undefined
        let reviewsCount: number | undefined

        const ratingEl = el.querySelector('[role="img"][aria-label*="star"]')
        if (ratingEl) {
          const ariaLabel = ratingEl.getAttribute('aria-label')
          if (ariaLabel) {
            const ratingMatch = ariaLabel.match(/(\d+[.,]\d+)/)
            if (ratingMatch) {
              rating = parseFloat(ratingMatch[1].replace(',', '.'))
            }
            
            const reviewMatch = ariaLabel.match(/(\d+)[\s]*recensioni|(\d+)[\s]*reviews/)
            if (reviewMatch) {
              reviewsCount = parseInt(reviewMatch[1] || reviewMatch[2])
            }
          }
        }

        return {
          name: name || null,
          rating,
          reviews_count: reviewsCount
        }
      })

      if (!elementData.name || elementData.name === 'Risultati' || elementData.name.length < 2) {
        return null
      }

      return {
        name: elementData.name,
        rating: elementData.rating,
        reviews_count: elementData.reviews_count
      }

    } catch (error) {
      this.logger.debug(`⚠️  Errore estrazione dati base:`, error)
      return null
    }
  }

  private async extractAdditionalDataFromPanel(page: Page): Promise<Partial<BusinessData>> {
    const additionalData: Partial<BusinessData> = {}

    try {
      // Aspetta che il pannello laterale si carichi
      await page.waitForSelector('[data-section-id="oh"]', { timeout: 3000 })
    } catch {
      // Il pannello potrebbe non esistere, continua comunque
    }

    // Estrai telefono
    const phone = await this.extractPhoneImproved(page)
    if (phone) additionalData.phone = phone

    // Estrai website
    const website = await this.extractWebsiteImproved(page)
    if (website) additionalData.website = website

    // Estrai indirizzo
    const address = await this.extractAddressImproved(page)
    if (address) additionalData.address = address

    return additionalData
  }

  // Metodi di estrazione migliorati
  private async extractTextWithMultipleSelectors(page: Page, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 })
        const element = await page.$(selector)
        if (element) {
          const text = await element.textContent()
          if (text && text.trim() && text.trim() !== 'Risultati') {
            return text.trim()
          }
        }
      } catch (error) {
        // Continua con il prossimo selettore
      }
    }
    return null
  }

  private async extractRatingImproved(page: Page): Promise<number | undefined> {
    const ratingSelectors = [
      '.F7nice span[aria-label*="star"]',
      '.section-star-display',
      '[data-value="Rating"]',
      'span[aria-label*="stelle"]',
      '.review-score-stars',
      'span[role="img"][aria-label*="star"]'
    ]

    for (const selector of ratingSelectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          const ariaLabel = await element.getAttribute('aria-label')
          if (ariaLabel) {
            const match = ariaLabel.match(/(\d+[.,]\d+)/)
            if (match) {
              return parseFloat(match[1].replace(',', '.'))
            }
          }
          
          const text = await element.textContent()
          if (text) {
            const match = text.match(/(\d+[.,]\d+)/)
            if (match) {
              return parseFloat(match[1].replace(',', '.'))
            }
          }
        }
      } catch (error) {
        // Continua con il prossimo selettore
      }
    }
    return undefined
  }

  private async extractReviewsCountImproved(page: Page): Promise<number | undefined> {
    const reviewSelectors = [
      '.F7nice span[aria-label*="recensioni"]',
      '.section-star-display',
      '[aria-label*="reviews"]',
      '[aria-label*="recensioni"]',
      '.review-count'
    ]

    for (const selector of reviewSelectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          const ariaLabel = await element.getAttribute('aria-label')
          if (ariaLabel) {
            const match = ariaLabel.match(/(\d+)[\s]*recensioni/)
            if (match) {
              return parseInt(match[1])
            }
          }
          
          const text = await element.textContent()
          if (text) {
            const match = text.match(/\((\d+)\)/)
            if (match) {
              return parseInt(match[1])
            }
          }
        }
      } catch (error) {
        // Continua con il prossimo selettore
      }
    }
    return undefined
  }

  private async extractAddressImproved(page: Page): Promise<string | null> {
    const addressSelectors = [
      '[data-item-id="address"]',
      '[data-attrid="kc:/location/location:address"]',
      '.section-info-line',
      '[aria-label*="Address"]'
    ]

    return await this.extractTextWithMultipleSelectors(page, addressSelectors)
  }

  private async extractPhoneImproved(page: Page): Promise<string | null> {
    const phoneSelectors = [
      '[data-item-id="phone"]',
      '[data-attrid*="phone"]',
      '[aria-label*="Phone"]',
      'a[href^="tel:"]'
    ]

    for (const selector of phoneSelectors) {
      try {
        if (selector.includes('href^="tel:"')) {
          const element = await page.$(selector)
          if (element) {
            const href = await element.getAttribute('href')
            if (href) {
              return href.replace('tel:', '')
            }
          }
        } else {
          const text = await this.extractText(page, selector)
          if (text) {
            return text
          }
        }
      } catch (error) {
        // Continua con il prossimo selettore
      }
    }
    return null
  }

  private async extractWebsiteImproved(page: Page): Promise<string | null> {
    const websiteSelectors = [
      '[data-item-id="authority"]',
      'a[data-value="Website"]',
      'a[href^="http"]:not([href*="google.com"])',
      '[aria-label*="Website"]'
    ]

    for (const selector of websiteSelectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          const href = await element.getAttribute('href')
          if (href && href.startsWith('http') && !href.includes('google.com')) {
            return href
          }
        }
      } catch (error) {
        // Continua con il prossimo selettore
      }
    }
    return null
  }

  private async extractText(page: Page, selector: string): Promise<string | null> {
    try {
      const element = await page.$(selector)
      return element ? await element.textContent() : null
    } catch {
      return null
    }
  }

  private async scrollToLoadResults(page: Page): Promise<void> {
    try {
      const scrollContainer = await page.$('[role="main"]')
      if (scrollContainer) {
        // Scorri gradualmente per caricare più risultati
        for (let i = 0; i < 3; i++) {
          await scrollContainer.evaluate((el: any) => {
            el.scrollTop = el.scrollHeight
          })
          await this.delay(2000)
        }
      }
    } catch (error) {
      this.logger.warn('⚠️  Errore durante scrolling:', error)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
