/**
 * Checker avanzato per stato e accessibilità dei siti web
 * Gestisce redirect, timeout, SSL, errori 5xx e problemi JS
 * Previene falsi negativi nella rilevazione di siti esistenti
 * 
 * Utilizzato dal Website Analyzer per determinare lo stato reale del sito
 * Parte del modulo services/scraping-engine
 */

import axios, { AxiosResponse, AxiosError } from 'axios'
import { chromium, Browser, Page } from 'playwright'
import * as https from 'https'
import * as tls from 'tls'
import type { ReachabilityVerdict } from './confidence'

export type WebsiteStatus =
  | 'online'
  | 'offline'
  | 'broken_link'
  | 'forbidden'
  | 'timeout'
  | 'redirect_loop'
  | 'ssl_error'
  | 'javascript_blocked'
  | 'server_error'
  | 'dns_error'
  | 'parked'
  | 'not_mobile_friendly'

export interface WebsiteStatusResult {
  status: WebsiteStatus
  httpCode: number
  finalUrl: string
  redirectChain: string[]
  sslValid: boolean
  responseTime: number
  isAccessible: boolean
  /**
   * Verdetto di raggiungibilità con confidenza. Distingue l'assenza CERTA
   * (DNS che non risolve) da quella SOSPETTA (timeout/rate-limit): è la chiave
   * per non marcare come "sito assente" un sito vivo ma lento o protetto.
   */
  verdict: ReachabilityVerdict
  /** Numero di tentativi effettuati prima di arrivare al verdetto. */
  attempts: number
  errorMessage?: string
  technicalDetails: {
    hasJavaScript: boolean
    isResponsive: boolean
    contentLength: number
    serverHeaders: Record<string, string>
    sslCertificate?: SSLCertificateInfo
  }
}

export interface SSLCertificateInfo {
  valid: boolean
  issuer: string
  subject: string
  validFrom: Date
  validTo: Date
  daysToExpiry: number
}

export class WebsiteStatusChecker {
  private browser: Browser | null = null
  // Timeout più generoso: 15s tagliava fuori siti lenti/CDN congestionati -> falsi "offline".
  private readonly TIMEOUT_MS = 25000
  private readonly MAX_REDIRECTS = 10
  // Numero massimo di tentativi prima di concludere che un sito è irraggiungibile.
  // Un singolo timeout NON deve bastare a dichiarare un sito offline.
  private readonly MAX_ATTEMPTS = 3
  // Backoff base tra i tentativi (ms). Cresce linearmente: 1.2s, 2.4s, ...
  private readonly RETRY_BACKOFF_MS = 1200
  private readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  /**
   * Verifica completa con RETRY ed emissione di un verdetto con confidenza.
   *
   * Ritenta sui fallimenti transitori (timeout, connessione resettata) prima di
   * concludere alcunché. Un errore DNS, invece, è deterministico: lo confermiamo
   * subito come assenza certa. Il risultato include `verdict` per decidere a valle
   * se il lead è pubblicabile o va in quarantena.
   */
  async checkWebsiteStatus(url: string): Promise<WebsiteStatusResult> {
    const startTime = Date.now()
    const normalizedUrl = this.normalizeUrl(url)

    let lastResult: WebsiteStatusResult | null = null

    for (let attempt = 1; attempt <= this.MAX_ATTEMPTS; attempt++) {
      const result = await this.runSingleCheck(normalizedUrl, startTime)
      result.attempts = attempt

      // Successo, oppure il server ha comunque risposto (4xx/5xx) => il dominio è vivo.
      if (result.isAccessible || result.httpCode > 0) {
        result.verdict = this.computeVerdict(result)
        return result
      }

      // DNS che non risolve = assenza deterministica: inutile ritentare a oltranza.
      if (result.status === 'dns_error') {
        result.verdict = 'offline_confirmed'
        return result
      }

      lastResult = result

      // Fallimento transitorio (timeout/refused/reset): backoff e ritenta.
      if (attempt < this.MAX_ATTEMPTS) {
        const wait = this.RETRY_BACKOFF_MS * attempt
        console.log(`⏳ Tentativo ${attempt}/${this.MAX_ATTEMPTS} fallito (${result.status}), ritento tra ${wait}ms: ${normalizedUrl}`)
        await this.delay(wait)
      }
    }

    // Esauriti i tentativi: il sito resta irraggiungibile. Confidenza = sospetta, non certa.
    const finalResult = lastResult as WebsiteStatusResult
    finalResult.verdict = this.computeVerdict(finalResult)
    finalResult.responseTime = Date.now() - startTime
    return finalResult
  }

  /**
   * Determina il verdetto di raggiungibilità a partire dal risultato grezzo.
   * - online: sito raggiungibile, oppure server che risponde anche con 4xx/5xx (dominio vivo)
   * - offline_confirmed: DNS non risolve o connessione rifiutata in modo ripetuto
   * - offline_suspected: timeout/reset ripetuti -> potrebbe essere vivo ma lento/protetto
   * - uncertain: stato non riconducibile a una causa chiara
   */
  private computeVerdict(result: WebsiteStatusResult): ReachabilityVerdict {
    if (result.isAccessible) return 'online'
    // Il server HA risposto (anche 403/500/503): il dominio esiste ed è raggiungibile.
    if (result.httpCode > 0) return 'online'
    if (result.status === 'dns_error') return 'offline_confirmed'
    if (result.status === 'offline') return 'offline_confirmed' // ECONNREFUSED ripetuto
    if (result.status === 'timeout') return 'offline_suspected'
    return 'uncertain'
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Un singolo tentativo di verifica (HTTP -> fallback HTTPS/HTTP -> SSL -> browser).
   */
  private async runSingleCheck(normalizedUrl: string, startTime: number): Promise<WebsiteStatusResult> {
    console.log(`🔍 Verifica stato sito: ${normalizedUrl}`)

    try {
      // Step 1: Prova l'URL originale
      let httpResult = await this.checkHttpStatus(normalizedUrl)
      let finalUrl = normalizedUrl
      
      // Step 2: Se fallisce e non è HTTPS, prova la versione HTTPS
      if (!httpResult.isAccessible && normalizedUrl.startsWith('http://')) {
        const httpsUrl = normalizedUrl.replace('http://', 'https://')
        console.log(`🔄 HTTP fallito, provo HTTPS: ${httpsUrl}`)
        
        try {
          const httpsResult = await this.checkHttpStatus(httpsUrl)
          if (httpsResult.isAccessible) {
            console.log(`✅ HTTPS funziona! Uso ${httpsUrl}`)
            httpResult = httpsResult
            finalUrl = httpsUrl
          }
        } catch (httpsError) {
          console.log(`⚠️ Anche HTTPS fallito per ${httpsUrl}`)
        }
      }
      
      // Step 3: Se fallisce e non è HTTP, prova la versione HTTP
      if (!httpResult.isAccessible && normalizedUrl.startsWith('https://')) {
        const httpUrl = normalizedUrl.replace('https://', 'http://')
        console.log(`🔄 HTTPS fallito, provo HTTP: ${httpUrl}`)
        
        try {
          const httpUrlResult = await this.checkHttpStatus(httpUrl)
          if (httpUrlResult.isAccessible) {
            console.log(`✅ HTTP funziona! Uso ${httpUrl}`)
            httpResult = httpUrlResult
            finalUrl = httpUrl
          }
        } catch (httpError) {
          console.log(`⚠️ Anche HTTP fallito per ${httpUrl}`)
        }
      }
      
      // Step 4: Controllo SSL se la URL finale è HTTPS
      let sslInfo: SSLCertificateInfo | undefined
      if (finalUrl.startsWith('https://')) {
        sslInfo = await this.checkSSLCertificate(finalUrl)
      }
      
      // Step 5: Se basic check fallisce, prova con browser
      let browserResult: any = null
      if (!httpResult.isAccessible || (httpResult.httpCode && httpResult.httpCode >= 400)) {
        browserResult = await this.checkWithBrowser(finalUrl)
      }
      
      // Step 6: Determina lo stato finale
      const responseTime = Date.now() - startTime
      const finalResult = this.determineFinalStatus(httpResult, browserResult, sslInfo)
      
      return {
        ...finalResult,
        finalUrl: httpResult.finalUrl || finalUrl,
        responseTime,
        // verdict/attempts vengono assegnati dal wrapper checkWebsiteStatus.
        verdict: 'uncertain',
        attempts: 1,
        technicalDetails: {
          ...finalResult.technicalDetails,
          sslCertificate: sslInfo
        }
      }

    } catch (error) {
      console.error(`❌ Errore verifica sito ${normalizedUrl}:`, error)

      return {
        status: 'offline',
        httpCode: 0,
        finalUrl: normalizedUrl,
        redirectChain: [],
        sslValid: false,
        responseTime: Date.now() - startTime,
        isAccessible: false,
        verdict: 'uncertain',
        attempts: 1,
        errorMessage: error instanceof Error ? error.message : 'Errore sconosciuto',
        technicalDetails: {
          hasJavaScript: false,
          isResponsive: false,
          contentLength: 0,
          serverHeaders: {}
        }
      }
    }
  }

  /**
   * Controllo HTTP/HTTPS di base con Axios - versione migliorata
   */
  private async checkHttpStatus(url: string): Promise<Partial<WebsiteStatusResult>> {
    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT_MS,
        maxRedirects: this.MAX_REDIRECTS,
        validateStatus: () => true, // Non fare throw per status codes
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate'
        },
        // Configura Axios per seguire meglio i redirect
        beforeRedirect: (options, responseDetails) => {
          console.log(`🔄 Redirect: ${responseDetails.headers.location}`)
        }
      })

      const redirectChain = this.extractRedirectChain(response)
      const finalUrl = response.request.res?.responseUrl || response.config.url || url
      
      console.log(`📊 Response: ${response.status} per ${url} → ${finalUrl}`)
      
      // Considera successo anche per redirect (3xx)
      const isSuccessful = response.status >= 200 && response.status < 400

      // Rileva pagine "parcheggio" / dominio in vendita / placeholder host:
      // rispondono 200 ma non sono un vero sito aziendale -> opportunità, ma non
      // vanno trattate come sito sano. La distinzione evita falsi "tutto ok".
      const html = typeof response.data === 'string' ? response.data : ''
      const parked = isSuccessful && this.isParkedOrPlaceholder(html, finalUrl)

      return {
        httpCode: response.status,
        finalUrl: finalUrl,
        redirectChain,
        isAccessible: isSuccessful,
        status: parked ? 'parked' : undefined,
        technicalDetails: {
          hasJavaScript: this.detectJavaScript(response.data),
          isResponsive: this.detectResponsiveDesign(response.data),
          contentLength: response.data ? response.data.length : 0,
          serverHeaders: response.headers as Record<string, string>
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError

        if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'EAI_AGAIN') {
          return { status: 'dns_error', httpCode: 0, isAccessible: false }
        }

        if (axiosError.code === 'ECONNREFUSED') {
          return { status: 'offline', httpCode: 0, isAccessible: false }
        }

        // Axios segnala il timeout come ECONNABORTED ('timeout exceeded'); ETIMEDOUT è
        // il livello OS. ECONNRESET è un reset transitorio: lo trattiamo come timeout
        // così il wrapper ritenta invece di dichiarare il sito offline.
        if (
          axiosError.code === 'ECONNABORTED' ||
          axiosError.code === 'ETIMEDOUT' ||
          axiosError.code === 'ECONNRESET' ||
          /timeout/i.test(axiosError.message || '')
        ) {
          return { status: 'timeout', httpCode: 0, isAccessible: false }
        }

        if (axiosError.response) {
          return {
            httpCode: axiosError.response.status,
            finalUrl: url,
            redirectChain: [],
            isAccessible: false,
            status: axiosError.response.status === 403 ? 'forbidden' : 'server_error'
          }
        }
      }
      
      throw error
    }
  }

  /**
   * Controllo con browser per siti JS-heavy o problematici
   */
  private async checkWithBrowser(url: string): Promise<any> {
    await this.initBrowser()
    
    const page = await this.browser!.newPage()
    
    try {
      await page.setExtraHTTPHeaders({
        'User-Agent': this.USER_AGENT
      })
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      // Intercetta le richieste per analisi
      const requestDetails: any = {
        jsErrors: [],
        networkErrors: [],
        resourcesLoaded: 0,
        resourcesFailed: 0
      }
      
      page.on('pageerror', error => {
        requestDetails.jsErrors.push(error.message)
      })
      
      page.on('requestfailed', request => {
        requestDetails.networkErrors.push(request.url())
        requestDetails.resourcesFailed++
      })
      
      page.on('requestfinished', () => {
        requestDetails.resourcesLoaded++
      })
      
      // Prova a caricare la pagina
      const response = await page.goto(url, {
        timeout: this.TIMEOUT_MS,
        waitUntil: 'domcontentloaded'
      })
      
      if (!response) {
        return { status: 'offline', isAccessible: false }
      }
      
      // Attendi che JS completi il rendering
      await page.waitForTimeout(3000)
      
      // Verifica mobile responsiveness
      const isResponsive = await this.checkMobileResponsiveness(page)
      
      // Estrai contenuto finale
      const content = await page.content()
      
      return {
        httpCode: response.status(),
        finalUrl: response.url(),
        isAccessible: response.status() < 400,
        technicalDetails: {
          hasJavaScript: requestDetails.jsErrors.length === 0,
          isResponsive,
          contentLength: content.length,
          jsErrors: requestDetails.jsErrors,
          networkErrors: requestDetails.networkErrors,
          resourcesLoaded: requestDetails.resourcesLoaded,
          resourcesFailed: requestDetails.resourcesFailed
        }
      }
      
    } finally {
      await page.close()
    }
  }

  /**
   * Verifica mobile responsiveness con viewport test
   */
  private async checkMobileResponsiveness(page: Page): Promise<boolean> {
    try {
      // Test viewport mobile
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(1000)
      
      // Controlla se il layout si adatta
      const hasViewportMeta = await page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]')
        return !!viewport
      })
      
      // Controlla se ci sono elementi che escono dal viewport
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth
      })
      
      // Controlla media queries CSS
      const hasResponsiveCss = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets)
        for (const sheet of stylesheets) {
          try {
            const rules = Array.from(sheet.cssRules || [])
            for (const rule of rules) {
              if (rule.type === CSSRule.MEDIA_RULE) {
                return true
              }
            }
          } catch (e) {
            // Ignore CORS errors
          }
        }
        return false
      })
      
      return hasViewportMeta && !hasHorizontalScroll && hasResponsiveCss
      
    } catch (error) {
      console.warn('Errore controllo responsiveness:', error)
      return false
    }
  }

  /**
   * Verifica certificato SSL
   */
  private async checkSSLCertificate(url: string): Promise<SSLCertificateInfo> {
    return new Promise((resolve, reject) => {
      try {
        const hostname = new URL(url).hostname
        const port = 443
        
        const socket = tls.connect(port, hostname, {
          servername: hostname,
          rejectUnauthorized: false // Per controllare anche certificati non validi
        })
        
        socket.on('secureConnect', () => {
          const cert = socket.getPeerCertificate()
          
          if (!cert || Object.keys(cert).length === 0) {
            resolve({
              valid: false,
              issuer: '',
              subject: '',
              validFrom: new Date(),
              validTo: new Date(),
              daysToExpiry: 0
            })
            return
          }
          
          const now = new Date()
          const validTo = new Date(cert.valid_to)
          const daysToExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          resolve({
            valid: socket.authorized,
            issuer: cert.issuer?.CN || cert.issuer?.O || 'Unknown',
            subject: cert.subject?.CN || hostname,
            validFrom: new Date(cert.valid_from),
            validTo,
            daysToExpiry
          })
          
          socket.destroy()
        })
        
        socket.on('error', (error) => {
          resolve({
            valid: false,
            issuer: '',
            subject: hostname,
            validFrom: new Date(),
            validTo: new Date(),
            daysToExpiry: 0
          })
        })
        
        socket.setTimeout(5000, () => {
          socket.destroy()
          reject(new Error('SSL check timeout'))
        })
        
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Determina lo stato finale basandosi su tutti i controlli
   */
  private determineFinalStatus(
    httpResult: Partial<WebsiteStatusResult>,
    browserResult: any,
    sslInfo?: SSLCertificateInfo
  ): Omit<WebsiteStatusResult, 'responseTime' | 'verdict' | 'attempts'> {
    
    // Se il browser riesce dove HTTP fallisce
    if (browserResult && browserResult.isAccessible && !httpResult.isAccessible) {
      return {
        status: 'online',
        httpCode: browserResult.httpCode,
        finalUrl: browserResult.finalUrl,
        redirectChain: [],
        sslValid: sslInfo?.valid || false,
        isAccessible: true,
        technicalDetails: browserResult.technicalDetails
      }
    }
    
    // Se entrambi falliscono
    if (!httpResult.isAccessible && (!browserResult || !browserResult.isAccessible)) {
      let status: WebsiteStatus = 'offline'
      
      if (httpResult.status === 'dns_error') status = 'dns_error'
      else if (httpResult.status === 'timeout') status = 'timeout'
      else if (httpResult.httpCode === 403) status = 'forbidden'
      else if (httpResult.httpCode && httpResult.httpCode >= 500) status = 'server_error'
      else if (httpResult.redirectChain && httpResult.redirectChain.length > 5) status = 'redirect_loop'
      
      return {
        status,
        httpCode: httpResult.httpCode || 0,
        finalUrl: httpResult.finalUrl || '',
        redirectChain: httpResult.redirectChain || [],
        sslValid: sslInfo?.valid || false,
        isAccessible: false,
        technicalDetails: httpResult.technicalDetails || {
          hasJavaScript: false,
          isResponsive: false,
          contentLength: 0,
          serverHeaders: {}
        }
      }
    }
    
    // Successo HTTP (preserva 'parked' se rilevato: dominio vivo ma senza sito reale)
    return {
      status: httpResult.status === 'parked' ? 'parked' : 'online',
      httpCode: httpResult.httpCode || 200,
      finalUrl: httpResult.finalUrl || '',
      redirectChain: httpResult.redirectChain || [],
      sslValid: sslInfo?.valid || false,
      isAccessible: true,
      technicalDetails: httpResult.technicalDetails || {
        hasJavaScript: false,
        isResponsive: false,
        contentLength: 0,
        serverHeaders: {}
      }
    }
  }

  /**
   * Estrae catena di redirect
   */
  private extractRedirectChain(response: AxiosResponse): string[] {
    const chain: string[] = []
    
    // Axios non espone direttamente la catena di redirect
    // Utilizziamo request.res per provare a ricostruirla
    if (response.request?.res?.responseUrl && response.request.res.responseUrl !== response.config.url) {
      chain.push(response.config.url || '')
      chain.push(response.request.res.responseUrl)
    }
    
    return chain
  }

  /**
   * Rileva presenza di JavaScript
   */
  private detectJavaScript(html: string): boolean {
    return /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(html)
  }

  /**
   * Rileva design responsive
   */
  private detectResponsiveDesign(html: string): boolean {
    // Cerca meta viewport
    const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html)
    
    // Cerca media queries
    const hasMediaQueries = /@media[^{]*\{/i.test(html)
    
    // Cerca classi responsive comuni
    const hasResponsiveClasses = /\b(col-|row-|flex|grid|responsive|mobile|tablet)\b/i.test(html)
    
    return hasViewport || hasMediaQueries || hasResponsiveClasses
  }

  /**
   * Rileva pagine "parcheggio", domini in vendita o placeholder dell'hosting.
   * Questi siti rispondono 200 ma non sono un vero sito aziendale: per il
   * lead-gen equivalgono a "sito assente" (ottima opportunità), ma non vanno
   * confusi con un sito funzionante. Heuristica volutamente conservativa:
   * combiniamo pattern testuali tipici con la pochezza del contenuto.
   */
  private isParkedOrPlaceholder(html: string, finalUrl: string): boolean {
    if (!html) return false
    const lower = html.toLowerCase()

    const parkingPatterns = [
      'this domain is for sale',
      'domain is for sale',
      'buy this domain',
      'questo dominio è in vendita',
      'dominio in vendita',
      'parked free, courtesy of',
      'domain parking',
      'godaddy.com/domains',
      'sedoparking.com',
      'bodis.com',
      'hugedomains',
      'afternic',
      'future home of something qute',
      'future home of something quite cool',
      'default web site page',
      'apache2 ubuntu default page',
      'welcome to nginx',
      'index of /',
      'website coming soon',
      'sito in costruzione',
      'coming soon',
      'site under construction',
      'account suspended',
      'this account has been suspended',
    ]

    const matched = parkingPatterns.some(p => lower.includes(p))
    if (!matched) return false

    // Per i pattern molto generici ('coming soon', 'in costruzione') richiediamo
    // anche un contenuto povero, così non scartiamo un sito reale che cita la frase.
    const strongPatterns = [
      'for sale', 'in vendita', 'parking', 'suspended', 'default page',
      'welcome to nginx', 'apache2 ubuntu default',
    ]
    const isStrong = strongPatterns.some(p => lower.includes(p))
    if (isStrong) return true

    // 'coming soon' / 'in costruzione': solo se la pagina è davvero scarna.
    return html.length < 4000
  }

  /**
   * Normalizza URL
   */
  private normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Prova HTTPS prima
      return `https://${url}`
    }
    return url
  }

  /**
   * Inizializza browser
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })
  }

  /**
   * Chiude browser
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Verifica rapida se un URL è raggiungibile
   */
  static async quickCheck(url: string): Promise<boolean> {
    const checker = new WebsiteStatusChecker()
    try {
      const result = await checker.checkWebsiteStatus(url)
      return result.isAccessible
    } catch {
      return false
    } finally {
      await checker.closeBrowser()
    }
  }
}
