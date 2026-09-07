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
import { decideLeadPublication } from './utils/confidence';
import type { LeadConfidenceDecision } from './utils/confidence';
import { Logger } from './utils/logger';
import { createHash } from 'crypto';
import { computeUniqueKey, computeContentHash } from './utils/lead-identity';
import { computeOpportunityScore } from './scoring/opportunity-score';

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
  private logger: Logger;

  constructor(supabaseClient: SupabaseClient) {
    this.analyzer = new EnhancedWebsiteAnalyzer();
    this.supabase = supabaseClient;
    this.logger = new Logger('LeadGenerator');
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
   * Salva i lead nel database con UPSERT su unique_key.
   * Semantica di merge (freschezza dati):
   * - riga nuova -> insert
   * - riga esistente con content_hash IDENTICO -> aggiorna solo
   *   last_seen_at/last_verified_at (nessun cambiamento reale)
   * - riga esistente con hash diverso -> upsert completo (analisi/score
   *   aggiornati); id e created_at non vengono mai toccati
   * Prima: INSERT cieco -> il vincolo unique rigettava ogni re-scrape e i
   * lead non venivano MAI aggiornati (freschezza zero).
   *
   * Ritorna i conteggi effettivi: {saved, errors, quarantined} così il chiamante
   * (scraping-job-runner) può registrare le metriche reali del run.
   */
  async saveLeads(businesses: AnalyzedBusiness[]): Promise<{ saved: number; errors: number; quarantined: number }> {
    console.log(`Tentativo di salvare ${businesses.length} lead nel database`);

    let saved = 0;
    let errors = 0;
    let quarantined = 0;
    let unchanged = 0;

    // Serializza tutto prima, così possiamo confrontare gli hash in una query
    const payloads = businesses.map(business => {
      try {
        return { business, leadData: this.serializeForDatabase(business) };
      } catch (error) {
        errors++;
        console.error(`Errore nella serializzazione del lead ${business.name}:`, error);
        return null;
      }
    }).filter((p): p is { business: AnalyzedBusiness; leadData: any } => p !== null);

    // Stato attuale delle righe con le stesse chiavi
    const keys = payloads.map(p => p.leadData.unique_key);
    const existingByKey = new Map<string, { id: string; content_hash: string | null }>();
    if (keys.length > 0) {
      const { data: existingRows, error: readError } = await this.supabase
        .from('leads')
        .select('id, unique_key, content_hash')
        .in('unique_key', keys);
      if (readError) {
        console.error('Errore lettura lead esistenti (procedo con upsert):', readError);
      } else {
        for (const row of existingRows || []) {
          existingByKey.set(row.unique_key, { id: row.id, content_hash: row.content_hash });
        }
      }
    }

    const nowIso = new Date().toISOString();

    for (const { business, leadData } of payloads) {
      try {
        const existing = existingByKey.get(leadData.unique_key);

        if (existing && existing.content_hash === leadData.content_hash) {
          // Nessun cambiamento osservato: bump di freschezza e basta
          const { error } = await this.supabase
            .from('leads')
            .update({ last_seen_at: nowIso, last_verified_at: nowIso })
            .eq('id', existing.id);
          if (error) {
            errors++;
            console.error(`Errore bump freschezza ${business.name}:`, error);
          } else {
            unchanged++;
          }
          continue;
        }

        const { error } = await this.supabase
          .from('leads')
          .upsert([{ ...leadData, last_seen_at: nowIso }], { onConflict: 'unique_key' });

        if (error) {
          errors++;
          console.error(`Errore nel salvataggio del lead ${business.name}:`, error);
        } else {
          saved++;
          if (leadData.status === 'quarantine') quarantined++;
        }
      } catch (error) {
        errors++;
        console.error(`Errore nel processamento del lead ${business.name}:`, error);
      }
    }

    if (unchanged > 0) {
      console.log(`♻️ ${unchanged} lead invariati: aggiornata solo la freschezza (last_seen_at)`);
    }

    // Se più del 20% degli insert è fallito, segnala a livello error:
    // probabile problema sistemico (schema, permessi, rete) e non lead singoli.
    if (businesses.length > 0 && errors / businesses.length > 0.2) {
      this.logger.error(`❌ Salvataggio lead degradato: ${errors}/${businesses.length} scritture fallite (>20%)`);
    }

    return { saved: saved + unchanged, errors, quarantined };
  }

  /**
   * Serializza un business per il database
   */
  private serializeForDatabase(business: AnalyzedBusiness): any {
    const analysis = business.websiteAnalysis || null;

    // OPPORTUNITY SCORE v2: 0-100, ALTO = migliore opportunità.
    // (Il vecchio score era un "health score" del sito con convenzione opposta.)
    const opportunity = computeOpportunityScore(analysis, {
      hasWebsite: !!business.website,
      phone: business.phone,
      email: (business as any).email,
      rating: business.rating,
      reviewsCount: business.reviews_count
    }, {
      confirmedAbsence: !business.website
        || analysis?.reachabilityVerdict === 'offline_confirmed'
        || analysis?.websiteStatus === 'parked'
    });

    // Identità deterministica (lead-identity): dominio+città -> telefono -> nome
    const uniqueKey = computeUniqueKey({
      source: business.source || 'google_maps',
      name: business.name,
      website: business.website,
      phone: business.phone,
      city: business.city
    });

    // Hash dei soli fatti osservati (NIENTE timestamp): re-scrape identico =
    // stesso hash = solo bump di freschezza
    const confirmedIssues = [
      ...(analysis?.issues?.critical || []),
      ...(analysis?.issues?.high || [])
    ];
    const contentHash = computeContentHash({
      website: business.website,
      phone: business.phone,
      email: (business as any).email || null,
      address: business.address,
      category: business.category,
      hasWebsite: !!business.website,
      confirmedIssues,
      technicalHealth: analysis?.technicalHealth ?? null
    });

    // Decisione di pubblicazione: combina raggiungibilità, proprietà del sito,
    // affidabilità dei contatti E affidabilità dell'analisi. I lead a bassa
    // confidenza vanno in quarantena e NON vengono mostrati agli utenti.
    const confidence = this.computeLeadConfidence(business);

    // needed_roles: dal nuovo scoring; fallback al vecchio estrattore se vuoto
    const neededRoles = opportunity.neededRoles.length > 0
      ? opportunity.neededRoles
      : this.getSuggestedRoles(business);

    // WhatsApp: link wa.me/api.whatsapp trovati sul sito (pitch concreto per PMI)
    const hasWhatsapp = (analysis?.content?.socialLinks || [])
      .some((l: string) => /wa\.me\/|api\.whatsapp\.com/i.test(l))

    return {
      unique_key: uniqueKey,
      content_hash: contentHash,
      business_name: business.name || 'Nome non disponibile',
      website_url: business.website || null,
      phone: business.phone || null,
      email: (business as any).email || null,
      email_confidence: (business as any).email_confidence || null,
      address: business.address || null,
      city: business.city || null,
      category: business.category || null,
      rating: business.rating ?? null,
      reviews_count: business.reviews_count ?? null,
      has_whatsapp: analysis ? hasWhatsapp : null,
      score: opportunity.score,
      score_version: 2,
      origin: 'scraping',
      source: business.source || 'google_maps',
      // Confidenza e stato di pubblicazione
      status: confidence?.status || 'published',
      confidence_score: confidence?.score ?? 100,
      needs_recheck: confidence?.needsRecheck ?? false,
      quarantine_reasons: confidence?.reasons || [],
      reachability_verdict: analysis?.reachabilityVerdict || null,
      last_verified_at: new Date().toISOString(),
      // Struttura moderna completa
      website_analysis: analysis,
      // Struttura legacy per compatibilità
      analysis: business.analysis,
      // Campi moderni estratti
      issues: this.extractIssues(business),
      opportunities: this.extractOpportunities(business),
      needed_roles: neededRoles
      // NB: niente created_at (default DB) né id: l'upsert non deve toccarli.
      // social_presence viene dal nuovo campo social (link dal sito)
      , social_presence: analysis?.social || null
    };
  }

  /**
   * Normalizza un telefono alle ultime 8 cifre significative, per confronti robusti
   * a prefissi/spaziature diverse.
   */
  private phoneTail(phone?: string | null): string {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 8 ? digits.slice(-8) : ''
  }

  /**
   * Verifica che il sito web associato al business sia DAVVERO il suo.
   * Segnale forte: il telefono/email del business compare tra i contatti estratti
   * dal sito. Se il sito espone contatti ma NESSUNO combacia, è sospetto (sito sbagliato,
   * aggregatore, social). Se non abbiamo elementi sufficienti, ritorniamo null (ignoto).
   *
   * @returns true = verificato, false = sospetto non-proprietà, null = non determinabile
   */
  private verifyWebsiteOwnership(business: AnalyzedBusiness): boolean | null {
    const analysis = business.websiteAnalysis
    if (!analysis || !analysis.isAccessible) return null
    const content = analysis.content
    if (!content) return null

    const sitePhones = (content.phoneNumbers || []).map(p => this.phoneTail(p)).filter(Boolean)

    const bizPhone = this.phoneTail(business.phone)

    // Match positivo: il telefono del business compare tra i contatti del sito.
    if (bizPhone && sitePhones.includes(bizPhone)) return true

    // Il sito espone telefoni ma nessuno combacia col business -> sospetto sito sbagliato.
    if (bizPhone && sitePhones.length > 0) return false

    // Non abbastanza informazioni per decidere.
    return null
  }

  /**
   * Calcola la decisione di pubblicazione del lead combinando tutti i segnali di
   * confidenza disponibili: raggiungibilità, proprietà del sito, contatti, e numero
   * di segnali tecnici non verificabili.
   */
  private computeLeadConfidence(business: AnalyzedBusiness): LeadConfidenceDecision {
    const analysis = business.websiteAnalysis

    const ownership = this.verifyWebsiteOwnership(business)
    // Contattabile se abbiamo un telefono dallo scraping o contatti estratti dal sito.
    const siteContacts = analysis?.content
    const hasReliableContact = !!business.phone ||
      !!(siteContacts?.phoneNumbers?.length) ||
      !!(siteContacts?.emailAddresses?.length)

    // Conta i segnali tecnici che non siamo riusciti a verificare con certezza.
    let unverifiableSignalsCount = 0
    if (analysis?.tracking?.detectionConfidence === 'unverifiable') unverifiableSignalsCount++
    if (analysis?.gdpr?.cookieBannerConfidence === 'unverifiable') unverifiableSignalsCount++

    return decideLeadPublication({
      reachability: analysis?.reachabilityVerdict,
      websiteOwnershipVerified: ownership,
      hasReliableContact,
      unverifiableSignalsCount,
      // Gating sull'affidabilità dell'analisi: se i moduli sono in gran parte
      // falliti, i "difetti" potrebbero essere artefatti -> quarantena + recheck
      analysisReliability: (analysis as any)?.reliability?.overallConfidence,
      analysisMethod: (analysis as any)?.reliability?.analysisMethod
    })
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

  // NB: unique_key e content_hash ora vivono in utils/lead-identity.ts
  // (formule deterministiche condivise con gli script di dedup/backfill).
}
