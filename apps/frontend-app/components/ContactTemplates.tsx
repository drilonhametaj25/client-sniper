/**
 * Componente ContactTemplates - Sistema di template personalizzati per il primo contatto con i lead
 * 
 * Genera template per primo contatto basati sui problemi specifici del lead:
 * - Template email formale con problemi identificati e proposta valore
 * - Template LinkedIn informale e diretto per connessioni
 * - Template script cold call strutturato per piani PRO
 * - Logica di personalizzazione dinamica basata su analisi tecnica
 * - Integrazione copia negli appunti e mailto per PRO
 * 
 * Usato in: /apps/frontend-app/app/lead/[id]/page.tsx (nella sezione dettaglio lead)
 * Chiamato da: pagina dettaglio lead per utenti con piano attivo
 */

'use client';

import React, { useState, useCallback } from 'react'
import { Copy, Mail, Phone, MessageCircle, CheckCircle, ExternalLink } from 'lucide-react'
import Card from '@/components/ui/Card'
import { isStarterOrHigher, isProOrHigher } from '@/lib/utils/plan-helpers'

interface ContactTemplatesProps {
  lead: {
    id: string;
    business_name?: string;
    website_url?: string;
    city?: string;
    category?: string;
    analysis?: any; // Struttura flessibile per supportare diversi formati di analisi
    website_analysis?: any; // Supporta anche la struttura moderna
    email?: string;
    phone?: string;
    score?: number;
  };
  userPlan: string;
}

type TemplateType = 'email' | 'linkedin' | 'cold_call';

interface ProblemAnalysis {
  problems: string[];
  impacts: string[];
  solutions: string[];
  urgencyLevel: 'bassa' | 'media' | 'alta' | 'critica';
}

export default function ContactTemplates({ lead, userPlan }: ContactTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('email')
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  // Analizza i problemi del lead per personalizzazione
  const analyzeLeadProblems = useCallback((): ProblemAnalysis => {
    const problems: string[] = []
    const impacts: string[] = []
    const solutions: string[] = []
    let urgencyLevel: 'bassa' | 'media' | 'alta' | 'critica' = 'bassa'

    // Priorità: website_analysis (moderno) poi analysis (legacy)
    const analysis = lead.website_analysis || lead.analysis
    if (!analysis) {
      return { problems: [], impacts: [], solutions: [], urgencyLevel: 'bassa' }
    }

    const score = analysis.overall_score || analysis.overallScore || analysis.seo_score || lead.score || 50

    // Analisi problemi SEO - supporta diversi formati
    if (analysis.seo?.hasTitle === false || analysis.technical?.missing_meta_title || analysis.missing_meta_tags?.includes('title')) {
      problems.push('meta title mancante o non ottimizzato')
      impacts.push('perdita di ranking su Google')
      solutions.push('Strategia SEO tecnica mirata')
    }

    if (analysis.seo?.hasMetaDescription === false || analysis.technical?.missing_meta_description || analysis.missing_meta_tags?.includes('description')) {
      problems.push('meta description mancante')
      impacts.push('ridotta visibilità sui motori di ricerca')
      solutions.push('Ottimizzazione SEO on-page completa')
    }

    if (analysis.seo?.hasH1 === false || analysis.technical?.h1_missing) {
      problems.push('struttura heading non ottimizzata')
      impacts.push('contenuto poco indicizzabile')
      solutions.push('Ristrutturazione contenuti SEO-friendly')
    }

    // Analisi performance - supporta diversi formati
    const loadTime = analysis.performance?.loadTime || analysis.performance?.load_time || analysis.website_load_time
    if (loadTime && loadTime > 3000) {
      problems.push('velocità di caricamento lenta')
      impacts.push('utenti abbandonano il sito prima del caricamento')
      solutions.push('Ottimizzazione performance e server')
    }

    // Analisi tracking e analytics - supporta diversi formati
    if (!analysis.tracking?.hasGoogleAnalytics && !analysis.tracking?.has_google_analytics && !analysis.has_google_analytics) {
      problems.push('Google Analytics non installato')
      impacts.push('impossibile misurare traffico e conversioni')
      solutions.push('Implementazione tracking e analytics completi')
    }

    if (!analysis.tracking?.hasFacebookPixel && !analysis.tracking?.has_facebook_pixel && !analysis.has_facebook_pixel && !analysis.has_tracking_pixel) {
      problems.push('Facebook Pixel mancante')
      impacts.push('perdita opportunità remarketing e advertising')
      solutions.push('Setup campagne pubblicitarie Facebook/Instagram')
    }

    // Analisi sicurezza e compliance - supporta diversi formati
    if (!analysis.security?.hasSSL && !analysis.security?.has_ssl && !analysis.has_ssl) {
      problems.push('certificato SSL mancante')
      impacts.push('sito considerato non sicuro da Google')
      solutions.push('Implementazione sicurezza e certificati SSL')
    }

    if (!analysis.compliance?.hasPrivacyPolicy && !analysis.compliance?.has_privacy_policy && !analysis.has_privacy_policy) {
      problems.push('privacy policy e cookie banner mancanti')
      impacts.push('non conformità GDPR - rischio sanzioni')
      solutions.push('Compliance GDPR e privacy completa')
    }

    // Analisi mobile e UX - supporta diversi formati
    if (analysis.mobile?.isMobileFriendly === false || analysis.mobile_friendly === false || analysis.performance?.isResponsive === false) {
      problems.push('sito non responsive per mobile')
      impacts.push('perdita del 60%+ di traffico mobile')
      solutions.push('Redesign responsive e mobile-first')
    }

    if (analysis.technical?.broken_images || analysis.images?.broken > 0 || analysis.broken_images || analysis.performance?.brokenImages > 0) {
      problems.push('immagini rotte o mancanti')
      impacts.push('esperienza utente compromessa')
      solutions.push('Audit completo contenuti multimediali')
    }

    // Determina livello di urgenza
    if (score <= 25) urgencyLevel = 'critica'
    else if (score <= 40) urgencyLevel = 'alta' 
    else if (score <= 60) urgencyLevel = 'media'
    else urgencyLevel = 'bassa'

    return { problems, impacts, solutions, urgencyLevel }
  }, [lead])

  // Genera template personalizzato
  const generateTemplate = useCallback((type: TemplateType): string => {
    const businessName = lead.business_name || 'la vostra azienda'
    const website = lead.website_url || 'il vostro sito web'
    const city = lead.city || 'la vostra zona'
    const category = translateCategory(lead.category || 'settore')
    
    const { problems, impacts, solutions, urgencyLevel } = analyzeLeadProblems()
    
    const mainProblems = problems.slice(0, 3)
    const mainImpacts = impacts.slice(0, 2) 
    const suggestedSolutions = solutions.slice(0, 2)

    switch (type) {
      case 'email':
        return generateEmailTemplate(businessName, website, city, category, mainProblems, mainImpacts, suggestedSolutions, urgencyLevel)
      
      case 'linkedin':
        return generateLinkedInTemplate(businessName, category, mainProblems.slice(0, 2), urgencyLevel)
      
      case 'cold_call':
        return generateColdCallScript(businessName, category, mainProblems, urgencyLevel)
      
      default:
        return ''
    }
  }, [lead, analyzeLeadProblems])

  const generateEmailTemplate = (
    businessName: string,
    website: string, 
    city: string,
    category: string,
    problems: string[],
    impacts: string[],
    solutions: string[],
    urgency: string
  ): string => {
    return `Oggetto: Analisi tecnica gratuita per ${businessName} - ${problems.length} problemi critici identificati

Gentile Responsabile Marketing/Digitale,

Mi chiamo [IL TUO NOME] e sono un consulente specializzato nell'ottimizzazione digitale per aziende nel settore ${category}.

Ho recentemente analizzato ${website} e ho identificato alcune opportunità di miglioramento che potrebbero avere un impatto significativo sui vostri risultati online.

🔍 **PROBLEMI IDENTIFICATI:**
${problems.map(p => `• ${p.charAt(0).toUpperCase() + p.slice(1)}`).join('\n')}

📉 **IMPATTO SUL BUSINESS:**
${impacts.map(i => `• ${i.charAt(0).toUpperCase() + i.slice(1)}`).join('\n')}
• Perdita di potenziali clienti che cercano i vostri servizi online
• Competitors che si posizionano meglio sui motori di ricerca

✅ **SOLUZIONI PROPOSTE:**
${solutions.map(s => `• ${s}`).join('\n')}
• Strategia di content marketing per ${category} a ${city}
• Monitoraggio continuo performance e ROI

${urgency === 'critica' ? '🚨 **URGENZA ELEVATA:** I problemi identificati stanno causando una perdita immediata di opportunità commerciali.' : ''}

**PROPOSTA:**
Vi offro un'analisi tecnica approfondita GRATUITA (del valore di €297) per mostrarvi esattamente come risolvere questi problemi e aumentare la vostra visibilità online.

La chiamata durerà 15 minuti e riceverete:
• Report tecnico dettagliato
• Stima ROI degli interventi
• Strategia personalizzata per ${category}

Siete disponibili per una breve chiamata nei prossimi giorni?

Cordiali saluti,
[IL TUO NOME]
[IL TUO TITOLO] 
[I TUOI CONTATTI]

P.S.: ${businessName} ha un grande potenziale online. Con le giuste ottimizzazioni, potreste vedere un aumento del 40-60% nel traffico qualificato entro 3 mesi.`
  }

  const generateLinkedInTemplate = (
    businessName: string,
    category: string, 
    problems: string[],
    urgency: string
  ): string => {
    const urgencyIcon = urgency === 'critica' ? '🚨' : urgency === 'alta' ? '⚡' : '💡'
    
    return `Ciao! ${urgencyIcon}

Ho analizzato il sito di ${businessName} e ho notato ${problems.length} opportunità per migliorare la vostra presenza online nel settore ${category}.

${problems.slice(0, 2).map(p => `• ${p.charAt(0).toUpperCase() + p.slice(1)}`).join('\n')}

Questi aspetti stanno limitando la vostra visibilità su Google. Vi va di approfondire con una chiamata veloce?

Vi offro un'analisi gratuita (15 min) con suggerimenti concreti per aumentare clienti e fatturato online.

Quando siete disponibili?

[IL TUO NOME]`
  }

  const generateColdCallScript = (
    businessName: string,
    category: string,
    problems: string[],
    urgency: string
  ): string => {
    return `📞 **SCRIPT COLD CALL - ${businessName}**

**1. APERTURA (10 secondi)**
"Buongiorno, sono [NOME] di [AZIENDA]. Parlo con il responsabile marketing di ${businessName}?"

[Se no: "Perfetto, potrebbe passarmelo per cortesia?"]
[Se si: continua...]

**2. AGGANCIO (20 secondi)**
"Le chiamo perché abbiamo analizzato il vostro sito web e ho identificato ${problems.length} problemi che stanno limitando i vostri risultati online. Ha 2 minuti per una breve spiegazione?"

**3. VALORE (30 secondi)**
"Nello specifico abbiamo notato:
${problems.slice(0, 2).map(p => `• ${p.charAt(0).toUpperCase() + p.slice(1)}`).join('\n')}

Nel settore ${category} queste problematiche causano una perdita media del 40-50% di potenziali clienti."

${urgency === 'critica' ? '**URGENZA:** Questi problemi stanno causando perdite immediate.' : ''}

**4. CHIUSURA**
"Le propongo un'analisi tecnica gratuita di 15 minuti dove le mostro esattamente come risolvere questi aspetti. Quando potremmo sentirci?"

**📋 GESTIONE OBIEZIONI:**

❌ "Non ho tempo"
✅ "Capisco perfettamente. Il tempo è prezioso, per questo le propongo solo 15 minuti. In questo breve lasso di tempo le mostro come recuperare i clienti che state perdendo online. Le va meglio oggi pomeriggio o domani mattina?"

❌ "Non siamo interessati"  
✅ "Perfetto, immagino abbiate già risolto i problemi di ${problems[0]} e ${problems[1] || 'performance'}. Posso chiederle qual è la vostra strategia attuale per l'acquisizione clienti online?"

❌ "Costa troppo"
✅ "Non le sto proponendo nulla a pagamento. È un'analisi completamente gratuita. L'unico investimento sono 15 minuti del suo tempo per vedere concretamente cosa sta limitando i vostri risultati."

**🎯 METRICHE DI SUCCESSO:**
• Conversione chiamate: 15-20%
• Follow-up necessari: 2-3 tentativi
• Miglior orario: 10:00-12:00 / 14:00-16:00
• Durata media chiamata: 3-5 minuti`
  }

  const translateCategory = (category: string): string => {
    const translations: Record<string, string> = {
      'restaurants': 'ristorazione',
      'hotels': 'settore alberghiero', 
      'lawyers': 'settore legale',
      'dentists': 'settore odontoiatrico',
      'medical': 'settore medico',
      'beauty': 'settore beauty',
      'fitness': 'settore fitness',
      'real_estate': 'settore immobiliare',
      'automotive': 'settore automotive',
      'retail': 'settore retail',
      'construction': 'settore edilizio',
      'technology': 'settore tecnologico'
    }
    
    return translations[category] || category
  }

  const copyToClipboard = async (text: string, type: TemplateType) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTemplate(type)
      setShowFeedback(true)
      
      setTimeout(() => {
        setCopiedTemplate(null)
        setShowFeedback(false)
      }, 2000)
    } catch (err) {
      console.error('Errore copia negli appunti:', err)
    }
  }

  const openMailto = (emailTemplate: string) => {
    const lines = emailTemplate.split('\n')
    const subject = lines[0].replace('Oggetto: ', '')
    const body = lines.slice(1).join('\n')
    
    const mailtoUrl = `mailto:${lead.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, '_blank')
  }

  const currentTemplate = generateTemplate(selectedTemplate)

  // Non mostrare per piano free
  if (userPlan === 'free') {
    return null
  }

  return (
    <Card className="mt-4">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
            <span className="text-base">💬</span>
            Template Primo Contatto
          </h3>
          {showFeedback && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-fade-in">
              <CheckCircle className="h-4 w-4" />
              <span>Copiato!</span>
            </div>
          )}
        </div>

        {/* Tab Template Types - Solo per Starter/Pro */}
        {isStarterOrHigher(userPlan) && (
          <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              onClick={() => setSelectedTemplate('email')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTemplate === 'email'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              onClick={() => setSelectedTemplate('linkedin')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTemplate === 'linkedin'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              LinkedIn
            </button>
            {isProOrHigher(userPlan) && (
              <button
                onClick={() => setSelectedTemplate('cold_call')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTemplate === 'cold_call'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Phone className="h-4 w-4" />
                Cold Call
              </button>
            )}
          </div>
        )}

        {/* Template Content */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
            {currentTemplate}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => copyToClipboard(currentTemplate, selectedTemplate)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              copiedTemplate === selectedTemplate
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
            }`}
          >
            {copiedTemplate === selectedTemplate ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Copiato!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copia Template</span>
              </>
            )}
          </button>

          {/* Mailto Integration per PRO con template email */}
          {isProOrHigher(userPlan) && selectedTemplate === 'email' && lead.email && (
            <button
              onClick={() => openMailto(currentTemplate)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Invia Email</span>
            </button>
          )}

          {/* LinkedIn direct per PRO con LinkedIn template */}
          {isProOrHigher(userPlan) && selectedTemplate === 'linkedin' && (
            <button
              onClick={() => window.open('https://www.linkedin.com/messaging', '_blank')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Apri LinkedIn</span>
            </button>
          )}
        </div>

        {/* Info per template type */}
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {selectedTemplate === 'email' && (
              <div>
                <strong>📧 Template Email:</strong> Messaggio formale e professionale con problemi specifici identificati, 
                proposta di valore chiara e call-to-action per analisi gratuita. Tasso di risposta tipico: 8-12%.
              </div>
            )}
            {selectedTemplate === 'linkedin' && (
              <div>
                <strong>💼 Template LinkedIn:</strong> Messaggio breve e diretto (max 300 caratteri) per richiesta connessione. 
                Tono informale ma professionale. Tasso di accettazione tipico: 25-35%.
              </div>
            )}
            {selectedTemplate === 'cold_call' && (
              <div>
                <strong>📞 Script Cold Call (Solo PRO):</strong> Script strutturato in 4 fasi con gestione obiezioni e metriche. 
                Include suggerimenti timing e follow-up. Tasso conversione tipico: 15-20%.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
