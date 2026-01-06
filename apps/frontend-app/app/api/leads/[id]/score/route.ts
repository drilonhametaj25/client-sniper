/**
 * API per ottenere lead scoring avanzato
 * Restituisce breakdown dettagliato, raccomandazioni e probabilità conversione
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Pesi scoring
const SCORING_WEIGHTS = {
  seo: 20,
  performance: 15,
  mobile: 15,
  tracking: 15,
  gdpr: 10,
  content: 10,
  technical: 15
}

// Prezzi servizi
const SERVICE_PRICES = {
  website_redesign: 3000,
  seo_optimization: 1500,
  performance_optimization: 800,
  gdpr_compliance: 500,
  analytics_setup: 400,
  mobile_optimization: 600,
  content_creation: 1000
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const leadId = params.id

    // Recupera lead con analisi
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('id, business_name, category, city, score, analysis, website_url')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 })
    }

    // Verifica che l'utente abbia accesso (sbloccato o admin)
    const { data: unlocked } = await supabaseAdmin
      .from('user_unlocked_leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .single()

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!unlocked && userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Lead non sbloccato' }, { status: 403 })
    }

    // Calcola scoring avanzato dall'analisi salvata
    const analysis = lead.analysis || {}
    const scoring = calculateLeadScoring(analysis, lead.category)

    return NextResponse.json({
      lead_id: lead.id,
      business_name: lead.business_name,
      category: lead.category,
      city: lead.city,
      website_url: lead.website_url,
      base_score: lead.score,
      ...scoring
    })

  } catch (error) {
    console.error('Lead scoring error:', error)
    return NextResponse.json({
      error: 'Errore calcolo scoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Calcola scoring avanzato dal JSON analysis
 */
function calculateLeadScoring(analysis: any, category?: string) {
  // Estrai dati dall'analisi (struttura EnhancedWebsiteAnalysis)
  const seo = analysis.seo || {}
  const performance = analysis.performance || {}
  const mobile = analysis.mobile || {}
  const tracking = analysis.tracking || {}
  const gdpr = analysis.gdpr || {}
  const content = analysis.content || {}
  const issues = analysis.issues || { critical: [], high: [], medium: [], low: [] }

  // Calcola breakdown
  const breakdown = {
    seo: calculateSeoScore(seo),
    performance: calculatePerfScore(performance),
    mobile: calculateMobileScore(mobile),
    tracking: calculateTrackingScore(tracking),
    gdpr: calculateGdprScore(gdpr),
    content: calculateContentScore(content),
    technical: calculateTechnicalScore(analysis, issues)
  }

  // Score pesato
  const weightedScore = Math.round(
    breakdown.seo * (SCORING_WEIGHTS.seo / 100) +
    breakdown.performance * (SCORING_WEIGHTS.performance / 100) +
    breakdown.mobile * (SCORING_WEIGHTS.mobile / 100) +
    breakdown.tracking * (SCORING_WEIGHTS.tracking / 100) +
    breakdown.gdpr * (SCORING_WEIGHTS.gdpr / 100) +
    breakdown.content * (SCORING_WEIGHTS.content / 100) +
    breakdown.technical * (SCORING_WEIGHTS.technical / 100)
  )

  // Qualità lead
  const quality = determineQuality(weightedScore, issues)

  // Probabilità conversione
  const conversionProbability = calculateConversionProb(weightedScore, quality, analysis)

  // Valore stimato
  const estimatedDealValue = calculateDealValue(breakdown)

  // Raccomandazioni
  const recommendations = generateRecommendations(breakdown, analysis)

  // Quick wins
  const quickWins = identifyQuickWins(seo, tracking, gdpr, content, mobile)

  // Urgenza
  const urgencyScore = calculateUrgency(breakdown, issues, analysis)

  return {
    overall_score: weightedScore,
    breakdown,
    quality: quality.level,
    quality_label: quality.label,
    conversion_probability: conversionProbability,
    estimated_deal_value: estimatedDealValue,
    estimated_monthly_revenue: Math.round(estimatedDealValue * 0.05) + 150,
    recommendations,
    quick_wins: quickWins,
    urgency_score: urgencyScore,
    scoring_weights: SCORING_WEIGHTS
  }
}

function calculateSeoScore(seo: any): number {
  let score = 0
  if (!seo.hasTitle) score += 25
  if (!seo.hasMetaDescription) score += 20
  if (!seo.hasH1) score += 15
  if (!seo.hasCanonical) score += 10
  if (!seo.hasStructuredData) score += 15
  if (!seo.hasOpenGraph) score += 10
  if (!seo.hasSitemap) score += 5
  return Math.min(100, score)
}

function calculatePerfScore(perf: any): number {
  let score = 0
  if ((perf.speedScore || 100) < 50) score += 30
  else if ((perf.speedScore || 100) < 70) score += 15
  if ((perf.optimizationScore || 100) < 50) score += 25
  if ((perf.loadComplete || 0) > 5000) score += 20
  if ((perf.totalSize || 0) > 3000000) score += 15
  return Math.min(100, score)
}

function calculateMobileScore(mobile: any): number {
  let score = 0
  if (!mobile.isMobileFriendly) score += 40
  if (!mobile.hasViewportMeta) score += 20
  if (!mobile.hasResponsiveCss) score += 20
  if (mobile.hasHorizontalScroll) score += 10
  if (!mobile.touchTargetsOk) score += 10
  return Math.min(100, score)
}

function calculateTrackingScore(tracking: any): number {
  let score = 0
  if (!tracking.googleAnalytics) score += 35
  if (!tracking.googleTagManager) score += 25
  if (!tracking.facebookPixel) score += 20
  if (!tracking.googleAdsConversion) score += 20
  return Math.min(100, score)
}

function calculateGdprScore(gdpr: any): number {
  let score = 0
  if (!gdpr.hasCookieBanner) score += 30
  if (!gdpr.hasPrivacyPolicy) score += 30
  if (!gdpr.hasContactInfo) score += 20
  if (!gdpr.hasVatNumber) score += 20
  return Math.min(100, score)
}

function calculateContentScore(content: any): number {
  let score = 0
  if (!content.hasContactForm) score += 25
  if ((content.wordCount || 0) < 300) score += 25
  if (!content.hasSocialLinks) score += 15
  if (!content.hasBusinessHours) score += 15
  return Math.min(100, score)
}

function calculateTechnicalScore(analysis: any, issues: any): number {
  let score = 0
  if (!analysis.hasSSL) score += 30
  if (!analysis.sslValid) score += 20
  if ((issues.critical?.length || 0) > 0) score += 30
  if ((issues.high?.length || 0) > 2) score += 20
  return Math.min(100, score)
}

function determineQuality(score: number, issues: any): { level: string, label: string } {
  if (score >= 70 && (issues.critical?.length || 0) > 0) {
    return { level: 'hot', label: 'Lead Caldo - Alta priorità' }
  }
  if (score >= 50) {
    return { level: 'warm', label: 'Lead Tiepido - Buon potenziale' }
  }
  if (score >= 30) {
    return { level: 'cold', label: 'Lead Freddo - Richiede nurturing' }
  }
  return { level: 'unqualified', label: 'Non qualificato' }
}

function calculateConversionProb(score: number, quality: any, analysis: any): number {
  let prob = quality.level === 'hot' ? 35 : quality.level === 'warm' ? 20 : quality.level === 'cold' ? 8 : 2
  if (analysis.content?.hasPhoneNumbers) prob += 5
  if (analysis.gdpr?.hasVatNumber) prob += 5
  if (!analysis.hasSSL) prob += 5
  return Math.min(50, prob)
}

function calculateDealValue(breakdown: any): number {
  let value = 0
  if (breakdown.seo > 50) value += SERVICE_PRICES.seo_optimization
  if (breakdown.performance > 50) value += SERVICE_PRICES.performance_optimization
  if (breakdown.mobile > 50) value += SERVICE_PRICES.mobile_optimization
  if (breakdown.tracking > 50) value += SERVICE_PRICES.analytics_setup
  if (breakdown.gdpr > 50) value += SERVICE_PRICES.gdpr_compliance
  if (breakdown.content > 50) value += SERVICE_PRICES.content_creation
  return Math.max(500, value)
}

function generateRecommendations(breakdown: any, analysis: any): any[] {
  const recs = []

  if (!analysis.hasSSL) {
    recs.push({ service: 'Certificato SSL', priority: 'critical', price: 100, impact: 'Sicurezza' })
  }
  if (breakdown.performance > 50) {
    recs.push({ service: 'Ottimizzazione Performance', priority: 'high', price: 800, impact: '+20% conversioni' })
  }
  if (breakdown.seo > 40) {
    recs.push({ service: 'Ottimizzazione SEO', priority: 'high', price: 1500, impact: '+50% visibilità' })
  }
  if (breakdown.mobile > 40) {
    recs.push({ service: 'Ottimizzazione Mobile', priority: 'high', price: 600, impact: '60% traffico mobile' })
  }
  if (breakdown.tracking > 50) {
    recs.push({ service: 'Setup Analytics', priority: 'medium', price: 400, impact: 'Dati per decisioni' })
  }
  if (breakdown.gdpr > 40) {
    recs.push({ service: 'Adeguamento GDPR', priority: 'medium', price: 500, impact: 'Evita sanzioni' })
  }

  return recs.slice(0, 6)
}

function identifyQuickWins(seo: any, tracking: any, gdpr: any, content: any, mobile: any): string[] {
  const wins = []
  if (!seo.hasTitle) wins.push('Aggiungere title tag')
  if (!seo.hasMetaDescription) wins.push('Aggiungere meta description')
  if (!tracking.googleAnalytics) wins.push('Installare Google Analytics')
  if (!gdpr.hasCookieBanner) wins.push('Aggiungere cookie banner')
  if (!content.hasContactForm) wins.push('Aggiungere form contatto')
  if (!mobile.hasViewportMeta) wins.push('Aggiungere viewport meta')
  return wins.slice(0, 5)
}

function calculateUrgency(breakdown: any, issues: any, analysis: any): number {
  let urgency = 0
  if (!analysis.hasSSL) urgency += 25
  urgency += (issues.critical?.length || 0) * 15
  if (breakdown.gdpr > 60) urgency += 20
  if (breakdown.mobile > 60) urgency += 15
  if (breakdown.performance > 60) urgency += 15
  return Math.min(100, urgency)
}
