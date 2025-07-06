// Questo file gestisce l'esecuzione asincrona dei job di scraping
// È parte del modulo services/scraping-engine  
// Orchestrata il sistema distribuito di scraping utilizzando le zone prioritarie
// Gestisce la concorrenza e i retry automatici

import { ZoneManager, Zone } from '../utils/zone-manager'
import { GoogleMapsScraper } from '../scrapers/google-maps-improved'
import { YelpScraper } from '../scrapers/yelp'
import { Logger } from '../utils/logger'
import { BusinessData } from '../scrapers/google-maps'
import { BusinessLead } from '../types/LeadAnalysis'
import { LeadGenerator } from '../lead-generator'
import { WebsiteAnalyzer, TechnicalAnalysis } from '../analyzers/website-analyzer'

export interface ScrapingJob {
  id: string
  zone: Zone
  scraper: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  leadsFound: number
  error?: string
}

export class ScrapingJobRunner {
  private logger: Logger
  private zoneManager: ZoneManager
  private leadGenerator: LeadGenerator | null = null
  private analyzer: WebsiteAnalyzer
  private runningJobs: Map<string, ScrapingJob> = new Map()
  private maxConcurrentJobs: number = 3

  constructor() {
    this.logger = new Logger('ScrapingJobRunner')
    this.zoneManager = new ZoneManager()
    this.analyzer = new WebsiteAnalyzer()
  }

  /**
   * Inizializza il LeadGenerator con il client Supabase
   */
  private async initializeLeadGenerator(): Promise<void> {
    if (this.leadGenerator) return

    const { createClient } = await import('@supabase/supabase-js')
    
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ Variabili d\'ambiente Supabase mancanti (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    this.leadGenerator = new LeadGenerator(supabase)
  }

  /**
   * Avvia il sistema di scraping distribuito
   */
  async runDistributedScraping(maxZones: number = 10): Promise<void> {
    try {
      this.logger.info(`🚀 Avvio scraping distribuito - Max ${maxZones} zone`)
      
      // Reset eventuali zone bloccate
      await this.zoneManager.resetStuckZones()
      
      // Ottieni zone prioritarie
      const zones = await this.zoneManager.getZonesToScrape(maxZones)
      
      if (zones.length === 0) {
        this.logger.info('⏳ Nessuna zona disponibile per scraping')
        return
      }

      this.logger.info(`📋 Trovate ${zones.length} zone da processare`)
      
      // Processa le zone in batch con concorrenza limitata
      await this.processZonesInBatches(zones)
      
      this.logger.info('✅ Scraping distribuito completato')
      
    } catch (error) {
      this.logger.error('❌ Errore durante scraping distribuito:', error)
    }
  }

  /**
   * Processa le zone in batch con concorrenza limitata
   */
  private async processZonesInBatches(zones: Zone[]): Promise<void> {
    const batches = this.chunkArray(zones, this.maxConcurrentJobs)
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      this.logger.info(`🔄 Processando batch ${i + 1}/${batches.length} di ${batch.length} zone`)
      
      const promises = batch.map(zone => this.processZone(zone))
      await Promise.all(promises)
      
      this.logger.info(`✅ Batch ${i + 1}/${batches.length} completato`)
      
      // Piccola pausa tra i batch
      if (i < batches.length - 1) {
        await this.delay(2000)
      }
    }
    
    this.logger.info('🎯 Tutti i batch processati, attendendo completamento job...')
    
    // Attendi che tutti i job finiscano veramente
    await this.waitForAllJobsToComplete()
  }

  /**
   * Processa una singola zona
   */
  private async processZone(zone: Zone): Promise<void> {
    const jobId = `${zone.source}_${zone.category}_${zone.location_name}_${Date.now()}`
    
    const job: ScrapingJob = {
      id: jobId,
      zone,
      scraper: zone.source,
      status: 'pending',
      leadsFound: 0
    }

    this.runningJobs.set(jobId, job)

    try {
      // Marca la zona come in elaborazione
      const marked = await this.zoneManager.markZoneAsProcessing(zone.id)
      if (!marked) {
        throw new Error('Impossibile marcare la zona come in elaborazione')
      }

      job.status = 'running'
      job.startTime = new Date()
      
      this.logger.info(`🎯 Avvio scraping: ${zone.source} - ${zone.category} in ${zone.location_name}`)

      // Crea log di inizio
      const logId = await this.zoneManager.createScrapeLog({
        zone_id: zone.id,
        source: zone.source,
        category: zone.category,
        location_name: zone.location_name,
        status: 'success', // Verrà aggiornato dopo
        start_time: job.startTime.toISOString(),
        leads_found: 0
      })

      // Esegui lo scraping
      const businessData = await this.runScraper(zone)
      
      if (businessData.length === 0) {
        this.logger.info(`⚠️ Nessun business trovato per ${zone.location_name}`)
        job.leadsFound = 0
        job.status = 'completed'
        job.endTime = new Date()
        await this.zoneManager.completeZoneProcessing(zone.id, 0, true)
        return
      }

      this.logger.info(`🔍 Analisi di ${businessData.length} business trovati per ${zone.location_name}`)

      // Inizializza il LeadGenerator se necessario
      await this.initializeLeadGenerator()
      
      // Analizza i business e genera i lead
      const analyzedBusinesses = []
      for (const business of businessData) {
        try {
          const analysis = business.website ? 
            await this.analyzer.analyze(business.website) : 
            this.createFallbackAnalysis('', 20)

          analyzedBusinesses.push({
            ...business,
            analysis,
            target_category: zone.category
          })
        } catch (error) {
          this.logger.debug(`⚠️ Errore analisi ${business.name}:`, error)
          // Usa analisi base per business con errori
          analyzedBusinesses.push({
            ...business,
            analysis: this.createFallbackAnalysis(business.website || '', 10),
            target_category: zone.category
          })
        }
      }

      // Salva i lead nel database
      this.logger.debug(`💾 Salvando ${analyzedBusinesses.length} business come lead...`)
      const savedLeads = await this.leadGenerator!.generateLeads(analyzedBusinesses)
      this.logger.debug(`✅ Salvati ${savedLeads.length} lead nel database`)
      
      job.leadsFound = savedLeads.length
      job.status = 'completed'
      job.endTime = new Date()

      // Completa l'elaborazione della zona
      await this.zoneManager.completeZoneProcessing(zone.id, savedLeads.length, true)

      this.logger.info(`✅ Scraping completato: ${businessData.length} business trovati, ${savedLeads.length} lead salvati per ${zone.location_name}`)

    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Errore sconosciuto'
      job.endTime = new Date()

      this.logger.error(`❌ Errore scraping zona ${zone.location_name}:`, error)

      // Completa l'elaborazione della zona con errore
      await this.zoneManager.completeZoneProcessing(zone.id, 0, false)

      // Crea log di errore
      await this.zoneManager.createScrapeLog({
        zone_id: zone.id,
        source: zone.source,
        category: zone.category,
        location_name: zone.location_name,
        status: 'failed',
        start_time: job.startTime?.toISOString() || new Date().toISOString(),
        end_time: job.endTime.toISOString(),
        leads_found: 0,
        error_message: job.error,
        error_log: { error: job.error }
      })

    } finally {
      this.runningJobs.delete(jobId)
    }
  }

  /**
   * Esegue lo scraper appropriato per la zona
   */
  private async runScraper(zone: Zone): Promise<BusinessData[]> {
    const target = {
      source: zone.source,
      query: zone.category,
      location: zone.location_name,
      category: zone.category
    }

    switch (zone.source) {
      case 'google_maps':
        const googleScraper = new GoogleMapsScraper()
        // Converti il target nel formato richiesto dal nuovo scraper
        const options = {
          query: zone.category,
          location: zone.location_name,
          category: zone.category,
          maxResults: 20,
          delayBetweenRequests: 1500,
          enableSiteAnalysis: true
        }
        const result = await googleScraper.scrape(options)
        
        // Converti BusinessLead[] in BusinessData[] per compatibilità
        return result.leads.map(lead => ({
          name: lead.businessName,
          website: lead.contacts.website,
          phone: lead.contacts.phone,
          address: lead.contacts.address,
          city: lead.city,
          category: lead.category,
          rating: undefined, // Non disponibile nel nuovo formato
          reviews_count: undefined,
          source: 'google_maps'
        }))
        
      // case 'yelp':
      //   const yelpScraper = new YelpScraper()
      //   return await yelpScraper.scrape(target)
        
      default:
        throw new Error(`Scraper non supportato: ${zone.source}`)
    }
  }

  /**
   * Ottiene lo stato dei job in esecuzione
   */
  getRunningJobs(): ScrapingJob[] {
    return Array.from(this.runningJobs.values())
  }

  /**
   * Ottiene statistiche del sistema
   */
  async getScrapingStats(): Promise<{
    totalZones: number
    runningJobs: number
    completedToday: number
    failedToday: number
  }> {
    try {
      // Importa Supabase direttamente
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('❌ Variabili d\'ambiente Supabase mancanti (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Conta le zone totali
      const { count: totalZones } = await supabase
        .from('zones_to_scrape')
        .select('*', { count: 'exact', head: true })

      // Conta i job di oggi
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count: completedToday } = await supabase
        .from('scrape_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')
        .gte('created_at', today.toISOString())

      const { count: failedToday } = await supabase
        .from('scrape_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'fail')
        .gte('created_at', today.toISOString())

      return {
        totalZones: totalZones || 0,
        runningJobs: this.runningJobs.size,
        completedToday: completedToday || 0,
        failedToday: failedToday || 0
      }

    } catch (error) {
      this.logger.error('❌ Errore nel calcolo statistiche:', error)
      return {
        totalZones: 0,
        runningJobs: this.runningJobs.size,
        completedToday: 0,
        failedToday: 0
      }
    }
  }

  /**
   * Crea un'analisi di fallback per business senza sito web o con errori
   */
  private createFallbackAnalysis(url: string = '', score: number = 10): TechnicalAnalysis {
    return {
      url,
      load_time: 0,
      status_code: url ? 404 : 0,
      has_ssl: false,
      meta_tags: {},
      h_tags: { h1: [], h2: [] },
      images: { total: 0, without_alt: 0, broken: 0 },
      tracking: {
        google_analytics: false,
        google_tag_manager: false,
        facebook_pixel: false
      },
      performance: {
        page_size: 0,
        requests_count: 0,
        speed_score: 0
      },
      mobile_friendly: false,
      // NEW FEATURES: Extended fallback analysis
      email_analysis: {
        has_generic_email: true, // Assume generic for businesses without proper sites
        found_emails: []
      },
      footer_analysis: {
        has_old_year: false,
        current_year: new Date().getFullYear()
      },
      gdpr_compliance: {
        has_cookie_banner: false,
        has_privacy_policy: false,
        has_vat_number: false
      },
      branding_consistency: {
        domain_social_mismatch: false,
        social_links: []
      },
      cms_analysis: {
        is_wordpress: false,
        uses_default_theme: false,
        uses_page_builder: false
      },
      content_quality: {
        has_generic_content: true, // No site = no content
        has_stock_images: false,
        content_length: 0
      },
      needed_roles: ['developer', 'designer', 'copywriter'], // Default roles for sites with major issues
      issues: url ? ['Website not accessible', 'No website found'] : ['No website found'],
      overall_score: score
    }
  }

  /**
   * Utility per dividere array in chunk
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Utility per delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Attende che tutti i job in esecuzione siano completati
   */
  private async waitForAllJobsToComplete(): Promise<void> {
    const maxWaitTime = 300000 // 5 minuti massimo
    const startTime = Date.now()
    
    while (this.runningJobs.size > 0) {
      if (Date.now() - startTime > maxWaitTime) {
        this.logger.warn(`⚠️ Timeout raggiunto, ${this.runningJobs.size} job ancora in esecuzione`)
        break
      }
      
      this.logger.debug(`⏳ Attendendo completamento di ${this.runningJobs.size} job...`)
      await this.delay(1000)
    }
    
    this.logger.info('✅ Tutti i job sono stati completati')
  }
}
