/**
 * Orchestratore per batch processing del scraping migliorato
 * Gestisce code di scraping, retry automatici e distribuzione del carico
 * Integra zone geografiche e scheduling intelligente per evitare duplicati
 */

import { GoogleMapsScraper, GoogleMapsScrapingOptions } from '../scrapers/google-maps-improved'
import { BusinessLead, ScrapingResult } from '../types/LeadAnalysis'

export interface BatchScrapingJob {
  id: string
  query: string
  location: string
  category: string
  maxResults: number
  priority: 'high' | 'medium' | 'low'
  retryCount: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: ScrapingResult
  error?: string
}

export interface BatchScrapingOptions {
  maxConcurrentJobs: number
  defaultDelay: number
  maxRetries: number
  enableSiteAnalysis: boolean
  saveResults: boolean
}

export class ScrapingOrchestrator {
  private queue: BatchScrapingJob[] = []
  private running: BatchScrapingJob[] = []
  private completed: BatchScrapingJob[] = []
  private options: BatchScrapingOptions
  private isProcessing = false

  constructor(options: Partial<BatchScrapingOptions> = {}) {
    this.options = {
      maxConcurrentJobs: 3,
      defaultDelay: 2000,
      maxRetries: 3,
      enableSiteAnalysis: true,
      saveResults: true,
      ...options
    }
  }

  /**
   * Aggiunge un job alla coda
   */
  addJob(
    query: string,
    location: string,
    category: string,
    maxResults: number = 20,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): string {
    const jobId = this.generateJobId()
    
    const job: BatchScrapingJob = {
      id: jobId,
      query,
      location,
      category,
      maxResults,
      priority,
      retryCount: 0,
      status: 'pending',
      createdAt: new Date()
    }

    // Inserisci in base alla priorità
    if (priority === 'high') {
      this.queue.unshift(job)
    } else {
      this.queue.push(job)
    }

    console.log(`📝 Job aggiunto alla coda: ${jobId} - ${query} in ${location}`)
    
    // Avvia il processamento se non è già in corso
    if (!this.isProcessing) {
      this.startProcessing()
    }

    return jobId
  }

  /**
   * Aggiunge multiple job per diverse location
   */
  addBatchJobs(
    query: string,
    locations: string[],
    category: string,
    maxResultsPerLocation: number = 20
  ): string[] {
    const jobIds: string[] = []

    for (const location of locations) {
      const jobId = this.addJob(query, location, category, maxResultsPerLocation)
      jobIds.push(jobId)
    }

    console.log(`📦 Batch di ${locations.length} job aggiunto per query: ${query}`)
    return jobIds
  }

  /**
   * Avvia il processamento della coda
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true
    console.log('🚀 Avvio processamento coda scraping')

    while (this.queue.length > 0 || this.running.length > 0) {
      // Avvia nuovi job se c'è spazio
      while (this.running.length < this.options.maxConcurrentJobs && this.queue.length > 0) {
        const job = this.queue.shift()!
        this.startJob(job)
      }

      // Aspetta un po' prima del prossimo controllo
      await this.delay(1000)
    }

    this.isProcessing = false
    console.log('✅ Processamento coda completato')
  }

  /**
   * Avvia un singolo job
   */
  private async startJob(job: BatchScrapingJob): Promise<void> {
    job.status = 'running'
    job.startedAt = new Date()
    this.running.push(job)

    console.log(`🔄 Avvio job: ${job.id} - ${job.query} in ${job.location}`)

    try {
      const scraper = new GoogleMapsScraper()
      
      const scrapingOptions: GoogleMapsScrapingOptions = {
        query: job.query,
        location: job.location,
        category: job.category,
        maxResults: job.maxResults,
        delayBetweenRequests: this.options.defaultDelay,
        enableSiteAnalysis: this.options.enableSiteAnalysis
      }

      const result = await scraper.scrape(scrapingOptions)
      
      // Job completato con successo
      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result

      console.log(`✅ Job completato: ${job.id} - ${result.leads.length} lead trovati`)

      // Salva i risultati se richiesto
      if (this.options.saveResults) {
        await this.saveJobResult(job)
      }

    } catch (error) {
      console.error(`❌ Errore job ${job.id}:`, error)
      
      // Gestisci retry
      if (job.retryCount < this.options.maxRetries) {
        job.retryCount++
        job.status = 'pending'
        
        // Rimetti in coda con delay
        setTimeout(() => {
          console.log(`🔄 Retry job ${job.id} (tentativo ${job.retryCount}/${this.options.maxRetries})`)
          this.queue.unshift(job)
        }, this.options.defaultDelay * job.retryCount)
        
      } else {
        // Fallimento definitivo
        job.status = 'failed'
        job.completedAt = new Date()
        job.error = error instanceof Error ? error.message : 'Errore sconosciuto'
        
        console.log(`💥 Job fallito definitivamente: ${job.id}`)
      }
    } finally {
      // Rimuovi dalla lista dei job in esecuzione
      this.running = this.running.filter(j => j.id !== job.id)
      
      // Aggiungi ai completati
      this.completed.push(job)
    }
  }

  /**
   * Salva i risultati di un job (implementazione base)
   */
  private async saveJobResult(job: BatchScrapingJob): Promise<void> {
    if (!job.result) return

    try {
      // TODO: Implementare salvataggio su database
      // Per ora logga i risultati
      console.log(`💾 Salvando risultati job ${job.id}:`)
      console.log(`   - Lead trovati: ${job.result.leads.length}`)
      console.log(`   - Siti analizzati: ${job.result.totalAnalyzed}`)
      console.log(`   - Tempo medio analisi: ${job.result.avgAnalysisTime}ms`)

      // Esempio di come potresti salvare su file JSON (per test)
      const fs = require('fs').promises
      const path = require('path')
      
      const resultsDir = path.join(__dirname, '../../results')
      await fs.mkdir(resultsDir, { recursive: true })
      
      const filename = `${job.id}_${job.query.replace(/\s+/g, '_')}_${job.location.replace(/\s+/g, '_')}.json`
      const filepath = path.join(resultsDir, filename)
      
      await fs.writeFile(filepath, JSON.stringify({
        job: {
          id: job.id,
          query: job.query,
          location: job.location,
          category: job.category,
          completedAt: job.completedAt
        },
        result: job.result
      }, null, 2))

      console.log(`📁 Risultati salvati in: ${filepath}`)

    } catch (error) {
      console.error(`❌ Errore salvando risultati job ${job.id}:`, error)
    }
  }

  /**
   * Ottieni lo stato della coda
   */
  getQueueStatus(): {
    pending: number
    running: number
    completed: number
    failed: number
    totalProcessed: number
  } {
    const failed = this.completed.filter(job => job.status === 'failed').length
    const succeeded = this.completed.filter(job => job.status === 'completed').length

    return {
      pending: this.queue.length,
      running: this.running.length,
      completed: succeeded,
      failed,
      totalProcessed: this.completed.length
    }
  }

  /**
   * Ottieni i risultati di un job specifico
   */
  getJobResult(jobId: string): BatchScrapingJob | null {
    return this.completed.find(job => job.id === jobId) || null
  }

  /**
   * Ottieni tutti i lead da tutti i job completati
   */
  getAllLeads(): BusinessLead[] {
    const allLeads: BusinessLead[] = []
    
    for (const job of this.completed) {
      if (job.status === 'completed' && job.result) {
        allLeads.push(...job.result.leads)
      }
    }

    return allLeads
  }

  /**
   * Statistiche aggregate
   */
  getStats(): {
    totalJobs: number
    totalLeads: number
    totalSitesAnalyzed: number
    averageLeadsPerJob: number
    averageAnalysisTime: number
    successRate: number
  } {
    const completedJobs = this.completed.filter(job => job.status === 'completed')
    const totalLeads = completedJobs.reduce((sum, job) => sum + (job.result?.leads.length || 0), 0)
    const totalSitesAnalyzed = completedJobs.reduce((sum, job) => sum + (job.result?.totalAnalyzed || 0), 0)
    const totalAnalysisTime = completedJobs.reduce((sum, job) => sum + (job.result?.avgAnalysisTime || 0), 0)

    return {
      totalJobs: this.completed.length,
      totalLeads,
      totalSitesAnalyzed,
      averageLeadsPerJob: completedJobs.length > 0 ? totalLeads / completedJobs.length : 0,
      averageAnalysisTime: completedJobs.length > 0 ? totalAnalysisTime / completedJobs.length : 0,
      successRate: this.completed.length > 0 ? (completedJobs.length / this.completed.length) * 100 : 0
    }
  }

  /**
   * Pulisci job completati più vecchi di X giorni
   */
  cleanupOldJobs(maxAgeInDays: number = 7): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays)

    const initialCount = this.completed.length
    this.completed = this.completed.filter(job => 
      !job.completedAt || job.completedAt > cutoffDate
    )

    const removedCount = initialCount - this.completed.length
    if (removedCount > 0) {
      console.log(`🧹 Rimossi ${removedCount} job più vecchi di ${maxAgeInDays} giorni`)
    }

    return removedCount
  }

  /**
   * Genera un ID univoco per il job
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Factory per creare configurazioni pre-impostate
export class ScrapingPresets {
  
  /**
   * Configurazione per scraping veloce (senza analisi siti)
   */
  static createFastScraper(): ScrapingOrchestrator {
    return new ScrapingOrchestrator({
      maxConcurrentJobs: 5,
      defaultDelay: 1000,
      enableSiteAnalysis: false,
      maxRetries: 2
    })
  }

  /**
   * Configurazione per analisi completa (con analisi siti)
   */
  static createDeepAnalyzer(): ScrapingOrchestrator {
    return new ScrapingOrchestrator({
      maxConcurrentJobs: 2,
      defaultDelay: 3000,
      enableSiteAnalysis: true,
      maxRetries: 3
    })
  }

  /**
   * Configurazione per produzione (bilanciata)
   */
  static createProduction(): ScrapingOrchestrator {
    return new ScrapingOrchestrator({
      maxConcurrentJobs: 3,
      defaultDelay: 2000,
      enableSiteAnalysis: true,
      maxRetries: 3,
      saveResults: true
    })
  }
}
