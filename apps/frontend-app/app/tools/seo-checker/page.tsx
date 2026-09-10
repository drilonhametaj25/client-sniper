/**
 * SEO Checker — pagina pubblica del tool di analisi SEO on-page.
 *
 * Percorso: apps/frontend-app/app/tools/seo-checker/page.tsx
 * Guida: apps/frontend-app/DESIGN.md
 * Chiamata da: l'indice /tools, la voce "Tools" della Navbar e la ricerca
 * organica (i metadati stanno in layout.tsx, che non si tocca).
 *
 * Presentazione sui token del design system e sulle primitive condivise di
 * components/tools: il risultato dell'analisi è il soggetto della pagina, i
 * nomi dei controlli sono detti in italiano e il gergo ("tag title",
 * "og:image") resta nella riga di consiglio che arriva dall'API.
 * L'invito a registrarsi compare una volta sola, in fondo, dopo il risultato.
 *
 * La logica è invariata: stesse chiamate a /api/tools/seo-checker (GET per il
 * contatore, POST per l'analisi), stessi campi, stessa gestione del limite
 * giornaliero per indirizzo IP.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  AlignLeft,
  FileText,
  Heading1,
  Image as ImageIcon,
  Languages,
  Link2,
  ListTree,
  Lock,
  Network,
  Share2,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import LinkButton from '@/components/ui/LinkButton'
import NewsletterForm from '@/components/NewsletterForm'
import {
  ToolPageHeader,
  ToolUrlForm,
  ToolStatusMessage,
  ToolLoadingState,
  ToolResultPanel,
  ToolScore,
  ToolSummaryStats,
  ToolCheckList,
  ToolSignupCta,
  ToolsCrossLinks,
  getTool,
  type ToolCheckItem,
  type ToolUsage,
} from '@/components/tools'

interface SEOCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  recommendation?: string
  importance: 'critical' | 'important' | 'optional'
}

interface SEOResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  checks: SEOCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    critical: number
  }
  analysisDate: string
  remaining: number
}

/**
 * I controlli che l'API restituisce, detti in italiano.
 * La chiave è il nome tecnico che arriva dall'API: se un giorno ne aggiunge
 * uno nuovo, la riga mostra comunque il nome originale senza rompersi.
 */
const CHECK_META: Record<string, { label: string; icon: LucideIcon; about: string }> = {
  'Title Tag': {
    label: 'Titolo della pagina',
    icon: FileText,
    about: 'Il titolo che si legge come link azzurro nei risultati di Google.',
  },
  'Meta Description': {
    label: 'Descrizione nei risultati',
    icon: AlignLeft,
    about: 'Le due righe di testo sotto il titolo: decidono se la gente clicca.',
  },
  'H1 Tag': {
    label: 'Titolo principale',
    icon: Heading1,
    about: 'Il titolo in cima al contenuto. Dovrebbe essercene uno solo.',
  },
  'Viewport Meta': {
    label: 'Adattamento al telefono',
    icon: Smartphone,
    about: 'Senza questa riga il sito si vede rimpicciolito sugli schermi piccoli.',
  },
  'Lang Attribute': {
    label: 'Lingua dichiarata',
    icon: Languages,
    about: 'Dice ai motori di ricerca e agli screen reader in che lingua è scritta la pagina.',
  },
  'Canonical URL': {
    label: 'Indirizzo ufficiale della pagina',
    icon: Link2,
    about: 'Evita che lo stesso contenuto venga contato più volte a indirizzi diversi.',
  },
  'Open Graph Tags': {
    label: 'Anteprima quando il link viene condiviso',
    icon: Share2,
    about: 'Titolo, testo e immagine che appaiono su WhatsApp, Facebook e LinkedIn.',
  },
  'Alt Text Immagini': {
    label: 'Testo alternativo delle immagini',
    icon: ImageIcon,
    about: 'Descrive le immagini a chi non le vede e ai motori di ricerca.',
  },
  'Link Interni': {
    label: 'Collegamenti fra le pagine',
    icon: Network,
    about: 'Aiutano chi visita il sito e chi lo scansiona a trovare il resto dei contenuti.',
  },
  'Struttura Heading': {
    label: 'Struttura dei sottotitoli',
    icon: ListTree,
    about: 'Sottotitoli che spezzano il testo e fanno capire come è organizzato il contenuto.',
  },
  HTTPS: {
    label: 'Connessione sicura',
    icon: Lock,
    about: 'Il lucchetto del browser: senza, il visitatore vede un avviso.',
  },
}

const CHECK_ENTRIES = Object.entries(CHECK_META)

const IMPORTANCE_LABEL: Record<SEOCheck['importance'], string> = {
  critical: 'Critico',
  important: 'Importante',
  optional: 'Opzionale',
}

/** Ordine di lettura: prima quello che non va, e a parità quello che pesa di più. */
const STATUS_ORDER: Record<SEOCheck['status'], number> = { fail: 0, warning: 1, pass: 2 }
const IMPORTANCE_ORDER: Record<SEOCheck['importance'], number> = {
  critical: 0,
  important: 1,
  optional: 2,
}

function byUrgency(a: SEOCheck, b: SEOCheck): number {
  const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  if (byStatus !== 0) return byStatus
  return IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance]
}

/** L'hostname del sito analizzato, senza far esplodere la pagina su un URL storto. */
function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return value
  }
}

function formatAnalysisDate(iso: string): string | undefined {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined

  const day = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return `Analisi del ${day} alle ${time}`
}

/** Cosa vuol dire quel numero, detto in una riga e ricavato dai controlli veri. */
function scoreCaption(result: SEOResult): string {
  const { failed, warnings, critical } = result.summary

  if (failed === 0 && warnings === 0) {
    return 'Tutti i controlli sono superati: gli elementi che Google legge per capire di cosa parla la pagina sono al loro posto.'
  }

  if (critical === 1) {
    return 'Un controllo critico non è superato: è tra gli elementi che pesano di più su come la pagina viene letta dai motori di ricerca.'
  }

  if (critical > 1) {
    return `${critical} controlli critici non sono superati: sono gli elementi che pesano di più su come la pagina viene letta dai motori di ricerca.`
  }

  if (failed > 0) {
    return 'Gli elementi critici sono a posto, ma qualche controllo non è superato: sono correzioni brevi, quasi tutte nel codice della pagina.'
  }

  return 'Gli elementi principali ci sono, ma alcuni vanno rivisti: bastano piccoli aggiustamenti per metterli in ordine.'
}

/** Da controllo dell'API a riga della lista: il nome diventa italiano, l'importanza un metadato quieto. */
function toCheckItem(check: SEOCheck, index: number, showImportance: boolean): ToolCheckItem {
  const meta = CHECK_META[check.name]
  const Icon = meta?.icon

  return {
    id: `${check.name}-${index}`,
    name: meta?.label ?? check.name,
    status: check.status,
    value: check.value,
    recommendation: check.recommendation,
    meta: showImportance ? IMPORTANCE_LABEL[check.importance] : undefined,
    icon: Icon ? <Icon /> : undefined,
  }
}

export default function SEOCheckerPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SEOResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<ToolUsage | null>(null)

  useEffect(() => {
    loadUsageInfo()
  }, [])

  const loadUsageInfo = async () => {
    try {
      const response = await fetch('/api/tools/seo-checker')
      const data = await response.json()
      setUsage(data)
    } catch (error) {
      console.error('Errore caricamento info utilizzo:', error)
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      setError('Inserisci un URL valido')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/tools/seo-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Errore durante l\'analisi')
        if (data.remaining !== undefined) {
          setUsage(prev => prev ? { ...prev, remaining: data.remaining, canAnalyze: data.remaining > 0 } : null)
        }
        return
      }

      setResult(data.result)
      setUsage(prev => prev ? { ...prev, remaining: data.remaining, canAnalyze: data.remaining > 0 } : null)

    } catch (err) {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const tool = getTool('seo-checker')
  const limitReached = usage !== null && !usage.canAnalyze

  const toFix = result ? result.checks.filter((check) => check.status !== 'pass').sort(byUrgency) : []
  const passed = result ? result.checks.filter((check) => check.status === 'pass') : []

  return (
    <div className="min-h-screen bg-surface">
      {/* pt generoso: la Navbar pubblica è fissa e non lascia spazio dietro di sé */}
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <ToolPageHeader
          eyebrow="Tool gratuito"
          title={tool?.name ?? 'SEO Checker'}
          description={
            tool?.tagline ??
            'Verifica se il sito ha in ordine gli elementi che Google legge per capire di cosa parla una pagina.'
          }
          usage={usage}
          /* 2, non 3: e' il limite anonimo vero (ANONYMOUS_LIMIT in lib/utils/tools-rate-limit.ts).
             Vale solo finche' la GET non risponde: dopo comanda usage.limit. */
          fallbackLimit={2}
        >
          <ToolUrlForm
            value={url}
            onChange={setUrl}
            onSubmit={handleAnalyze}
            loading={loading}
            disabled={limitReached}
            placeholder="esempio.it"
            submitLabel="Analizza"
            hint="Basta il dominio: se manca, https:// viene aggiunto da noi."
          />
        </ToolPageHeader>

        {/* Un messaggio alla volta: se il limite è finito, quello dice già tutto e porta altrove */}
        {limitReached ? (
          <ToolStatusMessage
            tone="warning"
            title="Hai finito le analisi gratuite di oggi"
            className="mt-6"
            action={
              <LinkButton href="/register" variant="secondary">
                Crea un account gratuito
              </LinkButton>
            }
          >
            Il contatore riparte domani. Con un account gratuito ricevi anche un credito per
            vedere un&apos;attività trovata da TrovaMi, con i contatti e i problemi del suo sito.
          </ToolStatusMessage>
        ) : error ? (
          /* Il messaggio arriva dall'API ed e' gia' specifico ("Impossibile raggiungere il
             sito...", "Il sito ha impiegato troppo tempo..."): sta come riga forte, non
             annegato in una spiegazione generica. */
          <ToolStatusMessage tone="danger" title={error} className="mt-6" />
        ) : null}

        {loading && <ToolLoadingState className="mt-12 sm:mt-16" rows={6} label="Analisi SEO in corso" />}

        {!loading && result && (
          <ToolResultPanel
            title="Risultato dell'analisi"
            subject={hostnameOf(result.finalUrl)}
            meta={formatAnalysisDate(result.analysisDate)}
            className="mt-12 sm:mt-16"
          >
            {!result.isAccessible && (
              <ToolStatusMessage tone="warning" className="mb-8">
                Il server ha risposto con un errore. I controlli sono stati fatti sulla pagina
                ricevuta, che potrebbe non essere quella vera.
              </ToolStatusMessage>
            )}

            <ToolScore
              value={result.score}
              label="Punteggio SEO"
              caption={scoreCaption(result)}
            />

            <ToolSummaryStats
              className="mt-10"
              items={[
                { label: 'Superati', value: result.summary.passed },
                { label: 'Da controllare', value: result.summary.warnings },
                {
                  label: 'Non superati',
                  value: result.summary.failed,
                  tone: result.summary.failed > 0 ? 'danger' : undefined,
                },
                { label: 'Controlli totali', value: result.checks.length },
              ]}
            />

            <ToolCheckList
              className="mt-12"
              title="Da sistemare"
              description={
                toFix.length > 0
                  ? 'In ordine di urgenza: prima quello che non passa, poi quello che pesa di più.'
                  : undefined
              }
              emptyMessage="Nessun controllo da sistemare su questa pagina."
              items={toFix.map((check, index) => toCheckItem(check, index, true))}
            />

            <ToolCheckList
              className="mt-12"
              title="Già a posto"
              emptyMessage="Nessun controllo superato su questa pagina."
              items={passed.map((check, index) => toCheckItem(check, index, false))}
            />
          </ToolResultPanel>
        )}

        {!loading && !result && (
          <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
            <h2 className="text-heading font-semibold text-content">Cosa controlla</h2>
            <p className="mt-2 max-w-2xl text-body text-content-muted">
              {CHECK_ENTRIES.length} controlli sulla pagina che indichi, spiegati uno per uno. Sono
              gli stessi che TrovaMi passa sui siti delle attività italiane.
            </p>

            <dl className="mt-6 grid gap-x-10 sm:grid-cols-2">
              {CHECK_ENTRIES.map(([name, meta]) => {
                const Icon = meta.icon

                return (
                  <div key={name} className="border-t border-edge py-4">
                    <dt className="flex items-start gap-2 text-body font-medium text-content">
                      <Icon className="mt-1 h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
                      {meta.label}
                    </dt>
                    <dd className="mt-1 text-caption text-content-muted">{meta.about}</dd>
                  </div>
                )
              })}
            </dl>
          </section>
        )}

        <ToolSignupCta
          className="mt-12 sm:mt-16"
          title="Aziende con questi problemi, vicino a te"
          description="Qui analizzi un sito alla volta, quello che scegli tu. TrovaMi passa gli stessi controlli sui siti delle attività italiane e ti mostra quelle a cui manca il titolo, la descrizione o l'HTTPS, con nome, contatti e il dettaglio di cosa non va."
        />

        <ToolsCrossLinks currentSlug="seo-checker" className="mt-12 sm:mt-16" />

        <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
          <h2 className="text-heading font-semibold text-content">Nuovi tool, quando escono</h2>
          <p className="mt-2 max-w-2xl text-body text-content-muted">
            Ti scriviamo solo quando aggiungiamo uno strumento gratuito nuovo.
          </p>
          <div className="mt-6 max-w-md">
            <NewsletterForm variant="inline" placeholder="La tua email" buttonText="Iscriviti" />
          </div>
        </section>
      </main>
    </div>
  )
}
