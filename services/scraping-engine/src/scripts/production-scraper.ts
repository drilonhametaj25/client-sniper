/**
 * Script di produzione per scraping distribuito intelligente
 * Legge zone e categorie dal database e gestisce scheduling automatico
 * Implementa la logica distribuita come da s      // 3. Esegue scraping con GoogleMapsScraper
      console.log(`   🔍 Scraping con analisi siti: ${CONFIG.enableSiteAnalysis ? 'ABILITATA' : 'DISABILITATA'}`)
      const result = await this.scraper.scrape({
        query: zone.category,
        location: zone.location_name,
        category: zone.category,
        maxResults: CONFIG.maxLeadsPerZone,
        delayBetweenRequests: 2000,
        enableSiteAnalysis: CONFIG.enableSiteAnalysis
      })

      console.log(`   📊 Lead trovati: ${result.leads.length}`)
      if (result.leads.length > 0) {
        console.log(`   🔍 Lead con analisi: ${result.leads.filter(l => l.websiteAnalysis).length}`)
        console.log(`   📈 Score esempio: ${result.leads[0].score}`)
      } del progetto
 * 
 * LOGICA:
 * 1. Recupera zone da `zones_to_scrape` ordinate per priorità
 * 2. Filtra zone non scrappate di recente (min_interval)
 * 3. Marca zona come "in elaborazione" 
 * 4. Esegue scraping con GoogleMapsScraper migliorato
 * 5. Salva lead in `leads` evitando duplicati
 * 6. Aggiorna statistiche zona e crea log
 * 7. Calcola nuova priorità basata su risultati
 */

import 'dotenv/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { GoogleMapsScraper } from '../scrapers/google-maps-improved'
import { BusinessLead } from '../types/LeadAnalysis'
import * as crypto from 'crypto'

interface ZoneToScrape {
  id: string
  source: string
  category: string
  location_name: string
  last_scraped_at?: string
  score: number
  is_scraping_now: boolean
  times_scraped: number
  total_leads_found: number
}

interface ScrapingConfig {
  maxZonesPerRun: number
  minIntervalHours: number
  maxLeadsPerZone: number
  enableSiteAnalysis: boolean
  batchSize: number
  sources: string[]
}

const CONFIG: ScrapingConfig = {
  maxZonesPerRun: 2, // LIMITATO per test
  minIntervalHours: 24, // Ore minime tra scraping della stessa zona
  maxLeadsPerZone: 3, // LIMITATO per test veloce
  enableSiteAnalysis: true, // ✅ ABILITATO per analisi completa
  batchSize: 1, // Una zona alla volta per test
  sources: ['google_maps'] // Altri: 'yelp', 'pagine_gialle'
}

class IntelligentProductionScraper {
  private supabase: SupabaseClient
  private scraper: GoogleMapsScraper
  private stats = {
    zonesProcessed: 0,
    newLeads: 0,
    updatedLeads: 0,
    errors: 0,
    totalTime: 0,
    startTime: Date.now()
  }

  constructor() {
    // Verifica variabili d'ambiente
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variabili SUPABASE_URL e SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY devono essere configurate nel file .env')
    }
    
    console.log(`🔗 Connessione a Supabase: ${supabaseUrl}`)
    console.log(`🔑 Tipo chiave: ${process.env.SUPABASE_SERVICE_KEY ? 'SERVICE' : 'ANON'}`)
    
    // Inizializza Supabase
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.scraper = new GoogleMapsScraper()
  }

  /**
   * Funzione principale per avviare lo scraping distribuito
   */
  async runIntelligentScraping(): Promise<void> {
    console.log('🤖 SCRAPING DISTRIBUITO INTELLIGENTE')
    console.log('=====================================')
    console.log(`📊 Max zone per run: ${CONFIG.maxZonesPerRun}`)
    console.log(`⏰ Intervallo minimo: ${CONFIG.minIntervalHours}h`)
    console.log(`🎯 Max lead per zona: ${CONFIG.maxLeadsPerZone}`)
    console.log(`🔍 Fonti abilitate: ${CONFIG.sources.join(', ')}`)
    console.log('')

    try {
      // 1. Recupera zone prioritarie dal database
      const zones = await this.getZonesToScrape()
      console.log(`📍 Zone trovate nel database: ${zones.length}`)
      
      if (zones.length === 0) {
        console.log('⚠️ Nessuna zona da scrappare trovata')
        return
      }

      // 2. Elabora zone in batch
      const batches = this.createBatches(zones, CONFIG.batchSize)
      console.log(`🔄 Elaborazione in ${batches.length} batch di ${CONFIG.batchSize} zone`)

      for (const [batchIndex, batch] of batches.entries()) {
        console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length}`)
        await this.processBatch(batch)
        
        // Pausa tra batch per evitare rate limiting
        if (batchIndex < batches.length - 1) {
          console.log('⏳ Pausa 30s tra batch...')
          await this.delay(30000)
        }
      }

      // 3. Statistiche finali
      await this.printFinalStats()

    } catch (error) {
      console.error('💥 Errore durante scraping distribuito:', error)
      throw error
    }
  }

  /**
   * Recupera le zone da scrappare dal database usando la logica intelligente
   */
  private async getZonesToScrape(): Promise<ZoneToScrape[]> {
    console.log('🔍 Recupero zone prioritarie dal database...')
    
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - CONFIG.minIntervalHours)
    
    const { data, error } = await this.supabase
      .from('zones_to_scrape')
      .select('*')
      .in('source', CONFIG.sources)
      .eq('is_scraping_now', false)
      .or(`last_scraped_at.is.null,last_scraped_at.lt.${cutoffTime.toISOString()}`)
      .order('score', { ascending: false })
      .limit(CONFIG.maxZonesPerRun)

    if (error) {
      throw new Error(`Errore recupero zone: ${error.message}`)
    }

    console.log(`✅ Recuperate ${data?.length || 0} zone prioritarie`)
    return data || []
  }

  /**
   * Crea batch di zone per elaborazione parallela
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Elabora un batch di zone in parallelo
   */
  private async processBatch(zones: ZoneToScrape[]): Promise<void> {
    const promises = zones.map(zone => this.processZone(zone))
    await Promise.allSettled(promises)
  }

  /**
   * Elabora una singola zona
   */
  private async processZone(zone: ZoneToScrape): Promise<void> {
    const startTime = Date.now()

    try {
      console.log(`🎯 Inizio scraping: ${zone.category} in ${zone.location_name} (score: ${zone.score})`)

      // 1. Marca zona come "in elaborazione"
      await this.markZoneAsProcessing(zone.id, true)

      // 2. Esegue scraping con GoogleMapsScraper
      const result = await this.scraper.scrape({
        query: zone.category,
        location: zone.location_name,
        category: zone.category,
        maxResults: CONFIG.maxLeadsPerZone,
        delayBetweenRequests: 2000,
        enableSiteAnalysis: CONFIG.enableSiteAnalysis
      })

      // 3. Salva lead nel database
      const { newLeads, updatedLeads } = await this.saveLeads(result.leads, zone)

      // 4. Aggiorna statistiche zona
      const newScore = this.calculateNewScore(zone, result.leads.length)
      await this.updateZoneStats(zone.id, result.leads.length, newScore)

      // 5. Crea log di successo
      const duration = Math.floor((Date.now() - startTime) / 1000)
      await this.createScrapeLog(zone, 'success', result.leads.length, newLeads, updatedLeads, duration)

      // 6. Aggiorna statistiche globali
      this.stats.zonesProcessed++
      this.stats.newLeads += newLeads
      this.stats.updatedLeads += updatedLeads

      console.log(`✅ Completato: ${zone.category} in ${zone.location_name}`)
      console.log(`   📊 Lead trovati: ${result.leads.length} (${newLeads} nuovi, ${updatedLeads} aggiornati)`)
      console.log(`   🔍 Con analisi siti: ${result.leads.filter(l => l.websiteAnalysis).length}/${result.leads.length}`)
      console.log(`   📈 Score medio: ${result.leads.length > 0 ? Math.round(result.leads.reduce((sum, l) => sum + l.score, 0) / result.leads.length) : 'N/A'}`)
      console.log(`   ⏱️ Tempo: ${duration}s`)

    } catch (error) {
      console.error(`❌ Errore scraping zona ${zone.id}:`, error)
      
      // Crea log di errore
      const duration = Math.floor((Date.now() - startTime) / 1000)
      await this.createScrapeLog(zone, 'failed', 0, 0, 0, duration, error instanceof Error ? error.message : String(error))
      
      // Decrementa score per errore
      await this.updateZoneStats(zone.id, 0, Math.max(zone.score - 20, 10))
      this.stats.errors++

    } finally {
      // 7. Rilascia zona
      await this.markZoneAsProcessing(zone.id, false)
    }
  }

  /**
   * Marca una zona come in elaborazione o libera
   */
  private async markZoneAsProcessing(zoneId: string, isProcessing: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('zones_to_scrape')
      .update({ 
        is_scraping_now: isProcessing,
        updated_at: new Date().toISOString()
      })
      .eq('id', zoneId)

    if (error) {
      throw new Error(`Errore aggiornamento zona: ${error.message}`)
    }
  }

  /**
   * Crea un log di scraping completo
   */
  private async createScrapeLog(
    zone: ZoneToScrape, 
    status: string,
    leadsFound: number = 0,
    newLeads: number = 0,
    updatedLeads: number = 0,
    duration: number = 0,
    errorMessage?: string
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('scrape_logs')
      .insert({
        zone_id: zone.id,
        source: zone.source,
        category: zone.category,
        location_name: zone.location_name,
        status: status,
        start_time: new Date(Date.now() - duration * 1000).toISOString(),
        end_time: new Date().toISOString(),
        duration_seconds: duration,
        leads_found: leadsFound,
        leads_new: newLeads,
        leads_updated: updatedLeads,
        error_message: errorMessage
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Errore creazione log: ${error.message}`)
    }

    return data.id
  }

  /**
   * Salva i lead nel database evitando duplicati
   */
  private async saveLeads(leads: BusinessLead[], zone: ZoneToScrape): Promise<{newLeads: number, updatedLeads: number}> {
    let newLeads = 0
    let updatedLeads = 0

    for (const lead of leads) {
      try {
        // Genera unique_key e content_hash
        const uniqueKey = this.generateUniqueKey(lead, zone)
        const contentHash = this.generateContentHash(lead)

        // Verifica se esiste già
        const { data: existing } = await this.supabase
          .from('leads')
          .select('id, content_hash')
          .eq('unique_key', uniqueKey)
          .single()

        const leadData = {
          unique_key: uniqueKey,
          content_hash: contentHash,
          source: zone.source,
          business_name: lead.businessName,
          website_url: lead.contacts.website,
          phone: lead.contacts.phone,
          email: lead.contacts.email,
          address: lead.contacts.address,
          city: zone.location_name,
          category: zone.category,
          score: lead.score,
          raw_data: {},
          analysis: lead.websiteAnalysis ? {
            overallScore: lead.websiteAnalysis.overallScore,
            issues: Object.keys(lead.websiteAnalysis.issues).filter(key => 
              lead.websiteAnalysis?.issues[key as keyof typeof lead.websiteAnalysis.issues]
            )
          } : {},
          needed_roles: lead.suggestedRoles,
          issues: lead.opportunities,
          last_seen_at: new Date().toISOString()
        }

        if (existing) {
          // Aggiorna se contenuto cambiato
          if (existing.content_hash !== contentHash) {
            await this.supabase
              .from('leads')
              .update({
                ...leadData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            
            updatedLeads++
          }
        } else {
          // Inserisci nuovo lead
          await this.supabase
            .from('leads')
            .insert(leadData)
          
          newLeads++
        }

      } catch (error) {
        console.error(`Errore salvataggio lead ${lead.businessName}:`, error)
      }
    }

    return { newLeads, updatedLeads }
  }

  /**
   * Aggiorna statistiche della zona
   */
  private async updateZoneStats(zoneId: string, leadsFound: number, newScore: number): Promise<void> {
    // Prima recupera i valori attuali
    const { data: currentZone } = await this.supabase
      .from('zones_to_scrape')
      .select('times_scraped, total_leads_found')
      .eq('id', zoneId)
      .single()
    
    const { error } = await this.supabase
      .from('zones_to_scrape')
      .update({
        last_scraped_at: new Date().toISOString(),
        score: newScore,
        times_scraped: (currentZone?.times_scraped || 0) + 1,
        total_leads_found: (currentZone?.total_leads_found || 0) + leadsFound,
        updated_at: new Date().toISOString()
      })
      .eq('id', zoneId)

    if (error) {
      throw new Error(`Errore aggiornamento statistiche zona: ${error.message}`)
    }
  }

  /**
   * Calcola nuovo score basato sui risultati
   */
  private calculateNewScore(zone: ZoneToScrape, leadsFound: number): number {
    let newScore = zone.score

    if (leadsFound === 0) {
      // Nessun lead trovato: diminuisci priorità
      newScore = Math.max(newScore - 15, 10)
    } else if (leadsFound >= CONFIG.maxLeadsPerZone * 0.8) {
      // Molti lead trovati: aumenta priorità
      newScore = Math.min(newScore + 10, 1000)
    } else if (leadsFound >= CONFIG.maxLeadsPerZone * 0.5) {
      // Buona quantità: leggero aumento
      newScore = Math.min(newScore + 5, 1000)
    }

    return Math.round(newScore)
  }

  /**
   * Genera chiave unica per il lead
   */
  private generateUniqueKey(lead: BusinessLead, zone: ZoneToScrape): string {
    const base = `${zone.source}_${lead.businessName}_${zone.location_name}`
    return base.toLowerCase().replace(/[^a-z0-9]/g, '_')
  }

  /**
   * Genera hash del contenuto per rilevare cambiamenti
   */
  private generateContentHash(lead: BusinessLead): string {
    const content = JSON.stringify({
      name: lead.businessName,
      phone: lead.contacts.phone,
      email: lead.contacts.email,
      website: lead.contacts.website,
      address: lead.contacts.address
    })
    return crypto.createHash('md5').update(content).digest('hex')
  }

  /**
   * Stampa statistiche finali
   */
  private async printFinalStats(): Promise<void> {
    const totalTime = Date.now() - this.stats.startTime
    
    console.log('\n📊 STATISTICHE FINALI')
    console.log('=====================')
    console.log(`🎯 Zone processate: ${this.stats.zonesProcessed}`)
    console.log(`📈 Lead nuovi: ${this.stats.newLeads}`)
    console.log(`🔄 Lead aggiornati: ${this.stats.updatedLeads}`)
    console.log(`❌ Errori: ${this.stats.errors}`)
    console.log(`⏱️ Tempo totale: ${Math.floor(totalTime/1000)}s`)
    console.log(`🔍 Analisi siti: ${CONFIG.enableSiteAnalysis ? 'ABILITATA' : 'DISABILITATA'}`)
    
    if (this.stats.zonesProcessed > 0) {
      console.log(`📊 Tempo medio per zona: ${Math.floor(totalTime/this.stats.zonesProcessed/1000)}s`)
    }

    // Statistiche database
    try {
      const { count: totalZones } = await this.supabase
        .from('zones_to_scrape')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'google_maps')

      const { count: totalLeads } = await this.supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      console.log(`\n📊 STATO DATABASE:`)
      console.log(`Zone totali Google Maps: ${totalZones || 'N/A'}`)
      console.log(`Lead totali: ${totalLeads || 'N/A'}`)
    } catch (error) {
      console.error('Errore recupero statistiche database:', error)
    }
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Funzione principale per eseguire lo scraping
 */
async function runIntelligentScraping(): Promise<void> {
  console.log('🚀 AVVIO SCRAPING DISTRIBUITO INTELLIGENTE')
  console.log('==========================================')
  console.log('Utilizza il database esistente con zone e categorie preconfigurate')
  console.log('Logica distribuita: priorità, intervalli, deduplicazione, tracking')
  console.log('')

  try {
    const scraper = new IntelligentProductionScraper()
    await scraper.runIntelligentScraping()
    
    console.log('\n✅ Scraping distribuito completato con successo!')
    
  } catch (error) {
    console.error('\n💥 Errore fatale durante scraping:', error)
    process.exit(1)
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  runIntelligentScraping().then(() => {
    console.log('\n🎯 Sessione di scraping terminata.')
    process.exit(0)
  }).catch(error => {
    console.error('💥 Errore nell\'esecuzione:', error)
    process.exit(1)
  })
}

export { IntelligentProductionScraper, runIntelligentScraping }
