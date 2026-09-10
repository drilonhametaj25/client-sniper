/**
 * Analisi avanzata — lancia il motore di TrovaMi su un sito a scelta.
 *
 * Percorso: apps/frontend-app/app/tools/manual-scan/page.tsx
 * Guida: apps/frontend-app/DESIGN.md
 * Raggiunta da: l'indice /tools (voce "Analisi avanzata") e il dropdown "Tools"
 * della Navbar. Richiede un account: senza sessione si viene mandati a /login.
 *
 * Qui cambia SOLO la presentazione: la sessione Supabase, la POST verso
 * /api/tools/manual-scan, il consumo dei crediti, i campi letti dalla risposta
 * e gli stati di errore sono quelli di prima. Il soggetto della pagina è il
 * rapporto dell'analisi; il form e il saldo crediti stanno sopra e si tolgono
 * di mezzo.
 *
 * Nota sul punteggio: qui alto = sito sano (è il punteggio dell'analizzatore,
 * che parte da 100 e sottrae le penalità). NON è l'opportunity score dei lead,
 * quindi lib/utils/opportunity.ts non si usa in questa pagina.
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import LinkButton from '@/components/ui/LinkButton'
import {
  ToolCheckList,
  ToolLoadingState,
  ToolPageHeader,
  ToolResultPanel,
  ToolScore,
  ToolSignupCta,
  ToolStatusMessage,
  ToolSummaryStats,
  ToolUrlForm,
  ToolsCrossLinks,
  type ToolCheckItem,
  type ToolStat,
  type ToolTone,
} from '@/components/tools'
import { formatCredits } from '@/lib/utils/credits-display'
import type {
  GDPRCompliance,
  LegalCompliance,
  PerformanceMetrics,
  SEOAnalysis,
  SocialPresence,
  TechnicalIssues,
  TrackingAnalysis,
  WebsiteAnalysis,
} from '@/lib/types/analysis'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface AnalysisResult {
  leadId: string | undefined
  analysis: WebsiteAnalysis
  creditsRemaining: number
  isSimplifiedAnalysis?: boolean
}

/* ---------------------------------------------------------------------------
 * Vocabolario: i problemi tecnici detti in italiano comprensibile.
 * Il gergo (H1, meta description, HSTS) resta nel dettaglio dei controlli.
 * ------------------------------------------------------------------------- */

const ISSUE_LABELS: Array<{ key: keyof TechnicalIssues; text: string }> = [
  { key: 'httpsIssues', text: 'Il sito non usa una connessione sicura: il browser lo segnala come "non sicuro" a chi lo visita.' },
  { key: 'slowLoading', text: 'Il sito impiega troppo tempo a caricarsi.' },
  { key: 'missingTitle', text: 'Manca il titolo della pagina, la riga che Google mostra nei risultati di ricerca.' },
  { key: 'shortTitle', text: 'Il titolo della pagina è troppo corto per dire di cosa si occupa l’attività.' },
  { key: 'missingMetaDescription', text: 'Manca la descrizione che compare sotto il titolo nei risultati di Google.' },
  { key: 'shortMetaDescription', text: 'La descrizione mostrata nei risultati di Google è troppo corta.' },
  { key: 'missingH1', text: 'La pagina non ha un titolo principale nel testo.' },
  { key: 'brokenImages', text: 'Alcune immagini non si caricano.' },
  { key: 'noTracking', text: 'Non c’è nessuno strumento di statistiche: chi gestisce il sito non sa quante visite riceve.' },
  { key: 'noCookieConsent', text: 'Manca la richiesta di consenso ai cookie.' },
  { key: 'missingPartitaIva', text: 'La partita IVA non è visibile sul sito, come invece richiede la legge.' },
  { key: 'noSocialPresence', text: 'Dal sito non si arriva a nessun profilo social.' },
]

type SocialKey = 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'twitter' | 'tiktok'

const SOCIAL_PLATFORMS: Array<{ key: SocialKey; label: string }> = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'tiktok', label: 'TikTok' },
]

const VAT_LOCATIONS: Record<NonNullable<LegalCompliance['partitaIvaLocation']>, string> = {
  footer: 'nel piè di pagina',
  header: 'nell’intestazione',
  contact: 'nella pagina contatti',
  privacy: 'nell’informativa privacy',
}

/* ---------------------------------------------------------------------------
 * Formattazione (solo presentazione)
 * ------------------------------------------------------------------------- */

/** Hostname leggibile: via protocollo, path e www. */
function readableHost(value?: string): string {
  if (!value) return ''
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

/** Millisecondi in secondi, con la virgola decimale italiana. */
function formatSeconds(ms?: number): string | undefined {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return undefined
  const seconds = (ms / 1000).toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${seconds} s`
}

function formatDate(value?: Date | string): string | undefined {
  if (!value) return undefined
  const date = new Date(value as string)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many.replace('{n}', String(count))
}

/**
 * Le soglie di questa pagina (80 / 60 / 40) sono quelle che c'erano prima:
 * qui restano solo la parola e la frase che le spiegano, senza helper di colori.
 */
function scoreVerdict(score: number): { word: string; tone: ToolTone; caption: string } {
  if (score >= 80) {
    return {
      word: 'Sito in ordine',
      tone: 'success',
      caption:
        'Il sito è tecnicamente a posto: c’è poco da sistemare, e quindi poco da proporre a chi lo gestisce.',
    }
  }
  if (score >= 60) {
    return {
      word: 'Qualche lacuna',
      tone: 'warning',
      caption:
        'Il sito funziona, ma ha dei punti scoperti: si può proporre un intervento mirato, non un rifacimento.',
    }
  }
  if (score >= 40) {
    return {
      word: 'Diverse lacune',
      tone: 'warning',
      caption:
        'Ci sono problemi concreti su più fronti: c’è spazio per una proposta di lavoro con un motivo preciso.',
    }
  }
  return {
    word: 'Molti problemi',
    tone: 'danger',
    caption:
      'Il sito ha problemi diffusi: è il tipo di situazione in cui un rifacimento si giustifica da solo.',
  }
}

/* ---------------------------------------------------------------------------
 * Il rapporto vero e proprio.
 * Legge gli stessi campi di prima; le sezioni compaiono solo se il campo
 * corrispondente è arrivato (i lead già in archivio possono avere un'analisi
 * salvata con una forma diversa).
 * ------------------------------------------------------------------------- */

function AnalysisReport({ analysis }: { analysis: WebsiteAnalysis }) {
  const score = analysis.overallScore || 0
  const verdict = scoreVerdict(score)

  const performance = analysis.performance as PerformanceMetrics | undefined
  const seo = analysis.seo as SEOAnalysis | undefined
  const tracking = analysis.tracking as TrackingAnalysis | undefined
  const gdpr = analysis.gdpr as GDPRCompliance | undefined
  const legal = analysis.legal as LegalCompliance | undefined
  const social = analysis.social as SocialPresence | undefined
  const issues = analysis.issues as Partial<TechnicalIssues> | undefined

  const problems = ISSUE_LABELS.filter(({ key }) => issues?.[key] === true)
  const loadSeconds = formatSeconds(performance?.loadTime)

  /* --- Riepilogo in cifre --- */
  const stats: ToolStat[] = []
  if (issues) {
    stats.push({
      label: 'Problemi rilevati',
      value: problems.length,
      tone: problems.length > 0 ? 'danger' : 'success',
    })
  }
  if (loadSeconds) {
    stats.push({ label: 'Caricamento', value: loadSeconds })
  }
  if (typeof performance?.totalImages === 'number') {
    stats.push({ label: 'Immagini', value: performance.totalImages })
  }
  if (typeof performance?.averageImageSize === 'number') {
    stats.push({ label: 'Peso medio immagine', value: `${Math.round(performance.averageImageSize)} KB` })
  }
  if (typeof performance?.networkRequests === 'number') {
    stats.push({ label: 'Richieste di rete', value: performance.networkRequests })
  }

  /* --- Stato e velocità --- */
  const statusChecks: ToolCheckItem[] = []
  if (typeof analysis.isAccessible === 'boolean') {
    statusChecks.push({
      id: 'reachable',
      name: 'Sito raggiungibile',
      status: analysis.isAccessible ? 'pass' : 'fail',
      statusLabel: analysis.isAccessible ? 'Raggiungibile' : 'Non raggiungibile',
      meta: typeof analysis.httpStatus === 'number' ? `Risposta HTTP ${analysis.httpStatus}` : undefined,
    })
  }
  if (typeof performance?.loadTime === 'number') {
    const slow = performance.loadTime >= 3000
    statusChecks.push({
      id: 'load-time',
      name: 'Tempo di caricamento',
      status: performance.loadTime < 2000 ? 'pass' : slow ? 'fail' : 'warning',
      statusLabel: performance.loadTime < 2000 ? 'Veloce' : slow ? 'Lento' : 'Nella media',
      value: loadSeconds,
      recommendation: slow
        ? 'Oltre i tre secondi buona parte dei visitatori chiude la pagina prima che finisca di caricare.'
        : undefined,
    })
  }
  if (typeof performance?.isResponsive === 'boolean') {
    statusChecks.push({
      id: 'responsive',
      name: 'Adattamento al telefono',
      status: performance.isResponsive ? 'pass' : 'fail',
      statusLabel: performance.isResponsive ? 'Si adatta' : 'Non si adatta',
      recommendation: performance.isResponsive
        ? undefined
        : 'Da telefono la pagina non si riadatta: testo minuscolo e scorrimento laterale.',
    })
  }
  if (typeof performance?.brokenImages === 'number') {
    const broken = performance.brokenImages
    statusChecks.push({
      id: 'broken-images',
      name: 'Immagini che non si caricano',
      status: broken === 0 ? 'pass' : 'fail',
      statusLabel: broken === 0 ? 'Nessuna' : plural(broken, '1 rotta', '{n} rotte'),
      value:
        typeof performance.totalImages === 'number'
          ? `${broken} su ${performance.totalImages} immagini della pagina`
          : undefined,
    })
  }

  /* --- Come si presenta su Google --- */
  const seoChecks: ToolCheckItem[] = []
  if (seo) {
    seoChecks.push({
      id: 'title',
      name: 'Titolo della pagina',
      status: seo.hasTitle ? 'pass' : 'fail',
      statusLabel: seo.hasTitle ? 'Presente' : 'Mancante',
      value: seo.hasTitle ? `${seo.titleLength} caratteri` : undefined,
      recommendation: seo.hasTitle
        ? undefined
        : 'È la riga che Google mostra come link nei risultati: senza, la pagina si presenta da sola.',
    })
    seoChecks.push({
      id: 'meta-description',
      name: 'Descrizione nei risultati di ricerca',
      meta: 'meta description',
      status: seo.hasMetaDescription ? 'pass' : 'fail',
      statusLabel: seo.hasMetaDescription ? 'Presente' : 'Mancante',
      value: seo.hasMetaDescription ? `${seo.metaDescriptionLength} caratteri` : undefined,
      recommendation: seo.hasMetaDescription
        ? undefined
        : 'Senza descrizione, Google inventa un estratto qualsiasi preso dalla pagina.',
    })
    seoChecks.push({
      id: 'h1',
      name: 'Titolo principale nel testo',
      meta: 'H1',
      status: seo.hasH1 ? 'pass' : 'fail',
      statusLabel: seo.hasH1 ? 'Presente' : 'Mancante',
      value: seo.hasH1 ? plural(seo.h1Count, '1 titolo trovato', '{n} titoli trovati') : undefined,
    })
    seoChecks.push({
      id: 'structured-data',
      name: 'Dati strutturati',
      status: seo.hasStructuredData ? 'pass' : 'warning',
      statusLabel: seo.hasStructuredData ? 'Presenti' : 'Assenti',
      recommendation: seo.hasStructuredData
        ? undefined
        : 'Servono a far comparire orari, indirizzo e recensioni direttamente nei risultati di Google.',
    })
  }

  /* --- Statistiche e tracciamento --- */
  const trackingChecks: ToolCheckItem[] = []
  if (tracking) {
    const detected = (installed: boolean, required: boolean): ToolCheckItem['status'] =>
      installed ? 'pass' : required ? 'fail' : 'warning'

    trackingChecks.push({
      id: 'google-analytics',
      name: 'Google Analytics',
      status: detected(tracking.hasGoogleAnalytics, true),
      statusLabel: tracking.hasGoogleAnalytics ? 'Installato' : 'Non rilevato',
    })
    trackingChecks.push({
      id: 'google-tag-manager',
      name: 'Google Tag Manager',
      status: detected(tracking.hasGoogleTagManager, true),
      statusLabel: tracking.hasGoogleTagManager ? 'Installato' : 'Non rilevato',
    })
    trackingChecks.push({
      id: 'meta-pixel',
      name: 'Meta Pixel',
      meta: 'Facebook e Instagram',
      status: detected(tracking.hasFacebookPixel, true),
      statusLabel: tracking.hasFacebookPixel ? 'Installato' : 'Non rilevato',
    })
    trackingChecks.push({
      id: 'hotjar',
      name: 'Hotjar',
      status: detected(tracking.hasHotjar, false),
      statusLabel: tracking.hasHotjar ? 'Installato' : 'Non rilevato',
    })
    trackingChecks.push({
      id: 'clarity',
      name: 'Microsoft Clarity',
      status: detected(tracking.hasClarityMicrosoft, false),
      statusLabel: tracking.hasClarityMicrosoft ? 'Installato' : 'Non rilevato',
    })

    if (tracking.customTracking && tracking.customTracking.length > 0) {
      trackingChecks.push({
        id: 'custom-tracking',
        name: 'Altri strumenti rilevati',
        status: 'pass',
        statusLabel: plural(tracking.customTracking.length, '1 trovato', '{n} trovati'),
        details: tracking.customTracking,
      })
    }
  }

  /* --- Cookie e privacy --- */
  const gdprChecks: ToolCheckItem[] = []
  if (gdpr) {
    const consentMethod =
      gdpr.cookieConsentMethod === 'banner'
        ? 'Raccolto con una fascia in fondo alla pagina'
        : gdpr.cookieConsentMethod === 'popup'
          ? 'Raccolto con una finestra sovrapposta'
          : undefined

    gdprChecks.push({
      id: 'cookie-consent',
      name: 'Consenso ai cookie',
      status: gdpr.hasCookieBanner ? 'pass' : 'fail',
      statusLabel: gdpr.hasCookieBanner ? 'Raccolto' : 'Non raccolto',
      value: consentMethod,
      recommendation: gdpr.hasCookieBanner
        ? undefined
        : 'Se il sito carica statistiche o contenuti esterni senza chiedere il consenso, è fuori norma.',
    })
    gdprChecks.push({
      id: 'privacy-policy',
      name: 'Informativa privacy',
      status: gdpr.hasPrivacyPolicy ? 'pass' : 'fail',
      statusLabel: gdpr.hasPrivacyPolicy ? 'Presente' : 'Assente',
      value: gdpr.privacyPolicyUrl,
      mono: Boolean(gdpr.privacyPolicyUrl),
    })
    gdprChecks.push({
      id: 'terms',
      name: 'Termini di servizio',
      status: gdpr.hasTermsOfService ? 'pass' : 'warning',
      statusLabel: gdpr.hasTermsOfService ? 'Presenti' : 'Assenti',
    })

    if (gdpr.riskyEmbeds && gdpr.riskyEmbeds.length > 0) {
      gdprChecks.push({
        id: 'risky-embeds',
        name: 'Contenuti esterni caricati senza consenso',
        status: 'warning',
        statusLabel: plural(gdpr.riskyEmbeds.length, '1 trovato', '{n} trovati'),
        details: gdpr.riskyEmbeds,
        recommendation:
          'Mappe e video incorporati che partono prima del consenso sono la violazione più comune.',
      })
    }
  }

  /* --- Dati dell'attività --- */
  const legalChecks: ToolCheckItem[] = []
  if (legal) {
    legalChecks.push({
      id: 'vat',
      name: 'Partita IVA visibile',
      status: legal.hasVisiblePartitaIva ? 'pass' : 'fail',
      statusLabel: legal.hasVisiblePartitaIva ? 'Visibile' : 'Non trovata',
      value:
        legal.hasVisiblePartitaIva && legal.partitaIvaLocation
          ? `Trovata ${VAT_LOCATIONS[legal.partitaIvaLocation]}`
          : undefined,
      recommendation: legal.hasVisiblePartitaIva
        ? undefined
        : 'Per un’attività italiana la partita IVA sul sito è un obbligo di legge.',
    })
    legalChecks.push({
      id: 'address',
      name: 'Indirizzo dell’attività',
      status: legal.hasBusinessAddress ? 'pass' : 'warning',
      statusLabel: legal.hasBusinessAddress ? 'Presente' : 'Non trovato',
    })
    legalChecks.push({
      id: 'contacts',
      name: 'Recapiti di contatto',
      status: legal.hasContactInfo ? 'pass' : 'fail',
      statusLabel: legal.hasContactInfo ? 'Presenti' : 'Mancanti',
      recommendation: legal.hasContactInfo
        ? undefined
        : 'Senza un recapito in chiaro, chi visita il sito non ha modo di scrivere o chiamare.',
    })

    if (typeof legal.complianceScore === 'number') {
      legalChecks.push({
        id: 'compliance',
        name: 'Completezza dei dati obbligatori',
        status:
          legal.complianceScore >= 70 ? 'pass' : legal.complianceScore >= 40 ? 'warning' : 'fail',
        value: `${legal.complianceScore} su 100`,
      })
    }
  }

  /* --- Social --- */
  const socialChecks: ToolCheckItem[] = []
  if (social) {
    const found = SOCIAL_PLATFORMS.filter(({ key }) => Boolean(social[key]))
    socialChecks.push({
      id: 'social',
      name: 'Profili social collegati dal sito',
      status: social.hasAnySocial ? 'pass' : 'warning',
      statusLabel: social.hasAnySocial
        ? plural(social.socialCount ?? found.length, '1 piattaforma', '{n} piattaforme')
        : 'Nessuno',
      details: found.map(({ label }) => label),
      recommendation: social.hasAnySocial
        ? undefined
        : 'Se l’attività ha una pagina Facebook o un profilo Instagram, dal sito non si riesce a raggiungerli.',
    })
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <ToolScore
        value={score}
        label="Punteggio tecnico"
        qualifier={verdict.word}
        tone={verdict.tone}
        caption={verdict.caption}
      />

      {stats.length > 0 && <ToolSummaryStats items={stats} />}

      {problems.length > 0 && (
        <section>
          <h3 className="text-heading font-semibold text-content">Cosa non va</h3>
          <p className="mt-2 max-w-2xl text-body text-content-muted">
            Detto senza gergo: sono i punti da cui puoi partire per una proposta.
          </p>
          <ul className="mt-4 space-y-2.5">
            {problems.map(({ key, text }) => (
              <li key={key} className="flex items-start gap-3 text-body text-content">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-content-subtle"
                  aria-hidden="true"
                />
                {text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {statusChecks.length > 0 && (
        <ToolCheckList
          title="Stato del sito"
          description="Se la pagina risponde, quanto ci mette e come si comporta da telefono."
          items={statusChecks}
        />
      )}

      {seoChecks.length > 0 && (
        <ToolCheckList
          title="Come si presenta su Google"
          description="Gli elementi che i motori di ricerca leggono per capire di cosa parla la pagina."
          items={seoChecks}
        />
      )}

      {trackingChecks.length > 0 && (
        <ToolCheckList
          title="Statistiche e tracciamento"
          description="Strumenti che dicono a chi gestisce il sito quante visite riceve e da dove arrivano."
          items={trackingChecks}
        />
      )}

      {gdprChecks.length > 0 && (
        <ToolCheckList
          title="Cookie e privacy"
          description="Gli obblighi che riguardano i dati di chi visita il sito."
          items={gdprChecks}
        />
      )}

      {legalChecks.length > 0 && (
        <ToolCheckList
          title="Dati dell’attività"
          description="Le informazioni che per legge devono essere raggiungibili dal sito."
          items={legalChecks}
        />
      )}

      {socialChecks.length > 0 && <ToolCheckList title="Presenza social" items={socialChecks} />}
    </div>
  )
}

/* ------------------------------------------------------------------------- */

export default function ManualScanPage() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [responseData, setResponseData] = useState<any>(null)
  const [error, setError] = useState('')
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const router = useRouter()

  // Carica crediti utente all'inizio
  useEffect(() => {
    loadUserCredits()
  }, [])

  async function loadUserCredits() {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Errore caricamento crediti:', error)
        return
      }

      setUserCredits(data.credits_remaining)
    } catch (error) {
      console.error('Errore caricamento crediti:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!url.trim()) {
      setError('Inserisci un URL valido')
      return
    }

    if (userCredits === null || userCredits < 1) {
      setError('Crediti insufficienti. Effettua l\'upgrade del piano per continuare.')
      return
    }

    setIsLoading(true)
    setError('')
    setResult(null)

    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/tools/manual-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'analisi')
      }

      // Salva i risultati dell'analisi
      setResponseData(data)
      setResult(data.data)
      setUserCredits(data.data.creditsRemaining)


    } catch (error) {
      console.error('Errore analisi:', error)
      setError(error instanceof Error ? error.message : 'Errore durante l\'analisi')
    } finally {
      setIsLoading(false)
    }
  }

  /* --- Presentazione --- */

  const hasNoCredits = userCredits !== null && userCredits < 1
  const analysis = result?.analysis
  const host = readableHost(analysis?.finalUrl || analysis?.url)
  const analysisDate = formatDate(analysis?.analysisDate)
  const isExistingLead = Boolean(responseData?.existingLead)
  const leadInfo = responseData?.leadInfo

  // La scheda del lead esiste solo se l'analisi è stata salvata: le analisi
  // semplificate ricevono un id temporaneo che non corrisponde a nessuna riga.
  const canOpenLead = Boolean(
    result?.leadId && !result.isSimplifiedAnalysis && !result.leadId.startsWith('temp-')
  )

  const creditsNote =
    userCredits === null
      ? 'Controllo del saldo crediti in corso.'
      : hasNoCredits
        ? 'Non hai crediti disponibili per una nuova analisi.'
        : userCredits === 1
          ? 'Ti resta 1 credito. Ogni analisi ne consuma 1.'
          : `Ti restano ${formatCredits(userCredits)} crediti. Ogni analisi ne consuma 1.`

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <ToolPageHeader
          title="Analisi avanzata di un sito"
          description="Lancia su un indirizzo a tua scelta lo stesso motore che analizza i lead di TrovaMi. Il rapporto resta nel tuo account."
          hideUsage
        >
          <ToolUrlForm
            value={url}
            onChange={setUrl}
            onSubmit={handleSubmit}
            loading={isLoading}
            disabled={hasNoCredits}
            inputType="url"
            required
            placeholder="https://esempio.it"
            submitLabel="Analizza il sito"
            hint="Controlliamo velocità, SEO, tracciamento, cookie e privacy, dati legali e profili social."
          />
          <p className="mt-3 text-caption text-content-subtle">{creditsNote}</p>
        </ToolPageHeader>

        {hasNoCredits && (
          <ToolStatusMessage
            tone="warning"
            className="mt-8"
            title="Servono crediti per lanciare un’analisi"
            action={
              <LinkButton href="/upgrade" variant="secondary">
                Vedi i piani
              </LinkButton>
            }
          >
            Ogni analisi avanzata consuma 1 credito. Puoi cambiare piano oppure acquistare un
            pacchetto di crediti.
          </ToolStatusMessage>
        )}

        {error && (
          <ToolStatusMessage tone="danger" className="mt-8">
            {error}
          </ToolStatusMessage>
        )}

        {isLoading && <ToolLoadingState className="mt-12 sm:mt-16" rows={6} />}

        {!isLoading && result && analysis && (
          <ToolResultPanel
            className="mt-12 sm:mt-16"
            title="Risultato dell’analisi"
            subject={host || undefined}
            meta={analysisDate ? `Analisi del ${analysisDate}` : undefined}
            actions={
              <>
                {canOpenLead && (
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/lead/${result.leadId}`)}
                  >
                    Apri la scheda del lead
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setResult(null)
                    setUrl('')
                    setError('')
                  }}
                >
                  Analizza un altro sito
                </Button>
              </>
            }
          >
            <div className="space-y-10 sm:space-y-12">
              {isExistingLead && (
                <ToolStatusMessage tone="accent" title="Questo dominio era già in archivio">
                  <p>
                    {responseData?.message ??
                      'Ti mostriamo l’analisi già salvata invece di rifarla da capo.'}
                  </p>
                  {leadInfo && (
                    <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                      {leadInfo.businessName && (
                        <div>
                          <dt className="text-micro text-content-subtle">Attività</dt>
                          <dd className="text-caption text-content">{leadInfo.businessName}</dd>
                        </div>
                      )}
                      {leadInfo.origin && (
                        <div>
                          <dt className="text-micro text-content-subtle">Da dove arriva</dt>
                          <dd className="text-caption text-content">
                            {leadInfo.origin === 'manual'
                              ? 'Analisi manuale di un utente'
                              : 'Ricerca automatica di TrovaMi'}
                          </dd>
                        </div>
                      )}
                      {formatDate(leadInfo.analyzedDate) && (
                        <div>
                          <dt className="text-micro text-content-subtle">Analizzato il</dt>
                          <dd className="text-caption text-content">
                            {formatDate(leadInfo.analyzedDate)}
                          </dd>
                        </div>
                      )}
                      {leadInfo.websiteUrl && (
                        <div className="min-w-0">
                          <dt className="text-micro text-content-subtle">Indirizzo salvato</dt>
                          <dd className="break-all text-caption text-content">
                            {leadInfo.websiteUrl}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                </ToolStatusMessage>
              )}

              {result.isSimplifiedAnalysis && (
                <ToolStatusMessage tone="warning" title="Analisi semplificata">
                  Il sito è stato letto senza aprirlo in un browser: velocità, immagini rotte e
                  adattamento al telefono possono essere imprecisi. Questo rapporto non viene
                  salvato nel tuo archivio.
                </ToolStatusMessage>
              )}

              <AnalysisReport analysis={analysis} />

              <div className="border-t border-edge pt-6 text-caption text-content-subtle">
                <p>
                  Crediti rimasti:{' '}
                  <span className="tabular-nums text-content">
                    {formatCredits(result.creditsRemaining)}
                  </span>
                </p>
                {!result.isSimplifiedAnalysis && !isExistingLead && (
                  <p className="mt-1">
                    Il sito è stato salvato come lead: lo trovi nel tuo archivio e diventa
                    visibile anche agli altri utenti di TrovaMi.
                  </p>
                )}
              </div>
            </div>
          </ToolResultPanel>
        )}

        {!isLoading && !result && (
          <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
            <h2 className="text-heading font-semibold text-content">
              Cosa succede quando lanci l&apos;analisi
            </h2>
            <ul className="mt-5 space-y-3">
              {[
                'Il motore apre il sito e controlla velocità, SEO, tracciamento, cookie e privacy, dati legali e profili social.',
                'Il rapporto viene salvato come lead: lo ritrovi nel tuo archivio e diventa visibile anche agli altri utenti di TrovaMi.',
                'Il credito viene scalato all’avvio, quindi anche se il sito risulta irraggiungibile.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-body text-content-muted">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-content-subtle"
                    aria-hidden="true"
                  />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        <ToolSignupCta
          className="mt-12 sm:mt-16"
          variant="secondary"
          title="Attività con questi problemi, senza cercarle a mano"
          description="Qui analizzi un sito alla volta, quello che scegli tu. Nella dashboard ci sono le attività italiane già analizzate da TrovaMi, filtrate per zona, categoria e tipo di problema."
          ctaLabel="Vai a trova clienti"
          ctaHref="/dashboard"
          note=""
        />

        <ToolsCrossLinks className="mt-12 sm:mt-16" currentSlug="manual-scan" />
      </div>
    </div>
  )
}
