/**
 * Email Scraper Avanzato per Client Sniper
 * Estrae email da siti web navigando pagine contatti, about, footer
 * Parte del modulo services/scraping-engine
 */

import { Browser, Page } from 'playwright'

export interface EmailSource {
  email: string
  page: string
  context: 'footer' | 'contact_page' | 'about_page' | 'header' | 'body' | 'mailto' | 'meta'
  confidence: number // 0-100
}

export interface EmailScrapingResult {
  emails: string[]
  sources: EmailSource[]
  primaryEmail: string | null
  confidence: number
  scrapedPages: string[]
  totalTimeMs: number
}

export interface EmailScraperConfig {
  maxPagesToCheck: number
  timeoutPerPage: number
  followInternalLinks: boolean
  checkContactPages: boolean
  checkAboutPages: boolean
  checkFooter: boolean
  checkMailtoLinks: boolean
}

const DEFAULT_CONFIG: EmailScraperConfig = {
  maxPagesToCheck: 5,
  timeoutPerPage: 10000,
  followInternalLinks: true,
  checkContactPages: true,
  checkAboutPages: true,
  checkFooter: true,
  checkMailtoLinks: true
}

export class EmailScraper {
  private readonly config: EmailScraperConfig

  // Pattern email robusti
  private readonly EMAIL_PATTERNS = [
    // Email standard
    /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b/gi,
    // Email con spazi intorno a @
    /\b[A-Za-z0-9._%+\-]+\s*@\s*[A-Za-z0-9.\-]+\s*\.\s*[A-Z|a-z]{2,}\b/gi
  ]

  // Pattern email offuscate
  private readonly OBFUSCATED_PATTERNS = [
    // [at] e [dot]
    /\b([A-Za-z0-9._%+\-]+)\s*\[\s*at\s*\]\s*([A-Za-z0-9.\-]+)\s*\[\s*dot\s*\]\s*([A-Z|a-z]{2,})\b/gi,
    // (at) e (dot)
    /\b([A-Za-z0-9._%+\-]+)\s*\(\s*at\s*\)\s*([A-Za-z0-9.\-]+)\s*\(\s*dot\s*\)\s*([A-Z|a-z]{2,})\b/gi,
    // -at- e -dot-
    /\b([A-Za-z0-9._%+\-]+)\s*-at-\s*([A-Za-z0-9.\-]+)\s*-dot-\s*([A-Z|a-z]{2,})\b/gi,
    // chiocciola
    /\b([A-Za-z0-9._%+\-]+)\s*(?:chiocciola|arroba)\s*([A-Za-z0-9.\-]+)\s*(?:punto)\s*([A-Z|a-z]{2,})\b/gi
  ]

  // Pattern per escludere email non valide
  private readonly EXCLUDE_PATTERNS = [
    /^noreply@/i,
    /^no-reply@/i,
    /^donotreply@/i,
    /^do-not-reply@/i,
    /^postmaster@/i,
    /^mailer-daemon@/i,
    /^bounce@/i,
    /^unsubscribe@/i,
    /@example\.com$/i,
    /@example\.org$/i,
    /@test\./i,
    /@demo\./i,
    /@sample\./i,
    /@placeholder\./i,
    /@email\.com$/i,
    /@mail\.com$/i,
    // Platform emails
    /@sentry\./i,
    /@wix\./i,
    /@wixsite\./i,
    /@wordpress\./i,
    /@mailchimp\./i,
    /@sendgrid\./i,
    /@mailgun\./i,
    /@shopify\./i,
    /@squarespace\./i,
    /@weebly\./i,
    /@godaddy\./i,
    /@aruba\./i,
    /@hostinger\./i,
    /@siteground\./i
  ]

  // Pagine da controllare in ordine di priorità
  private readonly CONTACT_PAGE_PATHS = [
    '/contatti',
    '/contattaci',
    '/contact',
    '/contact-us',
    '/contacts',
    '/contacto',
    '/kontakt'
  ]

  private readonly ABOUT_PAGE_PATHS = [
    '/chi-siamo',
    '/about',
    '/about-us',
    '/info',
    '/informazioni',
    '/azienda',
    '/company',
    '/chi-siamo'
  ]

  private readonly ADDITIONAL_PATHS = [
    '/supporto',
    '/support',
    '/help',
    '/aiuto',
    '/assistenza',
    '/privacy',
    '/legal',
    '/imprint',
    '/impressum'
  ]

  constructor(config?: Partial<EmailScraperConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Scrapa email da un sito web
   */
  async scrapeEmails(websiteUrl: string, browser: Browser): Promise<EmailScrapingResult> {
    const startTime = Date.now()
    const allSources: EmailSource[] = []
    const scrapedPages: string[] = []

    let page: Page | null = null

    try {
      // Normalizza URL base
      const baseUrl = this.normalizeBaseUrl(websiteUrl)
      console.log(`📧 [EmailScraper] Inizio scraping email da: ${baseUrl}`)

      // Crea nuova pagina
      page = await browser.newPage()
      await page.setDefaultTimeout(this.config.timeoutPerPage)

      // 1. Scrapa homepage
      const homepageEmails = await this.scrapePageForEmails(page, baseUrl, 'body')
      allSources.push(...homepageEmails)
      scrapedPages.push(baseUrl)

      // 2. Estrai email da footer (sempre visibile)
      if (this.config.checkFooter) {
        const footerEmails = await this.extractFromFooter(page)
        allSources.push(...footerEmails.map(e => ({ ...e, page: baseUrl })))
      }

      // 3. Estrai email da mailto links (con supporto CC/BCC)
      if (this.config.checkMailtoLinks) {
        const mailtoEmails = await this.extractMailtoLinks(page)
        allSources.push(...mailtoEmails.map(e => ({ ...e, page: baseUrl })))
      }

      // 4. Estrai email da input type="email" (form di contatto)
      const inputEmails = await this.extractFromInputFields(page)
      allSources.push(...inputEmails.map(e => ({ ...e, page: baseUrl })))

      // 5. Estrai email da form action="mailto:"
      const formEmails = await this.extractFromFormActions(page)
      allSources.push(...formEmails.map(e => ({ ...e, page: baseUrl })))

      // 6. Estrai email da JavaScript inline e data attributes
      const jsEmails = await this.extractFromJavaScript(page)
      allSources.push(...jsEmails.map(e => ({ ...e, page: baseUrl })))

      // 7. Naviga a pagine contatti se configurato
      if (this.config.checkContactPages && scrapedPages.length < this.config.maxPagesToCheck) {
        const contactPageUrl = await this.findContactPage(page, baseUrl)
        if (contactPageUrl && !scrapedPages.includes(contactPageUrl)) {
          try {
            await page.goto(contactPageUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeoutPerPage })
            const contactEmails = await this.scrapePageForEmails(page, contactPageUrl, 'contact_page')
            allSources.push(...contactEmails)
            scrapedPages.push(contactPageUrl)

            // Estrai con tutti i metodi dalla pagina contatti
            const contactMailto = await this.extractMailtoLinks(page)
            allSources.push(...contactMailto.map(e => ({ ...e, page: contactPageUrl })))

            const contactInputs = await this.extractFromInputFields(page)
            allSources.push(...contactInputs.map(e => ({ ...e, page: contactPageUrl })))

            const contactForms = await this.extractFromFormActions(page)
            allSources.push(...contactForms.map(e => ({ ...e, page: contactPageUrl })))

            const contactJs = await this.extractFromJavaScript(page)
            allSources.push(...contactJs.map(e => ({ ...e, page: contactPageUrl })))
          } catch (err) {
            console.log(`⚠️ [EmailScraper] Errore navigazione pagina contatti: ${err}`)
          }
        }
      }

      // 8. Naviga a pagine about se configurato
      if (this.config.checkAboutPages && scrapedPages.length < this.config.maxPagesToCheck) {
        const aboutPageUrl = await this.findAboutPage(page, baseUrl)
        if (aboutPageUrl && !scrapedPages.includes(aboutPageUrl)) {
          try {
            // Torna prima alla homepage se necessario
            if (!page.url().startsWith(baseUrl)) {
              await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeoutPerPage })
            }
            await page.goto(aboutPageUrl, { waitUntil: 'domcontentloaded', timeout: this.config.timeoutPerPage })
            const aboutEmails = await this.scrapePageForEmails(page, aboutPageUrl, 'about_page')
            allSources.push(...aboutEmails)
            scrapedPages.push(aboutPageUrl)

            // Estrai con tutti i metodi
            const aboutMailto = await this.extractMailtoLinks(page)
            allSources.push(...aboutMailto.map(e => ({ ...e, page: aboutPageUrl })))

            const aboutJs = await this.extractFromJavaScript(page)
            allSources.push(...aboutJs.map(e => ({ ...e, page: aboutPageUrl })))
          } catch (err) {
            console.log(`⚠️ [EmailScraper] Errore navigazione pagina about: ${err}`)
          }
        }
      }

      // 9. Naviga a pagine aggiuntive (support, help, privacy, etc.)
      for (const additionalPath of this.ADDITIONAL_PATHS) {
        if (scrapedPages.length >= this.config.maxPagesToCheck) break

        const additionalUrl = `${baseUrl}${additionalPath}`
        if (scrapedPages.includes(additionalUrl)) continue

        try {
          const response = await page.goto(additionalUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 5000
          })

          if (response && response.status() === 200) {
            const additionalEmails = await this.scrapePageForEmails(page, additionalUrl, 'body')
            allSources.push(...additionalEmails)
            scrapedPages.push(additionalUrl)

            // Estrai mailto e JS
            const additionalMailto = await this.extractMailtoLinks(page)
            allSources.push(...additionalMailto.map(e => ({ ...e, page: additionalUrl })))

            const additionalJs = await this.extractFromJavaScript(page)
            allSources.push(...additionalJs.map(e => ({ ...e, page: additionalUrl })))
          }
        } catch {
          // Pagina non esiste, continua
        }
      }

      // Consolida risultati
      const result = this.consolidateResults(allSources, scrapedPages, startTime)
      console.log(`📧 [EmailScraper] Trovate ${result.emails.length} email in ${result.totalTimeMs}ms`)
      return result

    } catch (error) {
      console.error('[EmailScraper] Errore durante scraping:', error)
      return this.consolidateResults(allSources, scrapedPages, startTime)
    } finally {
      if (page) {
        try {
          await page.close()
        } catch {
          // Ignora errori di chiusura
        }
      }
    }
  }

  /**
   * Scrapa una singola pagina per email
   */
  private async scrapePageForEmails(
    page: Page,
    url: string,
    context: EmailSource['context']
  ): Promise<EmailSource[]> {
    const sources: EmailSource[] = []

    try {
      // Naviga se non già sulla pagina
      if (page.url() !== url) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeoutPerPage })
      }

      // Estrai testo della pagina
      const pageText = await page.evaluate(() => document.body?.innerText || '')
      const pageHtml = await page.content()

      // Cerca email nel testo
      const textEmails = this.extractEmailsFromText(pageText)
      textEmails.forEach(email => {
        if (this.isValidBusinessEmail(email)) {
          sources.push({
            email: this.normalizeEmail(email),
            page: url,
            context,
            confidence: this.calculateConfidence(email, context, pageText)
          })
        }
      })

      // Cerca email offuscate
      const obfuscatedEmails = this.extractObfuscatedEmails(pageText)
      obfuscatedEmails.forEach(email => {
        if (this.isValidBusinessEmail(email)) {
          sources.push({
            email: this.normalizeEmail(email),
            page: url,
            context,
            confidence: this.calculateConfidence(email, context, pageText) * 0.9 // Leggermente meno confidenza
          })
        }
      })

      // Cerca nel meta/head
      const metaEmails = this.extractFromMeta(pageHtml)
      metaEmails.forEach(email => {
        if (this.isValidBusinessEmail(email)) {
          sources.push({
            email: this.normalizeEmail(email),
            page: url,
            context: 'meta',
            confidence: 80
          })
        }
      })

    } catch (error) {
      console.warn(`[EmailScraper] Errore scraping pagina ${url}:`, error)
    }

    return sources
  }

  /**
   * Estrae email dal footer della pagina
   */
  private async extractFromFooter(page: Page): Promise<Omit<EmailSource, 'page'>[]> {
    const sources: Omit<EmailSource, 'page'>[] = []

    try {
      const footerText = await page.evaluate(() => {
        const footerSelectors = [
          'footer',
          '#footer',
          '.footer',
          '[role="contentinfo"]',
          '.site-footer',
          '.page-footer'
        ]

        for (const selector of footerSelectors) {
          const footer = document.querySelector(selector)
          if (footer) {
            return footer.textContent || ''
          }
        }

        // Fallback: ultime 500 caratteri della pagina
        const body = document.body?.textContent || ''
        return body.slice(-500)
      })

      const emails = this.extractEmailsFromText(footerText)
      emails.forEach(email => {
        if (this.isValidBusinessEmail(email)) {
          sources.push({
            email: this.normalizeEmail(email),
            context: 'footer',
            confidence: 85 // Footer = buona confidenza
          })
        }
      })
    } catch {
      // Ignora errori
    }

    return sources
  }

  /**
   * Estrae email da link mailto (con supporto CC/BCC)
   */
  private async extractMailtoLinks(page: Page): Promise<Omit<EmailSource, 'page'>[]> {
    const sources: Omit<EmailSource, 'page'>[] = []

    try {
      const mailtoHrefs = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href^="mailto:"]')
        return Array.from(links).map(link => link.getAttribute('href') || '')
      })

      mailtoHrefs.forEach(href => {
        // Parse mailto con supporto CC/BCC
        const emails = this.parseMailtoHref(href)
        emails.forEach(email => {
          if (email && this.isValidBusinessEmail(email)) {
            sources.push({
              email: this.normalizeEmail(email),
              context: 'mailto',
              confidence: 95 // Mailto = alta confidenza
            })
          }
        })
      })
    } catch {
      // Ignora errori
    }

    return sources
  }

  /**
   * Parse mailto href estraendo tutte le email (principale + CC + BCC)
   */
  private parseMailtoHref(href: string): string[] {
    const emails: string[] = []

    try {
      const withoutProtocol = href.replace('mailto:', '')

      // Estrai email principale (prima del ?)
      const mainPart = withoutProtocol.split('?')[0]
      // Supporta multiple email separate da virgola o punto e virgola
      const mainEmails = mainPart.split(/[,;]/).map(e => e.trim()).filter(Boolean)
      emails.push(...mainEmails)

      // Parse query params per cc e bcc
      const queryString = withoutProtocol.split('?')[1]
      if (queryString) {
        const params = new URLSearchParams(queryString)

        const cc = params.get('cc')
        if (cc) {
          emails.push(...cc.split(/[,;]/).map(e => e.trim()).filter(Boolean))
        }

        const bcc = params.get('bcc')
        if (bcc) {
          emails.push(...bcc.split(/[,;]/).map(e => e.trim()).filter(Boolean))
        }
      }
    } catch {
      // In caso di errore, tenta estrazione base
      const match = href.match(/mailto:([^?]+)/)
      if (match) {
        emails.push(match[1].trim())
      }
    }

    return emails.filter(e => e.includes('@'))
  }

  /**
   * Estrae email da input type="email" (form di contatto)
   */
  private async extractFromInputFields(page: Page): Promise<Omit<EmailSource, 'page'>[]> {
    const sources: Omit<EmailSource, 'page'>[] = []

    try {
      const inputEmails = await page.evaluate(() => {
        const emails: string[] = []

        // Input type="email" con value o placeholder che sembrano email
        const emailInputs = document.querySelectorAll('input[type="email"]')
        emailInputs.forEach(input => {
          const el = input as HTMLInputElement
          // Check value
          if (el.value && el.value.includes('@')) {
            emails.push(el.value)
          }
          // Check placeholder (alcuni siti mettono email di esempio reale)
          if (el.placeholder && el.placeholder.includes('@') && !el.placeholder.includes('example')) {
            emails.push(el.placeholder)
          }
          // Check data attributes
          const dataEmail = el.getAttribute('data-email') || el.getAttribute('data-default-email')
          if (dataEmail) {
            emails.push(dataEmail)
          }
        })

        // Input con name/id che suggerisce email e ha valore
        const namedInputs = document.querySelectorAll('input[name*="email"], input[id*="email"]')
        namedInputs.forEach(input => {
          const el = input as HTMLInputElement
          if (el.value && el.value.includes('@')) {
            emails.push(el.value)
          }
        })

        return emails
      })

      inputEmails.forEach(email => {
        if (this.isValidBusinessEmail(email)) {
          sources.push({
            email: this.normalizeEmail(email),
            context: 'body',
            confidence: 75 // Input field = buona confidenza
          })
        }
      })
    } catch {
      // Ignora errori
    }

    return sources
  }

  /**
   * Estrae email da form action="mailto:"
   */
  private async extractFromFormActions(page: Page): Promise<Omit<EmailSource, 'page'>[]> {
    const sources: Omit<EmailSource, 'page'>[] = []

    try {
      const formEmails = await page.evaluate(() => {
        const emails: string[] = []

        // Form con action mailto
        const forms = document.querySelectorAll('form[action^="mailto:"]')
        forms.forEach(form => {
          const action = (form as HTMLFormElement).action || form.getAttribute('action') || ''
          if (action.startsWith('mailto:')) {
            const email = action.replace('mailto:', '').split('?')[0].trim()
            if (email) emails.push(email)
          }
        })

        return emails
      })

      formEmails.forEach(email => {
        if (this.isValidBusinessEmail(email)) {
          sources.push({
            email: this.normalizeEmail(email),
            context: 'mailto',
            confidence: 90 // Form action = alta confidenza
          })
        }
      })
    } catch {
      // Ignora errori
    }

    return sources
  }

  /**
   * Estrae email da JavaScript inline e data attributes
   */
  private async extractFromJavaScript(page: Page): Promise<Omit<EmailSource, 'page'>[]> {
    const sources: Omit<EmailSource, 'page'>[] = []

    try {
      const jsEmails = await page.evaluate(() => {
        const emails: string[] = []
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

        // 1. Cerca in script tags inline (non src esterni)
        const scripts = document.querySelectorAll('script:not([src])')
        scripts.forEach(script => {
          const content = script.textContent || ''

          // Pattern per email in stringhe JS
          const patterns = [
            // "email": "info@example.com" o 'email': 'info@example.com'
            /['"](?:email|mail|contact|contatto)['"]?\s*[:=]\s*['"]([^'"]+@[^'"]+)['"]/gi,
            // var email = "info@example.com"
            /(?:var|let|const)\s+\w*(?:email|mail|contact)\w*\s*=\s*['"]([^'"]+@[^'"]+)['"]/gi,
            // Email dirette tra virgolette
            /['"]([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})['"]/g
          ]

          patterns.forEach(pattern => {
            let match
            while ((match = pattern.exec(content)) !== null) {
              if (match[1] && !match[1].includes('example') && !match[1].includes('test')) {
                emails.push(match[1])
              }
            }
          })
        })

        // 2. Cerca in data attributes
        const elementsWithData = document.querySelectorAll('[data-email], [data-contact-email], [data-mail], [data-contact]')
        elementsWithData.forEach(el => {
          const attrs = ['data-email', 'data-contact-email', 'data-mail', 'data-contact']
          attrs.forEach(attr => {
            const value = el.getAttribute(attr)
            if (value && value.includes('@')) {
              emails.push(value)
            }
          })
        })

        // 3. Cerca in JSON-LD script tags
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
        jsonLdScripts.forEach(script => {
          const content = script.textContent || ''
          const matches = content.match(emailRegex) || []
          emails.push(...matches.filter(e => !e.includes('example') && !e.includes('schema.org')))
        })

        // 4. Cerca in commenti HTML (a volte email sono commentate)
        const html = document.documentElement.innerHTML
        const commentRegex = /<!--[\s\S]*?-->/g
        let commentMatch
        while ((commentMatch = commentRegex.exec(html)) !== null) {
          const commentEmails = commentMatch[0].match(emailRegex) || []
          emails.push(...commentEmails.filter(e => !e.includes('example')))
        }

        return [...new Set(emails)]
      })

      jsEmails.forEach(email => {
        if (this.isValidBusinessEmail(email)) {
          sources.push({
            email: this.normalizeEmail(email),
            context: 'body',
            confidence: 70 // JavaScript = confidenza media-alta
          })
        }
      })
    } catch {
      // Ignora errori
    }

    return sources
  }

  /**
   * Cerca e ritorna URL della pagina contatti
   */
  private async findContactPage(page: Page, baseUrl: string): Promise<string | null> {
    try {
      // Prima cerca link nel DOM
      const contactLink = await page.evaluate((paths) => {
        const links = Array.from(document.querySelectorAll('a'))
        for (const link of links) {
          const href = link.getAttribute('href')?.toLowerCase() || ''
          const text = link.textContent?.toLowerCase() || ''

          // Cerca per href
          for (const path of paths) {
            if (href.includes(path)) {
              return link.getAttribute('href')
            }
          }

          // Cerca per testo
          if (text.includes('contatt') || text.includes('contact')) {
            return link.getAttribute('href')
          }
        }
        return null
      }, this.CONTACT_PAGE_PATHS)

      if (contactLink) {
        return this.resolveUrl(contactLink, baseUrl)
      }

      // Fallback: prova URL comuni
      for (const path of this.CONTACT_PAGE_PATHS) {
        const testUrl = `${baseUrl}${path}`
        try {
          const response = await page.goto(testUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 5000
          })
          if (response && response.status() === 200) {
            return testUrl
          }
        } catch {
          // URL non esiste, continua
        }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Cerca e ritorna URL della pagina about
   */
  private async findAboutPage(page: Page, baseUrl: string): Promise<string | null> {
    try {
      const aboutLink = await page.evaluate((paths) => {
        const links = Array.from(document.querySelectorAll('a'))
        for (const link of links) {
          const href = link.getAttribute('href')?.toLowerCase() || ''
          const text = link.textContent?.toLowerCase() || ''

          for (const path of paths) {
            if (href.includes(path)) {
              return link.getAttribute('href')
            }
          }

          if (text.includes('chi siamo') || text.includes('about')) {
            return link.getAttribute('href')
          }
        }
        return null
      }, this.ABOUT_PAGE_PATHS)

      if (aboutLink) {
        return this.resolveUrl(aboutLink, baseUrl)
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Estrae email da testo
   */
  private extractEmailsFromText(text: string): string[] {
    const emails: string[] = []

    for (const pattern of this.EMAIL_PATTERNS) {
      const matches = text.match(pattern) || []
      emails.push(...matches)
    }

    return [...new Set(emails)]
  }

  /**
   * Estrae email offuscate
   */
  private extractObfuscatedEmails(text: string): string[] {
    const emails: string[] = []

    for (const pattern of this.OBFUSCATED_PATTERNS) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        // Ricostruisci email: match[1]@match[2].match[3]
        const email = `${match[1]}@${match[2]}.${match[3]}`
        emails.push(email)
      }
    }

    return emails
  }

  /**
   * Estrae email da meta tags e JSON-LD con parsing completo
   */
  private extractFromMeta(html: string): string[] {
    const emails: string[] = []

    // 1. Schema.org/JSON-LD con parsing completo
    const jsonLdRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    let jsonLdMatch
    while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const content = jsonLdMatch[1]
        const data = JSON.parse(content)
        const foundEmails = this.extractEmailsFromJsonLd(data)
        emails.push(...foundEmails)
      } catch {
        // Se il parsing JSON fallisce, usa regex come fallback
        const fallbackEmails = jsonLdMatch[1].match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
        emails.push(...fallbackEmails.filter(e => !e.includes('example') && !e.includes('schema.org')))
      }
    }

    // 2. Simple Schema.org patterns (fallback per JSON malformato)
    const schemaPatterns = [
      /"email"\s*:\s*"([^"]+@[^"]+)"/gi,
      /"contactEmail"\s*:\s*"([^"]+@[^"]+)"/gi,
      /"sameAs"\s*:\s*"mailto:([^"]+)"/gi
    ]
    schemaPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(html)) !== null) {
        if (match[1] && !match[1].includes('example')) {
          emails.push(match[1])
        }
      }
    })

    // 3. Meta author email
    const metaMatch = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+@[^"]+)"/gi)
    if (metaMatch) {
      metaMatch.forEach(m => {
        const email = m.match(/content="([^"]+@[^"]+)"/)
        if (email) emails.push(email[1])
      })
    }

    // 4. Open Graph email (raro ma possibile)
    const ogEmailMatch = html.match(/<meta[^>]+property="og:email"[^>]+content="([^"]+)"/gi)
    if (ogEmailMatch) {
      ogEmailMatch.forEach(m => {
        const email = m.match(/content="([^"]+)"/)
        if (email && email[1].includes('@')) emails.push(email[1])
      })
    }

    return [...new Set(emails)]
  }

  /**
   * Estrae ricorsivamente email da oggetti JSON-LD
   */
  private extractEmailsFromJsonLd(obj: any, depth = 0): string[] {
    const emails: string[] = []

    // Limite profondità per evitare loop infiniti
    if (depth > 10 || !obj) return emails

    // Se è una stringa, controlla se è email
    if (typeof obj === 'string') {
      if (obj.includes('@') && !obj.includes('example') && !obj.includes('schema.org')) {
        // Valida formato email base
        const emailMatch = obj.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
        if (emailMatch) {
          emails.push(obj)
        }
        // Controlla mailto: link
        if (obj.startsWith('mailto:')) {
          const email = obj.replace('mailto:', '').split('?')[0]
          if (email.includes('@')) emails.push(email)
        }
      }
      return emails
    }

    // Se è un array, itera
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        emails.push(...this.extractEmailsFromJsonLd(item, depth + 1))
      })
      return emails
    }

    // Se è un oggetto, cerca campi email e itera ricorsivamente
    if (typeof obj === 'object') {
      // Campi che tipicamente contengono email
      const emailFields = ['email', 'contactEmail', 'mail', 'e-mail', 'emailAddress']
      emailFields.forEach(field => {
        if (obj[field] && typeof obj[field] === 'string' && obj[field].includes('@')) {
          emails.push(obj[field])
        }
      })

      // Cerca in contactPoint (comune in Schema.org)
      if (obj.contactPoint) {
        emails.push(...this.extractEmailsFromJsonLd(obj.contactPoint, depth + 1))
      }

      // Cerca in author
      if (obj.author) {
        emails.push(...this.extractEmailsFromJsonLd(obj.author, depth + 1))
      }

      // Cerca ricorsivamente in tutti i valori
      Object.values(obj).forEach(value => {
        if (typeof value === 'object' || Array.isArray(value)) {
          emails.push(...this.extractEmailsFromJsonLd(value, depth + 1))
        }
      })
    }

    return emails
  }

  /**
   * Normalizza email
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim().replace(/\s+/g, '')
  }

  /**
   * Verifica se email è valida per business
   */
  private isValidBusinessEmail(email: string): boolean {
    const normalized = this.normalizeEmail(email)

    // Verifica formato base
    if (!normalized.includes('@') || !normalized.includes('.')) {
      return false
    }

    // Verifica lunghezza ragionevole
    if (normalized.length < 6 || normalized.length > 100) {
      return false
    }

    // Verifica pattern esclusi
    for (const pattern of this.EXCLUDE_PATTERNS) {
      if (pattern.test(normalized)) {
        return false
      }
    }

    // Verifica TLD valido
    const tld = normalized.split('.').pop() || ''
    if (tld.length < 2 || tld.length > 10) {
      return false
    }

    return true
  }

  /**
   * Calcola confidenza dell'email
   */
  private calculateConfidence(
    email: string,
    context: EmailSource['context'],
    pageText: string
  ): number {
    let confidence = 50 // Base

    // Bonus per contesto
    switch (context) {
      case 'mailto':
        confidence += 40
        break
      case 'contact_page':
        confidence += 30
        break
      case 'footer':
        confidence += 25
        break
      case 'about_page':
        confidence += 20
        break
      case 'meta':
        confidence += 20
        break
      default:
        confidence += 10
    }

    // Bonus se email contiene nome dominio
    const emailDomain = email.split('@')[1]?.split('.')[0]
    if (emailDomain && pageText.toLowerCase().includes(emailDomain)) {
      confidence += 15
    }

    // Bonus per pattern comuni
    if (/^info@/i.test(email)) confidence += 10
    if (/^contatti@/i.test(email)) confidence += 10
    if (/^contact@/i.test(email)) confidence += 10

    return Math.min(100, confidence)
  }

  /**
   * Normalizza URL base
   */
  private normalizeBaseUrl(url: string): string {
    let normalized = url.trim()

    if (!normalized.match(/^https?:\/\//i)) {
      normalized = `https://${normalized}`
    }

    try {
      const parsed = new URL(normalized)
      return `${parsed.protocol}//${parsed.host}`
    } catch {
      return normalized
    }
  }

  /**
   * Risolve URL relativo
   */
  private resolveUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).toString()
    } catch {
      return `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
    }
  }

  /**
   * Consolida risultati rimuovendo duplicati
   */
  private consolidateResults(
    sources: EmailSource[],
    scrapedPages: string[],
    startTime: number
  ): EmailScrapingResult {
    // Deduplica email mantenendo quella con confidenza più alta
    const emailMap = new Map<string, EmailSource>()

    sources.forEach(source => {
      const existing = emailMap.get(source.email)
      if (!existing || source.confidence > existing.confidence) {
        emailMap.set(source.email, source)
      }
    })

    const uniqueSources = Array.from(emailMap.values())
    const emails = uniqueSources.map(s => s.email)

    // Trova email primaria (più alta confidenza)
    const primarySource = uniqueSources.sort((a, b) => b.confidence - a.confidence)[0]

    // Calcola confidenza media
    const avgConfidence = uniqueSources.length > 0
      ? uniqueSources.reduce((sum, s) => sum + s.confidence, 0) / uniqueSources.length
      : 0

    return {
      emails,
      sources: uniqueSources,
      primaryEmail: primarySource?.email || null,
      confidence: Math.round(avgConfidence),
      scrapedPages,
      totalTimeMs: Date.now() - startTime
    }
  }
}

// Singleton per uso globale
let globalEmailScraper: EmailScraper | null = null

export function getGlobalEmailScraper(config?: Partial<EmailScraperConfig>): EmailScraper {
  if (!globalEmailScraper) {
    globalEmailScraper = new EmailScraper(config)
  }
  return globalEmailScraper
}
