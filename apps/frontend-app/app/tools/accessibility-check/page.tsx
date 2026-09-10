/**
 * Accessibility Audit — tool pubblico che verifica un sito rispetto alle WCAG 2.1 A/AA.
 *
 * Percorso: apps/frontend-app/app/tools/accessibility-check/page.tsx
 * Guida: apps/frontend-app/DESIGN.md · Primitive: components/tools/ e components/ui/
 * Chiamata da: /tools (indice), voce "Tools" della Navbar, ricerca organica.
 * API: GET/POST /api/tools/accessibility-check (limite giornaliero per indirizzo IP).
 *
 * Presentazione sui token del design system: il risultato dell’analisi è il
 * soggetto della pagina, i controlli non superati vengono prima di quelli
 * superati, e l’invito a registrarsi compare una volta sola, in fondo.
 * Header e footer sono quelli globali: qui non se ne disegnano altri.
 * La logica (fetch, campi della risposta, rate limit) è invariata: qui cambia
 * solo come le stesse cose vengono mostrate.
 */

'use client'

import { useState, useEffect } from 'react'
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
  toolScoreVerdict,
  getTool,
  type ToolCheckItem,
  type ToolTone,
} from '@/components/tools'

interface AccessibilityCheck {
  name: string
  status: 'pass' | 'warning' | 'fail'
  value?: string
  details?: string[]
  recommendation?: string
  wcagLevel: 'A' | 'AA' | 'AAA'
  wcagCriteria?: string
}

interface AccessibilityResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: AccessibilityCheck[]
  summary: {
    passed: number
    warnings: number
    failed: number
    levelA: { passed: number; failed: number }
    levelAA: { passed: number; failed: number }
  }
  analysisDate: string
  remaining: number
}

interface UsageInfo {
  used: number
  limit: number
  remaining: number
  canAnalyze: boolean
}

const TOOL = getTool('accessibility-check')

/**
 * I nomi che arrivano dall’API sono tecnici ("Alt Text Immagini", "ARIA
 * Landmarks"): qui vengono detti in italiano, mentre il criterio WCAG resta
 * accanto come metadato. È una mappa di sola presentazione, con il nome
 * originale come fallback: se l’API aggiunge un controllo, si legge com’è.
 */
const CHECK_LABELS: Record<string, string> = {
  'Attributo Lingua': 'Lingua della pagina',
  'Alt Text Immagini': 'Testo alternativo delle immagini',
  'Struttura Heading': 'Struttura dei titoli',
  'Label Form': 'Etichette dei campi',
  'Testo Link': 'Testo dei link',
  'Skip Link': 'Link «salta al contenuto»',
  'ARIA Landmarks': 'Punti di riferimento della pagina',
  'Meta Viewport': 'Zoom sui dispositivi mobili',
  'Focus Visibile': 'Focus visibile',
  'Tabelle Accessibili': 'Intestazioni delle tabelle',
  'Semantica Interattiva': 'Uso di link e bottoni',
  'Titolo Pagina': 'Titolo della pagina',
}

/** Le soglie di questo tool sono quelle del voto A-F, non quelle di default. */
const GRADE_VERDICT: Record<AccessibilityResult['grade'], { word: string; tone: ToolTone }> = {
  A: { word: 'Buono', tone: 'success' },
  B: { word: 'Discreto', tone: 'warning' },
  C: { word: 'Da migliorare', tone: 'warning' },
  D: { word: 'Insufficiente', tone: 'danger' },
  F: { word: 'Critico', tone: 'danger' },
}

/** Cosa guarda l’analisi, detto prima che l’utente la lanci. */
const CHECK_AREAS = [
  'Lingua dichiarata e titolo della pagina',
  'Testo alternativo delle immagini',
  'Struttura dei titoli, dall’H1 in giù',
  'Etichette dei campi dei moduli',
  'Testo dei link, che deve dire dove portano',
  'Punti di riferimento: main, nav, header, footer',
  'Link «salta al contenuto» e focus visibile',
  'Zoom non bloccato sui dispositivi mobili',
  'Intestazioni delle tabelle',
  'Uso corretto di link e bottoni',
]

/** Il limite dichiarato: quello che l’analisi automatica non può vedere. */
const SCOPE_NOTE =
  'L’analisi legge l’HTML della pagina di partenza. Non misura il contrasto dei colori, non prova la navigazione da tastiera e non usa uno screen reader: per dire che un sito è conforme serve anche una verifica manuale.'

function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return value
  }
}

function formatAnalysisDate(value: string): string | undefined {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  const day = date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return `Analisi del ${day} alle ${time}`
}

function toCheckItem(check: AccessibilityCheck, index: number, prefix: string): ToolCheckItem {
  return {
    id: `${prefix}-${index}`,
    name: CHECK_LABELS[check.name] ?? check.name,
    status: check.status,
    value: check.value,
    details: check.details,
    recommendation: check.recommendation,
    meta: check.wcagCriteria
      ? `WCAG ${check.wcagLevel} · ${check.wcagCriteria}`
      : `WCAG ${check.wcagLevel}`,
  }
}

function scoreCaption(result: AccessibilityResult): string {
  const issues = result.summary.failed + result.summary.warnings
  const total = result.checks.length

  if (issues === 0) {
    return `Il sito supera tutti i ${total} controlli automatici che si possono fare leggendo l’HTML della pagina.`
  }

  if (issues === 1) {
    return `Un controllo su ${total} segnala un problema che chi naviga da tastiera o con uno screen reader incontra davvero.`
  }

  return `${issues} controlli su ${total} segnalano problemi che chi naviga da tastiera o con uno screen reader incontra davvero.`
}

export default function AccessibilityCheckPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AccessibilityResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  useEffect(() => {
    fetch('/api/tools/accessibility-check')
      .then(res => res.json())
      .then(data => setUsage(data))
      .catch(() => {})
  }, [])

  const handleAnalyze = async () => {
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/tools/accessibility-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Errore durante l\'analisi')
        return
      }

      setResult(data.result)
      if (usage) {
        setUsage({
          ...usage,
          remaining: data.remaining,
          used: usage.limit - data.remaining,
          canAnalyze: data.remaining > 0
        })
      }
    } catch (err) {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const limitReached = usage !== null && !usage.canAnalyze

  const verdict = result
    ? GRADE_VERDICT[result.grade] ?? toolScoreVerdict(result.score)
    : null

  const problemChecks = result
    ? [
        ...result.checks.filter(check => check.status === 'fail'),
        ...result.checks.filter(check => check.status === 'warning'),
      ]
    : []
  const passedChecks = result ? result.checks.filter(check => check.status === 'pass') : []

  return (
    <div className="min-h-screen bg-surface">
      {/*
        Niente <main> qui: il landmark lo mette già app/layout.tsx e annidarne
        un secondo è un errore proprio del tipo che questo tool segnala.
        Il pt generoso serve perché la Navbar pubblica è fissa.
      */}
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <ToolPageHeader
          eyebrow="Tool gratuito"
          title={TOOL?.name ?? 'Accessibility Audit'}
          description={
            TOOL?.tagline ??
            'Verifica se il sito è usabile anche da chi naviga con la tastiera o con uno screen reader, come chiedono le WCAG 2.1.'
          }
          usage={usage}
        >
          <ToolUrlForm
            value={url}
            onChange={setUrl}
            onSubmit={() => handleAnalyze()}
            loading={loading}
            disabled={limitReached}
            inputType="url"
            placeholder="https://esempio.it"
            hint="Scrivi l’indirizzo per intero, compreso https://"
          />
        </ToolPageHeader>

        {error && (
          <ToolStatusMessage
            tone="danger"
            title="Non è stato possibile analizzare il sito"
            className="mt-8"
          >
            <p>{error}</p>
            <p className="mt-2 text-caption text-content-subtle">
              Controlla che l’indirizzo sia completo e che il sito si apra in un browser. Se il
              sito è protetto da un firewall o da una schermata anti-bot, l’analisi non riesce a
              leggerlo.
            </p>
          </ToolStatusMessage>
        )}

        {limitReached && !error && (
          <ToolStatusMessage
            tone="warning"
            title="Hai usato le analisi gratuite di oggi"
            className="mt-8"
          >
            Il conteggio è per indirizzo IP e riparte domani.
          </ToolStatusMessage>
        )}

        {loading && <ToolLoadingState className="mt-12 sm:mt-16" rows={6} />}

        {result && !loading && verdict && (
          <ToolResultPanel
            title="Risultato dell’analisi"
            subject={hostnameOf(result.finalUrl || result.url)}
            meta={formatAnalysisDate(result.analysisDate)}
            className="mt-12 sm:mt-16"
          >
            <ToolScore
              value={result.score}
              label="Punteggio accessibilità"
              qualifier={verdict.word}
              tone={verdict.tone}
              grade={result.grade}
              gradeLabel="Voto"
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

            {result.summary.failed > 0 && (
              <p className="mt-4 max-w-2xl text-caption text-content-subtle">
                Non superati: {result.summary.levelA.failed} di livello A e{' '}
                {result.summary.levelAA.failed} di livello AA. Il livello A è il minimo, il
                livello AA è quello richiesto dalla normativa europea.
              </p>
            )}

            <ToolCheckList
              className="mt-12"
              title={problemChecks.length > 0 ? 'Da sistemare' : 'Niente da sistemare'}
              description={
                problemChecks.length > 0
                  ? 'Prima i criteri non superati, poi quelli da controllare a mano.'
                  : undefined
              }
              items={problemChecks.map((check, index) => toCheckItem(check, index, 'problema'))}
              emptyMessage="Nessun criterio risulta non superato. Restano da verificare a mano le cose che il codice non dice."
            />

            {passedChecks.length > 0 && (
              <ToolCheckList
                className="mt-12"
                title="Controlli superati"
                items={passedChecks.map((check, index) => toCheckItem(check, index, 'superato'))}
              />
            )}

            <p className="mt-10 max-w-2xl text-caption text-content-subtle">{SCOPE_NOTE}</p>
          </ToolResultPanel>
        )}

        {!result && !loading && (
          <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
            <h2 className="text-heading font-semibold text-content">Cosa guarda l’analisi</h2>
            <ul className="mt-6 grid max-w-3xl gap-x-10 gap-y-3 sm:grid-cols-2">
              {CHECK_AREAS.map(area => (
                <li key={area} className="flex items-start gap-2 text-body text-content-muted">
                  <span
                    className="mt-2.5 h-1 w-1 shrink-0 rounded-pill bg-content-subtle"
                    aria-hidden="true"
                  />
                  {area}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-2xl text-caption text-content-subtle">{SCOPE_NOTE}</p>
          </section>
        )}

        <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
          <h2 className="text-heading font-semibold text-content">
            Perché l’accessibilità conta
          </h2>
          <p className="mt-2 max-w-2xl text-body text-content-muted">
            Un sito accessibile resta usabile per chi naviga solo con la tastiera, per chi usa uno
            screen reader e per chi ingrandisce i caratteri. In Italia la Legge Stanca lo impone
            alla pubblica amministrazione e alle imprese sopra una certa dimensione, e dal 28
            giugno 2025 l’European Accessibility Act lo richiede a molti servizi venduti online ai
            consumatori.
          </p>
          <ul className="mt-4 max-w-2xl space-y-2">
            {[
              'Le persone che oggi non riescono a usare il sito possono farlo',
              'I motori di ricerca leggono meglio le pagine ben strutturate',
              'Per molti servizi online è un requisito di legge, non un extra',
              'La navigazione migliora anche per chi non ha disabilità',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-body text-content-muted">
                <span
                  className="mt-2.5 h-1 w-1 shrink-0 rounded-pill bg-content-subtle"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <ToolSignupCta
          className="mt-12 sm:mt-16"
          title="Aziende con un sito inaccessibile, vicino a te"
          description="TrovaMi passa gli stessi controlli sui siti delle attività italiane e ti mostra quelle che hanno problemi che sai già risolvere, con nome, contatti e il dettaglio di cosa non va."
        />

        <ToolsCrossLinks currentSlug="accessibility-check" className="mt-12 sm:mt-16" />
      </div>
    </div>
  )
}
