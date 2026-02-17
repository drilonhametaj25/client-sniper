/**
 * Outreach Templates - TrovaMi
 *
 * Template pronti all'uso per contattare potenziali clienti.
 * 4 canali: Email, WhatsApp, LinkedIn, Drop-in (visita di persona)
 *
 * PRINCIPI:
 * - MAI "Gentile Responsabile" - sempre nome azienda specifico
 * - Menzionare il problema SPECIFICO trovato dall'analisi
 * - Report allegato, non promesso
 * - "Se ti interessa, altrimenti nessun problema"
 * - Tono umano, non formale
 */

export interface OutreachContext {
  // Dati lead
  businessName: string
  category: string
  city?: string
  website?: string
  phone?: string
  email?: string

  // Problemi identificati
  mainProblem: string
  mainProblemEmoji: string
  additionalProblems?: string[]
  score: number

  // Dati freelancer/agenzia
  freelancerName: string
  freelancerCompany?: string
  freelancerPhone?: string
  freelancerEmail: string
  freelancerWebsite?: string
  freelancerSpecialization?: string[]
}

export interface OutreachTemplate {
  id: string
  name: string
  channel: 'email' | 'whatsapp' | 'linkedin' | 'dropin'
  icon: string
  description: string
  subject?: string // Solo per email
  body: string
  tips: string[]
}

// ================================================================
// TEMPLATE EMAIL
// ================================================================
export function generateEmailTemplate(ctx: OutreachContext): OutreachTemplate {
  const subject = `Ho notato un problema sul sito di ${ctx.businessName}`

  const body = `Ciao,

mi chiamo ${ctx.freelancerName}${ctx.freelancerCompany ? ` di ${ctx.freelancerCompany}` : ''} e mi occupo di ${getSpecializationText(ctx.freelancerSpecialization)}.

Ho dato un'occhiata al sito di ${ctx.businessName} e ho notato che ${getProblemDescription(ctx.mainProblem)}.

${ctx.additionalProblems && ctx.additionalProblems.length > 0
  ? `Oltre a questo, ci sono altri ${ctx.additionalProblems.length} aspetti che potrebbero essere migliorati per aumentare la visibilità online e attirare più clienti.`
  : ''}

Ho preparato un report gratuito con l'analisi completa del sito — te lo allego qui.

Se ti fa piacere, possiamo fare una chiamata veloce (15 minuti) per vedere insieme cosa si potrebbe fare. Altrimenti, nessun problema, il report è comunque tuo!

${ctx.freelancerName}
${ctx.freelancerPhone ? ctx.freelancerPhone : ''}
${ctx.freelancerWebsite ? ctx.freelancerWebsite : ''}`

  return {
    id: 'email-standard',
    name: 'Email Professionale',
    channel: 'email',
    icon: '📧',
    description: 'Email con allegato report PDF. Tono professionale ma umano.',
    subject,
    body,
    tips: [
      'Allega sempre il report PDF',
      'Invia di martedì, mercoledì o giovedì mattina',
      'Follow-up dopo 3-4 giorni se non rispondono',
      'Non usare troppi link (spam filter)'
    ]
  }
}

// ================================================================
// TEMPLATE WHATSAPP
// ================================================================
export function generateWhatsAppTemplate(ctx: OutreachContext): OutreachTemplate {
  const body = `Ciao! Sono ${ctx.freelancerName}${ctx.freelancerCompany ? ` di ${ctx.freelancerCompany}` : ''}.

Ho fatto un'analisi del sito di ${ctx.businessName} e ho trovato ${getProblemShort(ctx.mainProblem)} che potrebbe costarti clienti.

Ho il report completo pronto — te lo mando?`

  return {
    id: 'whatsapp-intro',
    name: 'WhatsApp Introduzione',
    channel: 'whatsapp',
    icon: '💬',
    description: 'Messaggio breve per aprire la conversazione.',
    body,
    tips: [
      'Massimo 3 righe + domanda',
      'Aspetta risposta prima di mandare il PDF',
      'Non mandare note vocali al primo contatto',
      'Rispondi velocemente se ti scrivono'
    ]
  }
}

// ================================================================
// TEMPLATE LINKEDIN
// ================================================================
export function generateLinkedInTemplate(ctx: OutreachContext): OutreachTemplate {
  const body = `Ciao,

mi occupo di ${getSpecializationText(ctx.freelancerSpecialization)} e ho notato ${ctx.businessName} nella mia zona.

Ho dato un'occhiata al sito e ho trovato alcune opportunità di miglioramento — in particolare ${getProblemShort(ctx.mainProblem)}.

Se ti interessa, ho un report gratuito con l'analisi completa. Ti va di dare un'occhiata?

${ctx.freelancerName}`

  return {
    id: 'linkedin-connection',
    name: 'LinkedIn Messaggio',
    channel: 'linkedin',
    icon: '💼',
    description: 'Per contatti già connessi o InMail.',
    body,
    tips: [
      'Prima connettiti, poi manda il messaggio',
      'Guarda il profilo prima di scrivere',
      'Evita linguaggio troppo "vendita"',
      'Offri valore, non chiedere subito un meeting'
    ]
  }
}

// ================================================================
// TEMPLATE DROP-IN (Visita di persona)
// ================================================================
export function generateDropInTemplate(ctx: OutreachContext): OutreachTemplate {
  const body = `# GUIDA VISITA DI PERSONA

## Prima della visita
- [ ] Stampa il report PDF (2 copie)
- [ ] Prepara biglietto da visita
- [ ] Vai in orari tranquilli (non ora di punta)

## Script apertura
"Buongiorno! Mi chiamo ${ctx.freelancerName}, mi occupo di ${getSpecializationText(ctx.freelancerSpecialization)}.
Ho notato che ${ctx.businessName} ha un bel locale ma il sito web potrebbe attirare più clienti.
Ho preparato un'analisi gratuita — posso lasciarla al responsabile?"

## Se chiedono dettagli
"Ho trovato che ${getProblemDescription(ctx.mainProblem)}.
È una cosa comune e si sistema facilmente. Nel report c'è tutto spiegato."

## Se non c'è il responsabile
"Capisco, nessun problema. Posso lasciare il report con i miei contatti?
Se gli interessa, mi trova qui [biglietto da visita]."

## Dopo la visita
- [ ] Segna la visita nel CRM
- [ ] Follow-up WhatsApp dopo 2-3 giorni
- [ ] Non tornare di persona se non rispondono`

  return {
    id: 'dropin-guide',
    name: 'Guida Visita di Persona',
    channel: 'dropin',
    icon: '🚶',
    description: 'Script completo per visita in negozio/ufficio.',
    body,
    tips: [
      'Vai in orari calmi (10-11 o 15-16)',
      'Non essere insistente, lascia il report',
      'Sorridi e sii cordiale',
      'Follow-up WhatsApp è più efficace del telefono'
    ]
  }
}

// ================================================================
// GENERA TUTTI I TEMPLATE
// ================================================================
export function generateAllTemplates(ctx: OutreachContext): OutreachTemplate[] {
  return [
    generateEmailTemplate(ctx),
    generateWhatsAppTemplate(ctx),
    generateLinkedInTemplate(ctx),
    generateDropInTemplate(ctx)
  ]
}

// ================================================================
// HELPERS
// ================================================================

function getSpecializationText(specializations?: string[]): string {
  if (!specializations || specializations.length === 0) {
    return 'siti web e marketing digitale'
  }

  const specMap: Record<string, string> = {
    web_development: 'siti web',
    seo: 'SEO e visibilità su Google',
    marketing: 'marketing digitale',
    design: 'design e branding',
    social: 'social media',
    ads: 'pubblicità online',
    ecommerce: 'e-commerce'
  }

  const translated = specializations
    .map(s => specMap[s] || s)
    .slice(0, 2)

  return translated.join(' e ')
}

function getProblemDescription(problem: string): string {
  const descriptions: Record<string, string> = {
    'missing_title': 'il sito non ha un titolo visibile su Google — quando qualcuno cerca, non capisce di cosa parla',
    'missing_meta_description': 'non c\'è una descrizione che appare su Google, quindi i potenziali clienti non cliccano',
    'no_ssl': 'il browser segna il sito come "Non sicuro", facendo scappare i visitatori',
    'slow_loading': 'il sito è lento a caricare e molti visitatori se ne vanno prima di vederlo',
    'not_mobile_friendly': 'il sito non funziona bene da smartphone, dove arriva il 60% del traffico',
    'no_analytics': 'non c\'è modo di sapere quanti visitatori arrivano e cosa fanno',
    'no_cookie_banner': 'manca il banner cookie obbligatorio per legge (rischio multe GDPR)',
    'no_contact_form': 'non c\'è un modo semplice per i clienti di contattarti online',
    'broken_images': 'alcune immagini non si caricano, dando un\'impressione poco professionale'
  }

  return descriptions[problem] || 'ci sono alcuni aspetti tecnici che potrebbero essere migliorati'
}

function getProblemShort(problem: string): string {
  const shorts: Record<string, string> = {
    'missing_title': 'un problema con la visibilità su Google',
    'missing_meta_description': 'la descrizione Google mancante',
    'no_ssl': 'un problema di sicurezza',
    'slow_loading': 'problemi di velocità',
    'not_mobile_friendly': 'problemi con la versione mobile',
    'no_analytics': 'la mancanza di statistiche',
    'no_cookie_banner': 'un problema di conformità GDPR',
    'no_contact_form': 'la mancanza di un form contatti',
    'broken_images': 'delle immagini non funzionanti'
  }

  return shorts[problem] || 'alcune opportunità di miglioramento'
}

// ================================================================
// GENERATORE LINK WHATSAPP
// ================================================================
export function generateWhatsAppLink(phone: string, message: string): string {
  // Pulisci numero (rimuovi spazi, +, ecc.)
  const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '')

  // Assicurati che inizi con codice paese
  const phoneWithCountry = cleanPhone.startsWith('39')
    ? cleanPhone
    : cleanPhone.startsWith('0')
      ? '39' + cleanPhone.slice(1)
      : '39' + cleanPhone

  // Codifica messaggio
  const encodedMessage = encodeURIComponent(message)

  return `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`
}

// ================================================================
// GENERATORE LINK MAILTO
// ================================================================
export function generateMailtoLink(
  email: string,
  subject: string,
  body: string
): string {
  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)

  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`
}
