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
import { SimplifiedSiteAnalyzer } from '../../../../lib/analyzers/simplified-site-analyzer'
import { URLValidator } from '../../../../lib/utils/url-validator'
import type { WebsiteAnalysis } from '../../../../lib/types/analysis'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ManualScanRequest {
  url: string
}

interface ManualScanResponse {
  success: boolean
  data?: {
    leadId: string | undefined
    analysis: WebsiteAnalysis
    creditsRemaining: number
    isSimplifiedAnalysis?: boolean
  }
  existingLead?: boolean
  message?: string
  leadInfo?: {
    businessName?: string
    websiteUrl?: string
    origin?: string
    score?: number
    analyzedDate?: string
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
 * Esegue analisi del sito usando RealSiteAnalyzer con fallback a SimplifiedSiteAnalyzer
 */
async function analyzeSite(url: string) {
  // Prima controlla se l'URL ha un protocollo
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  // Rileva se siamo in ambiente serverless
  const isServerless = process.env.VERCEL === '1' || 
                       !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
                       !!process.env.LAMBDA_TASK_ROOT;
  
  console.log(`🌐 Ambiente rilevato: ${isServerless ? 'Serverless (Vercel/Lambda)' : 'Standard (Development)'}`);
  console.log(`🔍 Inizio analisi per URL: ${url}`);
  
  // In ambiente serverless, prova direttamente con SimplifiedSiteAnalyzer
  if (isServerless) {
    console.log('⚡ Usando direttamente SimplifiedSiteAnalyzer in ambiente serverless');      try {
      const simplifiedAnalyzer = new SimplifiedSiteAnalyzer();
      const analysis = await simplifiedAnalyzer.analyzeSite(url);
      console.log('✅ Analisi semplificata completata con successo');
      
      // Assicurati che l'analysis abbia il flag corretto
      return {
        ...analysis,
        analysisType: 'simplified' as const
      };
      
    } catch (error) {
      console.error('❌ Errore con SimplifiedSiteAnalyzer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      throw new Error(`Impossibile analizzare il sito web: ${errorMessage}`);
    }
  }
  
  // In ambiente standard, prova prima con RealSiteAnalyzer
  console.log('🔧 Tentativo con RealSiteAnalyzer (Playwright)...');
  const analyzer = new RealSiteAnalyzer();
  
  try {
    // Inizializza e analizza con Playwright
    console.log('🚀 Inizializzazione RealSiteAnalyzer...');
    await analyzer.initialize();
    console.log('🔍 Esecuzione analisi RealSiteAnalyzer...');
    
    const analysis = await analyzer.analyzeSite(url);
    console.log('✅ Analisi completa completata con successo');
    
    return analysis; // Già include analysisType: 'full'
    
  } catch (error) {
    console.error('❌ Errore con RealSiteAnalyzer:', error);
    console.log('🔄 Fallback a SimplifiedSiteAnalyzer...');
    
    // Fallback a SimplifiedSiteAnalyzer
    try {
      const simplifiedAnalyzer = new SimplifiedSiteAnalyzer();
      const analysis = await simplifiedAnalyzer.analyzeSite(url);
      console.log('✅ Analisi semplificata (fallback) completata');
      
      return {
        ...analysis,
        analysisType: 'simplified' as const
      };
      
    } catch (error) {
      console.error('❌ Errore anche con SimplifiedSiteAnalyzer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      throw new Error(`Impossibile analizzare il sito web: ${errorMessage}`);
    }
    
  } finally {
    // Pulizia risorse
    try {
      await analyzer.cleanup();
      console.log('🧹 Cleanup completato');
    } catch (cleanupError) {
      console.warn('⚠️ Errore non critico durante cleanup:', cleanupError);
    }
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

    // 3. Valida URL con nuovo validator robusto
    const urlValidator = new URLValidator()
    const urlValidation = urlValidator.validate(body.url)
    
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, error: urlValidation.error },
        { status: 400 }
      )
    }

    const normalizedUrl = urlValidation.normalizedUrl!

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
      
      // 7. Salva lead nel database SOLO se l'analisi è completa (non semplificata)
      if (analysis.analysisType !== 'simplified') {
        // Solo le analisi complete vengono salvate nel database
        console.log('✅ Analisi completa, procedo con salvataggio nel database');
        const leadResult = await saveManualLead({
          url: normalizedUrl!,
          analysis,
          createdByUserId: user.id
        });
        
        if (!leadResult.success) {
          throw new Error(leadResult.error || 'Errore salvataggio lead')
        }
        
        leadId = leadResult.leadId;
      } else {
        console.log('ℹ️ Analisi semplificata, non salvo nel database');
        // Per analisi semplificate, generiamo solo un ID temporaneo per la risposta
        leadId = `temp-${Date.now()}`;
      }

      // 8. Risposta di successo
      return NextResponse.json({
        success: true,
        data: {
          leadId: leadId,
          analysis,
          creditsRemaining: creditResult.creditsRemaining!,
          isSimplifiedAnalysis: analysis.analysisType === 'simplified'
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
