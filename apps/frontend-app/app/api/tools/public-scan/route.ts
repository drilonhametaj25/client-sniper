/**
 * API endpoint per l'analisi pubblica di siti web
 * Permette analisi limitate (2 al giorno) per IP senza registrazione
 * Mostra risultati parziali per invogliare la registrazione
 * Usato dal    // Se il lead esiste già, restituiamo l'analisi esistente limitata
    if (existingLead) {
      // Aggiungiamo l'overallScore all'analisi se manca
      const analysisWithScore = existingLead.analysis ? {
        ...existingLead.analysis,
        overallScore: existingLead.analysis.overallScore || existingLead.score
      } : null
      
      return NextResponse.json({
        success: true,
        existingLead: true,
        analysis: analysisWithScore ? generateLimitedAnalysis(analysisWithScore) : null,
        message: `Questo sito è già nella nostra database! È stato analizzato il ${new Date(existingLead.created_at).toLocaleDateString('it-IT')}.`,
        leadInfo: {
          businessName: existingLead.business_name,
          score: existingLead.score,
          analyzedDate: existingLead.created_at
        },ools/public-scan
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { RealSiteAnalyzer } from '@/lib/analyzers/real-site-analyzer'
import { SimplifiedSiteAnalyzer } from '@/lib/analyzers/simplified-site-analyzer'

// Limite giornaliero per IP non registrati
const DAILY_IP_LIMIT = 2

// Funzione per ottenere l'IP del client
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (real) {
    return real
  }
  if (cfConnecting) {
    return cfConnecting
  }
  
  return '127.0.0.1' // fallback per sviluppo
}

// Funzione per generare analisi limitata (stesso punteggio, meno dettagli)
function generateLimitedAnalysis(fullAnalysis: any) {
  // Calcola punteggi parziali basati sui dati disponibili
  const seoScore = calculateSEOScore(fullAnalysis.seo, fullAnalysis.issues)
  const performanceScore = calculatePerformanceScore(fullAnalysis.performance, fullAnalysis.issues)
  
  // Determina il tipo di analisi sorgente
  const sourceAnalysisType = fullAnalysis.analysisType || 'full'
  const isSimplified = sourceAnalysisType === 'simplified'
  
  return {
    url: fullAnalysis.url,
    finalUrl: fullAnalysis.finalUrl,
    isAccessible: fullAnalysis.isAccessible,
    httpStatus: fullAnalysis.httpStatus,
    
    // SEO limitato - punteggio calcolato, meno dettagli
    seo: {
      hasTitle: fullAnalysis.seo?.hasTitle || false,
      hasMetaDescription: fullAnalysis.seo?.hasMetaDescription || false,
      hasH1: fullAnalysis.seo?.hasH1 || false,
      score: seoScore
    },
    
    // Performance - punteggio calcolato, meno dettagli
    performance: {
      loadTime: fullAnalysis.performance?.loadTime || 0,
      isResponsive: fullAnalysis.performance?.isResponsive || false,
      score: performanceScore
    },
    
    // Social presence limitata - solo presenza generica
    social: {
      hasAnySocial: fullAnalysis.social?.hasAnySocial || false,
      socialCount: fullAnalysis.social?.socialCount || 0
    },
    
    // Tracking limitato - solo presenza generica
    tracking: {
      hasAnyTracking: fullAnalysis.tracking?.hasGoogleAnalytics || 
                     fullAnalysis.tracking?.hasFacebookPixel || 
                     fullAnalysis.tracking?.hasGoogleTagManager || false
    },
    
    // Score generale IDENTICO all'analisi completa
    overallScore: fullAnalysis.overallScore || 0,
    
    // Flag per indicare che è limitata
    isLimitedAnalysis: true,
    
    // Messaggio personalizzato in base al tipo di analisi
    upgradeMessage: isSimplified 
      ? "Registrati gratuitamente per vedere l'analisi completa con tutti i dati tecnici avanzati!"
      : "Registrati gratuitamente per vedere l'analisi completa con raccomandazioni dettagliate e tutti i dati tecnici!"
  }
}

// Calcola punteggio SEO basato sui dati disponibili
function calculateSEOScore(seo: any, issues: any): number {
  let score = 100
  
  if (issues?.missingTitle || !seo?.hasTitle) score -= 30
  if (issues?.shortTitle) score -= 10
  if (issues?.missingMetaDescription || !seo?.hasMetaDescription) score -= 25
  if (issues?.shortMetaDescription) score -= 10
  if (issues?.missingH1 || !seo?.hasH1) score -= 20
  if (!seo?.hasStructuredData) score -= 5
  
  return Math.max(0, Math.min(100, score))
}

// Calcola punteggio Performance basato sui dati disponibili
function calculatePerformanceScore(performance: any, issues: any): number {
  let score = 100
  
  if (issues?.slowLoading || (performance?.loadTime > 3000)) score -= 30
  if (issues?.brokenImages || (performance?.brokenImages > 0)) score -= 20
  if (!performance?.isResponsive) score -= 25
  if (performance?.loadTime > 5000) score -= 15 // penalità extra per siti molto lenti
  if (!performance?.hasHTTPS) score -= 10
  
  return Math.max(0, Math.min(100, score))
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
    console.log('⚡ Usando direttamente SimplifiedSiteAnalyzer in ambiente serverless');
    
    try {
      const simplifiedAnalyzer = new SimplifiedSiteAnalyzer();
      const analysis = await simplifiedAnalyzer.analyzeSite(url);
      console.log('✅ Analisi semplificata completata con successo');
      
      // Assicurati che l'analysis abbia il flag corretto
      return {
        ...analysis,
        analysisType: 'simplified' as const
      };
      
    } catch (error) {
      const simplifiedError = error as Error;
      console.error('❌ Errore con SimplifiedSiteAnalyzer:', simplifiedError);
      throw new Error(`Impossibile analizzare il sito web: ${simplifiedError.message || 'Errore sconosciuto'}`);
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
      const simplifiedError = error as Error;
      console.error('❌ Errore anche con SimplifiedSiteAnalyzer:', simplifiedError);
      throw new Error(`Impossibile analizzare il sito web: ${simplifiedError.message || 'Errore sconosciuto'}`);
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

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL richiesto' },
        { status: 400 }
      )
    }

    // Validazione URL base
    let validUrl: URL
    try {
      validUrl = new URL(url.startsWith('http') ? url : `https://${url}`)
    } catch {
      return NextResponse.json(
        { error: 'URL non valido' },
        { status: 400 }
      )
    }

    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''

    // Verifica limite giornaliero per IP
    const { data: usageCount, error: countError } = await supabase
      .rpc('check_daily_ip_limit', { 
        p_ip_address: clientIP,
        p_daily_limit: DAILY_IP_LIMIT 
      })

    if (countError) {
      console.error('Errore verifica limite IP:', countError)
      return NextResponse.json(
        { error: 'Errore interno del server' },
        { status: 500 }
      )
    }

    if (usageCount >= DAILY_IP_LIMIT) {
      return NextResponse.json(
        { 
          error: 'Limite giornaliero raggiunto',
          message: `Hai raggiunto il limite di ${DAILY_IP_LIMIT} analisi gratuite al giorno. Registrati per ottenere più analisi!`,
          upgradeRequired: true
        },
        { status: 429 }
      )
    }

    // Controlla se esiste già un lead per il dominio principale
    const inputDomain = extractMainDomain(validUrl.toString())
    
    console.log(`🔍 [Public Scan] Cerco lead esistente per dominio: ${inputDomain}`)
    
    // Cerca tutti i lead che potrebbero appartenere al dominio (con limite per performance)
    const { data: potentialLeads, error: leadError } = await supabase
      .from('leads')
      .select('id, business_name, score, analysis, created_at, website_url')
      .not('website_url', 'is', null)
      .limit(20) // Limita per performance
    
    if (leadError && leadError.code !== 'PGRST116') {
      console.error('Errore verifica lead esistente:', leadError)
      // Non blocchiamo per questo errore, continuiamo con l'analisi
    }
    
    // Filtra i lead che appartengono effettivamente al dominio richiesto
    const existingLead = potentialLeads?.find(lead => 
      lead.website_url && belongsToMainDomain(lead.website_url, inputDomain)
    )

    // Se il lead esiste già, restituiamo l'analisi esistente limitata
    if (existingLead) {
      console.log(`✅ [Public Scan] Lead esistente trovato: ${existingLead.id} per dominio ${inputDomain}`)
      
      // Aggiungiamo l'overallScore all'analisi se manca
      const analysisWithScore = existingLead.analysis ? {
        ...existingLead.analysis,
        overallScore: existingLead.analysis.overallScore || existingLead.score
      } : null
      
      return NextResponse.json({
        success: true,
        existingLead: true,
        analysis: analysisWithScore ? generateLimitedAnalysis(analysisWithScore) : null,
        message: `Questo sito è già nella nostra database! È stato analizzato il ${new Date(existingLead.created_at).toLocaleDateString('it-IT')}.`,
        leadInfo: {
          businessName: existingLead.business_name,
          score: existingLead.score,
          analyzedDate: existingLead.created_at
        },
        upgradeMessage: "Registrati per vedere tutti i lead della nostra database e accedere ai dettagli completi!",
        remainingAnalyses: DAILY_IP_LIMIT - usageCount // Non consumiamo un'analisi se il lead esiste già
      })
    }
    
    console.log(`🆕 [Public Scan] Nessun lead esistente per dominio ${inputDomain}, procedo con analisi reale`)

    try {
      // Usa la funzione analyzeSite che gestisce automaticamente il fallback
      const fullAnalysis = await analyzeSite(validUrl.toString())
      
      // Genera versione limitata
      const limitedAnalysis = {
        ...generateLimitedAnalysis(fullAnalysis),
        // Includi il tipo di analisi eseguita
        analysisType: fullAnalysis.analysisType || 'full'
      }
      
      // Registra l'uso dell'API
      const { error: logError } = await supabase
        .rpc('log_public_analysis', {
          p_ip_address: clientIP,
          p_website_url: validUrl.toString(),
          p_user_agent: userAgent
        })

      if (logError) {
        console.error('Errore logging analisi pubblica:', logError)
        // Non blocchiamo l'analisi per questo errore
      }

      return NextResponse.json({
        success: true,
        analysis: limitedAnalysis,
        remainingAnalyses: DAILY_IP_LIMIT - (usageCount + 1),
        message: usageCount === 0 ? 
          `Prima analisi gratuita completata! Puoi farne ancora ${DAILY_IP_LIMIT - 1} oggi.` :
          `Analisi completata! Puoi farne ancora ${DAILY_IP_LIMIT - (usageCount + 1)} oggi.`
      })

    } catch (analysisError) {
      console.error('Errore durante l\'analisi del sito:', analysisError)
      throw analysisError // Rilancia l'errore per essere catturato dal try/catch esterno
    }

  } catch (error) {
    console.error('Errore analisi pubblica:', error)
    
    return NextResponse.json(
      { 
        error: 'Errore durante l\'analisi del sito',
        message: 'Si è verificato un errore tecnico. Riprova tra qualche minuto.'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Endpoint per verificare quante analisi rimangono per l'IP
  const clientIP = getClientIP(request)
  
  try {
    const { data: usageCount, error } = await supabase
      .rpc('check_daily_ip_limit', { 
        p_ip_address: clientIP,
        p_daily_limit: DAILY_IP_LIMIT 
      })

    if (error) {
      console.error('Errore verifica limite IP:', error)
      return NextResponse.json(
        { error: 'Errore interno' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      used: usageCount || 0,
      limit: DAILY_IP_LIMIT,
      remaining: Math.max(0, DAILY_IP_LIMIT - (usageCount || 0)),
      canAnalyze: (usageCount || 0) < DAILY_IP_LIMIT
    })

  } catch (error) {
    console.error('Errore controllo limite:', error)
    return NextResponse.json(
      { error: 'Errore interno' },
      { status: 500 }
    )
  }
}
