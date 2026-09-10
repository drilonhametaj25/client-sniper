/**
 * Security Check — tool pubblico che analizza la sicurezza di un sito.
 *
 * Percorso: apps/frontend-app/app/tools/security-check/page.tsx
 * Guida: apps/frontend-app/DESIGN.md
 * Chiamata da: indice /tools, voce "Tools" della Navbar, ricerca organica.
 * API: GET/POST /api/tools/security-check (il limite giornaliero è per IP
 * per chi non ha un account, per piano per chi ce l'ha).
 *
 * Presentazione: primitive condivise di components/tools sopra i token del
 * design system. Il rapporto è il soggetto della pagina: il colore dice lo
 * stato di un controllo una volta sola, accanto a una parola, e il nome
 * tecnico dell'header HTTP resta come dettaglio sotto il nome in italiano.
 * La logica (chiamate, campi della risposta, rate limit, stati di errore)
 * è identica a prima: qui è cambiata solo la resa.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Cookie,
  Cpu,
  EyeOff,
  FileType,
  Frame,
  Info,
  KeyRound,
  Link2,
  Lock,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'
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
  type ToolTone,
  type ToolUsage,
} from '@/components/tools'

interface SecurityCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  recommendation?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface SecurityResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: SecurityCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    critical: number
  }
  analysisDate: string
  remaining: number
}

interface CheckMeta {
  /** Il nome del controllo in italiano: è quello che si legge per primo */
  label: string
  /** L'intestazione HTTP letta, se il controllo ne guarda una */
  header?: string
  icon: LucideIcon
}

/**
 * Come si chiama in italiano ogni controllo dell'API, con l'header HTTP
 * corrispondente (mostrato sotto, in piccolo) e un'icona di argomento.
 * La chiave è il campo `name` restituito dall'API: non va cambiata.
 */
const CHECK_META: Record<string, CheckMeta> = {
  HTTPS: {
    label: 'Connessione cifrata (HTTPS)',
    icon: Lock,
  },
  HSTS: {
    label: 'Obbligo di usare HTTPS',
    header: 'Strict-Transport-Security',
    icon: ShieldCheck,
  },
  'Content Security Policy': {
    label: 'Regole su cosa il sito può caricare',
    header: 'Content-Security-Policy',
    icon: Shield,
  },
  'X-Frame-Options': {
    label: 'Protezione dal clickjacking',
    header: 'X-Frame-Options',
    icon: Frame,
  },
  'X-Content-Type-Options': {
    label: 'Tipo dei file dichiarato dal server',
    header: 'X-Content-Type-Options',
    icon: FileType,
  },
  'X-XSS-Protection': {
    label: 'Filtro del browser contro gli script iniettati',
    header: 'X-XSS-Protection',
    icon: ShieldAlert,
  },
  'Referrer-Policy': {
    label: 'Dati inviati quando si esce dal sito',
    header: 'Referrer-Policy',
    icon: EyeOff,
  },
  'Permissions-Policy': {
    label: 'Permessi concessi al browser',
    header: 'Permissions-Policy',
    icon: KeyRound,
  },
  'Server Header': {
    label: 'Informazioni sul server',
    header: 'Server',
    icon: Server,
  },
  'X-Powered-By': {
    label: 'Tecnologia dichiarata dal server',
    header: 'X-Powered-By',
    icon: Cpu,
  },
  'Mixed Content': {
    label: 'Risorse caricate senza HTTPS',
    icon: Link2,
  },
  'Cookie Security': {
    label: 'Sicurezza dei cookie',
    icon: Cookie,
  },
}

/** Ordine dei controlli nell'anteprima: è lo stesso in cui l'API li restituisce. */
const CHECK_ORDER = Object.keys(CHECK_META)

/** Se un domani l'API aggiunge un controllo, si mostra col suo nome originale. */
const FALLBACK_CHECK_META: CheckMeta = { label: '', icon: Shield }

/** Quanto pesa un controllo non superato. Si mostra solo quando non lo è. */
const SEVERITY_LABEL: Record<SecurityCheck['severity'], string> = {
  critical: 'Impatto critico',
  high: 'Impatto alto',
  medium: 'Impatto medio',
  low: 'Impatto basso',
}

/**
 * Il voto in lettera dell'API ha soglie sue (90/75/60/40): la parola e la
 * tinta accanto al punteggio seguono quelle, non quelle di default.
 */
const GRADE_META: Record<string, { word: string; tone: ToolTone; caption: string }> = {
  A: {
    word: 'Buono',
    tone: 'success',
    caption:
      'Il sito ha attive tutte le protezioni principali. Restano al massimo dettagli da rifinire.',
  },
  B: {
    word: 'Buono',
    tone: 'success',
    caption:
      'Le basi ci sono. Qualche protezione consigliata manca, ma niente che esponga il sito a rischi seri.',
  },
  C: {
    word: 'Da migliorare',
    tone: 'warning',
    caption:
      'Diverse protezioni consigliate non sono attive: chi gestisce il sito ha del lavoro davanti.',
  },
  D: {
    word: 'Da migliorare',
    tone: 'warning',
    caption:
      'Mancano protezioni importanti e il sito resta più esposto del necessario a problemi già noti.',
  },
  F: {
    word: 'Critico',
    tone: 'danger',
    caption:
      'Il sito è servito quasi senza protezioni di base: è il primo intervento da mettere sul tavolo.',
  },
}

/** Solo per la resa: se l'indirizzo non è analizzabile si mostra com'è. */
function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return value
  }
}

/** Data dell'analisi in italiano; se la data non è leggibile non si mostra. */
function formatAnalysisDate(value: string): string | undefined {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  return `Analisi del ${date.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

export default function SecurityCheckPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SecurityResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<ToolUsage | null>(null)

  useEffect(() => {
    loadUsageInfo()
  }, [])

  const loadUsageInfo = async () => {
    try {
      const response = await fetch('/api/tools/security-check')
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
      const response = await fetch('/api/tools/security-check', {
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

  const checkItems: ToolCheckItem[] = (result?.checks ?? []).map((check, index) => {
    const meta = CHECK_META[check.name] ?? FALLBACK_CHECK_META
    const Icon = meta.icon
    const label = meta.label || check.name
    const header = meta.header

    const technicalValue = header
      ? check.value
        ? `${header}: ${check.value}`
        : header
      : check.value

    return {
      id: `${check.name}-${index}`,
      name: label,
      status: check.status,
      value: technicalValue,
      mono: Boolean(header),
      meta: check.status === 'pass' ? undefined : SEVERITY_LABEL[check.severity],
      recommendation: check.recommendation,
      icon: <Icon />,
    }
  })

  const gradeMeta = result ? GRADE_META[result.grade] ?? null : null

  const criticalNote =
    result && result.summary.critical > 0
      ? result.summary.critical === 1
        ? 'Un controllo critico non è superato: è la prima cosa da sistemare.'
        : `${result.summary.critical} controlli critici non sono superati: sono la prima cosa da sistemare.`
      : null

  const scoreCaption = [gradeMeta?.caption, criticalNote].filter(Boolean).join(' ')

  return (
    <div className="min-h-screen bg-surface">
      {/* pt generoso: la Navbar pubblica è fissa e non lascia spazio dietro di sé */}
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <ToolPageHeader
          eyebrow="Tool gratuito"
          title="Controlla la sicurezza di un sito"
          description="Vedi se il sito viaggia cifrato, quali protezioni ha attive e quali mancano. Ne esce un punteggio, un voto da A a F e l'elenco di cosa conviene sistemare per primo."
          usage={usage}
          fallbackLimit={2}
        >
          <ToolUrlForm
            value={url}
            onChange={setUrl}
            onSubmit={handleAnalyze}
            loading={loading}
            disabled={limitReached}
            hint="Puoi scrivere l'indirizzo anche senza https://"
          />
        </ToolPageHeader>

        {error && (
          <ToolStatusMessage className="mt-6" title="Analisi non riuscita">
            <p>{error}</p>
            <p className="mt-1 text-caption text-content-subtle">
              Controlla che l&apos;indirizzo sia scritto per intero e che il sito risponda da un
              browser.
            </p>
          </ToolStatusMessage>
        )}

        {limitReached && (
          <ToolStatusMessage
            tone="warning"
            className="mt-6"
            title="Hai finito le analisi gratuite di oggi"
            action={
              <LinkButton href="/pricing" variant="secondary">
                Vedi i piani
              </LinkButton>
            }
          >
            Il contatore riparte domani. Se ti serve analizzare più siti al giorno, i piani a
            pagamento alzano il limite.
          </ToolStatusMessage>
        )}

        {loading && <ToolLoadingState className="mt-12 sm:mt-16" rows={6} />}

        {!loading && result && (
          <ToolResultPanel
            className="mt-12 sm:mt-16"
            title="Rapporto sicurezza"
            subject={hostnameOf(result.finalUrl)}
            meta={formatAnalysisDate(result.analysisDate)}
          >
            <ToolScore
              value={result.score}
              label="Punteggio sicurezza"
              qualifier={gradeMeta?.word}
              tone={gradeMeta?.tone}
              grade={result.grade}
              gradeLabel="Voto"
              caption={scoreCaption || undefined}
            />

            {!result.isAccessible && (
              <p className="mt-6 flex items-start gap-2.5 rounded-card border border-edge bg-surface-subtle p-4 text-caption text-content-muted">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
                Il sito ha risposto con un errore. Le intestazioni sono state lette lo stesso, ma i
                controlli sul contenuto della pagina potrebbero essere parziali.
              </p>
            )}

            <ToolSummaryStats
              className="mt-8"
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
              className="mt-10"
              title="Dettaglio dei controlli"
              description="Sotto ogni controllo c'è il valore letto sul sito e, dove qualcosa non va, cosa fare per sistemarlo."
              items={checkItems}
            />
          </ToolResultPanel>
        )}

        {!loading && !result && (
          <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
            <h2 className="text-heading font-semibold text-content">Cosa controlla</h2>
            <p className="mt-2 max-w-2xl text-body text-content-muted">
              {CHECK_ORDER.length} verifiche sulla risposta del server e sulla pagina: le stesse
              cose che vede un browser quando apre il sito, senza fare login.
            </p>

            <ul className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {CHECK_ORDER.map((name) => {
                const meta = CHECK_META[name]
                const Icon = meta.icon

                return (
                  <li key={name} className="flex items-start gap-2.5">
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-body text-content">{meta.label}</span>
                      {meta.header && (
                        <span className="mt-0.5 block break-all font-mono text-micro text-content-subtle">
                          {meta.header}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <ToolSignupCta
          className="mt-12 sm:mt-16"
          title="Aziende con questi problemi, vicino a te"
          description="Questi controlli li puoi fare un sito alla volta. TrovaMi li passa sui siti delle attività italiane e ti mostra quelle che navigano senza HTTPS o senza protezioni, con nome, contatti e il dettaglio di cosa manca."
        />

        <ToolsCrossLinks className="mt-12 sm:mt-16" currentSlug="security-check" />

        <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
          <h2 className="text-heading font-semibold text-content">Resta aggiornato sui nuovi tool</h2>
          <p className="mt-2 max-w-2xl text-body text-content-muted">
            Ti scriviamo quando pubblichiamo un nuovo strumento gratuito. Nient&apos;altro.
          </p>
          <div className="mt-6 max-w-md">
            <NewsletterForm variant="inline" />
          </div>
        </section>
      </main>
    </div>
  )
}
