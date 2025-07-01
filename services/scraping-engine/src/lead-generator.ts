// Questo file gestisce la generazione e salvataggio dei lead
// È parte del modulo services/scraping-engine  
// Viene chiamato dall'orchestratore per convertire i business analizzati in lead pubblici
// ⚠️ I lead sono pubblici e consultabili da tutti gli utenti del SaaS

import type { SupabaseClient } from '@supabase/supabase-js'
import { Logger } from './utils/logger'
import { BusinessData } from './scrapers/google-maps'
import { TechnicalAnalysis } from './analyzers/website-analyzer'
import { UnifiedLeadManager } from './utils/unified-lead-manager'

interface AnalyzedBusiness extends BusinessData {
  analysis: TechnicalAnalysis
  target_category: string
}

export class LeadGenerator {
  private supabase: SupabaseClient
  private logger: Logger
  private leadManager: UnifiedLeadManager

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.logger = new Logger('LeadGenerator')
    this.leadManager = new UnifiedLeadManager(supabase)
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
      // Prepara i dati del lead per il sistema unificato
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
        // NEW FEATURES: Add needed roles and issues
        needed_roles: business.analysis.needed_roles || [],
        issues: business.analysis.issues || []
      }

      // Usa il sistema unificato per gestire deduplicazione e arricchimento
      const result = await this.leadManager.saveOrEnrichLead(leadData)
      
      if (!result.success) {
        this.logger.error(`❌ Errore gestione lead per ${business.name}: ${result.error}`)
        return null
      }

      if (result.wasUpdated) {
        this.logger.info(`🔄 Lead arricchito per ${business.name} (ID: ${result.leadId})`)
      } else {
        this.logger.info(`✅ Nuovo lead creato per ${business.name} (Score: ${score}, ID: ${result.leadId})`)
      }

      // Recupera il lead completo per il ritorno
      const { data: completeLead } = await this.supabase
        .from('leads')
        .select('*')
        .eq('id', result.leadId)
        .single()

      return completeLead

    } catch (error) {
      this.logger.error(`❌ Errore creazione lead per ${business.name}:`, error)
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
}
