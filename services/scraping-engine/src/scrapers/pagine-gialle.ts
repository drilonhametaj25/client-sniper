/**
 * Scraper Pagine Gialle Italia per lead generation
 * Utilizza Playwright per scraping paginagialle.it
 * Implementa retry, rate limiting e parsing contatti italiani
 */

import { chromium, Browser, Page } from 'playwright'
import { Logger } from '../utils/logger'
import { BusinessData } from './google-maps'

export interface PagineGialleTarget {
  query: string
  location: string
  category: string
  maxResults?: number
}

export interface PagineGialleBusiness {
  name: string
  website?: string
  phone?: string
  address?: string
  city?: string
  province?: string
  cap?: string
  category?: string
  description?: string
  partitaIva?: string
}

export class PagineGialleScraper {
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
    this.logger = new Logger('PagineGialleScraper')
  }

  /**
   * Scraping principale da Pagine Gialle
   */
  async scrape(target: PagineGialleTarget): Promise<BusinessData[]> {
    this.logger.info(`🔍 Avvio scraping Pagine Gialle: "${target.query}" in ${target.location}`)

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
          this.logger.info(`✅ Scraping Pagine Gialle completato: ${businesses.length} aziende trovate`)
          return this.convertToBusinessData(businesses, target)
        }

        this.logger.warn('⚠️ Nessun risultato trovato, riprovo...')

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Errore sconosciuto')
        this.logger.error(`❌ Tentativo ${attempt} fallito: ${lastError.message}`)
        await this.closeBrowser()
      }
    }

    this.logger.error(`❌ Scraping Pagine Gialle fallito dopo ${this.maxRetries} tentativi`)
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
   * Scraping delle attività da Pagine Gialle
   */
  private async scrapeBusinesses(target: PagineGialleTarget, maxResults: number): Promise<PagineGialleBusiness[]> {
    if (!this.browser) {
      throw new Error('Browser non inizializzato')
    }

    const page = await this.browser.newPage()
    const businesses: PagineGialleBusiness[] = []

    try {
      // Configura pagina
      await page.setUserAgent(this.getRandomUserAgent())
      await page.setViewportSize({ width: 1920, height: 1080 })

      // Blocca risorse non necessarie
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType()
        if (['image', 'media', 'font'].includes(resourceType)) {
          route.abort()
        } else {
          route.continue()
        }
      })

      // Costruisci URL di ricerca Pagine Gialle
      // Formato: https://www.paginegialle.it/ricerca/[categoria]/[città]
      const searchQuery = this.normalizeForUrl(target.query)
      const searchLocation = this.normalizeForUrl(target.location)
      const pgUrl = `https://www.paginegialle.it/ricerca/${searchQuery}/${searchLocation}`

      this.logger.info(`🌐 Navigazione a: ${pgUrl}`)

      // Naviga alla pagina di ricerca
      await page.goto(pgUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      // Attendi che i risultati si carichino
      await this.delay(2000)

      // Accetta cookie se presente il banner
      try {
        const cookieButton = await page.$('button#onetrust-accept-btn-handler, button[id*="accept"], #didomi-notice-agree-button')
        if (cookieButton) {
          await cookieButton.click()
          await this.delay(500)
        }
      } catch (e) {
        // Banner cookie non presente, continua
      }

      // Estrai dati business
      const rawBusinesses = await page.evaluate(() => {
        const results: any[] = []

        // Selettori Pagine Gialle
        const businessCards = document.querySelectorAll('.vcard, [itemtype*="LocalBusiness"], article.listing, .search-result-item, .listing-item')

        businessCards.forEach((card) => {
          try {
            // Nome
            const nameEl = card.querySelector('.listing-name, .fn, h2 a, .org, [itemprop="name"]')
            const name = nameEl?.textContent?.trim()

            if (!name) return

            // Sito web
            const websiteEl = card.querySelector('a[href*="http"]:not([href*="paginegialle"]), a.website-link, [rel="external"]')
            const website = websiteEl?.getAttribute('href')

            // Telefono
            const phoneEl = card.querySelector('.tel, [itemprop="telephone"], a[href^="tel:"], .phone')
            let phone = phoneEl?.textContent?.trim() || phoneEl?.getAttribute('href')?.replace('tel:', '')

            // Pulisci numero telefono
            if (phone) {
              phone = phone.replace(/[^\d+\s-]/g, '').trim()
            }

            // Indirizzo
            const addressEl = card.querySelector('.street-address, [itemprop="streetAddress"], .address')
            const address = addressEl?.textContent?.trim()

            // Città
            const cityEl = card.querySelector('.locality, [itemprop="addressLocality"]')
            const city = cityEl?.textContent?.trim()

            // Provincia
            const provinceEl = card.querySelector('.region, [itemprop="addressRegion"]')
            const province = provinceEl?.textContent?.trim()

            // CAP
            const capEl = card.querySelector('.postal-code, [itemprop="postalCode"]')
            const cap = capEl?.textContent?.trim()

            // Categoria
            const categoryEl = card.querySelector('.category, .categories, [itemprop="category"]')
            const category = categoryEl?.textContent?.trim()

            // Descrizione
            const descEl = card.querySelector('.description, [itemprop="description"], .listing-description')
            const description = descEl?.textContent?.trim()?.substring(0, 200)

            // Partita IVA (se presente)
            const fullText = card.textContent || ''
            const pivaMatch = fullText.match(/P\.?\s?IVA[:\s]*(\d{11})/i)
            const partitaIva = pivaMatch ? pivaMatch[1] : undefined

            results.push({
              name,
              website,
              phone,
              address,
              city,
              province,
              cap,
              category,
              description,
              partitaIva
            })
          } catch (e) {
            // Ignora errori su singole card
          }
        })

        return results
      })

      // Se non troviamo risultati con i selettori primari, prova approccio alternativo
      if (rawBusinesses.length === 0) {
        this.logger.warn('⚠️ Nessun risultato con selettori primari, provo approccio alternativo')

        const altBusinesses = await page.evaluate(() => {
          const results: any[] = []

          // Cerca strutture generiche
          const containers = document.querySelectorAll('div[class*="listing"], div[class*="result"], article')
          const processedNames = new Set<string>()

          containers.forEach((container) => {
            // Cerca nome
            const nameEl = container.querySelector('h2, h3, a[class*="name"], strong')
            const name = nameEl?.textContent?.trim()

            if (!name || name.length < 3 || processedNames.has(name)) return
            processedNames.add(name)

            // Cerca telefono
            const phoneMatch = container.textContent?.match(/(\+39[\s\d]{10,}|0\d{1,3}[\s.-]?\d{6,})/);
            const phone = phoneMatch ? phoneMatch[1] : undefined

            // Cerca indirizzo
            const addressMatch = container.textContent?.match(/(Via|Viale|Piazza|Corso|Largo)[\s\w,]+\d{1,5}/i)
            const address = addressMatch ? addressMatch[0] : undefined

            // Cerca sito web
            const websiteEl = container.querySelector('a[href^="http"]:not([href*="paginegialle"]):not([href*="facebook"]):not([href*="google"])')
            const website = websiteEl?.getAttribute('href')

            results.push({
              name,
              phone,
              address,
              website
            })
          })

          return results.slice(0, 30)
        })

        if (altBusinesses.length > 0) {
          this.logger.info(`📊 Trovati ${altBusinesses.length} risultati con approccio alternativo`)
          rawBusinesses.push(...altBusinesses)
        }
      }

      // Limita ai risultati richiesti
      const limitedResults = rawBusinesses.slice(0, maxResults)

      // Converti in formato PagineGialleBusiness
      for (const raw of limitedResults) {
        businesses.push({
          name: raw.name,
          website: raw.website,
          phone: raw.phone,
          address: raw.address,
          city: raw.city || target.location.split(',')[0].trim(),
          province: raw.province,
          cap: raw.cap,
          category: raw.category || target.category,
          description: raw.description,
          partitaIva: raw.partitaIva
        })
      }

      this.logger.info(`📊 Estratti ${businesses.length} business da Pagine Gialle`)

      // Se necessario, carica più pagine
      if (businesses.length < maxResults) {
        const additionalNeeded = maxResults - businesses.length
        const additionalBusinesses = await this.scrapeAdditionalPages(page, additionalNeeded)
        businesses.push(...additionalBusinesses)
      }

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
   * Scraping di pagine aggiuntive se necessario
   */
  private async scrapeAdditionalPages(page: Page, needed: number): Promise<PagineGialleBusiness[]> {
    const additional: PagineGialleBusiness[] = []

    try {
      // Cerca pulsante "Avanti" o link paginazione
      const nextButton = await page.$('a.pagination-next, a[rel="next"], .next-page, a:has-text("Avanti")')

      if (nextButton && needed > 0) {
        await nextButton.click()
        await this.delay(2000)

        // Estrai business dalla nuova pagina
        const moreBusinesses = await page.evaluate(() => {
          const results: any[] = []
          const cards = document.querySelectorAll('.vcard, [itemtype*="LocalBusiness"], article.listing')

          cards.forEach((card) => {
            const nameEl = card.querySelector('.listing-name, .fn, h2 a, .org')
            const name = nameEl?.textContent?.trim()
            if (!name) return

            const phoneEl = card.querySelector('.tel, [itemprop="telephone"]')
            const phone = phoneEl?.textContent?.trim()

            const websiteEl = card.querySelector('a[href*="http"]:not([href*="paginegialle"])')
            const website = websiteEl?.getAttribute('href')

            results.push({ name, phone, website })
          })

          return results
        })

        for (const raw of moreBusinesses.slice(0, needed)) {
          additional.push({
            name: raw.name,
            phone: raw.phone,
            website: raw.website
          })
        }

        this.logger.info(`📊 Aggiunti ${additional.length} business da pagina successiva`)
      }
    } catch (e) {
      // Paginazione non disponibile o errore
    }

    return additional
  }

  /**
   * Converte PagineGialleBusiness in BusinessData per compatibilità
   */
  private convertToBusinessData(businesses: PagineGialleBusiness[], target: PagineGialleTarget): BusinessData[] {
    return businesses.map(biz => ({
      name: biz.name,
      website: biz.website,
      phone: biz.phone,
      address: biz.address,
      city: biz.city || target.location.split(',')[0].trim(),
      category: biz.category || target.category,
      source: 'pagine_gialle'
    }))
  }

  /**
   * Normalizza stringa per URL
   */
  private normalizeForUrl(str: string): string {
    return str
      .toLowerCase()
      .replace(/[àáâã]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõ]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
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
