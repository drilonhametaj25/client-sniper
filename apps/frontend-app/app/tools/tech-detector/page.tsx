/**
 * Tech Detector — tool pubblico che elenca le tecnologie usate da un sito.
 *
 * Percorso: apps/frontend-app/app/tools/tech-detector/page.tsx
 * Guida: apps/frontend-app/DESIGN.md · Primitive: components/tools/ e components/ui/
 * Chiamata da: indice /tools, voce "Tools" della Navbar, ricerca organica.
 *
 * Presentazione sui token del design system. Il risultato è il soggetto della
 * pagina: le tecnologie sono raggruppate per categoria e dette come testo, non
 * come una fila di badge colorati, e l'invito a registrarsi arriva una volta
 * sola, dopo che l'utente ha visto l'esito.
 *
 * La logica è invariata: stessa chiamata a /api/tools/tech-detector, stessi
 * campi della risposta, stessa gestione del limite giornaliero e degli errori.
 * Header e footer per-pagina sono stati tolti: li copre la Navbar globale.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  Cloud,
  Code,
  Database,
  Layers,
  Palette,
  Puzzle,
  Server,
  Shield,
  ShoppingCart,
  Type,
  type LucideIcon,
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'
import {
  ToolLoadingState,
  ToolPageHeader,
  ToolResultPanel,
  ToolSignupCta,
  ToolStatusMessage,
  ToolSummaryStats,
  ToolUrlForm,
  ToolsCrossLinks,
  type ToolStat,
} from '@/components/tools'

interface TechStack {
  cms: string[]
  frameworks: string[]
  jsLibraries: string[]
  cssFrameworks: string[]
  analytics: string[]
  cdn: string[]
  server: string[]
  ecommerce: string[]
  fonts: string[]
  security: string[]
  other: string[]
}

interface DetectorResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  httpStatus: number
  techStack: TechStack
  totalTechnologies: number
  analysisDate: string
  remaining: number
}

interface UsageInfo {
  used: number
  limit: number
  remaining: number
  canAnalyze: boolean
}

/**
 * Nome, icona di argomento e qualche esempio per ogni categoria dell'API.
 * L'icona è un rinforzo quieto (16px, grigia): l'informazione è il nome.
 */
const CATEGORY_META: Record<
  keyof TechStack,
  { label: string; icon: LucideIcon; examples?: string }
> = {
  cms: {
    label: 'CMS',
    icon: Database,
    examples: 'WordPress, Shopify, Wix, Squarespace, Webflow, Joomla',
  },
  ecommerce: {
    label: 'E-commerce e pagamenti',
    icon: ShoppingCart,
    examples: 'WooCommerce, Shopify, BigCommerce, Stripe, PayPal',
  },
  frameworks: {
    label: 'Framework',
    icon: Code,
    examples: 'React, Next.js, Vue, Angular, Laravel, Django',
  },
  jsLibraries: {
    label: 'Librerie JavaScript',
    icon: Layers,
    examples: 'jQuery, GSAP, Chart.js, D3.js, Alpine.js',
  },
  cssFrameworks: {
    label: 'Framework CSS',
    icon: Palette,
    examples: 'Bootstrap, Tailwind CSS, Material UI, Bulma',
  },
  analytics: {
    label: 'Statistiche e tracciamento',
    icon: BarChart3,
    examples: 'Google Analytics, Tag Manager, Meta Pixel, Hotjar, Matomo',
  },
  cdn: {
    label: 'Rete di distribuzione (CDN)',
    icon: Cloud,
    examples: 'Cloudflare, CloudFront, Fastly, Vercel, Netlify',
  },
  server: {
    label: 'Server',
    icon: Server,
    examples: 'Apache, Nginx, IIS, PHP, Node.js',
  },
  security: {
    label: 'Protezione dei moduli',
    icon: Shield,
    examples: 'reCAPTCHA, hCaptcha, Cloudflare',
  },
  fonts: {
    label: 'Font',
    icon: Type,
    examples: 'Google Fonts, Adobe Fonts, Font Awesome',
  },
  other: {
    label: 'Altro',
    icon: Puzzle,
  },
}

/** Ordine di lettura: prima ciò che dice come si mette mano al sito. */
const CATEGORY_ORDER: Array<keyof TechStack> = [
  'cms',
  'ecommerce',
  'frameworks',
  'jsLibraries',
  'cssFrameworks',
  'analytics',
  'cdn',
  'server',
  'security',
  'fonts',
  'other',
]

/** Le categorie con un esempio da mostrare prima dell'analisi. */
const PREVIEW_CATEGORIES = CATEGORY_ORDER.filter((key) => Boolean(CATEGORY_META[key].examples))

/** "a, b e c" — per scrivere gli elenchi dentro una frase. */
function listToText(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

/**
 * Due righe in italiano su cosa dicono le tecnologie trovate. Sono derivate
 * dagli stessi campi che arrivano dall'API — nessuna chiamata in più — e
 * restano prudenti: il rilevamento legge tracce, non certificati.
 */
function readTechStack(tech: TechStack): string[] {
  const notes: string[] = []

  if (tech.cms.length > 0) {
    notes.push(
      `Il sito è costruito su ${listToText(tech.cms)}: chi ci mette mano lavora sul tema e sui plugin, senza rifarlo da capo.`
    )
  } else if (tech.frameworks.length > 0) {
    notes.push(
      `Non compare nessun CMS: il sito sembra sviluppato su misura con ${listToText(tech.frameworks)}, quindi ogni modifica passa da chi lo ha scritto.`
    )
  }

  if (tech.analytics.length === 0) {
    notes.push(
      'Nel codice della pagina non compare nessuno strumento di statistica: chi gestisce il sito probabilmente non sa quante persone lo visitano né da dove arrivano.'
    )
  }

  return notes
}

/** L'hostname del sito analizzato, con ripiego sull'indirizzo così com'è. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function formatAnalysisDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TechDetectorPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectorResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  useEffect(() => {
    loadUsageInfo()
  }, [])

  const loadUsageInfo = async () => {
    try {
      const response = await fetch('/api/tools/tech-detector')
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
      const response = await fetch('/api/tools/tech-detector', {
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

  const limitReached = usage !== null && !usage.canAnalyze

  // Solo le categorie con almeno una tecnologia, nell'ordine di lettura
  const detected = result
    ? CATEGORY_ORDER.map((key) => ({ key, techs: result.techStack?.[key] ?? [] })).filter(
        (entry) => entry.techs.length > 0
      )
    : []

  const notes = result && result.totalTechnologies > 0 ? readTechStack(result.techStack) : []

  const stats: ToolStat[] = result
    ? [
        { label: 'Tecnologie rilevate', value: result.totalTechnologies },
        { label: 'Categorie', value: detected.length },
        {
          label: 'Risposta del sito',
          value: `HTTP ${result.httpStatus}`,
          tone: result.isAccessible ? undefined : 'danger',
        },
      ]
    : []

  const analysisDate = result ? formatAnalysisDate(result.analysisDate) : ''

  return (
    <div className="min-h-screen bg-surface">
      {/* pt generoso: la Navbar pubblica è fissa e non lascia spazio dietro di sé */}
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <ToolPageHeader
          eyebrow="Tool gratuito"
          title="Scopri con cosa è costruito un sito"
          description="Incolla un indirizzo e vedi cosa c’è sotto: il sistema con cui è fatto il sito, le librerie che carica, gli strumenti di statistica e la rete che lo serve."
          usage={usage}
        >
          <ToolUrlForm
            value={url}
            onChange={setUrl}
            onSubmit={handleAnalyze}
            loading={loading}
            disabled={limitReached}
            hint="Puoi scrivere solo il dominio: al resto dell’indirizzo pensiamo noi."
          />
        </ToolPageHeader>

        {error && (
          <ToolStatusMessage tone="danger" title="Analisi non riuscita" className="mt-8">
            <p>{error}</p>
            <p className="mt-1">
              Controlla che l’indirizzo sia scritto per intero e che il sito si apra nel browser.
            </p>
          </ToolStatusMessage>
        )}

        {/* Un solo messaggio alla volta: se il server ha già risposto con un
            errore (anche quello di limite raggiunto), non ne impiliamo un altro. */}
        {limitReached && !error && (
          <ToolStatusMessage
            tone="warning"
            title="Hai usato tutte le analisi gratuite di oggi"
            className="mt-8"
          >
            Il contatore riparte domani. Se ti serve analizzare più siti nella stessa giornata, i
            piani a pagamento alzano il limite.
          </ToolStatusMessage>
        )}

        {loading && (
          <ToolLoadingState
            label="Analisi delle tecnologie in corso"
            showScore={false}
            rows={6}
            className="mt-12 sm:mt-16"
          />
        )}

        {!loading && result && (
          <ToolResultPanel
            title="Tecnologie rilevate"
            subject={hostnameOf(result.finalUrl)}
            meta={analysisDate ? `Analizzato il ${analysisDate}` : undefined}
            className="mt-12 sm:mt-16"
          >
            <ToolSummaryStats items={stats} />

            {!result.isAccessible && (
              <ToolStatusMessage
                tone="warning"
                title="Il sito ha risposto con un errore"
                className="mt-8"
              >
                La pagina ha restituito lo stato HTTP {result.httpStatus}. Quello che segue è stato
                letto in quella risposta, quindi potrebbe non corrispondere al sito vero.
              </ToolStatusMessage>
            )}

            {notes.length > 0 && (
              <div className="mt-6 space-y-2">
                {notes.map((note) => (
                  <p key={note} className="max-w-2xl text-body text-content-muted">
                    {note}
                  </p>
                ))}
              </div>
            )}

            {detected.length === 0 ? (
              <div className="mt-10 border-t border-edge pt-6">
                <p className="max-w-2xl text-body text-content">
                  Nessuna delle tecnologie che sappiamo riconoscere compare nel codice di questa
                  pagina.
                </p>
                <p className="mt-2 max-w-2xl text-body text-content-muted">
                  Succede con i siti scritti su misura, con quelli che caricano i contenuti dopo
                  l’apertura della pagina e quando davanti al sito c’è un servizio di protezione
                  che risponde al posto suo.
                </p>
              </div>
            ) : (
              <dl className="mt-10">
                {detected.map(({ key, techs }) => {
                  const Icon = CATEGORY_META[key].icon

                  return (
                    <div
                      key={key}
                      className="grid gap-1 border-t border-edge py-4 sm:grid-cols-[13rem_1fr] sm:gap-6"
                    >
                      <dt className="flex items-start gap-2 text-caption text-content-subtle sm:pt-0.5">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {CATEGORY_META[key].label}
                      </dt>
                      <dd className="min-w-0 text-body text-content">{techs.join(', ')}</dd>
                    </div>
                  )
                })}
              </dl>
            )}

            <p className="mt-8 max-w-2xl text-caption text-content-subtle">
              Il rilevamento si basa sulle tracce lasciate nel codice della pagina: qualcosa può
              sfuggire e qualcosa può comparire per somiglianza di nomi. Prendilo come
              un’indicazione, non come un elenco definitivo.
            </p>
          </ToolResultPanel>
        )}

        {/* Prima dell'analisi: la stessa forma del risultato, con degli esempi.
            Così l'utente sa già che aspetto avrà l'esito. */}
        {!loading && !result && (
          <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
            <h2 className="text-heading font-semibold text-content">
              Cosa cerchiamo nel codice della pagina
            </h2>
            <p className="mt-2 max-w-2xl text-body text-content-muted">
              Sempre le stesse categorie, per ogni sito analizzato. Nel risultato compaiono solo
              quelle in cui abbiamo trovato qualcosa.
            </p>

            <dl className="mt-6">
              {PREVIEW_CATEGORIES.map((key) => {
                const Icon = CATEGORY_META[key].icon

                return (
                  <div
                    key={key}
                    className="grid gap-1 border-t border-edge py-4 sm:grid-cols-[13rem_1fr] sm:gap-6"
                  >
                    <dt className="flex items-start gap-2 text-caption text-content-subtle sm:pt-0.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {CATEGORY_META[key].label}
                    </dt>
                    <dd className="min-w-0 text-body text-content-muted">
                      {CATEGORY_META[key].examples}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        )}

        <ToolSignupCta
          className="mt-12 sm:mt-16"
          title="Sapere com’è fatto un sito è metà del lavoro"
          description="L’altra metà è trovare i siti su cui vale la pena farsi avanti. TrovaMi passa i controlli tecnici sui siti delle attività italiane e ti mostra quelle che hanno problemi che sai già risolvere, con nome, contatti e il dettaglio di cosa non va."
        />

        <ToolsCrossLinks currentSlug="tech-detector" className="mt-12 sm:mt-16" />

        <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
          <h2 className="text-heading font-semibold text-content">
            Una mail al mese, quando c’è qualcosa da dire
          </h2>
          <p className="mt-2 max-w-2xl text-body text-content-muted">
            Ti avvisiamo quando esce un tool nuovo o cambia qualcosa che vale la pena sapere.
            Niente altro.
          </p>
          <div className="mt-6 max-w-md">
            <NewsletterForm variant="inline" placeholder="La tua email" buttonText="Iscriviti" />
          </div>
        </section>
      </div>
    </div>
  )
}
