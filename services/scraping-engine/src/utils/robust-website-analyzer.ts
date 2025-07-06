/**
 * Sistema robusto per analisi siti web difficili da raggiungere
 * 
 * Gestisce:
 * - Siti con protezioni anti-bot
 * - Timeout e errori di rete
 * - Redirects complessi
 * - Fallback per analisi parziali
 * 
 * Utilizzato quando l'analisi standard fallisce
 * Parte del scraping-engine/src/utils
 */

import { Browser, Page } from 'playwright'
import { WebsiteStatusChecker, WebsiteStatusResult } from './website-status-checker'
import { PerformanceAnalyzer } from './performance-analyzer'

export interface RobustAnalysisResult {
  success: boolean
  url: string
  finalUrl?: string
  isAccessible: boolean
  httpStatus?: number
  error?: string
  
  // Analisi di base (sempre disponibili)
  basicCheck: {
    hasWebsite: boolean
    responding: boolean
    redirects: number
    ssl: boolean
  }
  
  // Analisi avanzata (se possibile)
  advanced?: {
    performance?: any
    seo?: any
    privacy?: any
    techStack?: any
    mobile?: any
    tracking?: any
  }
  
  // Fallback info
  estimatedIssues: string[]
  suggestedServices: string[]
  confidenceLevel: 'low' | 'medium' | 'high'
}

export class RobustWebsiteAnalyzer {
  private statusChecker: WebsiteStatusChecker
  private performanceAnalyzer: PerformanceAnalyzer
  
  constructor() {
    this.statusChecker = new WebsiteStatusChecker()
    this.performanceAnalyzer = new PerformanceAnalyzer()
  }

  /**
   * Analizza un sito web con approccio robusto e fallback intelligenti
   */
  async analyzeRobustly(url: string, browser: Browser): Promise<RobustAnalysisResult> {
    console.log(`🛡️ Analisi robusta per: ${url}`)
    
    const result: RobustAnalysisResult = {
      success: false,
      url,
      isAccessible: false,
      basicCheck: {
        hasWebsite: true,
        responding: false,
        redirects: 0,
        ssl: url.startsWith('https://')
      },
      estimatedIssues: [],
      suggestedServices: [],
      confidenceLevel: 'low'
    }

    try {
      // FASE 1: Test di connettività base
      const statusResult = await this.performBasicConnectivityTest(url)
      result.basicCheck = { ...result.basicCheck, ...statusResult.basicInfo }
      result.httpStatus = statusResult.httpStatus
      result.finalUrl = statusResult.finalUrl

      if (!statusResult.isAccessible) {
        // Sito non raggiungibile - analisi basata su URL e tipo
        return this.createOfflineAnalysis(url, statusResult, result)
      }

      // FASE 2: Tentativo analisi browser con protezioni anti-bot
      const browserResult = await this.attemptBrowserAnalysis(statusResult.finalUrl || url, browser)
      
      if (browserResult.success) {
        result.success = true
        result.isAccessible = true
        result.advanced = browserResult.data
        result.confidenceLevel = 'high'
      } else {
        // Browser fallito ma sito raggiungibile - analisi ibrida
        result.isAccessible = true
        result.success = false
        result.error = browserResult.error
        result.confidenceLevel = 'medium'
      }

      // FASE 3: Genera insights anche con dati limitati
      this.generateEstimatedIssues(result)
      
      return result

    } catch (error) {
      console.error(`💥 Errore analisi robusta:`, error)
      result.error = error instanceof Error ? error.message : 'Errore sconosciuto'
      return this.createEmergencyAnalysis(url, result)
    }
  }

  /**
   * Test di connettività base senza browser
   */
  private async performBasicConnectivityTest(url: string): Promise<{
    isAccessible: boolean
    httpStatus?: number
    finalUrl?: string
    basicInfo: any
  }> {
    try {
      const statusResult = await this.statusChecker.checkWebsiteStatus(url)
      
      return {
        isAccessible: statusResult.isAccessible,
        httpStatus: statusResult.httpCode,
        finalUrl: statusResult.finalUrl,
        basicInfo: {
          hasWebsite: true,
          responding: statusResult.isAccessible,
          redirects: (statusResult as any).redirectCount || 0,
          ssl: (statusResult.finalUrl || url).startsWith('https://')
        }
      }
    } catch (error) {
      console.log(`⚠️ Test connettività fallito:`, error)
      return {
        isAccessible: false,
        basicInfo: {
          hasWebsite: true,
          responding: false,
          redirects: 0,
          ssl: url.startsWith('https://')
        }
      }
    }
  }

  /**
   * Tentativo di analisi con browser usando tecniche anti-rilevamento
   */
  private async attemptBrowserAnalysis(url: string, browser: Browser): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    let page: Page | null = null
    
    try {
      console.log(`🎭 Tentativo analisi browser per: ${url}`)
      
      // Crea nuova pagina con stealth mode
      page = await browser.newPage()
      
      // Configura stealth anti-detection
      await this.setupStealthMode(page)
      
      // Tentativo 1: Navigazione standard
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        })
        
        // Attendi rendering parziale
        await page.waitForTimeout(2000)
        
        // Raccoglie dati base
        const basicData = await this.collectBasicPageData(page)
        
        return { 
          success: true, 
          data: basicData 
        }
        
      } catch (navError) {
        console.log(`⚠️ Navigazione standard fallita, provo modalità conservativa`)
        
        // Tentativo 2: Modalità ultra-conservativa
        return await this.attemptConservativeAnalysis(page, url)
      }
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore browser' 
      }
    } finally {
      if (page) {
        try {
          await page.close()
        } catch (closeError) {
          console.log(`⚠️ Errore chiusura pagina:`, closeError)
        }
      }
    }
  }

  /**
   * Configura modalità stealth per evitare detection
   */
  private async setupStealthMode(page: Page): Promise<void> {
    // User agent realistico
    await page.route('**/*', (route) => {
      route.continue({
        headers: {
          ...route.request().headers(),
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
    })
    
    // Headers realistici
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    })
    
    // Viewport standard
    await page.setViewportSize({ width: 1366, height: 768 })
    
    // Rimuovi webdriver properties
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
    })
  }

  /**
   * Tentativo ultra-conservativo con timeout ridotti
   */
  private async attemptConservativeAnalysis(page: Page, url: string): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      // Prova con timeout molto basso
      await page.goto(url, { 
        waitUntil: 'commit', // Solo commit, non aspetta il caricamento
        timeout: 8000 
      })
      
      // Aspetta solo 1 secondo
      await page.waitForTimeout(1000)
      
      // Raccoglie quello che può
      const minimalData = await this.collectMinimalPageData(page)
      
      return { 
        success: true, 
        data: minimalData 
      }
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Modalità conservativa fallita' 
      }
    }
  }

  /**
   * Raccoglie dati base dalla pagina
   */
  private async collectBasicPageData(page: Page): Promise<any> {
    try {
      const data = await page.evaluate(() => {
        return {
          title: document.title || '',
          hasH1: !!document.querySelector('h1'),
          hasMetaDescription: !!document.querySelector('meta[name="description"]'),
          hasImages: document.images.length,
          hasLinks: document.links.length,
          hasSSL: location.protocol === 'https:',
          pageSize: document.documentElement.outerHTML.length,
          hasGoogleAnalytics: !!(window as any).gtag || !!(window as any).ga || !!document.querySelector('[src*="google-analytics"]') || !!document.querySelector('[src*="gtag"]'),
          hasFacebookPixel: !!document.querySelector('[src*="facebook.net"]') || !!(window as any).fbq,
          hasJQuery: !!(window as any).jQuery || !!(window as any).$
        }
      })
      
      return {
        seo: {
          hasTitle: !!data.title,
          title: data.title,
          hasH1: data.hasH1,
          hasMetaDescription: data.hasMetaDescription,
          score: this.calculateBasicSEOScore(data)
        },
        technical: {
          hasSSL: data.hasSSL,
          pageSize: data.pageSize,
          hasImages: data.hasImages > 0,
          hasLinks: data.hasLinks > 0
        },
        tracking: {
          hasGoogleAnalytics: data.hasGoogleAnalytics,
          hasFacebookPixel: data.hasFacebookPixel,
          score: data.hasGoogleAnalytics ? 80 : 20
        },
        isAccessible: true
      }
      
    } catch (error) {
      console.log(`⚠️ Errore raccolta dati base:`, error)
      return { isAccessible: true }
    }
  }

  /**
   * Raccoglie solo dati minimi
   */
  private async collectMinimalPageData(page: Page): Promise<any> {
    try {
      const title = await page.title().catch(() => '')
      const url = page.url()
      
      return {
        seo: {
          hasTitle: !!title,
          title: title,
          score: title ? 40 : 10
        },
        technical: {
          hasSSL: url.startsWith('https://'),
          accessible: true
        },
        isAccessible: true
      }
    } catch (error) {
      return { isAccessible: true }
    }
  }

  /**
   * Crea analisi per siti offline
   */
  private createOfflineAnalysis(url: string, statusResult: any, result: RobustAnalysisResult): RobustAnalysisResult {
    console.log(`🔴 Sito offline, genero analisi basata su URL: ${url}`)
    
    result.estimatedIssues = [
      'Sito web non raggiungibile',
      'Possibili problemi di hosting',
      'Necessaria verifica configurazione DNS'
    ]
    
    result.suggestedServices = [
      'Riparazione sito web',
      'Migrazione hosting',
      'Nuovo sito web'
    ]
    
    // Analisi basata su URL
    if (!url.startsWith('https://')) {
      result.estimatedIssues.push('Certificato SSL mancante')
      result.suggestedServices.push('Installazione certificato SSL')
    }
    
    result.confidenceLevel = 'medium' // Sappiamo che non funziona
    return result
  }

  /**
   * Analisi di emergenza per errori totali
   */
  private createEmergencyAnalysis(url: string, result: RobustAnalysisResult): RobustAnalysisResult {
    console.log(`🆘 Analisi di emergenza per: ${url}`)
    
    result.estimatedIssues = [
      'Impossibile analizzare il sito web',
      'Necessaria verifica manuale'
    ]
    
    result.suggestedServices = [
      'Analisi tecnica manuale',
      'Audit completo del sito'
    ]
    
    result.confidenceLevel = 'low'
    return result
  }

  /**
   * Genera problemi stimati basati sui dati disponibili
   */
  private generateEstimatedIssues(result: RobustAnalysisResult): void {
    if (!result.basicCheck.ssl) {
      result.estimatedIssues.push('Certificato SSL mancante')
      result.suggestedServices.push('Installazione SSL')
    }
    
    if (result.advanced?.seo) {
      if (!result.advanced.seo.hasTitle) {
        result.estimatedIssues.push('Titolo pagina mancante')
        result.suggestedServices.push('Ottimizzazione SEO')
      }
      
      if (!result.advanced.seo.hasMetaDescription) {
        result.estimatedIssues.push('Meta description mancante')
        result.suggestedServices.push('Scrittura contenuti SEO')
      }
    }
    
    if (result.advanced?.tracking && !result.advanced.tracking.hasGoogleAnalytics) {
      result.estimatedIssues.push('Google Analytics non installato')
      result.suggestedServices.push('Setup tracking e analytics')
    }
    
    // Se non abbiamo dati avanzati, stimiamo problemi comuni
    if (!result.advanced) {
      result.estimatedIssues.push(
        'Possibili problemi di performance',
        'SEO da verificare',
        'Compliance GDPR da controllare'
      )
      result.suggestedServices.push(
        'Audit completo del sito',
        'Ottimizzazione performance',
        'Consulenza GDPR'
      )
    }
  }

  /**
   * Calcola score SEO base
   */
  private calculateBasicSEOScore(data: any): number {
    let score = 30 // Score base
    
    if (data.title) score += 20
    if (data.hasH1) score += 15
    if (data.hasMetaDescription) score += 15
    if (data.hasSSL) score += 10
    if (data.hasImages > 0) score += 5
    if (data.hasLinks > 5) score += 5
    
    return Math.min(100, score)
  }
}
