/**
 * Analizzatore di performance per siti web
 * Misura TTFB, LCP, INP, CLS e dimensioni REALI dalla Resource Timing API
 * del caricamento ORIGINALE della pagina: NON naviga mai la pagina
 * (la ri-navigazione distruggeva il contesto degli altri moduli di analisi)
 * e non stima/fabbrica dimensioni.
 *
 * Utilizzato dall'EnhancedWebsiteAnalyzer, DOPO il page.goto principale.
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
  /**
   * Analizza le performance della pagina GIÀ CARICATA.
   * REGOLA: non naviga mai, non modifica header/viewport, non ha stato interno.
   * Tutte le metriche vengono dal caricamento originale (Navigation/Resource
   * Timing API + PerformanceObserver buffered).
   *
   * @param failedRequests numero di risposte >=400 osservate dal chiamante
   *                       (la Resource Timing API non espone gli status code)
   */
  async analyzePerformance(page: Page, url: string, failedRequests: number = 0): Promise<PerformanceMetrics> {
    try {
      // Raccoglie metriche timing dal caricamento originale
      const timingMetrics = await this.collectTimingMetrics(page)

      // Raccoglie Core Web Vitals (observer buffered: leggono eventi già accaduti)
      const coreWebVitals = await this.collectCoreWebVitals(page)

      // Risorse REALI dalla Resource Timing API (transferSize/encodedBodySize)
      const resourceMetrics = await this.collectResourceMetrics(page)
      resourceMetrics.failedRequests = failedRequests

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
   * Risorse REALI dalla Resource Timing API del caricamento originale.
   * transferSize = byte effettivamente trasferiti (0 se servito da cache);
   * niente più dimensioni fabbricate con "conteggio × costante".
   */
  private async collectResourceMetrics(page: Page): Promise<Partial<PerformanceMetrics>> {
    const data = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      let totalSize = 0
      let imageSize = 0
      let jsSize = 0
      let cssSize = 0
      let cached = 0

      for (const e of entries) {
        const size = e.transferSize || e.encodedBodySize || 0
        totalSize += size

        // transferSize 0 con body decodificato = servita dalla cache
        if (e.transferSize === 0 && e.decodedBodySize > 0) cached++

        const it = (e as any).initiatorType || ''
        const name = e.name || ''
        if (it === 'img' || /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i.test(name)) {
          imageSize += size
        } else if (it === 'script' || /\.m?js(\?|$)/i.test(name)) {
          jsSize += size
        } else if (it === 'link' || /\.css(\?|$)/i.test(name)) {
          cssSize += size
        }
      }

      return {
        totalResources: entries.length,
        requestCount: entries.length,
        totalSize,
        imageSize,
        jsSize,
        cssSize,
        cachedRequests: cached
      }
    })

    return data
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
