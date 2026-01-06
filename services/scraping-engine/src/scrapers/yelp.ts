/**
 * Scraper Yelp Italia per lead generation
 * Utilizza Playwright per scraping con gestione anti-bot
 * Implementa retry, rate limiting e fallback
 */

import { chromium, Browser, Page } from 'playwright'
import { Logger } from '../utils/logger'
import { BusinessData } from './google-maps'

export interface YelpScrapingTarget {
  query: string
  location: string
  category: string
  maxResults?: number
}

export interface YelpBusiness {
  name: string
  website?: string
  phone?: string
  address?: string
  city?: string
  category?: string
  rating?: number
  reviewsCount?: number
  priceRange?: string
  neighborhood?: string
}

export class YelpScraper {
  private logger: Logger
  private browser: Browser | null = null
  private readonly maxRetries = 3
  private readonly baseDelay = 2000
  private readonly userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]

  constructor() {
    this.logger = new Logger('YelpScraper')
  }

  /**
   * Scraping principale da Yelp
   */
  async scrape(target: YelpScrapingTarget): Promise<BusinessData[]> {
    this.logger.info(`🔍 Avvio scraping Yelp: "${target.query}" in ${target.location}`)

    const maxResults = target.maxResults || 20
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          this.logger.info(`🔄 Tentativo ${attempt}/${this.maxRetries}`)
          await this.delay(this.baseDelay * attempt)
        }

        await this.initBrowser()
        const businesses = await this.scrapeBusinesses(target, maxResults)
        await this.closeBrowser()

        if (businesses.length > 0) {
          this.logger.info(`✅ Scraping Yelp completato: ${businesses.length} aziende trovate`)
          return this.convertToBusinessData(businesses, target)
        }

        // Se non trovati risultati, prova a continuare con altro tentativo
        this.logger.warn('⚠️ Nessun risultato trovato, riprovo...')

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Errore sconosciuto')
        this.logger.error(`❌ Tentativo ${attempt} fallito: ${lastError.message}`)
        await this.closeBrowser()
      }
    }

    // Fallback: restituisce array vuoto se tutti i tentativi falliscono
    this.logger.error(`❌ Scraping Yelp fallito dopo ${this.maxRetries} tentativi`)
    return []
  }

  /**
   * Inizializza il browser
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    })
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

  /**
   * Scraping delle attività da Yelp
   */
  private async scrapeBusinesses(target: YelpScrapingTarget, maxResults: number): Promise<YelpBusiness[]> {
    if (!this.browser) {
      throw new Error('Browser non inizializzato')
    }

    const page = await this.browser.newPage()
    const businesses: YelpBusiness[] = []

    try {
      // Configura pagina
      await page.setUserAgent(this.getRandomUserAgent())
      await page.setViewportSize({ width: 1920, height: 1080 })

      // Blocca risorse non necessarie
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType()
        if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
          route.abort()
        } else {
          route.continue()
        }
      })

      // Costruisci URL di ricerca Yelp Italia
      const searchQuery = encodeURIComponent(target.query)
      const searchLocation = encodeURIComponent(target.location)
      const yelpUrl = `https://www.yelp.it/search?find_desc=${searchQuery}&find_loc=${searchLocation}`

      this.logger.info(`🌐 Navigazione a: ${yelpUrl}`)

      // Naviga alla pagina di ricerca
      await page.goto(yelpUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      // Attendi che i risultati si carichino
      await this.delay(2000)

      // Verifica se bloccati da CAPTCHA
      const hasCaptcha = await page.evaluate(() => {
        return document.body.innerHTML.includes('captcha') ||
               document.body.innerHTML.includes('robot') ||
               document.body.innerHTML.includes('verify')
      })

      if (hasCaptcha) {
        this.logger.warn('⚠️ Rilevato CAPTCHA, uscita...')
        throw new Error('CAPTCHA rilevato')
      }

      // Estrai dati business
      const rawBusinesses = await page.evaluate(() => {
        const results: any[] = []

        // Selettori Yelp (potrebbero cambiare)
        const businessCards = document.querySelectorAll('[data-testid="serp-ia-card"], .businessCard, .lemon--li__373c0__1r9wz, div[class*="container__09f24"]')

        businessCards.forEach((card) => {
          try {
            // Nome
            const nameEl = card.querySelector('a[class*="businessName"], h3 a, a[href*="/biz/"]')
            const name = nameEl?.textContent?.trim()

            if (!name) return

            // Link (per estrarre l'URL del business)
            const linkEl = card.querySelector('a[href*="/biz/"]')
            const businessUrl = linkEl?.getAttribute('href')

            // Telefono
            const phoneEl = card.querySelector('[class*="phone"], [data-testid="phone"]')
            const phone = phoneEl?.textContent?.trim()

            // Indirizzo
            const addressEl = card.querySelector('[class*="address"], [data-testid="address"]')
            const address = addressEl?.textContent?.trim()

            // Rating
            const ratingEl = card.querySelector('[class*="star"], [aria-label*="rating"], [title*="rating"]')
            const ratingText = ratingEl?.getAttribute('aria-label') || ratingEl?.getAttribute('title') || ''
            const ratingMatch = ratingText.match(/(\d+(?:[.,]\d+)?)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : undefined

            // Numero recensioni
            const reviewsEl = card.querySelector('[class*="reviewCount"], [class*="review"]')
            const reviewsText = reviewsEl?.textContent || ''
            const reviewsMatch = reviewsText.match(/(\d+)/)
            const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : undefined

            // Categoria
            const categoryEl = card.querySelector('[class*="category"], [class*="categories"]')
            const category = categoryEl?.textContent?.trim()

            // Fascia prezzo
            const priceEl = card.querySelector('[class*="priceRange"], [class*="price"]')
            const priceRange = priceEl?.textContent?.trim()

            // Quartiere
            const neighborhoodEl = card.querySelector('[class*="neighborhood"]')
            const neighborhood = neighborhoodEl?.textContent?.trim()

            results.push({
              name,
              businessUrl,
              phone,
              address,
              rating,
              reviewsCount,
              category,
              priceRange,
              neighborhood
            })
          } catch (e) {
            // Ignora errori su singole card
          }
        })

        return results
      })

      // Se non troviamo risultati con i selettori, prova approccio alternativo
      if (rawBusinesses.length === 0) {
        this.logger.warn('⚠️ Nessun risultato con selettori primari, provo approccio alternativo')

        const altBusinesses = await page.evaluate(() => {
          const results: any[] = []

          // Cerca tutti i link che sembrano business
          const bizLinks = document.querySelectorAll('a[href*="/biz/"]')
          const processedNames = new Set<string>()

          bizLinks.forEach((link) => {
            const name = link.textContent?.trim()
            if (name && name.length > 2 && !processedNames.has(name)) {
              processedNames.add(name)

              // Trova il container parent per altri dati
              const container = link.closest('div[class*="container"], li, article')

              const phoneMatch = container?.textContent?.match(/(\+39[\s\d]{10,}|\d{2,4}[\s.-]\d{6,})/);
              const phone = phoneMatch ? phoneMatch[1] : undefined

              results.push({
                name,
                businessUrl: link.getAttribute('href'),
                phone
              })
            }
          })

          return results.slice(0, 30) // Limita risultati
        })

        if (altBusinesses.length > 0) {
          this.logger.info(`📊 Trovati ${altBusinesses.length} risultati con approccio alternativo`)
          rawBusinesses.push(...altBusinesses)
        }
      }

      // Limita ai risultati richiesti
      const limitedResults = rawBusinesses.slice(0, maxResults)

      // Converti in formato YelpBusiness
      for (const raw of limitedResults) {
        businesses.push({
          name: raw.name,
          phone: raw.phone,
          address: raw.address,
          rating: raw.rating,
          reviewsCount: raw.reviewsCount,
          category: raw.category || target.category,
          priceRange: raw.priceRange,
          neighborhood: raw.neighborhood,
          city: target.location.split(',')[0].trim()
        })
      }

      this.logger.info(`📊 Estratti ${businesses.length} business da Yelp`)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto'
      this.logger.error(`❌ Errore durante scraping pagina: ${errorMsg}`)
      throw error
    } finally {
      await page.close()
    }

    return businesses
  }

  /**
   * Converte YelpBusiness in BusinessData per compatibilità
   */
  private convertToBusinessData(businesses: YelpBusiness[], target: YelpScrapingTarget): BusinessData[] {
    return businesses.map(biz => ({
      name: biz.name,
      website: biz.website,
      phone: biz.phone,
      address: biz.address,
      city: biz.city || target.location.split(',')[0].trim(),
      category: biz.category || target.category,
      rating: biz.rating,
      reviews_count: biz.reviewsCount,
      source: 'yelp'
    }))
  }

  /**
   * Restituisce un User-Agent casuale
   */
  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
  }

  /**
   * Delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
