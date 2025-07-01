/**
 * Servizio per gestire i lead del database
 * Include salvataggio di lead da analisi manuale e scraping automatico
 * Gestisce deduplicazione cross-source tramite UnifiedLeadManager
 */

import { createClient } from '@supabase/supabase-js'
import { WebsiteAnalysis } from '../../../../services/scraping-engine/src/types/LeadAnalysis'
import { UnifiedLeadManager } from '../../../../services/scraping-engine/src/utils/unified-lead-manager'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client con service role per operazioni sui lead
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface ManualLeadData {
  url: string
  analysis: WebsiteAnalysis
  createdByUserId: string
}

/**
 * Estrae nome business da un URL analizzato
 */
function extractBusinessNameFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain
      .replace(/^www\./, '')
      .replace(/\.[^.]+$/, '')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  } catch {
    return url
  }
}

/**
 * Calcola unique_key per un lead da analisi manuale
 */
function generateUniqueKey(url: string, origin: 'manual' | 'scraping'): string {
  const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  return `${origin}-${cleanUrl}`
}

/**
 * Calcola hash del contenuto per rilevare cambiamenti
 */
function generateContentHash(analysis: WebsiteAnalysis): string {
  const content = JSON.stringify({
    seo: analysis.seo,
    performance: analysis.performance,
    tracking: analysis.tracking,
    gdpr: analysis.gdpr,
    legal: analysis.legal,
    social: analysis.social,
    overallScore: analysis.overallScore
  })
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Salva un lead da analisi manuale nel database
 * Usa il sistema unificato di deduplicazione cross-source
 */
export async function saveManualLead({
  url,
  analysis,
  createdByUserId
}: ManualLeadData): Promise<{
  success: boolean
  leadId?: string
  error?: string
  isNewLead?: boolean
}> {
  try {
    const businessName = extractBusinessNameFromUrl(analysis.finalUrl || url)
    
    // Estrai città dall'analisi (se presente nell'indirizzo) o usa "Online"
    const city = analysis.legal?.hasBusinessAddress ? 'Estratto dal sito' : 'Online'
    
    // Prepara i dati per il sistema unificato
    const leadData = {
      business_name: businessName,
      website_url: analysis.finalUrl || url,
      phone: undefined, // Non estratto nell'analisi manuale
      email: undefined, // Non estratto nell'analisi manuale  
      address: undefined, // Non estratto nell'analisi manuale
      city,
      category: 'Analisi Manuale',
      score: analysis.overallScore,
      source: 'manual_scan',
      analysis: {
        // Dati nuovi strutturati
        seo: analysis.seo,
        performance: analysis.performance,
        tracking: analysis.tracking,
        gdpr: analysis.gdpr,
        legal: analysis.legal,
        social: analysis.social,
        issues: analysis.issues,
        analysisDate: analysis.analysisDate,
        analysisTime: analysis.analysisTime,
        httpStatus: analysis.httpStatus,
        redirectChain: analysis.redirectChain,
        isAccessible: analysis.isAccessible,
        overallScore: analysis.overallScore,
        
        // COMPATIBILITÀ LEGACY: Mapping preciso dei campi legacy per backward compatibility
        has_website: analysis.isAccessible && analysis.httpStatus >= 200 && analysis.httpStatus < 400,
        mobile_friendly: analysis.performance?.isResponsive || false, // Se non rilevato = false
        website_load_time: analysis.performance?.loadTime || 0,
        has_tracking_pixel: analysis.tracking?.hasFacebookPixel || analysis.tracking?.hasGoogleAnalytics || false,
        gtm_installed: analysis.tracking?.hasGoogleTagManager || false,
        has_ssl: analysis.finalUrl?.startsWith('https://') || false, // Solo se effettivamente HTTPS
        broken_images: (analysis.performance?.brokenImages || 0) > 0,
        missing_meta_tags: [
          ...(analysis.seo?.hasTitle ? [] : ['title']),
          ...(analysis.seo?.hasMetaDescription ? [] : ['description']),
          ...(analysis.seo?.hasH1 ? [] : ['h1'])
        ]
      },
      needed_roles: ['web-developer'], // Semplificato per ora
      issues: [] // Semplificato per ora
    }

    // Usa il sistema unificato di deduplicazione
    const leadManager = new UnifiedLeadManager(supabaseAdmin)
    const result = await leadManager.saveOrEnrichLead(leadData)

    if (!result.success) {
      return { 
        success: false, 
        error: result.error || 'Errore salvataggio lead' 
      }
    }

    return {
      success: true,
      leadId: result.leadId,
      isNewLead: !result.wasUpdated
    }

  } catch (error) {
    console.error('Errore saveManualLead:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    }
  }
}

/**
 * Ottieni lead con filtri
 */
export async function getLeads({
  origin,
  limit = 50,
  offset = 0
}: {
  origin?: 'manual' | 'scraping'
  limit?: number
  offset?: number
} = {}) {
  try {
    let query = supabaseAdmin
      .from('leads')
      .select(`
        *,
        lead_analysis (
          has_website,
          website_load_time,
          has_tracking_pixel,
          broken_images,
          gtm_installed,
          has_ssl,
          mobile_friendly,
          overall_score
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (origin) {
      query = query.eq('origin', origin)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: 'Errore recupero lead' }
    }

    return { success: true, data }

  } catch (error) {
    console.error('Errore getLeads:', error)
    return { success: false, error: 'Errore interno del sistema' }
  }
}
