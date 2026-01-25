/**
 * API per generare PDF del Preventivo Automatico - TrovaMi
 * Genera un PDF scaricabile del preventivo per un lead specifico
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotationDocument, QuotationData } from '@/lib/pdf/quotation-template'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Importiamo le stesse definizioni dall'API quotation esistente
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

// Prezzi base servizi (EUR)
const SERVICE_DEFINITIONS: Record<string, {
  basePrice: number
  days: number
  category: ServiceQuotation['category']
  roiTemplate: string
}> = {
  'seo_audit': { basePrice: 400, days: 5, category: 'seo', roiTemplate: 'Identificazione opportunità per +{percentage}% traffico organico' },
  'seo_optimization': { basePrice: 1500, days: 21, category: 'seo', roiTemplate: 'Aumento stimato traffico organico: +{percentage}%' },
  'seo_technical': { basePrice: 800, days: 10, category: 'seo', roiTemplate: 'Miglioramento indicizzazione e velocità crawling' },
  'structured_data': { basePrice: 300, days: 3, category: 'seo', roiTemplate: 'Rich snippets per +{percentage}% CTR nei risultati' },
  'performance_optimization': { basePrice: 800, days: 14, category: 'performance', roiTemplate: 'Tempo caricamento ridotto del {percentage}%, -bounce rate' },
  'image_optimization': { basePrice: 300, days: 5, category: 'performance', roiTemplate: 'Riduzione peso pagina fino a {percentage}%' },
  'core_web_vitals': { basePrice: 600, days: 10, category: 'performance', roiTemplate: 'Miglioramento Core Web Vitals per ranking Google' },
  'security_audit': { basePrice: 600, days: 7, category: 'security', roiTemplate: 'Identificazione vulnerabilità e piano remediation' },
  'security_hardening': { basePrice: 900, days: 10, category: 'security', roiTemplate: 'Protezione da attacchi comuni, riduzione rischio data breach' },
  'ssl_setup': { basePrice: 150, days: 1, category: 'security', roiTemplate: 'Certificato SSL attivo, trust badge, ranking boost' },
  'security_headers': { basePrice: 250, days: 2, category: 'security', roiTemplate: 'Protezione XSS, clickjacking, injection attacks' },
  'mobile_optimization': { basePrice: 900, days: 14, category: 'design', roiTemplate: 'Conversioni mobile aumentate: +{percentage}%' },
  'ux_audit': { basePrice: 500, days: 7, category: 'design', roiTemplate: 'Identificazione friction points e opportunità conversione' },
  'redesign_landing': { basePrice: 1200, days: 14, category: 'design', roiTemplate: 'Conversion rate aumentato: +{percentage}%' },
  'redesign_full': { basePrice: 4000, days: 45, category: 'design', roiTemplate: 'Sito moderno, responsive, conversion-focused' },
  'content_strategy': { basePrice: 800, days: 14, category: 'content', roiTemplate: 'Piano editoriale per +{percentage}% engagement' },
  'blog_setup': { basePrice: 500, days: 5, category: 'content', roiTemplate: 'Blog per content marketing e lead generation' },
  'gdpr_compliance': { basePrice: 500, days: 10, category: 'compliance', roiTemplate: 'Conformità GDPR, evitate sanzioni fino a 4% fatturato' },
  'cookie_banner': { basePrice: 200, days: 2, category: 'compliance', roiTemplate: 'Consenso cookie conforme a normativa EU' },
  'privacy_policy': { basePrice: 300, days: 3, category: 'compliance', roiTemplate: 'Documentazione legale completa' },
  'accessibility_audit': { basePrice: 500, days: 7, category: 'compliance', roiTemplate: 'Conformità WCAG 2.1 AA, audience +{percentage}%' },
  'accessibility_fix': { basePrice: 800, days: 14, category: 'compliance', roiTemplate: 'Sito accessibile a utenti con disabilità' },
  'tracking_setup': { basePrice: 400, days: 5, category: 'marketing', roiTemplate: 'Tracciamento completo conversioni e comportamento' },
  'gtm_setup': { basePrice: 350, days: 3, category: 'marketing', roiTemplate: 'Google Tag Manager configurato con eventi chiave' },
  'facebook_pixel': { basePrice: 200, days: 2, category: 'marketing', roiTemplate: 'Remarketing Facebook/Instagram attivo' },
  'update_dependencies': { basePrice: 350, days: 3, category: 'development', roiTemplate: 'Aggiornamento librerie per sicurezza e performance' },
}

const SERVICE_NAMES: Record<string, string> = {
  'seo_audit': 'Audit SEO Completo',
  'seo_optimization': 'Ottimizzazione SEO On-Page',
  'seo_technical': 'SEO Tecnico',
  'structured_data': 'Implementazione Dati Strutturati',
  'performance_optimization': 'Ottimizzazione Performance',
  'image_optimization': 'Ottimizzazione Immagini',
  'core_web_vitals': 'Miglioramento Core Web Vitals',
  'security_audit': 'Audit Sicurezza',
  'security_hardening': 'Hardening e Protezione',
  'ssl_setup': 'Configurazione SSL/HTTPS',
  'security_headers': 'Configurazione Security Headers',
  'mobile_optimization': 'Ottimizzazione Mobile',
  'ux_audit': 'Audit UX/UI',
  'redesign_landing': 'Redesign Landing Pages',
  'redesign_full': 'Redesign Completo Sito',
  'content_strategy': 'Strategia Contenuti',
  'blog_setup': 'Setup Sezione Blog',
  'gdpr_compliance': 'Compliance GDPR Completa',
  'cookie_banner': 'Implementazione Cookie Banner',
  'privacy_policy': 'Redazione Privacy Policy',
  'accessibility_audit': 'Audit Accessibilità WCAG',
  'accessibility_fix': 'Correzione Problemi Accessibilità',
  'tracking_setup': 'Setup Analytics Completo',
  'gtm_setup': 'Configurazione Google Tag Manager',
  'facebook_pixel': 'Setup Facebook/Meta Pixel',
  'update_dependencies': 'Aggiornamento Dipendenze',
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  'seo_audit': 'Analisi completa SEO con report dettagliato e piano di azione',
  'seo_optimization': 'Ottimizzazione title, meta, heading e contenuti per keyword target',
  'seo_technical': 'Sitemap, robots.txt, canonical, redirect e struttura URL',
  'structured_data': 'Schema.org JSON-LD per rich snippets',
  'performance_optimization': 'Caching, minification, lazy loading, code splitting',
  'image_optimization': 'Compressione, WebP, lazy loading, responsive images',
  'core_web_vitals': 'LCP, FID, CLS ottimizzati per ranking Google',
  'security_audit': 'Penetration test base, vulnerability scanning',
  'security_hardening': 'Firewall, WAF, protezione brute force, backup',
  'ssl_setup': 'Certificato SSL, redirect HTTPS, HSTS',
  'security_headers': 'CSP, X-Frame-Options, X-XSS-Protection',
  'mobile_optimization': 'Layout responsive, touch-friendly, performance mobile',
  'ux_audit': 'Analisi user journey, heatmaps, conversion funnel',
  'redesign_landing': 'Riprogettazione pagine chiave per conversione',
  'redesign_full': 'Nuovo design completo, responsive, moderno',
  'content_strategy': 'Piano editoriale, keyword research, content calendar',
  'blog_setup': 'Sezione blog con categorie, tags, e feed RSS',
  'gdpr_compliance': 'Cookie policy, consensi, registro trattamenti',
  'cookie_banner': 'Banner consenso con gestione preferenze',
  'privacy_policy': 'Informativa privacy conforme GDPR',
  'accessibility_audit': 'Test WCAG 2.1 AA con report violazioni',
  'accessibility_fix': 'Correzione contrast, focus, ARIA, semantica',
  'tracking_setup': 'Google Analytics 4, eventi, conversioni',
  'gtm_setup': 'Container GTM con trigger e variabili',
  'facebook_pixel': 'Pixel standard + eventi conversione',
  'update_dependencies': 'Aggiornamento framework, librerie, plugin',
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

    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = getSupabaseAdmin()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      )
    }

    // Verifica che l'utente abbia accesso al lead (deve averlo sbloccato)
    const { data: unlockedLead } = await supabaseAdmin
      .from('user_unlocked_leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .maybeSingle()

    if (!unlockedLead) {
      return NextResponse.json(
        { error: 'Lead non sbloccato. Sblocca il lead prima di generare il preventivo.' },
        { status: 403 }
      )
    }

    // Recupera il profilo aziendale dell'utente per il branding del PDF
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('company_name, company_phone, company_website, company_email, email')
      .eq('id', user.id)
      .single()

    // Crea il branding personalizzato basato sul profilo utente
    const userBranding = {
      companyName: userProfile?.company_name || 'La Tua Agenzia',
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF',
      accentColor: '#F59E0B',
      contactEmail: userProfile?.company_email || userProfile?.email || '',
      contactPhone: userProfile?.company_phone || '',
      website: userProfile?.company_website || '',
      footerText: 'Analisi generata con TrovaMi - trovami.pro'
    }

    // Recupera i dati del lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead non trovato' },
        { status: 404 }
      )
    }

    // Estrai l'analisi dal lead
    const analysis = lead.website_analysis || lead.analysis
    if (!analysis) {
      return NextResponse.json(
        { error: 'Nessuna analisi disponibile per questo lead' },
        { status: 400 }
      )
    }

    // Calcola moltiplicatore (1.0 come default)
    const multiplier = 1.0

    // Identifica servizi necessari
    const services = identifyNeededServices(analysis, multiplier)

    if (services.length === 0) {
      return NextResponse.json(
        { error: 'Nessun servizio necessario per questo lead' },
        { status: 400 }
      )
    }

    // Calcola totali
    const subtotal = services.reduce((sum, s) => sum + s.adjustedPrice, 0)

    // Sconto pacchetto se >= 3 servizi
    let discount: { percentage: number; reason: string } | undefined
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
    let complexity: QuotationData['complexity'] = 'simple'
    if (criticalCount >= 3 || (criticalCount >= 1 && highCount >= 3)) {
      complexity = 'enterprise'
    } else if (criticalCount >= 2 || highCount >= 3) {
      complexity = 'complex'
    } else if (criticalCount >= 1 || highCount >= 2) {
      complexity = 'medium'
    }

    // Prepara i dati per il PDF
    const quotationData: QuotationData = {
      leadId,
      businessName: lead.business_name || 'Azienda',
      websiteUrl: lead.website_url || 'N/A',
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

    // Genera il PDF con il branding dell'utente
    const pdfBuffer = await renderToBuffer(
      QuotationDocument({ data: quotationData, branding: userBranding })
    )

    // Log della generazione (ignora errori se la tabella non esiste)
    try {
      await supabaseAdmin
        .from('report_generation_logs')
        .insert({
          user_id: user.id,
          lead_id: leadId,
          report_type: 'quotation_pdf',
          created_at: new Date().toISOString()
        })
    } catch {
      // Tabella potrebbe non esistere
    }

    // Restituisci il PDF
    const sanitizedName = (lead.business_name || 'preventivo').replace(/[^a-zA-Z0-9]/g, '_')
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="preventivo-${sanitizedName}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Errore generazione PDF preventivo:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione del preventivo PDF' },
      { status: 500 }
    )
  }
}
