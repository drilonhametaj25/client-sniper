// Questo file orchestra il processo completo di scraping e analisi
// È parte del modulo services/scraping-engine
// Viene chiamato dal cron job per eseguire il ciclo completo di scraping
// ⚠️ Aggiornare se si aggiungono nuove fonti o si modifica il workflow

import { createClient } from '@supabase/supabase-js'
import { GoogleMapsScraper } from './scrapers/google-maps'
import { YelpScraper } from './scrapers/yelp'
import { WebsiteAnalyzer } from './analyzers/website-analyzer'
import { LeadGenerator } from './lead-generator'
import { Logger } from './utils/logger'

export class ScrapingOrchestrator {
  private supabase
  private googleMapsScraper: GoogleMapsScraper
  private yelpScraper: YelpScraper
  private websiteAnalyzer: WebsiteAnalyzer
  private leadGenerator: LeadGenerator
  private logger: Logger

  constructor() {
    this.logger = new Logger('Orchestrator')
    
    // Inizializza Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)!
    )
    
    // Inizializza componenti
    this.googleMapsScraper = new GoogleMapsScraper()
    this.yelpScraper = new YelpScraper()
    this.websiteAnalyzer = new WebsiteAnalyzer()
    this.leadGenerator = new LeadGenerator(this.supabase)
  }

  async runScrapingCycle(): Promise<void> {
    const startTime = Date.now()
    this.logger.info('🔄 Avvio ciclo completo di scraping')

    try {
      // 1. Ottieni configurazioni di scraping
      const targets = await this.getScrapingTargets()
      this.logger.info(`📋 Trovati ${targets.length} target di scraping`)

      let totalBusinesses = 0
      let totalLeads = 0

      // 2. Esegui scraping per ogni target
      for (const target of targets) {
        this.logger.info(`🎯 Scraping: ${target.source} - ${target.query} in ${target.location}`)
        
        let businesses: any[] = []
        
        // Scraping in base alla fonte
        switch (target.source) {
          case 'google_maps':
            businesses = await this.googleMapsScraper.scrape(target)
            break
          // case 'yelp':
          //   businesses = await this.yelpScraper.scrape(target)
          //   break
          default:
            this.logger.warn(`⚠️  Fonte non supportata: ${target.source}`)
            continue
        }

        this.logger.info(`📊 Trovate ${businesses.length} aziende per ${target.query}`)
        totalBusinesses += businesses.length

        // 3. Analizza i siti web
        const analyzedBusinesses = []
        for (const business of businesses) {
          if (business.website) {
            try {
              const analysis = await this.websiteAnalyzer.analyze(business.website)
              analyzedBusinesses.push({
                ...business,
                analysis,
                target_category: target.category
              })
              
              // Delay per evitare rate limiting
              await this.delay(2000)
            } catch (error) {
              this.logger.warn(`⚠️  Errore analisi ${business.website}:`, error)
            }
          }
        }

        this.logger.info(`🔍 Analizzati ${analyzedBusinesses.length} siti web`)

        // 4. Genera lead da aziende analizzate
        const leads = await this.leadGenerator.generateLeads(analyzedBusinesses)
        totalLeads += leads.length

        this.logger.info(`✨ Generati ${leads.length} lead da ${target.query}`)
      }

      const duration = (Date.now() - startTime) / 1000
      this.logger.success(`🎉 Ciclo completato in ${duration.toFixed(2)}s`)
      this.logger.success(`📈 Statistiche: ${totalBusinesses} aziende, ${totalLeads} lead generati`)

      // 5. Aggiorna statistiche
      await this.updateStats(totalBusinesses, totalLeads)

    } catch (error) {
      this.logger.error('💥 Errore durante il ciclo di scraping:', error)
      throw error
    }
  }

  async cleanupOldData(): Promise<void> {
    this.logger.info('🧹 Inizio pulizia dati obsoleti')

    try {
      // Rimuovi lead più vecchi di 90 giorni
      const { error: leadsError } = await this.supabase
        .from('leads')
        .delete()
        .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

      if (leadsError) {
        this.logger.error('Errore pulizia lead:', leadsError)
      } else {
        this.logger.info('✅ Lead obsoleti rimossi')
      }

      // Pulizia lead_analysis correlati
      const { error: analysisError } = await this.supabase
        .from('lead_analysis')
        .delete()
        .not('id', 'in', `(SELECT id FROM leads)`)

      if (analysisError) {
        this.logger.error('Errore pulizia analisi:', analysisError)
      } else {
        this.logger.info('✅ Analisi orfane rimosse')
      }

    } catch (error) {
      this.logger.error('💥 Errore durante la pulizia:', error)
      throw error
    }
  }

  private async getScrapingTargets(): Promise<any[]> {
    // Configurazione target di scraping
    // In futuro potrebbe essere configurabile dal database
    return [
      {
        source: 'google_maps',
        query: 'ristorante',
        location: 'Milano, Italia',
        category: 'ristorazione'
      },
      {
        source: 'google_maps', 
        query: 'parrucchiere',
        location: 'Roma, Italia',
        category: 'bellezza'
      },
      {
        source: 'google_maps',
        query: 'avvocato',
        location: 'Napoli, Italia', 
        category: 'servizi legali'
      },
      {
        source: 'google_maps',
        query: 'dentista',
        location: 'Torino, Italia',
        category: 'sanitario'
      },
      {
        source: 'google_maps',
        query: 'meccanico',
        location: 'Firenze, Italia',
        category: 'automotive'
      }
    ]
  }

  private async updateStats(businesses: number, leads: number): Promise<void> {
    try {
      // Aggiorna statistiche globali
      await this.supabase
        .from('settings')
        .upsert([
          { key: 'last_scraping_run', value: new Date().toISOString() },
          { key: 'total_businesses_scraped', value: businesses.toString() },
          { key: 'total_leads_generated', value: leads.toString() }
        ])
    } catch (error) {
      this.logger.warn('⚠️  Errore aggiornamento statistiche:', error)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
