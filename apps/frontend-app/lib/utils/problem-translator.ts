/**
 * Problem Translator - TrovaMi
 * Traduce i problemi tecnici rilevati dall'analisi in linguaggio umano
 * comprensibile per i potenziali clienti (non tecnici).
 *
 * Usato in: LeadCard, ProposalDetail, OutreachTemplates, PDFReport
 * Parte del sistema "proposte commerciali pronte all'uso"
 */

export interface TranslatedProblem {
  key: string
  title: string           // Titolo breve del problema (max 50 char)
  description: string     // Descrizione completa per il cliente
  impact: string          // Impatto sul business
  solution: string        // Soluzione proposta (generica)
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'seo' | 'performance' | 'security' | 'gdpr' | 'mobile' | 'tracking' | 'content' | 'technical'
  emoji: string
}

// Mappatura problemi tecnici -> linguaggio umano
const PROBLEM_TRANSLATIONS: Record<string, TranslatedProblem> = {
  // ============================================
  // SEO - PROBLEMI CRITICI
  // ============================================
  'missing_title': {
    key: 'missing_title',
    title: 'Titolo pagina mancante',
    description: 'Il sito non ha un titolo visibile su Google. Quando qualcuno cerca, non capisce di cosa parla il sito.',
    impact: 'Il sito appare senza nome nei risultati di ricerca, perdendo il 90% dei click potenziali.',
    solution: 'Aggiungere un titolo descrittivo e accattivante per ogni pagina.',
    severity: 'critical',
    category: 'seo',
    emoji: '🔍'
  },
  'missing_meta_description': {
    key: 'missing_meta_description',
    title: 'Descrizione Google mancante',
    description: 'Non c\'è una descrizione che appare sotto il titolo nei risultati di Google.',
    impact: 'Google mostra testo casuale dalla pagina, riducendo i click del 40-60%.',
    solution: 'Scrivere una descrizione persuasiva di 150-160 caratteri per ogni pagina.',
    severity: 'critical',
    category: 'seo',
    emoji: '📝'
  },
  'no_h1': {
    key: 'no_h1',
    title: 'Titolo principale assente',
    description: 'La pagina non ha un titolo principale (H1), fondamentale per far capire a Google l\'argomento.',
    impact: 'Google non comprende bene il contenuto, penalizzando il posizionamento.',
    solution: 'Aggiungere un titolo H1 chiaro e descrittivo in ogni pagina.',
    severity: 'high',
    category: 'seo',
    emoji: '📰'
  },
  'multiple_h1': {
    key: 'multiple_h1',
    title: 'Troppi titoli principali',
    description: 'La pagina ha più titoli H1, confondendo Google sull\'argomento principale.',
    impact: 'Il sito perde rilevanza nei risultati di ricerca.',
    solution: 'Mantenere un solo H1 per pagina e usare H2-H6 per i sottotitoli.',
    severity: 'medium',
    category: 'seo',
    emoji: '📋'
  },
  'no_sitemap': {
    key: 'no_sitemap',
    title: 'Mappa del sito mancante',
    description: 'Non esiste una sitemap XML che aiuti Google a trovare tutte le pagine.',
    impact: 'Alcune pagine potrebbero non essere indicizzate da Google.',
    solution: 'Generare e inviare una sitemap XML a Google Search Console.',
    severity: 'medium',
    category: 'seo',
    emoji: '🗺️'
  },
  'no_robots_txt': {
    key: 'no_robots_txt',
    title: 'File robots.txt mancante',
    description: 'Non ci sono istruzioni per i motori di ricerca su come scansionare il sito.',
    impact: 'I motori di ricerca potrebbero indicizzare pagine indesiderate.',
    solution: 'Creare un file robots.txt con le direttive appropriate.',
    severity: 'low',
    category: 'seo',
    emoji: '🤖'
  },
  'no_canonical': {
    key: 'no_canonical',
    title: 'Contenuto duplicato possibile',
    description: 'Non è indicato l\'URL principale delle pagine, rischiando penalizzazioni per contenuto duplicato.',
    impact: 'Google potrebbe penalizzare il sito per contenuto duplicato.',
    solution: 'Aggiungere tag canonical a tutte le pagine.',
    severity: 'medium',
    category: 'seo',
    emoji: '📑'
  },
  'no_structured_data': {
    key: 'no_structured_data',
    title: 'Dati strutturati mancanti',
    description: 'Il sito non comunica informazioni dettagliate a Google (orari, recensioni, prezzi).',
    impact: 'Impossibile ottenere rich snippet nei risultati di ricerca.',
    solution: 'Implementare Schema.org per LocalBusiness, prodotti, recensioni.',
    severity: 'medium',
    category: 'seo',
    emoji: '🏷️'
  },
  'no_open_graph': {
    key: 'no_open_graph',
    title: 'Anteprima social mancante',
    description: 'Quando il sito viene condiviso su Facebook/LinkedIn, non appare un\'anteprima corretta.',
    impact: 'Le condivisioni social appaiono brutte, riducendo click e engagement.',
    solution: 'Aggiungere tag Open Graph per titolo, descrizione e immagine.',
    severity: 'low',
    category: 'seo',
    emoji: '📱'
  },

  // ============================================
  // PERFORMANCE
  // ============================================
  'slow_loading': {
    key: 'slow_loading',
    title: 'Sito troppo lento',
    description: 'Il sito impiega più di 3 secondi a caricarsi. Gli utenti se ne vanno prima di vedere il contenuto.',
    impact: 'Il 53% degli utenti mobile abbandona se il sito non carica in 3 secondi.',
    solution: 'Ottimizzare immagini, attivare caching, minimizzare codice.',
    severity: 'critical',
    category: 'performance',
    emoji: '🐌'
  },
  'very_slow_loading': {
    key: 'very_slow_loading',
    title: 'Sito estremamente lento',
    description: 'Il sito impiega più di 5 secondi a caricarsi. Praticamente inutilizzabile su mobile.',
    impact: 'Perdita del 70-80% dei visitatori potenziali. Google penalizza pesantemente.',
    solution: 'Intervento urgente: hosting più veloce, CDN, ottimizzazione completa.',
    severity: 'critical',
    category: 'performance',
    emoji: '🔴'
  },
  'large_page_size': {
    key: 'large_page_size',
    title: 'Pagina troppo pesante',
    description: 'La pagina pesa più di 3MB, molto più del necessario per un sito moderno.',
    impact: 'Caricamento lento, consumo dati mobile eccessivo, utenti frustrati.',
    solution: 'Comprimere immagini, rimuovere risorse inutili, lazy loading.',
    severity: 'high',
    category: 'performance',
    emoji: '⚖️'
  },
  'unoptimized_images': {
    key: 'unoptimized_images',
    title: 'Immagini non ottimizzate',
    description: 'Le immagini sono troppo pesanti o in formati obsoleti.',
    impact: 'Pagina lenta, consumo banda eccessivo, esperienza utente scadente.',
    solution: 'Convertire in WebP, comprimere, usare lazy loading.',
    severity: 'high',
    category: 'performance',
    emoji: '🖼️'
  },
  'broken_images': {
    key: 'broken_images',
    title: 'Immagini rotte',
    description: 'Alcune immagini nel sito non si caricano, mostrando icone di errore.',
    impact: 'Aspetto non professionale, perdita di fiducia dei visitatori.',
    solution: 'Sistemare o rimuovere le immagini che non funzionano.',
    severity: 'high',
    category: 'technical',
    emoji: '💔'
  },
  'no_caching': {
    key: 'no_caching',
    title: 'Cache non configurata',
    description: 'Il browser deve scaricare tutto da capo ogni volta che un utente torna sul sito.',
    impact: 'Visite successive lente, spreco di risorse server.',
    solution: 'Configurare header di caching per risorse statiche.',
    severity: 'medium',
    category: 'performance',
    emoji: '🔄'
  },
  'no_compression': {
    key: 'no_compression',
    title: 'Compressione disattivata',
    description: 'I file non vengono compressi prima di essere inviati al browser.',
    impact: 'Trasferimento dati più lento, pagine pesanti.',
    solution: 'Attivare compressione GZIP o Brotli sul server.',
    severity: 'medium',
    category: 'performance',
    emoji: '📦'
  },

  // ============================================
  // SICUREZZA
  // ============================================
  'no_ssl': {
    key: 'no_ssl',
    title: 'Sito non sicuro',
    description: 'Il sito non ha HTTPS. I browser mostrano "Non sicuro" nella barra degli indirizzi.',
    impact: 'I visitatori non si fidano, Google penalizza nei risultati di ricerca.',
    solution: 'Installare certificato SSL (gratuito con Let\'s Encrypt).',
    severity: 'critical',
    category: 'security',
    emoji: '🔓'
  },
  'ssl_expiring': {
    key: 'ssl_expiring',
    title: 'Certificato SSL in scadenza',
    description: 'Il certificato di sicurezza sta per scadere.',
    impact: 'Se scade, il sito mostrerà avvisi di sicurezza spaventando i visitatori.',
    solution: 'Rinnovare il certificato SSL prima della scadenza.',
    severity: 'high',
    category: 'security',
    emoji: '⏰'
  },
  'ssl_expired': {
    key: 'ssl_expired',
    title: 'Certificato SSL scaduto',
    description: 'Il certificato di sicurezza è scaduto. I browser bloccano l\'accesso al sito.',
    impact: 'Sito inaccessibile per la maggior parte degli utenti.',
    solution: 'Rinnovare immediatamente il certificato SSL.',
    severity: 'critical',
    category: 'security',
    emoji: '🚨'
  },
  'mixed_content': {
    key: 'mixed_content',
    title: 'Contenuto misto HTTP/HTTPS',
    description: 'Il sito è HTTPS ma carica risorse non sicure (HTTP).',
    impact: 'Avvisi di sicurezza nel browser, risorse bloccate.',
    solution: 'Aggiornare tutti i link a risorse esterne in HTTPS.',
    severity: 'high',
    category: 'security',
    emoji: '⚠️'
  },
  'missing_security_headers': {
    key: 'missing_security_headers',
    title: 'Protezioni di sicurezza mancanti',
    description: 'Il server non implementa header di sicurezza moderni.',
    impact: 'Vulnerabilità a attacchi XSS, clickjacking e altri.',
    solution: 'Configurare header CSP, X-Frame-Options, HSTS.',
    severity: 'medium',
    category: 'security',
    emoji: '🛡️'
  },

  // ============================================
  // GDPR & PRIVACY
  // ============================================
  'no_cookie_banner': {
    key: 'no_cookie_banner',
    title: 'Cookie banner mancante',
    description: 'Il sito non chiede il consenso per i cookie come richiede la legge europea.',
    impact: 'Rischio multe fino al 4% del fatturato annuo (GDPR).',
    solution: 'Implementare banner cookie conforme GDPR con gestione consensi.',
    severity: 'critical',
    category: 'gdpr',
    emoji: '🍪'
  },
  'no_privacy_policy': {
    key: 'no_privacy_policy',
    title: 'Privacy policy mancante',
    description: 'Non esiste una pagina che spiega come vengono trattati i dati degli utenti.',
    impact: 'Violazione GDPR, rischio multe e azioni legali.',
    solution: 'Creare una privacy policy completa e linkarla nel footer.',
    severity: 'critical',
    category: 'gdpr',
    emoji: '📋'
  },
  'no_terms': {
    key: 'no_terms',
    title: 'Termini di servizio mancanti',
    description: 'Non ci sono termini e condizioni che regolano l\'uso del sito/servizio.',
    impact: 'Nessuna tutela legale in caso di dispute.',
    solution: 'Redigere termini di servizio con un legale.',
    severity: 'medium',
    category: 'gdpr',
    emoji: '📜'
  },
  'no_vat_number': {
    key: 'no_vat_number',
    title: 'P.IVA non visibile',
    description: 'La Partita IVA non è visibile nel sito come richiesto dalla legge italiana.',
    impact: 'Violazione dell\'obbligo di trasparenza fiscale.',
    solution: 'Aggiungere P.IVA nel footer di tutte le pagine.',
    severity: 'high',
    category: 'gdpr',
    emoji: '🏢'
  },

  // ============================================
  // MOBILE & RESPONSIVENESS
  // ============================================
  'not_mobile_friendly': {
    key: 'not_mobile_friendly',
    title: 'Sito non adatto a mobile',
    description: 'Il sito non si adatta correttamente agli schermi di smartphone e tablet.',
    impact: 'Il 60% delle visite è da mobile. Perdi la maggior parte dei clienti.',
    solution: 'Riprogettare il sito con design responsive.',
    severity: 'critical',
    category: 'mobile',
    emoji: '📱'
  },
  'no_viewport_meta': {
    key: 'no_viewport_meta',
    title: 'Viewport non configurato',
    description: 'Il sito non dice ai browser mobile come visualizzare le pagine.',
    impact: 'Su mobile appare tutto piccolissimo e illeggibile.',
    solution: 'Aggiungere il meta tag viewport nel codice.',
    severity: 'critical',
    category: 'mobile',
    emoji: '📏'
  },
  'horizontal_scroll': {
    key: 'horizontal_scroll',
    title: 'Scroll orizzontale',
    description: 'Su mobile bisogna scrollare a destra/sinistra per vedere tutto il contenuto.',
    impact: 'Esperienza frustrante, utenti abbandonano il sito.',
    solution: 'Correggere elementi che escono dallo schermo.',
    severity: 'high',
    category: 'mobile',
    emoji: '↔️'
  },
  'small_touch_targets': {
    key: 'small_touch_targets',
    title: 'Pulsanti troppo piccoli',
    description: 'Link e pulsanti sono troppo piccoli per essere toccati facilmente su mobile.',
    impact: 'Gli utenti toccano link sbagliati, si frustrano.',
    solution: 'Aumentare dimensioni pulsanti a minimo 44x44 pixel.',
    severity: 'medium',
    category: 'mobile',
    emoji: '👆'
  },
  'text_too_small': {
    key: 'text_too_small',
    title: 'Testo troppo piccolo',
    description: 'Il testo è difficile da leggere su smartphone senza zoomare.',
    impact: 'Gli utenti faticano a leggere, abbandonano.',
    solution: 'Usare font di almeno 16px per il testo principale.',
    severity: 'medium',
    category: 'mobile',
    emoji: '🔍'
  },

  // ============================================
  // TRACKING & ANALYTICS
  // ============================================
  'no_analytics': {
    key: 'no_analytics',
    title: 'Analytics non installato',
    description: 'Non c\'è Google Analytics o altro sistema per sapere quanti visitatori ha il sito.',
    impact: 'Impossibile misurare risultati e prendere decisioni informate.',
    solution: 'Installare Google Analytics 4 o alternativa privacy-friendly.',
    severity: 'high',
    category: 'tracking',
    emoji: '📊'
  },
  'no_gtm': {
    key: 'no_gtm',
    title: 'Google Tag Manager mancante',
    description: 'Non c\'è un sistema centralizzato per gestire i codici di tracciamento.',
    impact: 'Difficile aggiungere nuovi pixel senza modificare il codice.',
    solution: 'Installare Google Tag Manager per gestione semplificata.',
    severity: 'medium',
    category: 'tracking',
    emoji: '🏷️'
  },
  'no_conversion_tracking': {
    key: 'no_conversion_tracking',
    title: 'Conversioni non tracciate',
    description: 'Non vengono tracciate le azioni importanti (contatti, acquisti, registrazioni).',
    impact: 'Impossibile sapere se la pubblicità funziona.',
    solution: 'Configurare eventi di conversione in Analytics e ads.',
    severity: 'high',
    category: 'tracking',
    emoji: '🎯'
  },
  'no_facebook_pixel': {
    key: 'no_facebook_pixel',
    title: 'Pixel Meta/Facebook mancante',
    description: 'Non c\'è il pixel per tracciare visitatori da Facebook/Instagram.',
    impact: 'Impossibile fare retargeting su Meta, campagne meno efficaci.',
    solution: 'Installare Meta Pixel e configurare eventi standard.',
    severity: 'medium',
    category: 'tracking',
    emoji: '👥'
  },

  // ============================================
  // CONTENUTI & UX
  // ============================================
  'no_contact_form': {
    key: 'no_contact_form',
    title: 'Form contatto mancante',
    description: 'Non c\'è un modo semplice per i visitatori di contattare l\'azienda online.',
    impact: 'Perdita di potenziali clienti che preferiscono scrivere piuttosto che chiamare.',
    solution: 'Aggiungere form di contatto in posizione visibile.',
    severity: 'high',
    category: 'content',
    emoji: '📬'
  },
  'no_phone_visible': {
    key: 'no_phone_visible',
    title: 'Telefono non visibile',
    description: 'Il numero di telefono non è facilmente trovabile nel sito.',
    impact: 'I clienti che vogliono chiamare non trovano il numero.',
    solution: 'Mettere il telefono in header, footer e pagina contatti.',
    severity: 'medium',
    category: 'content',
    emoji: '📞'
  },
  'no_address': {
    key: 'no_address',
    title: 'Indirizzo non presente',
    description: 'L\'indirizzo fisico dell\'attività non è visibile nel sito.',
    impact: 'Meno fiducia, problemi con SEO locale.',
    solution: 'Aggiungere indirizzo completo nel footer e pagina contatti.',
    severity: 'medium',
    category: 'content',
    emoji: '📍'
  },
  'no_social_links': {
    key: 'no_social_links',
    title: 'Link social mancanti',
    description: 'Non ci sono link ai profili social dell\'azienda.',
    impact: 'Opportunità di engagement perse, meno credibilità.',
    solution: 'Aggiungere icone social nel header o footer.',
    severity: 'low',
    category: 'content',
    emoji: '🔗'
  },
  'thin_content': {
    key: 'thin_content',
    title: 'Contenuto scarso',
    description: 'Le pagine hanno pochissimo testo, insufficiente per Google.',
    impact: 'Google non capisce di cosa parla il sito, posizionamento basso.',
    solution: 'Arricchire le pagine con contenuti utili e informativi.',
    severity: 'medium',
    category: 'content',
    emoji: '📄'
  },
  'no_business_hours': {
    key: 'no_business_hours',
    title: 'Orari non indicati',
    description: 'Gli orari di apertura non sono visibili nel sito.',
    impact: 'I clienti non sanno quando possono visitare o chiamare.',
    solution: 'Aggiungere orari nel footer e nella pagina contatti.',
    severity: 'low',
    category: 'content',
    emoji: '🕐'
  },

  // ============================================
  // TECNICI
  // ============================================
  'site_down': {
    key: 'site_down',
    title: 'Sito non raggiungibile',
    description: 'Il sito non risponde o mostra errori.',
    impact: 'Perdita totale di visite e potenziali clienti.',
    solution: 'Verificare hosting e DNS, risolvere problemi server.',
    severity: 'critical',
    category: 'technical',
    emoji: '💀'
  },
  'under_construction': {
    key: 'under_construction',
    title: 'Sito in costruzione',
    description: 'Il sito mostra una pagina "coming soon" o "in costruzione".',
    impact: 'Nessuna visibilità online, perdita clienti.',
    solution: 'Completare e pubblicare il sito il prima possibile.',
    severity: 'critical',
    category: 'technical',
    emoji: '🚧'
  },
  'redirect_chain': {
    key: 'redirect_chain',
    title: 'Reindirizzamenti multipli',
    description: 'Il sito fa più reindirizzamenti prima di arrivare alla pagina finale.',
    impact: 'Rallentamento caricamento, possibili problemi SEO.',
    solution: 'Correggere i redirect per arrivare direttamente alla destinazione.',
    severity: 'medium',
    category: 'technical',
    emoji: '🔀'
  },
  'missing_alt_text': {
    key: 'missing_alt_text',
    title: 'Alt text immagini mancante',
    description: 'Le immagini non hanno descrizioni alternative per accessibilità e SEO.',
    impact: 'Accessibilità ridotta, opportunità SEO perse.',
    solution: 'Aggiungere alt text descrittivi a tutte le immagini.',
    severity: 'medium',
    category: 'seo',
    emoji: '🖼️'
  },
  'outdated_cms': {
    key: 'outdated_cms',
    title: 'CMS non aggiornato',
    description: 'La piattaforma del sito (WordPress, Joomla, ecc.) non è aggiornata.',
    impact: 'Vulnerabilità di sicurezza, funzionalità obsolete.',
    solution: 'Aggiornare CMS e plugin all\'ultima versione.',
    severity: 'high',
    category: 'security',
    emoji: '🔧'
  },
}

/**
 * Traduce una lista di chiavi di problemi tecnici in problemi leggibili
 */
export function translateProblems(problemKeys: string[]): TranslatedProblem[] {
  return problemKeys
    .map(key => PROBLEM_TRANSLATIONS[key])
    .filter((p): p is TranslatedProblem => p !== undefined)
}

/**
 * Traduce un singolo problema
 */
export function translateProblem(problemKey: string): TranslatedProblem | null {
  return PROBLEM_TRANSLATIONS[problemKey] || null
}

/**
 * Ottiene il problema principale (più critico) da una lista
 */
export function getMainProblem(problemKeys: string[]): TranslatedProblem | null {
  const translated = translateProblems(problemKeys)

  // Ordina per severità (critical > high > medium > low)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  translated.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return translated[0] || null
}

/**
 * Ottiene i problemi raggruppati per categoria
 */
export function groupProblemsByCategory(problemKeys: string[]): Record<string, TranslatedProblem[]> {
  const translated = translateProblems(problemKeys)
  const grouped: Record<string, TranslatedProblem[]> = {}

  for (const problem of translated) {
    if (!grouped[problem.category]) {
      grouped[problem.category] = []
    }
    grouped[problem.category].push(problem)
  }

  return grouped
}

/**
 * Ottiene i problemi raggruppati per severità
 */
export function groupProblemsBySeverity(problemKeys: string[]): Record<string, TranslatedProblem[]> {
  const translated = translateProblems(problemKeys)
  const grouped: Record<string, TranslatedProblem[]> = {
    critical: [],
    high: [],
    medium: [],
    low: []
  }

  for (const problem of translated) {
    grouped[problem.severity].push(problem)
  }

  return grouped
}

/**
 * Genera un riepilogo dei problemi per uso nei template outreach
 */
export function generateProblemSummary(problemKeys: string[], maxProblems: number = 3): string {
  const translated = translateProblems(problemKeys)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  translated.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const top = translated.slice(0, maxProblems)

  if (top.length === 0) {
    return 'Il sito è in buone condizioni generali.'
  }

  return top.map(p => `${p.emoji} ${p.title}`).join('\n')
}

/**
 * Converte l'analisi tecnica in una lista di chiavi problema
 * Da usare con i dati che vengono dal database/API
 */
export function extractProblemKeysFromAnalysis(analysis: any): string[] {
  const problems: string[] = []

  if (!analysis) return problems

  // SEO
  if (analysis.seo) {
    if (!analysis.seo.hasTitle) problems.push('missing_title')
    if (!analysis.seo.hasMetaDescription) problems.push('missing_meta_description')
    if (!analysis.seo.hasH1) problems.push('no_h1')
    if (analysis.seo.h1Count > 1) problems.push('multiple_h1')
    if (!analysis.seo.hasSitemap) problems.push('no_sitemap')
    if (!analysis.seo.hasRobotsTxt) problems.push('no_robots_txt')
    if (!analysis.seo.hasCanonical) problems.push('no_canonical')
    if (!analysis.seo.hasStructuredData) problems.push('no_structured_data')
    if (!analysis.seo.hasOpenGraph) problems.push('no_open_graph')
  }

  // Performance
  if (analysis.performance) {
    const loadTime = analysis.performance.loadTime || analysis.performance.totalTime
    if (loadTime > 5000) problems.push('very_slow_loading')
    else if (loadTime > 3000) problems.push('slow_loading')

    const pageSize = analysis.performance.pageSize || analysis.performance.totalSize
    if (pageSize > 3000000) problems.push('large_page_size')
  }

  // Images
  if (analysis.images) {
    if (analysis.images.broken > 0) problems.push('broken_images')
    if (analysis.images.withoutAlt > 3) problems.push('missing_alt_text')
    if (analysis.images.oversized > 0) problems.push('unoptimized_images')
  }

  // SSL & Security
  if (!analysis.hasSSL) problems.push('no_ssl')
  else if (analysis.sslDetails?.daysToExpiry < 30) problems.push('ssl_expiring')
  else if (analysis.sslDetails?.daysToExpiry < 0) problems.push('ssl_expired')

  // Tracking
  if (analysis.tracking) {
    if (!analysis.tracking.googleAnalytics && !analysis.tracking.googleTagManager) {
      problems.push('no_analytics')
    }
    if (!analysis.tracking.googleTagManager) problems.push('no_gtm')
    if (!analysis.tracking.facebookPixel) problems.push('no_facebook_pixel')
  }

  // GDPR
  if (analysis.gdpr) {
    if (!analysis.gdpr.hasCookieBanner) problems.push('no_cookie_banner')
    if (!analysis.gdpr.hasPrivacyPolicy) problems.push('no_privacy_policy')
    if (!analysis.gdpr.hasTermsOfService) problems.push('no_terms')
    if (!analysis.gdpr.hasVatNumber && analysis.gdpr.vatNumbers?.length === 0) {
      problems.push('no_vat_number')
    }
  }

  // Mobile
  if (analysis.mobile) {
    if (!analysis.mobile.isMobileFriendly) problems.push('not_mobile_friendly')
    if (!analysis.mobile.hasViewportMeta) problems.push('no_viewport_meta')
    if (analysis.mobile.hasHorizontalScroll) problems.push('horizontal_scroll')
    if (!analysis.mobile.touchTargetsOk) problems.push('small_touch_targets')
    if (!analysis.mobile.textReadable) problems.push('text_too_small')
  }

  // Content
  if (analysis.content) {
    if (!analysis.content.hasContactForm) problems.push('no_contact_form')
    if (!analysis.content.hasPhoneNumbers) problems.push('no_phone_visible')
    if (!analysis.content.hasSocialLinks) problems.push('no_social_links')
    if (analysis.content.wordCount < 200) problems.push('thin_content')
    if (!analysis.content.hasBusinessHours) problems.push('no_business_hours')
  }

  // Website status
  if (analysis.websiteStatus) {
    if (analysis.websiteStatus === 'unreachable' || analysis.websiteStatus === 'error') {
      problems.push('site_down')
    }
    if (analysis.websiteStatus === 'under_construction') {
      problems.push('under_construction')
    }
  }

  return problems
}

/**
 * Nomi delle categorie in italiano
 */
export const CATEGORY_NAMES: Record<string, string> = {
  seo: 'SEO e Visibilità',
  performance: 'Velocità',
  security: 'Sicurezza',
  gdpr: 'GDPR e Privacy',
  mobile: 'Mobile',
  tracking: 'Tracking e Analytics',
  content: 'Contenuti',
  technical: 'Problemi Tecnici'
}

/**
 * Nomi delle severità in italiano
 */
export const SEVERITY_NAMES: Record<string, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Basso'
}

/**
 * Colori per le severità (Tailwind classes)
 */
export const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' }
}

export default PROBLEM_TRANSLATIONS
