// Questo file gestisce la generazione e salvataggio dei lead
// È parte del modulo services/scraping-engine  
// Viene chiamato dall'orchestratore per convertire i business analizzati in lead pubblici
// ⚠️ I lead sono pubblici e consultabili da tutti gli utenti del SaaS

import type { SupabaseClient } from '@supabase/supabase-js'
import { Logger } from './utils/logger'
import { BusinessData } from './scrapers/google-maps'
import { TechnicalAnalysis } from './analyzers/website-analyzer'

interface AnalyzedBusiness extends BusinessData {
  analysis: TechnicalAnalysis
  target_category: string
}

export class LeadGenerator {
  private supabase: SupabaseClient
  private logger: Logger

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.logger = new Logger('LeadGenerator')
  }

  async generateLeads(businesses: AnalyzedBusiness[]): Promise<any[]> {
    this.logger.info(`🎯 Generazione lead da ${businesses.length} business analizzati`)
    
    const leads: any[] = []
    
    for (const business of businesses) {
      try {
        // Calcola il punteggio del lead
        const score = this.calculateLeadScore(business.analysis)
        
        // Crea il lead solo se il punteggio è sufficientemente basso (indica problemi)
        if (score <= 70) {
          const lead = await this.createLead(business, score)
          if (lead) {
            leads.push(lead)
          }
        } else {
          this.logger.debug(`⚠️ Business ${business.name} ha score troppo alto (${score}) - saltato`)
        }
        
      } catch (error) {
        this.logger.warn(`⚠️  Errore generazione lead per ${business.name}:`, error)
      }
    }
    
    this.logger.success(`✨ Generati ${leads.length} lead qualificati`)
    return leads
  }

  private calculateLeadScore(analysis: TechnicalAnalysis): number {
    let score = 100 // Inizia con punteggio perfetto

    // Sito non raggiungibile o in costruzione (0-20)
    if (analysis.status_code !== 200) {
      return 10
    }

    // Penalità per mancanza SSL
    if (!analysis.has_ssl) {
      score -= 10
    }

    // Penalità SEO base (-15 punti)
    if (!analysis.meta_tags.title) {
      score -= 15
    }
    if (!analysis.meta_tags.description) {
      score -= 10
    }
    if (analysis.h_tags.h1.length === 0) {
      score -= 8
    }

    // Penalità immagini (-10 punti)
    if (analysis.images.broken > 0) {
      score -= 10
    }
    if (analysis.images.without_alt > analysis.images.total * 0.5) {
      score -= 8
    }

    // Penalità tracking/analytics (-10 punti)
    if (!analysis.tracking.google_analytics && !analysis.tracking.google_tag_manager) {
      score -= 10
    }
    if (!analysis.tracking.facebook_pixel) {
      score -= 5
    }

    // Penalità performance (-15 punti)
    if (analysis.load_time > 3) {
      score -= 15
    }
    if (analysis.performance.speed_score < 50) {
      score -= 10
    }

    // Penalità mobile (-12 punti)
    if (!analysis.mobile_friendly) {
      score -= 12
    }

    return Math.max(0, Math.min(100, score))
  }

  private async createLead(business: AnalyzedBusiness, score: number): Promise<any | null> {
    try {
      // Genera unique_key e content_hash per evitare duplicati
      const uniqueKey = this.generateUniqueKey(business)
      const contentHash = this.generateContentHash(business)

      // Verifica se il lead esiste già usando unique_key
      const { data: existingLead } = await this.supabase
        .from('leads')
        .select('id, content_hash, last_seen_at, created_at')
        .eq('unique_key', uniqueKey)
        .single()

      if (existingLead) {
        const daysSinceCreation = Math.floor((Date.now() - new Date(existingLead.created_at).getTime()) / (1000 * 60 * 60 * 24))
        
        // Se il contenuto è cambiato, aggiorna
        if (existingLead.content_hash !== contentHash) {
          this.logger.info(`🔄 Aggiornamento lead esistente per ${business.name} (contenuto cambiato)`)
          return await this.updateExistingLead(existingLead.id, business, score, contentHash)
        } 
        
        // Se è stato creato da meno di 60 giorni e contenuto identico, salta
        if (daysSinceCreation < 60) {
          // Solo aggiorna last_seen_at
          await this.supabase
            .from('leads')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', existingLead.id)
          
          this.logger.debug(`⚠️ Lead già esistente per ${business.name} (creato ${daysSinceCreation} giorni fa)`)
          return null
        }
        
        // Se è vecchio, aggiorna
        this.logger.info(`🔄 Aggiornamento lead vecchio per ${business.name}`)
        return await this.updateExistingLead(existingLead.id, business, score, contentHash)
      }

      // Prepara i dati del lead (SENZA assegnazione utente - i lead sono pubblici)
      const leadData = {
        business_name: business.name,
        website_url: business.website || '',
        phone: business.phone || '',
        address: business.address || '',
        city: business.city,
        category: business.category,
        score: score,
        analysis: this.convertAnalysisToJson(business.analysis),
        source: business.source || 'google_maps',
        unique_key: uniqueKey,
        content_hash: contentHash,
        last_seen_at: new Date().toISOString(),
        // NEW FEATURES: Add needed roles and issues
        needed_roles: business.analysis.needed_roles || [],
        issues: business.analysis.issues || []
      }

      // Salva il lead nel database
      const { data: lead, error } = await this.supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single()

      if (error) {
        this.logger.error(`❌ Errore creazione lead per ${business.name}:`, error)
        return null
      }

      this.logger.info(`✅ Nuovo lead creato per ${business.name} (Score: ${score})`)
      return lead

    } catch (error) {
      this.logger.error(`❌ Errore creazione lead per ${business.name}:`, error)
      return null
    }
  }

  private async updateExistingLead(leadId: string, business: AnalyzedBusiness, score: number, contentHash?: string): Promise<any | null> {
    try {
      // Aggiorna il lead esistente con nuovi dati
      const updateData: any = {
        score: score,
        analysis: this.convertAnalysisToJson(business.analysis),
        phone: business.phone || '',
        address: business.address || '',
        website_url: business.website || '',
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // NEW FEATURES: Update needed roles and issues
        needed_roles: business.analysis.needed_roles || [],
        issues: business.analysis.issues || []
      }

      // Aggiungi content_hash se fornito
      if (contentHash) {
        updateData.content_hash = contentHash
      }

      const { data: updatedLead, error } = await this.supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
        .select()
        .single()

      if (error) {
        this.logger.error(`❌ Errore aggiornamento lead per ${business.name}:`, error)
        return null
      }

      this.logger.info(`✅ Lead aggiornato per ${business.name} (Score: ${score})`)
      return updatedLead

    } catch (error) {
      this.logger.error(`❌ Errore aggiornamento lead per ${business.name}:`, error)
      return null
    }
  }

  private convertAnalysisToJson(analysis: TechnicalAnalysis): any {
    return {
      url: analysis.url,
      status_code: analysis.status_code,
      load_time: analysis.load_time,
      has_ssl: analysis.has_ssl,
      meta_tags: analysis.meta_tags,
      h_tags: analysis.h_tags,
      images: analysis.images,
      tracking: analysis.tracking,
      mobile_friendly: analysis.mobile_friendly,
      performance: analysis.performance,
      overall_score: analysis.overall_score
    }
  }

  /**
   * Genera una chiave univoca per il business
   */
  private generateUniqueKey(business: AnalyzedBusiness): string {
    // Combina source, nome e città per creare una chiave univoca
    const key = `${business.source || 'google_maps'}_${business.name}_${business.city}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
    
    return key
  }

  /**
   * Genera hash del contenuto per rilevare cambiamenti
   */
  private generateContentHash(business: AnalyzedBusiness): string {
    const content = JSON.stringify({
      name: business.name,
      website: business.website,
      phone: business.phone,
      address: business.address,
      rating: business.rating,
      reviews_count: business.reviews_count
    })
    
    // Semplice hash (in produzione usa crypto.createHash)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36)
  }
}
