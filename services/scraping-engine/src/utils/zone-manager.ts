// Questo file gestisce le zone di scraping per il sistema distribuito
// È parte del modulo services/scraping-engine
// Viene utilizzato dall'orchestratore per determinare quali zone scrappare
// Evita duplicazioni e gestisce priorità dinamiche basate sui risultati

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Logger } from './logger'

export interface Zone {
  id: string
  source: string
  category: string
  location_name: string
  geohash?: string
  bounding_box?: any
  last_scraped_at?: string
  score: number
  is_scraping_now: boolean
  times_scraped: number
  total_leads_found: number
}

export interface ScrapeLog {
  id?: string
  zone_id: string
  source: string
  category: string
  location_name: string
  status: 'success' | 'failed' | 'partial'
  start_time: string
  end_time?: string
  leads_found: number
  leads_new?: number
  leads_updated?: number
  error_message?: string
  error_log?: any
}

export class ZoneManager {
  private logger: Logger
  private supabase: SupabaseClient
  private readonly MIN_INTERVAL_HOURS = 24 // Minimo intervallo tra scraping della stessa zona

  constructor() {
    this.logger = new Logger('ZoneManager')
    
    // Inizializza client Supabase con controllo delle variabili d'ambiente
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ Variabili d\'ambiente Supabase mancanti (SUPABASE_URL, SUPABASE_SERVICE_KEY)')
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * Ottiene le zone prioritarie pronte per lo scraping
   */
  async getZonesToScrape(limit: number = 5): Promise<Zone[]> {
    try {
      this.logger.debug(`🔍 Ricerca ${limit} zone prioritarie per scraping`)
      
      const minInterval = new Date()
      minInterval.setHours(minInterval.getHours() - this.MIN_INTERVAL_HOURS)

      const { data: zones, error } = await this.supabase
        .from('zones_to_scrape')
        .select('*')
        .eq('is_scraping_now', false)
        .or(`last_scraped_at.is.null,last_scraped_at.lt.${minInterval.toISOString()}`)
        .order('score', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      this.logger.debug(`✅ Trovate ${zones?.length || 0} zone disponibili`)
      return zones || []

    } catch (error) {
      this.logger.error('❌ Errore nel recupero zone:', error)
      return []
    }
  }

  /**
   * Marca una zona come in elaborazione
   */
  async markZoneAsProcessing(zoneId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('zones_to_scrape')
        .update({
          is_scraping_now: true,
          last_scraped_at: new Date().toISOString()
        })
        .eq('id', zoneId)

      if (error) {
        throw error
      }

      this.logger.debug(`🔒 Zona ${zoneId} marcata come in elaborazione`)
      return true

    } catch (error) {
      this.logger.error(`❌ Errore nel marcare zona ${zoneId}:`, error)
      return false
    }
  }

  /**
   * Completa l'elaborazione di una zona e aggiorna le statistiche
   */
  async completeZoneProcessing(zoneId: string, leadCount: number, success: boolean): Promise<boolean> {
    try {
      const zone = await this.getZoneById(zoneId)
      if (!zone) {
        throw new Error(`Zona ${zoneId} non trovata`)
      }

      // Calcola il nuovo score
      let newScore = zone.score
      if (success) {
        if (leadCount > 0) {
          // Aumenta score se ha trovato lead
          newScore = Math.min(zone.score + (leadCount * 5), 1000)
        } else {
          // Diminuisce leggermente se non trova nulla
          newScore = Math.max(zone.score - 10, 0)
        }
      } else {
        // Diminuisce di più in caso di errore
        newScore = Math.max(zone.score - 25, 0)
      }

      const { error } = await this.supabase
        .from('zones_to_scrape')
        .update({
          is_scraping_now: false,
          times_scraped: zone.times_scraped + 1,
          total_leads_found: zone.total_leads_found + leadCount,
          score: newScore
        })
        .eq('id', zoneId)

      if (error) {
        throw error
      }

      this.logger.debug(`✅ Zona ${zoneId} completata - Score: ${zone.score} → ${newScore}`)
      return true

    } catch (error) {
      this.logger.error(`❌ Errore nel completare zona ${zoneId}:`, error)
      return false
    }
  }

  /**
   * Crea un log di scraping
   */
  async createScrapeLog(log: Omit<ScrapeLog, 'id'>): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('scrape_logs')
        .insert([{
          zone_id: log.zone_id,
          source: log.source,
          category: log.category,
          location_name: log.location_name,
          status: log.status,
          start_time: log.start_time,
          end_time: log.end_time || new Date().toISOString(),
          leads_found: log.leads_found,
          leads_new: log.leads_new || 0,
          leads_updated: log.leads_updated || 0,
          error_message: log.error_message,
          error_log: log.error_log
        }])
        .select('id')
        .single()

      if (error) {
        throw error
      }

      this.logger.debug(`📝 Log di scraping creato: ${data.id}`)
      return data.id

    } catch (error) {
      this.logger.error('❌ Errore nella creazione log:', error)
      return null
    }
  }

  /**
   * Aggiunge una nuova zona di scraping
   */
  async addZone(zone: Omit<Zone, 'id' | 'times_scraped' | 'total_leads_found' | 'is_scraping_now'>): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('zones_to_scrape')
        .insert([{
          source: zone.source,
          category: zone.category,
          location_name: zone.location_name,
          geohash: zone.geohash,
          bounding_box: zone.bounding_box,
          score: zone.score || 100
        }])
        .select('id')
        .single()

      if (error) {
        throw error
      }

      this.logger.info(`✨ Nuova zona aggiunta: ${zone.source} - ${zone.category} in ${zone.location_name}`)
      return data.id

    } catch (error) {
      this.logger.error('❌ Errore nell\'aggiunta zona:', error)
      return null
    }
  }

  /**
   * Ottiene una zona per ID
   */
  private async getZoneById(zoneId: string): Promise<Zone | null> {
    try {
      const { data, error } = await this.supabase
        .from('zones_to_scrape')
        .select('*')
        .eq('id', zoneId)
        .single()

      if (error) {
        throw error
      }

      return data

    } catch (error) {
      this.logger.error(`❌ Errore nel recupero zona ${zoneId}:`, error)
      return null
    }
  }

  /**
   * Reset delle zone bloccate (per recovery)
   */
  async resetStuckZones(): Promise<number> {
    try {
      // Reset zone che sono "in elaborazione" da più di 2 ore
      const twoHoursAgo = new Date()
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

      const { data, error } = await this.supabase
        .from('zones_to_scrape')
        .update({ is_scraping_now: false })
        .eq('is_scraping_now', true)
        .lt('last_scraped_at', twoHoursAgo.toISOString())
        .select('id')

      if (error) {
        throw error
      }

      const resetCount = data?.length || 0
      if (resetCount > 0) {
        this.logger.warn(`🔧 Reset ${resetCount} zone bloccate`)
      }

      return resetCount

    } catch (error) {
      this.logger.error('❌ Errore nel reset zone bloccate:', error)
      return 0
    }
  }
}
