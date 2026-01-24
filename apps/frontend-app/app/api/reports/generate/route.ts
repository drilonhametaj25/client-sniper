/**
 * API per generare Report PDF - TrovaMi
 * Genera report di audit in formato PDF per i lead
 * Usato da: Dashboard per scaricare report PDF dei lead
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { AuditReportDocument } from '@/lib/pdf/audit-report-template'
import { AuditReportData, BrandingConfig, defaultBranding } from '@/lib/types/pdf'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Genera issues in base ai dati dell'analisi
function generateIssues(scores: any, details: any): AuditReportData['issues'] {
  const issues: AuditReportData['issues'] = []

  // SEO Issues
  if (!details.seo?.hasTitle) {
    issues.push({
      severity: 'critical',
      title: 'Tag Title mancante',
      description: 'Il sito non ha un tag title. Questo è fondamentale per la SEO e la visibilità nei motori di ricerca.',
      recommendation: 'Aggiungi un tag title unico e descrittivo tra 50-60 caratteri.'
    })
  } else if (details.seo?.titleLength < 30) {
    issues.push({
      severity: 'medium',
      title: 'Tag Title troppo corto',
      description: `Il title ha solo ${details.seo.titleLength} caratteri. La lunghezza ottimale è tra 50-60 caratteri.`,
      recommendation: 'Espandi il title per includere parole chiave rilevanti.'
    })
  }

  if (!details.seo?.hasMetaDescription) {
    issues.push({
      severity: 'high',
      title: 'Meta Description mancante',
      description: 'La meta description non è presente. Questo riduce il CTR nei risultati di ricerca.',
      recommendation: 'Aggiungi una meta description accattivante tra 150-160 caratteri.'
    })
  }

  if (!details.seo?.hasH1) {
    issues.push({
      severity: 'medium',
      title: 'Tag H1 mancante',
      description: 'La pagina non ha un tag H1, importante per la struttura SEO.',
      recommendation: 'Aggiungi un tag H1 chiaro e descrittivo.'
    })
  }

  // Performance Issues
  if (details.performance?.loadTime > 5) {
    issues.push({
      severity: 'critical',
      title: 'Tempo di caricamento critico',
      description: `Il sito impiega ${details.performance.loadTime.toFixed(1)} secondi per caricare. Gli utenti abbandonano dopo 3 secondi.`,
      recommendation: 'Ottimizza immagini, usa caching e riduci le richieste JavaScript.'
    })
  } else if (details.performance?.loadTime > 3) {
    issues.push({
      severity: 'high',
      title: 'Tempo di caricamento lento',
      description: `Il sito impiega ${details.performance.loadTime.toFixed(1)} secondi. L\'obiettivo dovrebbe essere sotto i 3 secondi.`,
      recommendation: 'Ottimizza le risorse per migliorare la velocità.'
    })
  }

  if (!details.performance?.isResponsive) {
    issues.push({
      severity: 'critical',
      title: 'Sito non responsive',
      description: 'Il sito non è ottimizzato per dispositivi mobili. Oltre il 60% del traffico web è mobile.',
      recommendation: 'Implementa un design responsive o mobile-first.'
    })
  }

  if (details.performance?.brokenImages > 0) {
    issues.push({
      severity: 'medium',
      title: 'Immagini non caricate',
      description: `${details.performance.brokenImages} immagini non vengono caricate correttamente.`,
      recommendation: 'Verifica i percorsi delle immagini e correggi i link rotti.'
    })
  }

  // Security Issues
  if (!details.security?.hasSSL) {
    issues.push({
      severity: 'critical',
      title: 'Certificato SSL mancante',
      description: 'Il sito non ha HTTPS. I browser mostrano avvisi di sicurezza e Google penalizza il ranking.',
      recommendation: 'Installa un certificato SSL (Let\'s Encrypt è gratuito).'
    })
  }

  // GDPR Issues
  if (!details.gdpr?.hasCookieBanner) {
    issues.push({
      severity: 'high',
      title: 'Cookie Banner mancante',
      description: 'Non è presente un banner per il consenso dei cookie. Questo viola il GDPR.',
      recommendation: 'Implementa un cookie banner conforme al GDPR.'
    })
  }

  if (!details.gdpr?.hasPrivacyPolicy) {
    issues.push({
      severity: 'high',
      title: 'Privacy Policy mancante',
      description: 'Non è presente una pagina Privacy Policy. Questo è obbligatorio per legge.',
      recommendation: 'Crea una Privacy Policy completa e linka il footer.'
    })
  }

  // Tracking Issues
  if (!details.tracking?.hasGoogleAnalytics && !details.tracking?.hasGoogleTagManager) {
    issues.push({
      severity: 'medium',
      title: 'Analytics non configurato',
      description: 'Non è presente Google Analytics o Google Tag Manager.',
      recommendation: 'Installa Google Analytics per monitorare il traffico.'
    })
  }

  return issues.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.severity] - order[b.severity]
  })
}

// Genera opportunità in base ai dati dell'analisi
function generateOpportunities(scores: any, details: any): AuditReportData['opportunities'] {
  const opportunities: AuditReportData['opportunities'] = []

  if (!details.seo?.hasStructuredData) {
    opportunities.push({
      priority: 'high',
      title: 'Aggiungi Dati Strutturati',
      description: 'I dati strutturati (Schema.org) migliorano la visibilità nei risultati di ricerca con rich snippets.',
      estimatedImpact: '+15-30% CTR nei risultati di ricerca'
    })
  }

  if (!details.tracking?.hasFacebookPixel) {
    opportunities.push({
      priority: 'medium',
      title: 'Installa Facebook Pixel',
      description: 'Il Facebook Pixel permette di tracciare le conversioni e creare audience per il remarketing.',
      estimatedImpact: 'Migliore targeting pubblicitario'
    })
  }

  if (!details.tracking?.hasHotjar) {
    opportunities.push({
      priority: 'low',
      title: 'Aggiungi Heatmap e Recording',
      description: 'Strumenti come Hotjar permettono di capire come gli utenti interagiscono con il sito.',
      estimatedImpact: 'Migliori insight sul comportamento utente'
    })
  }

  if (scores.seo < 80) {
    opportunities.push({
      priority: 'high',
      title: 'Ottimizzazione SEO On-Page',
      description: 'Ci sono margini di miglioramento significativi nella SEO on-page del sito.',
      estimatedImpact: '+20-50% traffico organico'
    })
  }

  if (scores.performance < 70) {
    opportunities.push({
      priority: 'high',
      title: 'Ottimizzazione Performance',
      description: 'Migliorare la velocità del sito può aumentare le conversioni e il ranking SEO.',
      estimatedImpact: '+7% conversioni per ogni secondo risparmiato'
    })
  }

  if (!details.tracking?.hasGoogleTagManager) {
    opportunities.push({
      priority: 'medium',
      title: 'Implementa Google Tag Manager',
      description: 'GTM semplifica la gestione di tutti i tag di marketing e analytics.',
      estimatedImpact: 'Gestione tag più efficiente'
    })
  }

  return opportunities
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, branding: customBranding } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID richiesto' },
        { status: 400 }
      )
    }

    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      )
    }

    // Verifica che l'utente abbia accesso al lead (deve averlo sbloccato)
    const { data: unlockedLead } = await getSupabaseAdmin()
      .from('user_unlocked_leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .maybeSingle()

    if (!unlockedLead) {
      return NextResponse.json(
        { error: 'Lead non sbloccato. Sblocca il lead prima di generare il report.' },
        { status: 403 }
      )
    }

    // Recupera i dati del lead
    const { data: lead, error: leadError } = await getSupabaseAdmin()
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

    // Calcola i punteggi dai dati del lead
    const analysisData = lead.analysis_data || {}
    const scores = {
      overall: lead.score || 50,
      seo: analysisData.seo_score || lead.seo_score || 50,
      performance: analysisData.performance_score || lead.performance_score || 50,
      mobile: analysisData.mobile_score || lead.mobile_score || 50,
      tracking: analysisData.tracking_score || lead.tracking_score || 50,
      gdpr: analysisData.gdpr_score || lead.gdpr_score || 50,
      security: analysisData.security_score || lead.security_score || 50
    }

    // Estrai i dettagli dall'analisi
    const details = {
      seo: {
        hasTitle: analysisData.has_title ?? lead.has_title ?? true,
        titleLength: analysisData.title_length ?? lead.title_length ?? 50,
        hasMetaDescription: analysisData.has_meta_description ?? lead.has_meta_description ?? true,
        metaDescriptionLength: analysisData.meta_description_length ?? lead.meta_description_length ?? 150,
        hasH1: analysisData.has_h1 ?? lead.has_h1 ?? true,
        h1Count: analysisData.h1_count ?? 1,
        hasStructuredData: analysisData.has_structured_data ?? lead.has_structured_data ?? false
      },
      performance: {
        loadTime: analysisData.load_time ?? lead.load_time ?? 2.5,
        isResponsive: analysisData.is_responsive ?? lead.is_responsive ?? true,
        totalImages: analysisData.total_images ?? 10,
        brokenImages: analysisData.broken_images ?? 0
      },
      tracking: {
        hasGoogleAnalytics: analysisData.has_google_analytics ?? lead.has_google_analytics ?? false,
        hasFacebookPixel: analysisData.has_facebook_pixel ?? lead.has_facebook_pixel ?? false,
        hasGoogleTagManager: analysisData.has_google_tag_manager ?? lead.has_google_tag_manager ?? false,
        hasHotjar: analysisData.has_hotjar ?? false
      },
      gdpr: {
        hasCookieBanner: analysisData.has_cookie_banner ?? lead.has_cookie_banner ?? false,
        hasPrivacyPolicy: analysisData.has_privacy_policy ?? lead.has_privacy_policy ?? false
      },
      security: {
        hasSSL: analysisData.has_ssl ?? lead.has_ssl ?? true,
        httpsIssues: analysisData.https_issues ?? false
      }
    }

    // Genera issues e opportunities
    const issues = generateIssues(scores, details)
    const opportunities = generateOpportunities(scores, details)

    // Prepara i dati per il report
    const reportData: AuditReportData = {
      metadata: {
        reportTitle: 'Audit Report Digitale',
        reportDate: new Date(),
        reportId: `RPT-${leadId.slice(0, 8).toUpperCase()}`,
        preparedBy: 'TrovaMi'
      },
      branding: { ...defaultBranding, ...customBranding } as BrandingConfig,
      businessInfo: {
        name: lead.business_name || lead.name || 'Azienda',
        website: lead.website || lead.url || 'N/A',
        city: lead.city || lead.location,
        category: lead.category || lead.business_type
      },
      scores,
      details,
      issues,
      opportunities
    }

    // Genera il PDF
    const pdfBuffer = await renderToBuffer(
      AuditReportDocument({ data: reportData, branding: reportData.branding })
    )

    // Log della generazione (ignora errori se la tabella non esiste)
    try {
      await getSupabaseAdmin()
        .from('report_generation_logs')
        .insert({
          user_id: user.id,
          lead_id: leadId,
          report_type: 'audit_pdf',
          created_at: new Date().toISOString()
        })
    } catch {
      // Tabella potrebbe non esistere
    }

    // Restituisci il PDF (converti Buffer in Uint8Array per compatibilità)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="audit-report-${lead.business_name || 'lead'}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Errore generazione PDF:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione del report' },
      { status: 500 }
    )
  }
}

// GET per preview (restituisce solo i dati, non il PDF)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID richiesto' },
        { status: 400 }
      )
    }

    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 401 }
      )
    }

    // Verifica accesso al lead
    const { data: unlockedLead } = await getSupabaseAdmin()
      .from('user_unlocked_leads')
      .select('id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .maybeSingle()

    if (!unlockedLead) {
      return NextResponse.json(
        { error: 'Lead non sbloccato' },
        { status: 403 }
      )
    }

    // Recupera i dati del lead
    const { data: lead, error: leadError } = await getSupabaseAdmin()
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

    // Restituisce i dati base per la preview
    return NextResponse.json({
      lead: {
        id: lead.id,
        business_name: lead.business_name || lead.name,
        website: lead.website || lead.url,
        city: lead.city || lead.location,
        category: lead.category || lead.business_type,
        score: lead.score
      }
    })

  } catch (error) {
    console.error('Errore preview report:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dati preview' },
      { status: 500 }
    )
  }
}
