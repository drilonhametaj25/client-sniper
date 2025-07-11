/**
 * Lead Generator - Gestisce la generazione, scoring e salvataggio dei lead
 * Utilizzato da: orchestratore di scraping, Google Maps Scraper
 * Responsabilità: conversione da business ad analyzed business, scoring, serializzazione per database
 * 
 * AGGIORNATO: supporta sia struttura legacy (analysis) che moderna (websiteAnalysis)
 * per compatibilità durante la migrazione. Priorità alla struttura moderna.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BusinessData } from './scrapers/google-maps';
import { BusinessLead } from './types/LeadAnalysis';
import { EnhancedWebsiteAnalyzer, EnhancedWebsiteAnalysis } from './analyzers/enhanced-website-analyzer';
import { createHash } from 'crypto';

// Interfaccia per business con analisi moderna
export interface AnalyzedBusiness extends BusinessData {
  websiteAnalysis?: EnhancedWebsiteAnalysis | null;
  analysis?: LegacyAnalysis | null; // Fallback per compatibilità
}

// Interfaccia legacy per compatibilità
export interface LegacyAnalysis {
  has_website: boolean;
  website_load_time: number;
  missing_meta_tags: string[];
  has_tracking_pixel: boolean;
  broken_images: boolean;
  gtm_installed: boolean;
  overall_score: number;
}

export class LeadGenerator {
  private analyzer: EnhancedWebsiteAnalyzer;
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.analyzer = new EnhancedWebsiteAnalyzer();
    this.supabase = supabaseClient;
  }

  /**
   * Converte un business in analyzed business con analisi completa
   */
  async analyzeBusinesses(businesses: BusinessData[]): Promise<AnalyzedBusiness[]> {
    const analyzedBusinesses: AnalyzedBusiness[] = [];
    
    for (const business of businesses) {
      try {
        console.log(`Analizzando: ${business.name} - ${business.website}`);
        
        let websiteAnalysis: EnhancedWebsiteAnalysis | null = null;
        
        if (business.website) {
          try {
            websiteAnalysis = await this.analyzer.analyzeWebsite(business.website);
            console.log(`Analisi completata per ${business.website}:`, {
              score: websiteAnalysis?.overallScore,
              issues: websiteAnalysis?.issues ? Object.keys(websiteAnalysis.issues).length : 0,
              social: websiteAnalysis?.social ? 'Presente' : 'Assente'
            });
          } catch (error) {
            console.error(`Errore nell'analisi di ${business.website}:`, error);
          }
        }

        // Creo sempre un analyzed business con la struttura moderna
        const analyzedBusiness: AnalyzedBusiness = {
          ...business,
          websiteAnalysis, // Struttura moderna
          analysis: websiteAnalysis ? this.convertToLegacyAnalysis(websiteAnalysis) : null // Fallback legacy
        };

        analyzedBusinesses.push(analyzedBusiness);
      } catch (error) {
        console.error(`Errore nell'analisi del business ${business.name}:`, error);
        // Aggiungo comunque il business senza analisi
        analyzedBusinesses.push({
          ...business,
          websiteAnalysis: null,
          analysis: null
        });
      }
    }

    return analyzedBusinesses;
  }

  /**
   * Converte la struttura moderna in legacy per compatibilità
   */
  private convertToLegacyAnalysis(websiteAnalysis: EnhancedWebsiteAnalysis): LegacyAnalysis {
    return {
      has_website: true,
      website_load_time: websiteAnalysis.performance?.loadComplete || 0,
      missing_meta_tags: this.extractMissingMetaTags(websiteAnalysis),
      has_tracking_pixel: websiteAnalysis.tracking?.facebookPixel || websiteAnalysis.tracking?.googleAnalytics || false,
      broken_images: websiteAnalysis.images?.broken > 0 || false,
      gtm_installed: websiteAnalysis.tracking?.googleTagManager || false,
      overall_score: websiteAnalysis.overallScore || 0
    };
  }

  /**
   * Estrae i meta tag mancanti dalla struttura moderna
   */
  private extractMissingMetaTags(analysis: EnhancedWebsiteAnalysis): string[] {
    const missingTags: string[] = [];
    
    if (!analysis.seo?.hasTitle) missingTags.push('title');
    if (!analysis.seo?.hasMetaDescription) missingTags.push('meta-description');
    if (!analysis.seo?.hasH1) missingTags.push('h1');
    if (!analysis.seo?.hasCanonical) missingTags.push('canonical');
    if (!analysis.seo?.hasOpenGraph) missingTags.push('og-tags');
    
    return missingTags;
  }

  /**
   * Metodo principale per generare lead (utilizzato dall'orchestratore)
   */
  async generateLeads(businesses: BusinessData[]): Promise<BusinessLead[]> {
    console.log(`Generando ${businesses.length} lead...`);
    
    // Analizza i business
    const analyzedBusinesses = await this.analyzeBusinesses(businesses);
    
    // Salva nel database
    await this.saveLeads(analyzedBusinesses);
    
    // Converte in BusinessLead per il return
    return analyzedBusinesses.map(business => this.convertToBusinessLead(business));
  }

  /**
   * Calcola il punteggio di un business analizzato
   */
  calculateScore(business: AnalyzedBusiness): number {
    // Priorità alla struttura moderna
    if (business.websiteAnalysis?.overallScore) {
      return business.websiteAnalysis.overallScore;
    }
    
    // Fallback alla struttura legacy
    if (business.analysis?.overall_score) {
      return business.analysis.overall_score;
    }

    // Calcolo manuale se non disponibile
    if (!business.website) return 10;

    let score = 50; // Base score

    // Usa struttura moderna se disponibile
    if (business.websiteAnalysis) {
      const analysis = business.websiteAnalysis;
      
      // Penalizza per problemi SEO
      if (!analysis.seo?.hasTitle) score -= 15;
      if (!analysis.seo?.hasMetaDescription) score -= 10;
      if (!analysis.seo?.hasH1) score -= 10;
      
      // Penalizza per performance scarse
      if (analysis.performance?.loadComplete && analysis.performance.loadComplete > 3000) score -= 15;
      
      // Penalizza per mancanza di tracking
      if (!analysis.tracking?.googleAnalytics && !analysis.tracking?.facebookPixel) score -= 10;
      
      // Penalizza per immagini rotte
      if (analysis.images?.broken > 0) score -= 10;
      
      return Math.max(0, Math.min(100, score));
    }

    // Fallback con struttura legacy
    if (business.analysis) {
      const analysis = business.analysis;
      
      if (analysis.missing_meta_tags?.length > 0) {
        score -= analysis.missing_meta_tags.length * 5;
      }
      
      if (analysis.website_load_time > 3000) {
        score -= 15;
      }
      
      if (!analysis.has_tracking_pixel) {
        score -= 10;
      }
      
      if (analysis.broken_images) {
        score -= 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Salva i lead nel database
   */
  async saveLeads(businesses: AnalyzedBusiness[]): Promise<void> {
    console.log(`Tentativo di salvare ${businesses.length} lead nel database`);
    
    for (const business of businesses) {
      try {
        const leadData = this.serializeForDatabase(business);
        
        console.log(`Salvando lead: ${business.name}`, {
          website: business.website,
          score: leadData.score,
          hasWebsiteAnalysis: !!business.websiteAnalysis,
          hasLegacyAnalysis: !!business.analysis
        });

        const { error } = await this.supabase
          .from('leads')
          .insert([leadData]);

        if (error) {
          console.error(`Errore nel salvataggio del lead ${business.name}:`, error);
        } else {
          console.log(`Lead salvato con successo: ${business.name}`);
        }
      } catch (error) {
        console.error(`Errore nel processamento del lead ${business.name}:`, error);
      }
    }
  }

  /**
   * Serializza un business per il database
   */
  private serializeForDatabase(business: AnalyzedBusiness): any {
    const score = this.calculateScore(business);
    
    // Genera unique_key per evitare duplicati
    const uniqueKey = this.generateUniqueKey(business);
    
    // Genera content_hash per rilevare cambiamenti
    const contentHash = this.generateContentHash(business);
    
    console.log(`Generato unique_key per ${business.name}: "${uniqueKey}"`);
    console.log(`Generato content_hash per ${business.name}: "${contentHash}"`);
    
    if (!uniqueKey) {
      console.error(`ERRORE: unique_key vuoto per business:`, {
        name: business.name,
        website: business.website,
        source: business.source,
        address: business.address
      });
    }
    
    return {
      unique_key: uniqueKey,
      content_hash: contentHash,
      business_name: business.name || 'Nome non disponibile',
      website_url: business.website || null,
      phone: business.phone || null,
      address: business.address || null,
      city: business.city || null,
      category: business.category || null,
      score,
      origin: 'scraping',
      source: business.source || 'google_maps',
      // Struttura moderna completa
      website_analysis: business.websiteAnalysis,
      // Struttura legacy per compatibilità
      analysis: business.analysis,
      // Campi moderni estratti
      issues: this.extractIssues(business),
      opportunities: this.extractOpportunities(business),
      needed_roles: this.getSuggestedRoles(business),
      // Dati social se disponibili
      social_presence: business.websiteAnalysis?.social || null,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Estrae gli issues dalla struttura moderna o legacy
   */
  private extractIssues(business: AnalyzedBusiness): string[] {
    const issues: string[] = [];
    
    // Priorità alla struttura moderna
    if (business.websiteAnalysis) {
      const analysis = business.websiteAnalysis;
      
      // Issues SEO
      if (!analysis.seo?.hasTitle) issues.push('Meta title mancante');
      if (!analysis.seo?.hasMetaDescription) issues.push('Meta description mancante');
      if (!analysis.seo?.hasH1) issues.push('Tag H1 mancante');
      
      // Issues Performance
      if (analysis.performance?.loadComplete && analysis.performance.loadComplete > 3000) {
        issues.push(`Sito lento: ${Math.round(analysis.performance.loadComplete / 1000)}s`);
      }
      
      // Issues Tracking
      if (!analysis.tracking?.googleAnalytics && !analysis.tracking?.facebookPixel) {
        issues.push('Pixel di tracciamento mancanti');
      }
      
      // Issues Immagini
      if (analysis.images?.broken > 0) {
        issues.push(`${analysis.images.broken} immagini rotte`);
      }
      
      // Issues GDPR
      if (!analysis.gdpr?.hasCookieBanner) {
        issues.push('Cookie banner mancante');
      }
      
      return issues;
    }

    // Fallback alla struttura legacy
    if (business.analysis) {
      const analysis = business.analysis;
      
      if (analysis.missing_meta_tags?.length > 0) {
        issues.push(`Meta tag mancanti: ${analysis.missing_meta_tags.join(', ')}`);
      }
      
      if (analysis.website_load_time > 3000) {
        issues.push(`Sito lento: ${Math.round(analysis.website_load_time / 1000)}s`);
      }
      
      if (!analysis.has_tracking_pixel) {
        issues.push('Pixel di tracciamento mancanti');
      }
      
      if (analysis.broken_images) {
        issues.push('Immagini rotte rilevate');
      }
      
      if (!analysis.gtm_installed) {
        issues.push('Google Tag Manager non installato');
      }
      
      return issues;
    }

    return issues;
  }

  /**
   * Estrae le opportunità dalla struttura moderna o legacy
   */
  private extractOpportunities(business: AnalyzedBusiness): string[] {
    const opportunities: string[] = [];
    
    // Priorità alla struttura moderna
    if (business.websiteAnalysis) {
      const analysis = business.websiteAnalysis;
      
      // Opportunità SEO
      if (!analysis.seo?.hasTitle || !analysis.seo?.hasMetaDescription) {
        opportunities.push('Ottimizzazione SEO');
      }
      
      // Opportunità Performance
      if (analysis.performance?.loadComplete && analysis.performance.loadComplete > 3000) {
        opportunities.push('Miglioramento performance');
      }
      
      // Opportunità Tracking
      if (!analysis.tracking?.googleAnalytics && !analysis.tracking?.facebookPixel) {
        opportunities.push('Implementazione analytics');
      }
      
      // Opportunità GDPR
      if (!analysis.gdpr?.hasCookieBanner || !analysis.gdpr?.hasPrivacyPolicy) {
        opportunities.push('Compliance GDPR');
      }
      
      // Opportunità Mobile
      if (!analysis.mobile?.isMobileFriendly) {
        opportunities.push('Ottimizzazione mobile');
      }
      
      return opportunities;
    }

    // Genera opportunità dalla struttura legacy
    if (business.analysis) {
      const analysis = business.analysis;
      
      if (analysis.missing_meta_tags?.length > 0) {
        opportunities.push('Ottimizzazione SEO');
      }
      
      if (analysis.website_load_time > 3000) {
        opportunities.push('Miglioramento performance');
      }
      
      if (!analysis.has_tracking_pixel) {
        opportunities.push('Implementazione analytics');
      }
      
      if (!analysis.gtm_installed) {
        opportunities.push('Setup Google Tag Manager');
      }
      
      return opportunities;
    }

    return opportunities;
  }

  /**
   * Converte un AnalyzedBusiness in BusinessLead per il return
   */
  private convertToBusinessLead(business: AnalyzedBusiness): BusinessLead {
    const score = this.calculateScore(business);
    
    return {
      businessName: business.name,
      category: business.category,
      city: business.city,
      source: business.source,
      contacts: {
        phone: business.phone,
        website: business.website,
        address: business.address
      },
      websiteAnalysis: business.websiteAnalysis as any, // Cast per compatibilità
      analysis: business.websiteAnalysis as any, // Cast per compatibilità
      score,
      priority: score < 30 ? 'high' : score < 60 ? 'medium' : 'low',
      opportunities: this.extractOpportunities(business),
      suggestedRoles: this.getSuggestedRoles(business) as any, // Cast per retrocompatibilità
      scrapedAt: new Date(),
      lastAnalyzed: new Date()
    };
  }

  /**
   * Mappa ruoli legacy/inglesi in italiano per retrocompatibilità
   */
  private mapRoleToItalian(role: string): string {
    switch (role) {
      case 'web-developer':
        return 'developer';
      case 'seo-specialist':
        return 'seo';
      case 'designer':
        return 'designer';
      case 'marketing-specialist':
        return 'social';
      case 'legal-consultant':
        return 'gdpr';
      default:
        return role;
    }
  }

  /**
   * Suggerisce ruoli professionali basati sui problemi rilevati - AGGIORNATO per ruoli italiani
   */
  private getSuggestedRoles(business: AnalyzedBusiness): string[] {
    const roles: string[] = [];
    
    if (business.websiteAnalysis) {
      const analysis = business.websiteAnalysis;
      
      // Developer (ex Web Developer)
      if ((analysis.performance?.loadComplete && analysis.performance.loadComplete > 3000) || analysis.images?.broken > 0) {
        roles.push('developer');
      }
      
      // SEO (ex SEO Specialist)
      if (!analysis.seo?.hasTitle || !analysis.seo?.hasMetaDescription || !analysis.seo?.hasH1) {
        roles.push('seo');
      }
      
      // Designer
      if (!analysis.mobile?.isMobileFriendly || (analysis.content?.contentQualityScore && analysis.content.contentQualityScore < 50)) {
        roles.push('designer');
      }
      
      // Social (ex Marketing Specialist)
      if (!analysis.tracking?.googleAnalytics && !analysis.tracking?.facebookPixel) {
        roles.push('social');
      }
      
      // GDPR (ex Legal Consultant)
      if (!analysis.gdpr?.hasCookieBanner || !analysis.gdpr?.hasPrivacyPolicy) {
        roles.push('gdpr');
      }
    }
    
    // Rimuovi duplicati
    return Array.from(new Set(roles));
  }

  /**
   * Genera un hash del contenuto per rilevare cambiamenti
   */
  private generateContentHash(business: AnalyzedBusiness): string {
    const contentData = {
      name: business.name || '',
      website: business.website || '',
      phone: business.phone || '',
      address: business.address || '',
      category: business.category || '',
      // Include anche alcuni dati dell'analisi per rilevare cambiamenti
      hasWebsite: business.websiteAnalysis ? true : false,
      score: this.calculateScore(business),
      // Include timestamp per garantire unicità
      timestamp: Date.now()
    };
    
    const dataString = JSON.stringify(contentData);
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Genera una chiave univoca per il business per evitare duplicati
   */
  private generateUniqueKey(business: AnalyzedBusiness): string {
    const source = business.source || 'google_maps';
    const name = business.name || 'unknown';
    const website = business.website || '';
    const address = business.address || '';
    
    // Se ha un sito web, usa quello come identificatore principale
    if (website) {
      try {
        const domain = new URL(website).hostname.replace('www.', '');
        return `${source}_${domain}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      } catch {
        // Se l'URL non è valido, usa il sito web grezzo
        return `${source}_${website.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      }
    }
    
    // Altrimenti usa nome + indirizzo + fonte
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanAddress = address.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 50);
    
    return `${source}_${cleanName}_${cleanAddress}`;
  }
}
