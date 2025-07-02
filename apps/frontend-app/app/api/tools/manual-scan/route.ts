/**
 * API endpoint per analisi manuale di siti web
 * POST /api/tools/manual-scan
 * 
 * Funzionalità:
 * - Verifica autenticazione utente
 * - Controlla crediti disponibili
 * - Esegue analisi completa del sito usando SiteAnalyzer
 * - Salva risultato come lead nel database
 * - Decrementa crediti utente
 * - Logga operazione per audit
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrementUserCredits } from '../../../../lib/services/credits'
import { saveManualLead } from '../../../../lib/services/leads'
import { RealSiteAnalyzer } from '../../../../lib/analyzers/real-site-analyzer'
import type { WebsiteAnalysis } from '../../../../lib/types/analysis'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ManualScanRequest {
  url: string
}

interface ManualScanResponse {
  success: boolean
  data?: {
    leadId: string
    analysis: WebsiteAnalysis
    creditsRemaining: number
  }
  error?: string
}

/**
 * Valida e normalizza URL
 */
function validateAndNormalizeUrl(url: string): { isValid: boolean; normalizedUrl?: string; error?: string } {
  try {
    // Aggiungi https:// se manca il protocollo
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    const parsedUrl = new URL(url)
    
    // Verifica che sia http o https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'Solo URL HTTP/HTTPS sono supportati' }
    }

    // Verifica che abbia un hostname valido
    if (!parsedUrl.hostname || parsedUrl.hostname === 'localhost') {
      return { isValid: false, error: 'URL non valido o localhost non supportato' }
    }

    return { isValid: true, normalizedUrl: parsedUrl.toString() }

  } catch (error) {
    return { isValid: false, error: 'Formato URL non valido' }
  }
}

/**
 * Estrae il dominio principale da un URL (senza www, sottodomini, path)
 */
function extractMainDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    let hostname = urlObj.hostname.toLowerCase()
    
    // Rimuove www.
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    
    // Per domini con sottodomini (es. shop.example.com), estrae solo example.com
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      // Mantiene solo gli ultimi due segmenti (dominio.tld)
      return parts.slice(-2).join('.')
    }
    
    return hostname
  } catch {
    return url.toLowerCase()
  }
}

/**
 * Controlla se un URL appartiene a un determinato dominio principale
 */
function belongsToMainDomain(url: string, targetDomain: string): boolean {
  try {
    const urlDomain = extractMainDomain(url)
    return urlDomain === targetDomain
  } catch {
    return false
  }
}

/**
 * Esegue analisi del sito usando il RealSiteAnalyzer
 */
async function analyzeSite(url: string) {
  const analyzer = new RealSiteAnalyzer()
  
  try {
    await analyzer.initialize()
    const analysis = await analyzer.analyzeSite(url)
    return analysis

  } catch (error) {
    console.error('Errore analisi sito:', error)
    throw new Error('Impossibile analizzare il sito web')
  } finally {
    await analyzer.cleanup()
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ManualScanResponse>> {
  try {
    // 1. Verifica autenticazione
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Token di autenticazione mancante' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // 2. Parsing e validazione input
    let body: ManualScanRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corpo della richiesta non valido' },
        { status: 400 }
      )
    }

    if (!body.url) {
      return NextResponse.json(
        { success: false, error: 'URL richiesto' },
        { status: 400 }
      )
    }

    // 3. Valida URL
    const { isValid, normalizedUrl, error: urlError } = validateAndNormalizeUrl(body.url)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: urlError },
        { status: 400 }
      )
    }

    // 4. Controlla e decrementa crediti prima dell'analisi
    const creditResult = await decrementUserCredits({
      userId: user.id,
      action: 'manual_scan',
      creditsConsumed: 1,
      metadata: { url: normalizedUrl }
    })

    if (!creditResult.success) {
      return NextResponse.json(
        { success: false, error: creditResult.error },
        { status: 402 } // Payment required
      )
    }

    // 5. Controlla se esiste già un lead per il dominio principale
    const inputDomain = extractMainDomain(normalizedUrl!)
    
    console.log(`🔍 Cerco lead esistente per dominio: ${inputDomain}`)
    
    // Cerca tutti i lead che appartengono al dominio principale
    const { data: potentialLeads, error: leadError } = await supabase
      .from('leads')
      .select('id, business_name, score, analysis, created_at, website_url, origin')
      .not('website_url', 'is', null)
      .limit(20) // Limita per performance
    
    if (leadError) {
      console.error('Errore verifica lead esistente:', leadError)
      // Non blocchiamo per questo errore, continuiamo con l'analisi
    }
    
    // Filtra i lead che appartengono effettivamente al dominio richiesto
    const existingLead = potentialLeads?.find(lead => 
      lead.website_url && belongsToMainDomain(lead.website_url, inputDomain)
    )

    // Se il lead esiste già, restituiamo l'analisi esistente (ottimizzazione trasparente)
    if (existingLead) {
      console.log(`✅ Lead esistente trovato: ${existingLead.id} per dominio ${inputDomain}`)
      
      // Aggiungiamo l'overallScore all'analisi se manca
      const analysisWithScore = {
        ...existingLead.analysis,
        overallScore: existingLead.analysis.overallScore || existingLead.score,
        // Indica che questo è un lead esistente
        isExistingLead: true,
        existingLeadId: existingLead.id
      }
      
      return NextResponse.json({
        success: true,
        existingLead: true,
        message: `Analisi recuperata da lead esistente. Il dominio ${inputDomain} è già stato analizzato.`,
        leadInfo: {
          businessName: existingLead.business_name,
          websiteUrl: existingLead.website_url,
          origin: existingLead.origin || 'scraping',
          score: existingLead.score,
          analyzedDate: existingLead.created_at
        },
        data: {
          leadId: existingLead.id,
          analysis: analysisWithScore,
          creditsRemaining: creditResult.creditsRemaining!
        }
      })
    }
    
    console.log(`🆕 Nessun lead esistente per dominio ${inputDomain}, procedo con analisi reale`)

    let analysis
    let leadId: string | undefined

    try {
      // 6. Esegui analisi del sito
      analysis = await analyzeSite(normalizedUrl!)
      
      // 7. Salva lead nel database
      const leadResult = await saveManualLead({
        url: normalizedUrl!,
        analysis,
        createdByUserId: user.id
      })

      if (!leadResult.success) {
        throw new Error(leadResult.error || 'Errore salvataggio lead')
      }

      leadId = leadResult.leadId

      // 8. Risposta di successo
      return NextResponse.json({
        success: true,
        data: {
          leadId: leadResult.leadId!,
          analysis,
          creditsRemaining: creditResult.creditsRemaining!
        }
      })

    } catch (analysisError) {
      // Se l'analisi fallisce, ripristina i crediti
      console.error('Errore durante analisi:', analysisError)
      
      // TODO: Implementare rollback crediti in caso di errore
      // Per ora logghiamo l'errore
      
      return NextResponse.json(
        { 
          success: false, 
          error: analysisError instanceof Error ? analysisError.message : 'Errore durante analisi del sito'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Errore interno manual-scan:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
