/**
 * Servizio per gestire i lead del database
 * Include salvataggio di lead da analisi manuale e scraping automatico
 * Gestisce deduplicazione e calcolo unique_key
 */

import { createClient } from '@supabase/supabase-js'
import { WebsiteAnalysis } from '../../../../services/scraping-engine/src/types/LeadAnalysis'
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
    const uniqueKey = generateUniqueKey(analysis.finalUrl || url, 'manual')
    const contentHash = generateContentHash(analysis)
    
    // Estrai città dall'analisi (se presente nell'indirizzo) o usa "Online"
    const city = analysis.legal?.hasBusinessAddress ? 'Estratto dal sito' : 'Online'
    
    // Determina categoria basata sull'analisi o URL
    const category = 'Analisi Manuale'
    
    // Controlla se il lead esiste già
    const { data: existingLead, error: checkError } = await supabaseAdmin
      .from('leads')
      .select('id, content_hash')
      .eq('unique_key', uniqueKey)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
      return { success: false, error: 'Errore controllo lead esistente' }
    }

    const leadData = {
      business_name: businessName,
      website_url: analysis.finalUrl || url,
      phone: null, // Non estratto nell'analisi manuale
      email: null, // Non estratto nell'analisi manuale  
      address: null, // Non estratto nell'analisi manuale
      city,
      category,
      score: analysis.overallScore,
      analysis: {
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
        overallScore: analysis.overallScore // Aggiungiamo esplicitamente lo score
      },
      source: 'manual_scan',
      origin: 'manual',
      unique_key: uniqueKey,
      content_hash: contentHash,
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (existingLead) {
      // Lead esiste già, aggiorna solo se il contenuto è cambiato
      if (existingLead.content_hash !== contentHash) {
        const { error: updateError } = await supabaseAdmin
          .from('leads')
          .update({
            ...leadData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)

        if (updateError) {
          return { success: false, error: 'Errore aggiornamento lead' }
        }

        return { 
          success: true, 
          leadId: existingLead.id,
          isNewLead: false
        }
      } else {
        // Solo aggiorna last_seen_at
        const { error: updateError } = await supabaseAdmin
          .from('leads')
          .update({ 
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)

        if (updateError) {
          return { success: false, error: 'Errore aggiornamento timestamp' }
        }

        return { 
          success: true, 
          leadId: existingLead.id,
          isNewLead: false
        }
      }
    } else {
      // Crea nuovo lead
      const { data: newLead, error: insertError } = await supabaseAdmin
        .from('leads')
        .insert(leadData)
        .select('id')
        .single()

      if (insertError) {
        return { success: false, error: 'Errore creazione lead' }
      }

      // Salva anche l'analisi dettagliata nella tabella separata
      const { error: analysisError } = await supabaseAdmin
        .from('lead_analysis')
        .insert({
          id: newLead.id,
          has_website: true,
          website_load_time: analysis.performance.loadTime / 1000, // Converti in secondi
          missing_meta_tags: [
            ...(analysis.issues.missingTitle ? ['title'] : []),
            ...(analysis.issues.missingMetaDescription ? ['description'] : []),
            ...(analysis.issues.missingH1 ? ['h1'] : [])
          ],
          has_tracking_pixel: analysis.tracking.hasFacebookPixel || analysis.tracking.hasGoogleAnalytics,
          broken_images: analysis.issues.brokenImages,
          gtm_installed: analysis.tracking.hasGoogleTagManager,
          has_ssl: !analysis.issues.httpsIssues,
          mobile_friendly: analysis.performance.isResponsive,
          overall_score: analysis.overallScore,
          analysis_data: {
            fullAnalysis: analysis,
            scannedAt: new Date().toISOString(),
            scannedBy: 'manual_user',
            userId: createdByUserId
          },
          created_at: new Date().toISOString()
        })

      if (analysisError) {
        console.error('Errore salvataggio analisi dettagliata:', analysisError)
        // Non bloccare l'operazione se l'analisi dettagliata fallisce
      }

      return { 
        success: true, 
        leadId: newLead.id,
        isNewLead: true
      }
    }

  } catch (error) {
    console.error('Errore saveManualLead:', error)
    return { 
      success: false, 
      error: 'Errore interno del sistema' 
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
