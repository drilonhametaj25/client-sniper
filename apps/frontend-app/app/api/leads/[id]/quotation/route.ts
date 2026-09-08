/**
 * API endpoint per generare preventivi automatici per un lead
 * Utilizza PricingEngine per calcolare servizi e prezzi basati sull'analisi
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { isLeadUnlocked } from '@/lib/api/paywall'
import { SERVICE_DEFINITIONS, SERVICE_NAMES, SERVICE_DESCRIPTIONS } from '@/lib/services/catalog'

// Interfacce per i preventivi (portate dal PricingEngine)
interface ServiceQuotation {
  service: string
  description: string
  basePrice: number
  adjustedPrice: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedDays: number
  roiEstimate: string
  category: 'seo' | 'performance' | 'security' | 'design' | 'content' | 'compliance' | 'marketing' | 'development'
}

interface Quotation {
  leadId: string
  businessName: string
  websiteUrl: string
  services: ServiceQuotation[]
  subtotal: number
  discount?: {
    percentage: number
    reason: string
  }
  total: number
  validUntil: Date
  paymentTerms: string
  generatedAt: Date
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise'
  estimatedTotalDays: number
  roiSummary: string
}

function createService(
  serviceKey: string,
  priority: ServiceQuotation['priority'],
  multiplier: number
): ServiceQuotation {
  const definition = SERVICE_DEFINITIONS[serviceKey]
  if (!definition) {
    throw new Error(`Service definition not found: ${serviceKey}`)
  }

  const adjustedPrice = Math.round(definition.basePrice * multiplier)
  const percentages: Record<ServiceQuotation['priority'], number> = {
    'critical': 40,
    'high': 25,
    'medium': 15,
    'low': 10
  }

  return {
    service: SERVICE_NAMES[serviceKey] || serviceKey,
    description: SERVICE_DESCRIPTIONS[serviceKey] || '',
    basePrice: definition.basePrice,
    adjustedPrice,
    priority,
    estimatedDays: definition.days,
    roiEstimate: definition.roiTemplate
      .replace('{percentage}', String(percentages[priority]))
      .replace('{keywords}', '10-15'),
    category: definition.category
  }
}

function identifyNeededServices(analysis: any, multiplier: number): ServiceQuotation[] {
  const services: ServiceQuotation[] = []

  // SEO Issues
  if (!analysis.seo?.hasTitle || (analysis.seo?.titleLength && (analysis.seo.titleLength < 30 || analysis.seo.titleLength > 65))) {
    services.push(createService('seo_audit', 'high', multiplier))
  }

  if (!analysis.seo?.hasMetaDescription || (analysis.seo?.metaDescriptionLength && analysis.seo.metaDescriptionLength < 120)) {
    if (!services.find(s => s.service === 'Audit SEO Completo')) {
      services.push(createService('seo_optimization', 'high', multiplier))
    }
  }

  if (!analysis.seo?.hasStructuredData) {
    services.push(createService('structured_data', 'medium', multiplier))
  }

  if (!analysis.seo?.hasSitemap || !analysis.seo?.hasRobotsTxt) {
    services.push(createService('seo_technical', 'medium', multiplier))
  }

  // Performance Issues
  const speedScore = analysis.performance?.speedScore ?? 50
  if (speedScore < 50) {
    services.push(createService('performance_optimization', 'critical', multiplier))
  } else if (speedScore < 70) {
    services.push(createService('core_web_vitals', 'high', multiplier))
  }

  if ((analysis.images?.oversized ?? 0) > 3 || (analysis.images?.total ?? 0) > 20) {
    services.push(createService('image_optimization', 'medium', multiplier))
  }

  // Security Issues
  if (!analysis.hasSSL) {
    services.push(createService('ssl_setup', 'critical', multiplier))
  }

  if (analysis.security) {
    const securityScore = analysis.security.overallSecurityScore ?? 50
    if (securityScore < 40) {
      services.push(createService('security_audit', 'critical', multiplier))
      services.push(createService('security_hardening', 'critical', multiplier))
    } else if (securityScore < 60) {
      services.push(createService('security_headers', 'high', multiplier))
    }

    if (analysis.security.vulnerabilities?.hasOutdatedJquery) {
      services.push(createService('update_dependencies', 'high', multiplier))
    }
  }

  // Mobile Issues
  const mobileScore = analysis.mobile?.mobileScore ?? 50
  if (!analysis.mobile?.isMobileFriendly || mobileScore < 50) {
    services.push(createService('mobile_optimization', 'critical', multiplier))
  }

  // Design/UX Issues
  const overallScore = analysis.overallScore ?? 50
  if (overallScore < 30) {
    services.push(createService('redesign_full', 'critical', multiplier))
  } else if (overallScore < 50) {
    services.push(createService('redesign_landing', 'high', multiplier))
  } else if ((analysis.businessValue ?? 50) < 50) {
    services.push(createService('ux_audit', 'medium', multiplier))
  }

  // Content Issues
  if (analysis.contentQuality) {
    if ((analysis.contentQuality.contentScore ?? 50) < 40) {
      services.push(createService('content_strategy', 'high', multiplier))
    }
    if (!analysis.contentQuality.blog?.exists) {
      services.push(createService('blog_setup', 'medium', multiplier))
    }
  }

  // GDPR/Compliance Issues
  const gdprScore = analysis.gdpr?.gdprScore ?? 50
  if (gdprScore < 50) {
    services.push(createService('gdpr_compliance', 'high', multiplier))
  }

  if (!analysis.gdpr?.hasCookieBanner && (analysis.tracking?.trackingScore ?? 0) > 0) {
    services.push(createService('cookie_banner', 'critical', multiplier))
  }

  if (!analysis.gdpr?.hasPrivacyPolicy) {
    services.push(createService('privacy_policy', 'high', multiplier))
  }

  // Accessibility Issues
  if (analysis.accessibility) {
    const wcagScore = analysis.accessibility.wcagScore ?? 50
    if (wcagScore < 40) {
      services.push(createService('accessibility_audit', 'high', multiplier))
      services.push(createService('accessibility_fix', 'high', multiplier))
    } else if (wcagScore < 60) {
      services.push(createService('accessibility_audit', 'medium', multiplier))
    }
  }

  // Tracking/Marketing Issues
  if (!analysis.tracking?.googleAnalytics && !analysis.tracking?.googleTagManager) {
    services.push(createService('tracking_setup', 'high', multiplier))
  } else if (!analysis.tracking?.googleTagManager) {
    services.push(createService('gtm_setup', 'medium', multiplier))
  }

  if (!analysis.tracking?.facebookPixel) {
    services.push(createService('facebook_pixel', 'low', multiplier))
  }

  // Sort by priority
  const priorityOrder: Record<ServiceQuotation['priority'], number> = {
    'critical': 0,
    'high': 1,
    'medium': 2,
    'low': 3
  }

  return services.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

function calculateTotalDays(services: ServiceQuotation[]): number {
  if (services.length === 0) return 0

  const byCategory: Record<string, ServiceQuotation[]> = {}
  services.forEach(s => {
    if (!byCategory[s.category]) {
      byCategory[s.category] = []
    }
    byCategory[s.category].push(s)
  })

  const categoryDays = Object.values(byCategory).map(
    categoryServices => categoryServices.reduce((sum, s) => sum + s.estimatedDays, 0)
  )

  if (categoryDays.length === 1) {
    return categoryDays[0]
  }

  const sortedDays = categoryDays.sort((a, b) => b - a)
  const longestTrack = sortedDays[0]
  const parallelTracks = sortedDays.slice(1)
  const additionalDays = parallelTracks.reduce((sum, d) => sum + d * 0.5, 0)

  return Math.ceil(longestTrack + additionalDays)
}

function getPaymentTerms(total: number): string {
  if (total <= 500) {
    return '100% alla firma del contratto'
  } else if (total <= 2000) {
    return '50% alla firma, 50% alla consegna'
  } else if (total <= 5000) {
    return '30% alla firma, 40% a metà lavori, 30% alla consegna'
  } else {
    return '20% alla firma, 30% milestone 1, 30% milestone 2, 20% alla consegna'
  }
}

function generateRoiSummary(analysis: any, services: ServiceQuotation[]): string {
  const criticalCount = services.filter(s => s.priority === 'critical').length
  const highCount = services.filter(s => s.priority === 'high').length

  const currentScore = analysis.overallScore ?? 50
  const potentialScore = Math.min(100, currentScore + (criticalCount * 15) + (highCount * 8))

  if (currentScore < 30) {
    return `Intervento urgente necessario. Con le ottimizzazioni proposte il sito può passare da score ${currentScore}/100 a circa ${potentialScore}/100, migliorando significativamente visibilità e conversioni.`
  } else if (currentScore < 50) {
    return `Opportunità di miglioramento concrete. Le ottimizzazioni possono portare lo score da ${currentScore}/100 a ${potentialScore}/100, con impatto diretto su traffico e lead.`
  } else if (currentScore < 70) {
    return `Sito con buone basi. Gli interventi proposti possono perfezionare le performance e portare lo score a ${potentialScore}/100.`
  } else {
    return `Sito già performante. Gli interventi sono di fine-tuning per massimizzare i risultati e mantenere il vantaggio competitivo.`
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params

    // Verifica autenticazione (helper unificato: Bearer token o sessione cookie)
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse
    const { user, admin } = auth

    // 🔒 PAYWALL: il preventivo è riservato a chi ha sbloccato il lead
    if (!(await isLeadUnlocked(admin, user.id, leadId))) {
      return NextResponse.json(
        { error: 'Sblocca il lead per generare il preventivo' },
        { status: 403 }
      )
    }

    // Carica il lead (client admin: i contatti non sono più leggibili dal ruolo authenticated)
    const { data: lead, error: leadError } = await admin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Estrai l'analisi dal lead
    const analysis = lead.website_analysis || lead.analysis
    if (!analysis) {
      return NextResponse.json({ error: 'No analysis available for this lead' }, { status: 400 })
    }

    // Calcola moltiplicatore (semplificato per ora, 1.0 come default)
    const multiplier = 1.0

    // Identifica servizi necessari
    const services = identifyNeededServices(analysis, multiplier)

    if (services.length === 0) {
      return NextResponse.json({
        leadId,
        businessName: lead.business_name,
        websiteUrl: lead.website_url,
        services: [],
        subtotal: 0,
        total: 0,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms: 'N/A',
        generatedAt: new Date(),
        complexity: 'simple',
        estimatedTotalDays: 0,
        roiSummary: 'Nessun intervento necessario. Il sito è già ben ottimizzato.'
      })
    }

    // Calcola totali
    const subtotal = services.reduce((sum, s) => sum + s.adjustedPrice, 0)

    // Sconto pacchetto se >= 3 servizi
    let discount: Quotation['discount'] | undefined
    if (services.length >= 3) {
      const discountPercentage = Math.min(services.length * 3, 15)
      discount = {
        percentage: discountPercentage,
        reason: `Sconto pacchetto ${services.length} servizi`
      }
    }

    const total = discount
      ? Math.round(subtotal * (1 - discount.percentage / 100))
      : subtotal

    // Determina complessità
    const criticalCount = services.filter(s => s.priority === 'critical').length
    const highCount = services.filter(s => s.priority === 'high').length
    let complexity: Quotation['complexity'] = 'simple'
    if (criticalCount >= 3 || (criticalCount >= 1 && highCount >= 3)) {
      complexity = 'enterprise'
    } else if (criticalCount >= 2 || highCount >= 3) {
      complexity = 'complex'
    } else if (criticalCount >= 1 || highCount >= 2) {
      complexity = 'medium'
    }

    const quotation: Quotation = {
      leadId,
      businessName: lead.business_name,
      websiteUrl: lead.website_url,
      services,
      subtotal,
      discount,
      total,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentTerms: getPaymentTerms(total),
      generatedAt: new Date(),
      complexity,
      estimatedTotalDays: calculateTotalDays(services),
      roiSummary: generateRoiSummary(analysis, services)
    }

    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Error generating quotation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
