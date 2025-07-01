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

// Funzione per normalizzare URL per confronto (copiata da public-scan)
function normalizeUrlForComparison(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    // Rimuove www. e trailing slash per confronto consistente
    let hostname = urlObj.hostname.toLowerCase()
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    let pathname = urlObj.pathname
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1)
    }
    return `${urlObj.protocol}//${hostname}${pathname}${urlObj.search}${urlObj.hash}`
  } catch {
    return url.toLowerCase()
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

    // 5. Controlla se il lead esiste già nel database (ottimizzazione trasparente)
    const normalizedInputUrl = normalizeUrlForComparison(normalizedUrl!)
    const urlObj = new URL(normalizedUrl!)
    const inputDomain = urlObj.hostname.toLowerCase()
    
    // Estrae il dominio principale (rimuove sottodomini come www, m, shop, etc.)
    const domainParts = inputDomain.split('.')
    const mainDomain = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : inputDomain
    
    // Varianti del dominio da cercare (più complete)
    const domainVariants = [
      inputDomain,
      inputDomain.startsWith('www.') ? inputDomain.substring(4) : `www.${inputDomain}`,
      mainDomain,
      `www.${mainDomain}`,
      // Aggiunge varianti con sottodomini comuni
      `m.${mainDomain}`,
      `mobile.${mainDomain}`,
      `shop.${mainDomain}`,
      `store.${mainDomain}`
    ].filter((domain, index, self) => self.indexOf(domain) === index) // rimuove duplicati
    
    // Prima cerca per URL normalizzato esatto
    let { data: existingLead, error: leadError } = await supabase
      .from('leads')
      .select('id, business_name, score, analysis, created_at, website_url, origin')
      .ilike('website_url', `%${normalizedInputUrl}%`)
      .limit(1)
      .maybeSingle()

    // Se non trova per URL esatto, cerca per varianti del dominio
    if (!existingLead && (!leadError || leadError.code === 'PGRST116')) {
      const domainQueries = domainVariants.map(domain => `website_url.ilike.%${domain}%`).join(',')
      
      const result = await supabase
        .from('leads')
        .select('id, business_name, score, analysis, created_at, website_url, origin')
        .or(domainQueries)
        .limit(1)
        .maybeSingle()
      
      existingLead = result.data
      leadError = result.error
    }

    if (leadError && leadError.code !== 'PGRST116') {
      console.error('Errore verifica lead esistente:', leadError)
      // Non blocchiamo per questo errore, continuiamo con l'analisi
    }

    // Se il lead esiste già, restituiamo l'analisi esistente (ottimizzazione trasparente)
    if (existingLead) {
      // Aggiungiamo l'overallScore all'analisi se manca
      const analysisWithScore = {
        ...existingLead.analysis,
        overallScore: existingLead.analysis.overallScore || existingLead.score
      }
      
      return NextResponse.json({
        success: true,
        data: {
          leadId: existingLead.id,
          analysis: analysisWithScore,
          creditsRemaining: creditResult.creditsRemaining!
        }
      })
    }

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
