/**
 * OutreachEmailGenerator - Generatore di template email per cold outreach
 * Include 8 template personalizzati per diversi scenari:
 * - Cold Email SEO
 * - Cold Email Performance
 * - Cold Email Security
 * - Cold Email GDPR
 * - Cold Email Full Audit
 * - Follow-up 1 (3 giorni)
 * - Follow-up 2 (7 giorni)
 * - LinkedIn Message (versione corta)
 */

export interface EmailTemplate {
  id: string
  name: string
  category: 'cold' | 'follow_up' | 'linkedin' | 'proposal'
  subject: string
  preheader: string
  bodyHtml: string
  bodyText: string
  variables: string[]
  bestFor: string[]
  tone: 'professional' | 'friendly' | 'urgent'
}

export interface TemplateVariables {
  business_name: string
  website: string
  city?: string
  score?: number
  seo_score?: number
  performance_score?: number
  security_score?: number
  main_issue?: string
  issues_count?: number
  potential_improvement?: string
  your_name: string
  your_company?: string
  your_title?: string
  your_phone?: string
  your_email?: string
  calendar_link?: string
}

// Lista variabili disponibili
export const AVAILABLE_VARIABLES = [
  { key: 'business_name', label: 'Nome Azienda', required: true },
  { key: 'website', label: 'URL Sito', required: true },
  { key: 'city', label: 'Città', required: false },
  { key: 'score', label: 'Score Complessivo', required: false },
  { key: 'seo_score', label: 'Score SEO', required: false },
  { key: 'performance_score', label: 'Score Performance', required: false },
  { key: 'security_score', label: 'Score Sicurezza', required: false },
  { key: 'main_issue', label: 'Problema Principale', required: false },
  { key: 'issues_count', label: 'Numero Problemi', required: false },
  { key: 'potential_improvement', label: 'Miglioramento Stimato', required: false },
  { key: 'your_name', label: 'Tuo Nome', required: true },
  { key: 'your_company', label: 'Tua Azienda', required: false },
  { key: 'your_title', label: 'Tuo Ruolo', required: false },
  { key: 'your_phone', label: 'Tuo Telefono', required: false },
  { key: 'your_email', label: 'Tua Email', required: false },
  { key: 'calendar_link', label: 'Link Calendario', required: false },
]

// Template email
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // 1. Cold Email SEO
  {
    id: 'cold_seo',
    name: 'Cold Email - SEO',
    category: 'cold',
    subject: '{business_name}: ho notato alcune opportunità SEO per il vostro sito',
    preheader: 'Analisi gratuita del posizionamento su Google',
    bodyHtml: `
<p>Buongiorno,</p>

<p>mi chiamo <strong>{your_name}</strong>{your_company_text} e mi occupo di ottimizzazione per motori di ricerca.</p>

<p>Ho analizzato il sito <strong>{website}</strong> e ho identificato alcune opportunità per migliorare il posizionamento su Google:</p>

<ul style="margin: 20px 0; padding-left: 20px;">
  <li><strong>Meta tag</strong>: titoli e descrizioni potrebbero essere ottimizzati per attirare più click</li>
  <li><strong>Struttura contenuti</strong>: l'organizzazione delle intestazioni (H1, H2) può essere migliorata</li>
  <li><strong>Dati strutturati</strong>: mancano markup che permetterebbero di apparire con rich snippet</li>
</ul>

<p>Questi interventi potrebbero portare a un <strong>aumento del traffico organico del 20-40%</strong> nei prossimi 3-6 mesi.</p>

<p>Sareste interessati a una breve call di 15 minuti per approfondire? Posso mostrarvi l'analisi completa senza impegno.</p>

{calendar_text}

<p>Cordiali saluti,<br>
<strong>{your_name}</strong>{signature_details}</p>
    `,
    bodyText: `
Buongiorno,

mi chiamo {your_name}{your_company_text} e mi occupo di ottimizzazione per motori di ricerca.

Ho analizzato il sito {website} e ho identificato alcune opportunità per migliorare il posizionamento su Google:

• Meta tag: titoli e descrizioni potrebbero essere ottimizzati
• Struttura contenuti: l'organizzazione delle intestazioni può essere migliorata
• Dati strutturati: mancano markup per rich snippet

Questi interventi potrebbero portare a un aumento del traffico organico del 20-40%.

Sareste interessati a una breve call di 15 minuti? Posso mostrarvi l'analisi senza impegno.

{calendar_text}

Cordiali saluti,
{your_name}{signature_details}
    `,
    variables: ['business_name', 'website', 'your_name', 'your_company', 'calendar_link'],
    bestFor: ['seo_issues', 'missing_meta', 'no_structured_data'],
    tone: 'professional'
  },

  // 2. Cold Email Performance
  {
    id: 'cold_performance',
    name: 'Cold Email - Performance',
    category: 'cold',
    subject: '{business_name}: il vostro sito potrebbe caricarsi più velocemente',
    preheader: 'Un sito veloce = più conversioni',
    bodyHtml: `
<p>Buongiorno,</p>

<p>sono <strong>{your_name}</strong>{your_company_text}, specialista in ottimizzazione web performance.</p>

<p>Ho effettuato un test di velocità su <strong>{website}</strong> e i risultati mostrano margini di miglioramento significativi:</p>

<div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0;"><strong>⏱️ Sapevate che:</strong></p>
  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
    <li>Il 53% degli utenti abbandona un sito se non carica entro 3 secondi</li>
    <li>Ogni secondo di ritardo riduce le conversioni del 7%</li>
    <li>Google penalizza i siti lenti nel ranking</li>
  </ul>
</div>

<p>Con alcune ottimizzazioni mirate (compressione immagini, caching, ottimizzazione codice), potremmo <strong>dimezzare i tempi di caricamento</strong> e migliorare l'esperienza utente.</p>

<p>Vi farebbe piacere ricevere un report gratuito con le ottimizzazioni consigliate?</p>

{calendar_text}

<p>A presto,<br>
<strong>{your_name}</strong>{signature_details}</p>
    `,
    bodyText: `
Buongiorno,

sono {your_name}{your_company_text}, specialista in ottimizzazione web performance.

Ho effettuato un test di velocità su {website} e i risultati mostrano margini di miglioramento significativi.

Sapevate che:
• Il 53% degli utenti abbandona un sito se non carica entro 3 secondi
• Ogni secondo di ritardo riduce le conversioni del 7%
• Google penalizza i siti lenti nel ranking

Con alcune ottimizzazioni mirate, potremmo dimezzare i tempi di caricamento.

Vi farebbe piacere ricevere un report gratuito?

{calendar_text}

A presto,
{your_name}{signature_details}
    `,
    variables: ['business_name', 'website', 'your_name', 'your_company', 'calendar_link'],
    bestFor: ['slow_site', 'performance_issues', 'low_speed_score'],
    tone: 'friendly'
  },

  // 3. Cold Email Security
  {
    id: 'cold_security',
    name: 'Cold Email - Sicurezza',
    category: 'cold',
    subject: 'Importante: vulnerabilità di sicurezza rilevate su {website}',
    preheader: 'Proteggi i dati dei tuoi clienti',
    bodyHtml: `
<p>Buongiorno,</p>

<p>mi chiamo <strong>{your_name}</strong>{your_company_text} e mi occupo di sicurezza informatica per PMI.</p>

<p>Durante un'analisi di routine, ho rilevato alcune <strong>vulnerabilità di sicurezza</strong> sul sito {website} che potrebbero esporre i dati dei vostri clienti:</p>

<div style="background: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
  <p style="margin: 0 0 10px 0;"><strong>⚠️ Problemi identificati:</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li>Security headers mancanti o non configurati correttamente</li>
    <li>Potenziali vulnerabilità nelle librerie JavaScript</li>
    <li>Configurazione SSL/HTTPS da verificare</li>
  </ul>
</div>

<p>Questi problemi potrebbero portare a:</p>
<ul>
  <li>Data breach con conseguenze legali (GDPR)</li>
  <li>Perdita di fiducia dei clienti</li>
  <li>Penalizzazioni da parte di Google</li>
</ul>

<p>Posso inviarvi un <strong>report dettagliato gratuito</strong> con le soluzioni consigliate. Vi andrebbe?</p>

<p>Cordiali saluti,<br>
<strong>{your_name}</strong>{signature_details}</p>
    `,
    bodyText: `
Buongiorno,

mi chiamo {your_name}{your_company_text} e mi occupo di sicurezza informatica per PMI.

Ho rilevato alcune vulnerabilità di sicurezza sul sito {website}:

⚠️ Problemi identificati:
• Security headers mancanti o non configurati
• Potenziali vulnerabilità nelle librerie JavaScript
• Configurazione SSL/HTTPS da verificare

Questi problemi potrebbero portare a data breach, perdita di fiducia dei clienti e penalizzazioni Google.

Posso inviarvi un report dettagliato gratuito con le soluzioni consigliate. Vi andrebbe?

Cordiali saluti,
{your_name}{signature_details}
    `,
    variables: ['business_name', 'website', 'your_name', 'your_company'],
    bestFor: ['security_issues', 'no_https', 'missing_headers'],
    tone: 'urgent'
  },

  // 4. Cold Email GDPR
  {
    id: 'cold_gdpr',
    name: 'Cold Email - GDPR/Privacy',
    category: 'cold',
    subject: '{business_name}: conformità GDPR del vostro sito web',
    preheader: 'Evita sanzioni fino al 4% del fatturato',
    bodyHtml: `
<p>Buongiorno,</p>

<p>sono <strong>{your_name}</strong>{your_company_text}, consulente per la conformità digitale.</p>

<p>Ho analizzato il sito <strong>{website}</strong> e ho notato alcuni aspetti che potrebbero non essere pienamente conformi alla normativa GDPR:</p>

<ul style="margin: 20px 0; padding-left: 20px;">
  <li>Cookie banner assente o non conforme alle linee guida del Garante</li>
  <li>Privacy policy da verificare/aggiornare</li>
  <li>Gestione del consenso da implementare</li>
</ul>

<div style="background: #DBEAFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0;"><strong>📋 Lo sapevate?</strong> Le sanzioni per violazioni GDPR possono arrivare fino al <strong>4% del fatturato annuo</strong> o 20 milioni di euro.</p>
</div>

<p>Mettersi in regola non è complicato se si interviene per tempo. Posso preparare una <strong>checklist personalizzata</strong> per il vostro sito, completamente gratuita.</p>

<p>Vi interessa?</p>

<p>Cordiali saluti,<br>
<strong>{your_name}</strong>{signature_details}</p>
    `,
    bodyText: `
Buongiorno,

sono {your_name}{your_company_text}, consulente per la conformità digitale.

Ho analizzato il sito {website} e ho notato aspetti che potrebbero non essere conformi al GDPR:

• Cookie banner assente o non conforme
• Privacy policy da verificare/aggiornare
• Gestione del consenso da implementare

📋 Le sanzioni GDPR possono arrivare fino al 4% del fatturato annuo o 20 milioni di euro.

Posso preparare una checklist personalizzata gratuita per il vostro sito.

Vi interessa?

Cordiali saluti,
{your_name}{signature_details}
    `,
    variables: ['business_name', 'website', 'your_name', 'your_company'],
    bestFor: ['gdpr_issues', 'no_cookie_banner', 'no_privacy_policy'],
    tone: 'professional'
  },

  // 5. Cold Email Full Audit
  {
    id: 'cold_full_audit',
    name: 'Cold Email - Audit Completo',
    category: 'cold',
    subject: 'Ho analizzato {website} - ecco cosa ho trovato',
    preheader: 'Opportunità di miglioramento per il vostro business',
    bodyHtml: `
<p>Buongiorno,</p>

<p>mi chiamo <strong>{your_name}</strong>{your_company_text}.</p>

<p>Ho effettuato un'analisi tecnica approfondita del sito <strong>{website}</strong> e vorrei condividere con voi i risultati.</p>

<div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0 0 15px 0;"><strong>📊 Riepilogo analisi:</strong></p>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0;">SEO e Visibilità</td>
      <td style="padding: 8px 0; text-align: right;"><strong>Margine di miglioramento</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 0;">Performance</td>
      <td style="padding: 8px 0; text-align: right;"><strong>Da ottimizzare</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 0;">Sicurezza</td>
      <td style="padding: 8px 0; text-align: right;"><strong>Verifiche necessarie</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 0;">Mobile</td>
      <td style="padding: 8px 0; text-align: right;"><strong>Migliorabile</strong></td>
    </tr>
  </table>
</div>

<p>Sono convinto che con alcuni interventi mirati, il sito potrebbe:</p>
<ul>
  <li>Aumentare il traffico organico del 30-50%</li>
  <li>Migliorare il tasso di conversione</li>
  <li>Offrire un'esperienza utente migliore</li>
</ul>

<p>Sareste disponibili per una call di 20 minuti in cui mostrarvi l'analisi dettagliata? Nessun impegno, solo valore.</p>

{calendar_text}

<p>A presto,<br>
<strong>{your_name}</strong>{signature_details}</p>
    `,
    bodyText: `
Buongiorno,

mi chiamo {your_name}{your_company_text}.

Ho effettuato un'analisi tecnica approfondita del sito {website}.

📊 Riepilogo analisi:
• SEO e Visibilità: Margine di miglioramento
• Performance: Da ottimizzare
• Sicurezza: Verifiche necessarie
• Mobile: Migliorabile

Con alcuni interventi mirati, il sito potrebbe:
• Aumentare il traffico organico del 30-50%
• Migliorare il tasso di conversione
• Offrire un'esperienza utente migliore

Sareste disponibili per una call di 20 minuti? Nessun impegno, solo valore.

{calendar_text}

A presto,
{your_name}{signature_details}
    `,
    variables: ['business_name', 'website', 'your_name', 'your_company', 'calendar_link'],
    bestFor: ['low_score', 'multiple_issues', 'general_outreach'],
    tone: 'professional'
  },

  // 6. Follow-up 1 (3 giorni)
  {
    id: 'follow_up_1',
    name: 'Follow-up #1 (3 giorni)',
    category: 'follow_up',
    subject: 'Re: Analisi sito {website}',
    preheader: 'Un breve follow-up sulla mia email precedente',
    bodyHtml: `
<p>Buongiorno,</p>

<p>vi scrivo per un breve follow-up sulla mia email di qualche giorno fa riguardo all'analisi del sito <strong>{website}</strong>.</p>

<p>Capisco che siate impegnati, ma volevo assicurarmi che il messaggio non fosse finito nello spam.</p>

<p>Se siete interessati a:</p>
<ul>
  <li>Ricevere l'analisi tecnica completa (gratuita)</li>
  <li>Capire come migliorare visibilità e performance</li>
  <li>Fare una breve call conoscitiva</li>
</ul>

<p>Rispondete pure a questa email o prenotate direttamente uno slot nel mio calendario.</p>

{calendar_text}

<p>Se invece non è il momento giusto o non siete interessati, nessun problema! Fatemelo sapere così non vi disturbo oltre.</p>

<p>Buona giornata,<br>
<strong>{your_name}</strong></p>
    `,
    bodyText: `
Buongiorno,

vi scrivo per un breve follow-up sulla mia email riguardo all'analisi del sito {website}.

Capisco che siate impegnati, ma volevo assicurarmi che il messaggio non fosse finito nello spam.

Se siete interessati a:
• Ricevere l'analisi tecnica completa (gratuita)
• Capire come migliorare visibilità e performance
• Fare una breve call conoscitiva

Rispondete pure a questa email.

{calendar_text}

Se non è il momento giusto, nessun problema! Fatemelo sapere.

Buona giornata,
{your_name}
    `,
    variables: ['business_name', 'website', 'your_name', 'calendar_link'],
    bestFor: ['no_response'],
    tone: 'friendly'
  },

  // 7. Follow-up 2 (7 giorni)
  {
    id: 'follow_up_2',
    name: 'Follow-up #2 (7 giorni)',
    category: 'follow_up',
    subject: 'Ultima email: opportunità per {business_name}',
    preheader: 'Non voglio disturbarvi ulteriormente',
    bodyHtml: `
<p>Buongiorno,</p>

<p>questo è il mio ultimo messaggio riguardo all'analisi del vostro sito.</p>

<p>Ho preparato un <strong>report dettagliato gratuito</strong> con:</p>
<ul>
  <li>Problemi tecnici identificati</li>
  <li>Opportunità di miglioramento concrete</li>
  <li>Stima del potenziale aumento di traffico/conversioni</li>
</ul>

<p>Se vi fa piacere riceverlo, rispondete con un semplice "Sì" e ve lo invio subito.</p>

<p>Altrimenti, vi auguro il meglio per il vostro business! 🙂</p>

<p>Cordiali saluti,<br>
<strong>{your_name}</strong></p>

<p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
PS: Questo sarà il mio ultimo messaggio su questo argomento. Non riceverete altre email da me a meno che non rispondiate.
</p>
    `,
    bodyText: `
Buongiorno,

questo è il mio ultimo messaggio riguardo all'analisi del vostro sito.

Ho preparato un report dettagliato gratuito con:
• Problemi tecnici identificati
• Opportunità di miglioramento concrete
• Stima del potenziale aumento di traffico/conversioni

Se vi fa piacere riceverlo, rispondete con un semplice "Sì".

Altrimenti, vi auguro il meglio per il vostro business! 🙂

Cordiali saluti,
{your_name}

PS: Questo sarà il mio ultimo messaggio su questo argomento.
    `,
    variables: ['business_name', 'website', 'your_name'],
    bestFor: ['no_response'],
    tone: 'friendly'
  },

  // 8. LinkedIn Message
  {
    id: 'linkedin_message',
    name: 'Messaggio LinkedIn',
    category: 'linkedin',
    subject: '',
    preheader: '',
    bodyHtml: `
<p>Ciao,</p>

<p>Ho analizzato il sito di {business_name} e ho notato alcune opportunità interessanti per migliorare visibilità e performance online.</p>

<p>Ti farebbe piacere ricevere un breve report gratuito con le mie osservazioni?</p>

<p>Fammi sapere! 👋</p>

<p>{your_name}</p>
    `,
    bodyText: `
Ciao,

Ho analizzato il sito di {business_name} e ho notato alcune opportunità interessanti per migliorare visibilità e performance online.

Ti farebbe piacere ricevere un breve report gratuito con le mie osservazioni?

Fammi sapere! 👋

{your_name}
    `,
    variables: ['business_name', 'your_name'],
    bestFor: ['linkedin_outreach'],
    tone: 'friendly'
  }
]

export class OutreachEmailGenerator {
  /**
   * Ottiene un template per ID
   */
  static getTemplate(templateId: string): EmailTemplate | undefined {
    return EMAIL_TEMPLATES.find(t => t.id === templateId)
  }

  /**
   * Ottiene tutti i template
   */
  static getAllTemplates(): EmailTemplate[] {
    return EMAIL_TEMPLATES
  }

  /**
   * Ottiene template per categoria
   */
  static getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
    return EMAIL_TEMPLATES.filter(t => t.category === category)
  }

  /**
   * Suggerisce il miglior template basato sull'analisi del lead
   */
  static suggestTemplate(analysis: any): EmailTemplate {
    // Priorità: Security > GDPR > Performance > SEO > Full Audit

    // Security issues
    if (analysis.security?.overallSecurityScore < 50 || !analysis.hasSSL) {
      return EMAIL_TEMPLATES.find(t => t.id === 'cold_security')!
    }

    // GDPR issues
    if (analysis.gdpr?.gdprScore < 50 || !analysis.gdpr?.hasCookieBanner) {
      return EMAIL_TEMPLATES.find(t => t.id === 'cold_gdpr')!
    }

    // Performance issues
    if (analysis.performance?.speedScore < 50) {
      return EMAIL_TEMPLATES.find(t => t.id === 'cold_performance')!
    }

    // SEO issues
    if (!analysis.seo?.hasTitle || !analysis.seo?.hasMetaDescription) {
      return EMAIL_TEMPLATES.find(t => t.id === 'cold_seo')!
    }

    // Default: Full Audit
    return EMAIL_TEMPLATES.find(t => t.id === 'cold_full_audit')!
  }

  /**
   * Compila un template con le variabili fornite
   */
  static compileTemplate(
    template: EmailTemplate,
    variables: TemplateVariables
  ): { subject: string; html: string; text: string } {
    let subject = template.subject
    let html = template.bodyHtml
    let text = template.bodyText

    // Sostituisci variabili standard
    const replacements: Record<string, string> = {
      '{business_name}': variables.business_name || '',
      '{website}': variables.website || '',
      '{city}': variables.city || '',
      '{score}': String(variables.score || ''),
      '{seo_score}': String(variables.seo_score || ''),
      '{performance_score}': String(variables.performance_score || ''),
      '{security_score}': String(variables.security_score || ''),
      '{main_issue}': variables.main_issue || '',
      '{issues_count}': String(variables.issues_count || ''),
      '{potential_improvement}': variables.potential_improvement || '',
      '{your_name}': variables.your_name || '',
      '{your_company}': variables.your_company || '',
      '{your_title}': variables.your_title || '',
      '{your_phone}': variables.your_phone || '',
      '{your_email}': variables.your_email || '',
      '{calendar_link}': variables.calendar_link || '',
    }

    // Testi condizionali
    const yourCompanyText = variables.your_company
      ? ` di <strong>${variables.your_company}</strong>`
      : ''
    const yourCompanyTextPlain = variables.your_company
      ? ` di ${variables.your_company}`
      : ''

    const calendarText = variables.calendar_link
      ? `<p>Potete prenotare direttamente uno slot nel mio calendario: <a href="${variables.calendar_link}">${variables.calendar_link}</a></p>`
      : ''
    const calendarTextPlain = variables.calendar_link
      ? `Potete prenotare direttamente: ${variables.calendar_link}`
      : ''

    let signatureDetails = ''
    let signatureDetailsPlain = ''
    if (variables.your_title || variables.your_company) {
      signatureDetails = '<br>'
      signatureDetailsPlain = '\n'
      if (variables.your_title) {
        signatureDetails += `${variables.your_title}`
        signatureDetailsPlain += variables.your_title
        if (variables.your_company) {
          signatureDetails += ` | ${variables.your_company}`
          signatureDetailsPlain += ` | ${variables.your_company}`
        }
      } else if (variables.your_company) {
        signatureDetails += variables.your_company
        signatureDetailsPlain += variables.your_company
      }
    }
    if (variables.your_phone) {
      signatureDetails += `<br>📞 ${variables.your_phone}`
      signatureDetailsPlain += `\n📞 ${variables.your_phone}`
    }
    if (variables.your_email) {
      signatureDetails += `<br>✉️ ${variables.your_email}`
      signatureDetailsPlain += `\n✉️ ${variables.your_email}`
    }

    // Applica sostituzioni
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g')
      subject = subject.replace(regex, value)
      html = html.replace(regex, value)
      text = text.replace(regex, value)
    })

    // Sostituisci testi condizionali
    html = html
      .replace(/{your_company_text}/g, yourCompanyText)
      .replace(/{calendar_text}/g, calendarText)
      .replace(/{signature_details}/g, signatureDetails)

    text = text
      .replace(/{your_company_text}/g, yourCompanyTextPlain)
      .replace(/{calendar_text}/g, calendarTextPlain)
      .replace(/{signature_details}/g, signatureDetailsPlain)

    // Pulisci spazi extra nel testo plain
    text = text.trim()

    return { subject, html, text }
  }

  /**
   * Genera variabili dal lead e dall'analisi
   */
  static generateVariablesFromLead(
    lead: any,
    analysis: any,
    userSettings: Partial<TemplateVariables>
  ): TemplateVariables {
    // Trova il problema principale
    let mainIssue = 'opportunità di miglioramento'
    let issuesCount = 0

    if (analysis?.issues) {
      const allIssues = [
        ...(analysis.issues.critical || []),
        ...(analysis.issues.high || []),
        ...(analysis.issues.medium || []),
      ]
      issuesCount = allIssues.length
      if (allIssues.length > 0) {
        mainIssue = allIssues[0]
      }
    }

    // Calcola miglioramento potenziale
    let potentialImprovement = 'miglioramento significativo'
    const overallScore = analysis?.overallScore || lead.score || 50
    if (overallScore < 30) {
      potentialImprovement = 'aumento del traffico del 50% o più'
    } else if (overallScore < 50) {
      potentialImprovement = 'aumento del traffico del 30-40%'
    } else if (overallScore < 70) {
      potentialImprovement = 'aumento del traffico del 15-25%'
    } else {
      potentialImprovement = 'ottimizzazione delle performance'
    }

    return {
      business_name: lead.business_name || 'la vostra azienda',
      website: lead.website_url || '',
      city: lead.city,
      score: overallScore,
      seo_score: analysis?.seo?.score || analysis?.overallScore,
      performance_score: analysis?.performance?.speedScore,
      security_score: analysis?.security?.overallSecurityScore,
      main_issue: mainIssue,
      issues_count: issuesCount,
      potential_improvement: potentialImprovement,
      your_name: userSettings.your_name || '',
      your_company: userSettings.your_company,
      your_title: userSettings.your_title,
      your_phone: userSettings.your_phone,
      your_email: userSettings.your_email,
      calendar_link: userSettings.calendar_link,
    }
  }
}

export default OutreachEmailGenerator
