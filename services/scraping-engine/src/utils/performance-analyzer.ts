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
  // Core Web Vitals (2024)
  lcp: number | null // Largest Contentful Paint (ms)
  inp: number | null // Interaction to Next Paint (ms) - SOSTITUISCE FID
  cls: number | null // Cumulative Layout Shift (score)

  // Legacy (deprecato, mantenuto per retrocompatibilità)
  fid: number | null // First Input Delay (ms) - DEPRECATO da Google marzo 2024

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
        inp: coreWebVitals.inp || null,
        fid: coreWebVitals.fid || null, // Deprecato, mantenuto per retrocompatibilità
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
   * INP (Interaction to Next Paint) sostituisce FID dal marzo 2024
   * Timeout migliorato con early resolution quando possibile
   * FIX: Usa Function constructor per evitare errore __name di esbuild/tsx
   */
  private async collectCoreWebVitals(page: Page): Promise<Partial<PerformanceMetrics>> {
    // Usiamo una stringa per evitare che esbuild/tsx aggiunga helpers (__name) che non esistono nel browser
    const webVitalsScript = `
      new Promise((resolve) => {
        const vitals = {
          lcp: null,
          inp: null,
          fid: null,
          cls: null
        };

        let metricsCollected = 0;
        const expectedMetrics = 3;
        let resolved = false;

        function checkAndResolve() {
          metricsCollected++;
          if (!resolved && (metricsCollected >= expectedMetrics || vitals.lcp !== null)) {
            setTimeout(function() {
              if (!resolved) {
                resolved = true;
                resolve(vitals);
              }
            }, 1000);
          }
        }

        if ('PerformanceObserver' in window) {
          // LCP
          try {
            const lcpObserver = new PerformanceObserver(function(entryList) {
              const entries = entryList.getEntries();
              const lastEntry = entries[entries.length - 1];
              vitals.lcp = Math.round(lastEntry.startTime);
              lcpObserver.disconnect();
              checkAndResolve();
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            setTimeout(function() {
              if (vitals.lcp === null) {
                lcpObserver.disconnect();
                checkAndResolve();
              }
            }, 5000);
          } catch (e) {
            checkAndResolve();
          }

          // INP/FID
          try {
            let maxInp = 0;
            const inpObserver = new PerformanceObserver(function(entryList) {
              const entries = entryList.getEntries();
              entries.forEach(function(entry) {
                const duration = entry.duration || 0;
                if (duration > maxInp) {
                  maxInp = duration;
                  vitals.inp = Math.round(maxInp);
                }
              });
            });
            try {
              inpObserver.observe({ type: 'event', buffered: true });
            } catch (e) {
              // event type not supported
            }
            setTimeout(function() {
              inpObserver.disconnect();
              if (vitals.inp === null) {
                try {
                  const fidObserver = new PerformanceObserver(function(entryList) {
                    const entries = entryList.getEntries();
                    entries.forEach(function(entry) {
                      if (entry.processingStart) {
                        vitals.fid = Math.round(entry.processingStart - entry.startTime);
                        if (vitals.inp === null) {
                          vitals.inp = vitals.fid;
                        }
                      }
                    });
                    fidObserver.disconnect();
                  });
                  fidObserver.observe({ type: 'first-input', buffered: true });
                } catch (e) {}
              }
              checkAndResolve();
            }, 4000);
          } catch (e) {
            checkAndResolve();
          }

          // CLS
          try {
            let clsValue = 0;
            let sessionValue = 0;
            let sessionEntries = [];
            const clsObserver = new PerformanceObserver(function(entryList) {
              const entries = entryList.getEntries();
              entries.forEach(function(entry) {
                if (!entry.hadRecentInput) {
                  const firstEntry = sessionEntries[0];
                  const lastEntry = sessionEntries[sessionEntries.length - 1];
                  if (sessionEntries.length > 0 &&
                      entry.startTime - lastEntry.startTime < 1000 &&
                      entry.startTime - firstEntry.startTime < 5000) {
                    sessionValue += entry.value;
                    sessionEntries.push(entry);
                  } else {
                    sessionValue = entry.value;
                    sessionEntries = [entry];
                  }
                  if (sessionValue > clsValue) {
                    clsValue = sessionValue;
                  }
                }
              });
              vitals.cls = Math.round(clsValue * 1000) / 1000;
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
            setTimeout(function() {
              clsObserver.disconnect();
              vitals.cls = vitals.cls !== null ? vitals.cls : Math.round(clsValue * 1000) / 1000;
              checkAndResolve();
            }, 5000);
          } catch (e) {
            checkAndResolve();
          }
        } else {
          resolve(vitals);
        }

        setTimeout(function() {
          if (!resolved) {
            resolved = true;
            resolve(vitals);
          }
        }, 8000);
      })
    `

    const webVitals = await page.evaluate(webVitalsScript)
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
    
    // Mobile Score basato su Core Web Vitals (aggiornato per INP)
    let mobileScore = 100
    if (vitals.lcp && vitals.lcp > 2500) mobileScore -= 30
    // INP soglie: buono <200ms, da migliorare 200-500ms, scarso >500ms
    if (vitals.inp && vitals.inp > 200) mobileScore -= 15
    if (vitals.inp && vitals.inp > 500) mobileScore -= 15
    // Fallback a FID se INP non disponibile
    if (!vitals.inp && vitals.fid && vitals.fid > 100) mobileScore -= 25
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
    
    // INP (sostituisce FID) - soglie: buono <200ms, da migliorare 200-500ms, scarso >500ms
    if (vitals.inp && vitals.inp > 200) {
      issues.push('Interaction to Next Paint (INP) lento')
      recommendations.push('Ridurre JavaScript bloccante e ottimizzare gestori eventi')
    }
    if (vitals.inp && vitals.inp > 500) {
      issues.push('Interattività molto lenta (INP critico)')
      recommendations.push('Suddividere task JavaScript lunghi, usare Web Workers, ridurre complessità DOM')
    }
    // Fallback FID (deprecato)
    if (!vitals.inp && vitals.fid && vitals.fid > 100) {
      issues.push('First Input Delay elevato (metrica deprecata)')
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
      inp: null,
      fid: null, // Deprecato
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
