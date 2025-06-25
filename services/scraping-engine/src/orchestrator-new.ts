// Questo file orchestra l'intero sistema di scraping distribuito
// È parte del modulo services/scraping-engine
// Coordina scrapers, analizzatori e generazione lead usando zone prioritarie
// Implementa il sistema intelligente per evitare duplicazioni e gestire priorità

import { ScrapingJobRunner } from './jobs/scraping-job-runner'
import { ZoneManager } from './utils/zone-manager'
import { Logger } from './utils/logger'

export class Orchestrator {
  private logger: Logger
  private jobRunner: ScrapingJobRunner
  private zoneManager: ZoneManager

  constructor() {
    this.logger = new Logger('Orchestrator')
    this.jobRunner = new ScrapingJobRunner()
    this.zoneManager = new ZoneManager()
  }

  /**
   * Esegue il nuovo sistema di scraping distribuito intelligente
   */
  async runDistributedScraping(): Promise<void> {
    this.logger.info('🔄 Avvio sistema scraping distribuito intelligente')
    
    try {
      // Esegui scraping distribuito usando zone prioritarie
      await this.jobRunner.runDistributedScraping(10)
      
      // Mostra statistiche finali
      const stats = await this.jobRunner.getScrapingStats()
      this.logger.info(`📊 Statistiche scraping completato:`)
      this.logger.info(`   - Zone totali nel sistema: ${stats.totalZones}`)
      this.logger.info(`   - Job completati oggi: ${stats.completedToday}`)
      this.logger.info(`   - Job falliti oggi: ${stats.failedToday}`)
      this.logger.info(`   - Job ancora in esecuzione: ${stats.runningJobs}`)
      
    } catch (error) {
      this.logger.error('❌ Errore durante scraping distribuito:', error)
    }
  }

  /**
   * Aggiunge nuove zone di scraping al sistema
   */
  async addNewZones(zones: Array<{
    source: string
    category: string
    location_name: string
    score?: number
  }>): Promise<void> {
    this.logger.info(`➕ Aggiunta di ${zones.length} nuove zone`)
    
    for (const zone of zones) {
      try {
        const zoneId = await this.zoneManager.addZone({
          source: zone.source,
          category: zone.category,
          location_name: zone.location_name,
          score: zone.score || 100
        })
        
        if (zoneId) {
          this.logger.info(`✅ Zona aggiunta: ${zone.source} - ${zone.category} in ${zone.location_name}`)
        }
      } catch (error) {
        this.logger.error(`❌ Errore aggiunta zona ${zone.location_name}:`, error)
      }
    }
  }

  /**
   * Metodo per compatibilità con il vecchio sistema
   */
  async runCompleteScraping(): Promise<void> {
    this.logger.info('🔄 Avvio ciclo completo di scraping (nuovo sistema distribuito)')
    await this.runDistributedScraping()
  }
}
