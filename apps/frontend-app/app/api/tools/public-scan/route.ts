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
    upgradeMessage: "Registrati gratuitamente per vedere l'analisi completa con raccomandazioni dettagliate e tutti i dati tecnici!"
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

// Funzione per normalizzare URL per confronto
function normalizeUrl(url: string): string {
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

    // Verifica se il sito è già presente nei nostri lead
    const normalizedInputUrl = normalizeUrl(validUrl.toString())
    const inputDomain = validUrl.hostname.toLowerCase()
    const inputDomainNoWww = inputDomain.startsWith('www.') ? inputDomain.substring(4) : inputDomain
    const inputDomainWithWww = inputDomain.startsWith('www.') ? inputDomain : `www.${inputDomain}`
    
    // Cerca varianti dell'URL per essere più precisi
    const { data: existingLead, error: leadError } = await supabase
      .from('leads')
      .select('id, business_name, score, analysis, created_at, website_url')
      .or(`website_url.ilike.%${inputDomainNoWww}%,website_url.ilike.%${inputDomainWithWww}%`)
      .limit(1)
      .maybeSingle()

    if (leadError && leadError.code !== 'PGRST116') {
      console.error('Errore verifica lead esistente:', leadError)
      // Non blocchiamo per questo errore, continuiamo con l'analisi
    }

    // Se il lead esiste già, restituiamo un messaggio informativo
    if (existingLead) {
      return NextResponse.json({
        success: true,
        existingLead: true,
        analysis: existingLead.analysis ? generateLimitedAnalysis(existingLead.analysis) : null,
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

    // Esegui analisi completa
    const analyzer = new RealSiteAnalyzer()
    
    try {
      await analyzer.initialize()
      const fullAnalysis = await analyzer.analyzeSite(validUrl.toString())
      
      // Genera versione limitata
      const limitedAnalysis = generateLimitedAnalysis(fullAnalysis)
      
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

    } finally {
      await analyzer.cleanup()
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
