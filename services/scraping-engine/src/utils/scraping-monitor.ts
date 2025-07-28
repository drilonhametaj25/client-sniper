/**
 * Sistema di monitoraggio performance per il Google Maps Scraper
 * Raccoglie metriche e statistiche per identificare pattern di fallimenti
 * Utilizzato per ottimizzare timeout e configurazioni di scraping
 * Parte del modulo services/scraping-engine
 */

export interface ScrapingMetrics {
  timestamp: Date
  attempt: number
  success: boolean
  error?: string
  timing: {
    browserInit?: number
    pageLoad?: number
    totalDuration: number
  }
  config: {
    maxRetries: number
    timeouts: number[]
    strategy: string
  }
}

export interface ScrapingStats {
  totalAttempts: number
  successfulAttempts: number
  failedAttempts: number
  successRate: number
  avgLoadTime: number
  commonErrors: Array<{
    error: string
    count: number
  }>
  performanceByStrategy: Map<string, {
    attempts: number
    successes: number
    avgTime: number
  }>
}

export class ScrapingMonitor {
  private metrics: ScrapingMetrics[] = []
  private maxMetricsHistory = 1000

  /**
   * Registra un tentativo di scraping
   */
  recordAttempt(metrics: ScrapingMetrics): void {
    this.metrics.push(metrics)
    
    // Mantieni solo le metriche più recenti
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }
  }

  /**
   * Ottiene statistiche aggregate
   */
  getStats(timeframe?: { hours?: number; days?: number }): ScrapingStats {
    let filteredMetrics = this.metrics

    // Filtra per timeframe se specificato
    if (timeframe) {
      const cutoff = new Date()
      if (timeframe.hours) {
        cutoff.setHours(cutoff.getHours() - timeframe.hours)
      } else if (timeframe.days) {
        cutoff.setDate(cutoff.getDate() - timeframe.days)
      }
      
      filteredMetrics = this.metrics.filter(m => m.timestamp >= cutoff)
    }

    const totalAttempts = filteredMetrics.length
    const successfulAttempts = filteredMetrics.filter(m => m.success).length
    const failedAttempts = totalAttempts - successfulAttempts
    const successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0

    // Calcola tempo medio di caricamento per tentativi riusciti
    const successfulWithTiming = filteredMetrics.filter(m => m.success && m.timing.pageLoad)
    const avgLoadTime = successfulWithTiming.length > 0
      ? successfulWithTiming.reduce((sum, m) => sum + (m.timing.pageLoad || 0), 0) / successfulWithTiming.length
      : 0

    // Analizza errori comuni
    const errorCounts = new Map<string, number>()
    filteredMetrics.filter(m => !m.success && m.error).forEach(m => {
      const error = m.error!
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
    })

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Performance per strategia
    const strategyPerformance = new Map<string, { attempts: number; successes: number; avgTime: number }>()
    filteredMetrics.forEach(m => {
      const strategy = m.config.strategy
      const current = strategyPerformance.get(strategy) || { attempts: 0, successes: 0, avgTime: 0 }
      
      current.attempts++
      if (m.success) {
        current.successes++
        if (m.timing.pageLoad) {
          current.avgTime = ((current.avgTime * (current.successes - 1)) + m.timing.pageLoad) / current.successes
        }
      }
      
      strategyPerformance.set(strategy, current)
    })

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate,
      avgLoadTime,
      commonErrors,
      performanceByStrategy: strategyPerformance
    }
  }

  /**
   * Ottiene raccomandazioni per ottimizzare la configurazione
   */
  getOptimizationRecommendations(): string[] {
    const stats = this.getStats({ hours: 24 })
    const recommendations: string[] = []

    // Basso tasso di successo
    if (stats.successRate < 0.7) {
      recommendations.push('Considerare aumento timeout o numero di retry')
    }

    // Tempo di caricamento alto
    if (stats.avgLoadTime > 30000) {
      recommendations.push('Valutare disabilitazione di risorse non necessarie (immagini, CSS)')
    }

    // Analizza errori comuni
    const timeoutErrors = stats.commonErrors.filter(e => 
      e.error.toLowerCase().includes('timeout') || 
      e.error.toLowerCase().includes('timed out')
    )
    
    if (timeoutErrors.length > 0 && timeoutErrors[0].count > stats.totalAttempts * 0.3) {
      recommendations.push('Timeout troppo aggressivi - considerare aumento')
    }

    // Analizza performance per strategia
    let bestStrategy = ''
    let bestRate = 0
    
    stats.performanceByStrategy.forEach((perf, strategy) => {
      const rate = perf.successes / perf.attempts
      if (rate > bestRate) {
        bestRate = rate
        bestStrategy = strategy
      }
    })

    if (bestStrategy && bestRate > 0.8) {
      recommendations.push(`Strategia '${bestStrategy}' ha performance migliori - considerare prioritizzazione`)
    }

    return recommendations
  }

  /**
   * Esporta metriche per analisi esterna
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2)
    }
    
    // Formato CSV
    const headers = ['timestamp', 'attempt', 'success', 'error', 'browserInit', 'pageLoad', 'totalDuration', 'strategy']
    const rows = this.metrics.map(m => [
      m.timestamp.toISOString(),
      m.attempt.toString(),
      m.success.toString(),
      m.error || '',
      (m.timing.browserInit || '').toString(),
      (m.timing.pageLoad || '').toString(),
      m.timing.totalDuration.toString(),
      m.config.strategy
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  /**
   * Reset delle metriche
   */
  reset(): void {
    this.metrics = []
  }
}

// Istanza globale del monitor
export const scrapingMonitor = new ScrapingMonitor()
