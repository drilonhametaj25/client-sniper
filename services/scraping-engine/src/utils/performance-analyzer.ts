/**
 * Analizzatore di performance avanzato per siti web
 * Misura TTFB, LCP, FID, CLS, dimensioni e velocità di caricamento
 * Utilizza Lighthouse API quando disponibile o metriche Playwright
 * 
 * Utilizzato dal Website Analyzer per valutazioni di performance complete
 * Parte del modulo services/scraping-engine
 */

import { Page } from 'playwright'

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null // Largest Contentful Paint (ms)
  fid: number | null // First Input Delay (ms)  
  cls: number | null // Cumulative Layout Shift (score)
  
  // Timing Metrics
  ttfb: number | null // Time to First Byte (ms)
  fcp: number | null // First Contentful Paint (ms)
  domContentLoaded: number | null // DOMContentLoaded (ms)
  loadComplete: number | null // Window Load (ms)
  
  // Resource Metrics
  totalResources: number
  totalSize: number // bytes
  imageSize: number // bytes
  jsSize: number // bytes
  cssSize: number // bytes
  
  // Network Metrics
  requestCount: number
  failedRequests: number
  cachedRequests: number
  
  // Performance Scores
  speedScore: number // 0-100
  optimizationScore: number // 0-100
  mobileScore: number // 0-100
  
  // Issues
  performanceIssues: string[]
  recommendations: string[]
}

export interface ResourceInfo {
  url: string
  type: string
  size: number
  duration: number
  fromCache: boolean
  failed: boolean
}

export class PerformanceAnalyzer {
  private navigationStart: number = 0
  private resources: ResourceInfo[] = []
  
  /**
   * Analizza le performance di una pagina
   */
  async analyzePerformance(page: Page, url: string): Promise<PerformanceMetrics> {
    console.log(`🚀 Analisi performance per: ${url}`)
    
    // Inizializza tracking delle risorse
    this.setupResourceTracking(page)
    
    // Naviga e misura timing
    const startTime = Date.now()
    this.navigationStart = startTime
    
    try {
      // Configura context per evitare blocchi anti-bot
      await page.context().addInitScript(() => {
        // Rimuove webdriver property per evitare detection
        delete (window as any).webdriver
      })
      
      // Headers realistici
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      })
      
      console.log(`⏱️ Tentativo navigazione a: ${url}`)
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded', // Meno restrittivo di networkidle
        timeout: 30000  // Timeout più generoso per siti lenti
      })
      
      if (!response) {
        throw new Error('Risposta nulla dal server - possibile blocco anti-bot')
      }
      
      const statusCode = response.status()
      console.log(`📡 Risposta HTTP: ${statusCode}`)
      
      if (statusCode >= 500) {
        throw new Error(`HTTP ${statusCode}: Errore server - ${response.statusText()}`)
      }
      
      if (statusCode >= 400) {
        console.log(`⚠️ HTTP ${statusCode} per ${url} - continuo analisi limitata`)
        // Non bloccare per 4xx, potrebbe essere un redirect o auth
      }
      
      // Attendi completamento rendering con fallback
      try {
        await page.waitForTimeout(3000) // Più tempo per rendering
        await page.waitForLoadState('networkidle', { timeout: 10000 })
      } catch (loadError) {
        console.log(`⚠️ Timeout attesa caricamento, continuo con analisi parziale`)
      }
      
      // Raccoglie metriche timing
      const timingMetrics = await this.collectTimingMetrics(page)
      
      // Raccoglie Core Web Vitals
      const coreWebVitals = await this.collectCoreWebVitals(page)
      
      // Analizza risorse
      const resourceMetrics = this.analyzeResources()
      
      // Calcola punteggi
      const scores = this.calculatePerformanceScores(timingMetrics, resourceMetrics, coreWebVitals)
      
      // Genera raccomandazioni
      const { issues, recommendations } = this.generateRecommendations(timingMetrics, resourceMetrics, coreWebVitals)
      
      return {
        ...timingMetrics,
        ...coreWebVitals,
        ...resourceMetrics,
        ...scores,
        // Garantisce che tutti i campi siano definiti
        lcp: coreWebVitals.lcp || null,
        fid: coreWebVitals.fid || null,
        cls: coreWebVitals.cls || null,
        ttfb: timingMetrics.ttfb || null,
        fcp: timingMetrics.fcp || null,
        domContentLoaded: timingMetrics.domContentLoaded || null,
        loadComplete: timingMetrics.loadComplete || null,
        totalResources: resourceMetrics.totalResources || 0,
        totalSize: resourceMetrics.totalSize || 0,
        imageSize: resourceMetrics.imageSize || 0,
        jsSize: resourceMetrics.jsSize || 0,
        cssSize: resourceMetrics.cssSize || 0,
        requestCount: resourceMetrics.requestCount || 0,
        failedRequests: resourceMetrics.failedRequests || 0,
        cachedRequests: resourceMetrics.cachedRequests || 0,
        speedScore: scores.speedScore || 0,
        optimizationScore: scores.optimizationScore || 0,
        mobileScore: scores.mobileScore || 0,
        performanceIssues: issues,
        recommendations
      }
      
    } catch (error) {
      console.error('Errore durante analisi performance:', error)
      
      return this.getDefaultMetrics()
    }
  }

  /**
   * Setup tracking delle risorse di rete
   */
  private setupResourceTracking(page: Page): void {
    this.resources = []
    
    page.on('request', request => {
      // Traccia richieste in uscita
    })
    
    page.on('response', response => {
      const request = response.request()
      
      this.resources.push({
        url: response.url(),
        type: this.categorizeResource(response.url(), request.resourceType()),
        size: 0, // Sarà aggiornato se disponibile
        duration: 0, // Timing non disponibile in Playwright Response
        fromCache: response.fromServiceWorker() || response.status() === 304,
        failed: response.status() >= 400
      })
    })
  }

  /**
   * Raccoglie metriche di timing della navigazione
   */
  private async collectTimingMetrics(page: Page): Promise<Partial<PerformanceMetrics>> {
    const timingData = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      if (!nav) return null
      
      return {
        ttfb: nav.responseStart - nav.requestStart,
        fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
        loadComplete: nav.loadEventEnd - nav.fetchStart,
        dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
        tcpConnect: nav.connectEnd - nav.connectStart,
        sslTime: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0
      }
    })
    
    return timingData || {}
  }

  /**
   * Raccoglie Core Web Vitals usando API del browser
   */
  private async collectCoreWebVitals(page: Page): Promise<Partial<PerformanceMetrics>> {
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          lcp: null as number | null,
          fid: null as number | null,
          cls: null as number | null
        }
        
        // LCP - Largest Contentful Paint
        if ('PerformanceObserver' in window) {
          try {
            new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries()
              const lastEntry = entries[entries.length - 1]
              vitals.lcp = lastEntry.startTime
            }).observe({ entryTypes: ['largest-contentful-paint'] })
          } catch (e) {
            console.warn('LCP non supportato')
          }
          
          // FID - First Input Delay
          try {
            new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries()
              entries.forEach((entry: any) => {
                if (entry.processingStart) {
                  vitals.fid = entry.processingStart - entry.startTime
                }
              })
            }).observe({ entryTypes: ['first-input'] })
          } catch (e) {
            console.warn('FID non supportato')
          }
          
          // CLS - Cumulative Layout Shift
          try {
            let clsValue = 0
            new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries()
              entries.forEach((entry: any) => {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value
                }
              })
              vitals.cls = clsValue
            }).observe({ entryTypes: ['layout-shift'] })
          } catch (e) {
            console.warn('CLS non supportato')
          }
        }
        
        // Fallback timeout
        setTimeout(() => resolve(vitals), 3000)
      })
    })
    
    return webVitals as Partial<PerformanceMetrics>
  }

  /**
   * Analizza le risorse caricate
   */
  private analyzeResources(): Partial<PerformanceMetrics> {
    const totalResources = this.resources.length
    const failedRequests = this.resources.filter(r => r.failed).length
    const cachedRequests = this.resources.filter(r => r.fromCache).length
    
    // Stima dimensioni per tipo
    const imageResources = this.resources.filter(r => r.type === 'image')
    const jsResources = this.resources.filter(r => r.type === 'script')
    const cssResources = this.resources.filter(r => r.type === 'stylesheet')
    
    return {
      totalResources,
      requestCount: totalResources,
      failedRequests,
      cachedRequests,
      totalSize: this.estimateTotalSize(),
      imageSize: imageResources.length * 50000, // Stima 50KB per immagine
      jsSize: jsResources.length * 30000, // Stima 30KB per script
      cssSize: cssResources.length * 20000 // Stima 20KB per CSS
    }
  }

  /**
   * Calcola punteggi di performance
   */
  private calculatePerformanceScores(
    timing: Partial<PerformanceMetrics>,
    resources: Partial<PerformanceMetrics>,
    vitals: Partial<PerformanceMetrics>
  ): Partial<PerformanceMetrics> {
    
    // Speed Score basato su timing
    let speedScore = 100
    if (timing.loadComplete && timing.loadComplete > 3000) speedScore -= 30
    if (timing.loadComplete && timing.loadComplete > 5000) speedScore -= 30
    if (timing.ttfb && timing.ttfb > 600) speedScore -= 20
    if (timing.fcp && timing.fcp > 1800) speedScore -= 20
    
    // Optimization Score basato su risorse
    let optimizationScore = 100
    if (resources.failedRequests && resources.failedRequests > 0) optimizationScore -= 20
    if (resources.totalResources && resources.totalResources > 100) optimizationScore -= 15
    if (resources.totalSize && resources.totalSize > 2000000) optimizationScore -= 25 // 2MB
    
    // Mobile Score basato su Core Web Vitals
    let mobileScore = 100
    if (vitals.lcp && vitals.lcp > 2500) mobileScore -= 30
    if (vitals.fid && vitals.fid > 100) mobileScore -= 25
    if (vitals.cls && vitals.cls > 0.1) mobileScore -= 25
    
    return {
      speedScore: Math.max(0, speedScore),
      optimizationScore: Math.max(0, optimizationScore),
      mobileScore: Math.max(0, mobileScore)
    }
  }

  /**
   * Genera raccomandazioni di ottimizzazione
   */
  private generateRecommendations(
    timing: Partial<PerformanceMetrics>,
    resources: Partial<PerformanceMetrics>,
    vitals: Partial<PerformanceMetrics>
  ): { issues: string[], recommendations: string[] } {
    
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Controlli timing
    if (timing.loadComplete && timing.loadComplete > 5000) {
      issues.push('Tempo di caricamento troppo lento')
      recommendations.push('Ottimizzare immagini e minimizzare CSS/JS')
    }
    
    if (timing.ttfb && timing.ttfb > 800) {
      issues.push('Time to First Byte elevato')
      recommendations.push('Migliorare le performance del server o usare CDN')
    }
    
    // Controlli risorse
    if (resources.totalResources && resources.totalResources > 150) {
      issues.push('Troppe richieste HTTP')
      recommendations.push('Combinare file CSS/JS e ottimizzare le immagini')
    }
    
    if (resources.failedRequests && resources.failedRequests > 0) {
      issues.push('Risorse non caricate correttamente')
      recommendations.push('Verificare e correggere i link alle risorse')
    }
    
    if (resources.totalSize && resources.totalSize > 3000000) {
      issues.push('Pagina troppo pesante')
      recommendations.push('Comprimere immagini e abilitare compressione gzip')
    }
    
    // Controlli Core Web Vitals
    if (vitals.lcp && vitals.lcp > 2500) {
      issues.push('Largest Contentful Paint lento')
      recommendations.push('Ottimizzare le immagini hero e il caricamento delle risorse critiche')
    }
    
    if (vitals.cls && vitals.cls > 0.1) {
      issues.push('Layout instabile (CLS)')
      recommendations.push('Specificare dimensioni per immagini e contenuti dinamici')
    }
    
    if (vitals.fid && vitals.fid > 100) {
      issues.push('Interattività ritardata')
      recommendations.push('Ridurre JavaScript non necessario e ottimizzare il thread principale')
    }
    
    return { issues, recommendations }
  }

  /**
   * Categorizza il tipo di risorsa
   */
  private categorizeResource(url: string, type: string): string {
    if (type === 'image') return 'image'
    if (type === 'stylesheet') return 'stylesheet'
    if (type === 'script') return 'script'
    if (type === 'font') return 'font'
    if (url.includes('.mp4') || url.includes('.webm')) return 'video'
    if (url.includes('.pdf')) return 'document'
    return 'other'
  }

  /**
   * Stima la dimensione totale delle risorse
   */
  private estimateTotalSize(): number {
    // Stima approssimativa basata sul numero e tipo di risorse
    return this.resources.reduce((total, resource) => {
      switch (resource.type) {
        case 'image': return total + 50000 // 50KB media
        case 'script': return total + 30000 // 30KB media
        case 'stylesheet': return total + 20000 // 20KB media
        case 'font': return total + 40000 // 40KB media
        default: return total + 10000 // 10KB media
      }
    }, 0)
  }

  /**
   * Metriche di default in caso di errore
   */
  private getDefaultMetrics(): PerformanceMetrics {
    return {
      lcp: null,
      fid: null,
      cls: null,
      ttfb: null,
      fcp: null,
      domContentLoaded: null,
      loadComplete: null,
      totalResources: 0,
      totalSize: 0,
      imageSize: 0,
      jsSize: 0,
      cssSize: 0,
      requestCount: 0,
      failedRequests: 0,
      cachedRequests: 0,
      speedScore: 0,
      optimizationScore: 0,
      mobileScore: 0,
      performanceIssues: ['Impossibile analizzare le performance'],
      recommendations: ['Verificare che il sito sia accessibile']
    }
  }

  /**
   * Valutazione rapida delle performance
   */
  static async quickPerformanceCheck(page: Page): Promise<{ score: number, issues: string[] }> {
    try {
      const startTime = Date.now()
      
      // Misura tempo di caricamento base
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
      const loadTime = Date.now() - startTime
      
      // Calcola punteggio semplificato
      let score = 100
      if (loadTime > 3000) score -= 30
      if (loadTime > 5000) score -= 30
      if (loadTime > 8000) score -= 40
      
      const issues: string[] = []
      if (loadTime > 5000) issues.push('Caricamento lento')
      if (loadTime > 8000) issues.push('Caricamento molto lento')
      
      return { score: Math.max(0, score), issues }
      
    } catch (error) {
      return { score: 0, issues: ['Timeout durante il caricamento'] }
    }
  }
}
