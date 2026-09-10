/**
 * Analisi gratuita di un sito web — la vetrina dei tool pubblici di TrovaMi.
 *
 * Percorso: apps/frontend-app/app/tools/public-scan/page.tsx
 * Guida: apps/frontend-app/DESIGN.md
 * Chiamata da: /tools (indice), Navbar (voce "Tools"), landing, ricerca organica.
 * SEO e schema markup stanno nel layout.tsx accanto a questo file.
 *
 * Presentazione: primitive condivise di components/tools + token del design
 * system. Il soggetto della pagina e' il risultato dell'analisi; l'invito a
 * registrarsi compare una volta sola, dopo che l'utente ha visto il valore.
 *
 * Logica invariata: stessa GET /api/tools/public-scan per il contatore, stessa
 * POST per l'analisi, stessi campi e stessi stati (errore, limite giornaliero,
 * sito gia' presente nel database).
 *
 * Nota sul punteggio: qui e' la SALUTE del sito (piu' alto = sito piu' sano),
 * il contrario dell'opportunity score dei lead. lib/utils/opportunity.ts non
 * si usa in questa pagina.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  ToolPageHeader,
  ToolUrlForm,
  ToolScore,
  ToolCheckList,
  ToolSummaryStats,
  ToolStatusMessage,
  ToolLoadingState,
  ToolResultPanel,
  ToolSignupCta,
  ToolsCrossLinks,
  type ToolCheckItem,
  type ToolTone,
} from '@/components/tools'
import LinkButton from '@/components/ui/LinkButton'
import NewsletterForm from '@/components/NewsletterForm'

interface PublicAnalysisResult {
  url: string
  finalUrl: string
  isAccessible: boolean
  httpStatus: number
  seo: {
    hasTitle: boolean
    hasMetaDescription: boolean
    hasH1: boolean
    score: number
  }
  performance: {
    loadTime: number
    isResponsive: boolean
    score: number
  }
  social: {
    hasAnySocial: boolean
    socialCount: number
  }
  tracking: {
    hasAnyTracking: boolean
  }
  overallScore: number
  isLimitedAnalysis: boolean
  upgradeMessage: string
}

interface PublicAnalysisResponse {
  success: boolean
  analysis?: PublicAnalysisResult
  existingLead?: boolean
  leadInfo?: {
    businessName: string
    score: number
    analyzedDate: string
  }
  message: string
  upgradeMessage?: string
  remainingAnalyses: number
}

interface UsageInfo {
  used: number
  limit: number
  remaining: number
  canAnalyze: boolean
}

/** Cosa vede chi arriva sulla pagina prima di lanciare l'analisi: gli stessi controlli, spiegati. */
const WHAT_WE_CHECK: Array<{ term: string; description: string }> = [
  {
    term: 'Quello che legge Google',
    description:
      'Titolo, descrizione e titolo principale della pagina: sono le tre cose che decidono come il sito compare nei risultati di ricerca.',
  },
  {
    term: 'Velocità di caricamento',
    description:
      'Quanto tempo passa prima che la pagina sia visibile. È la prima cosa che si nota e spesso la più semplice da sistemare.',
  },
  {
    term: 'Adattamento agli smartphone',
    description:
      'Se il sito è pensato anche per gli schermi piccoli. Un sito che non si adatta si legge male da telefono.',
  },
  {
    term: 'Connessione sicura',
    description:
      'Se il sito usa HTTPS. Senza, il browser avvisa chi lo apre che la connessione non è protetta.',
  },
  {
    term: 'Statistiche e social',
    description:
      'Se sul sito è installato un sistema di statistiche e se le pagine rimandano ai profili social dell\'attività.',
  },
]

/**
 * Le soglie di questa pagina (70 / 40) sono quelle che il tool usava gia':
 * sono piu' larghe di quelle di toolScoreVerdict, quindi parola e tinta si
 * passano esplicite a ToolScore invece di reintrodurre un helper di colori.
 */
function scoreVerdict(score: number): { word: string; tone: ToolTone; caption: string } {
  if (score >= 70) {
    return {
      word: 'Buono',
      tone: 'success',
      caption:
        'Il sito è messo bene: i controlli di base sono a posto e resta poco da rifare.',
    }
  }

  if (score >= 40) {
    return {
      word: 'Da migliorare',
      tone: 'warning',
      caption:
        'Il sito funziona ma ha diversi punti deboli: c\'è materiale concreto da proporre a chi lo gestisce.',
    }
  }

  return {
    word: 'Critico',
    tone: 'danger',
    caption:
      'Il sito ha problemi evidenti già sui controlli di base: chi lo gestisce ha bisogno di un intervento.',
  }
}

/** Solo per la resa: mostra il dominio invece dell'URL intero. */
function siteLabel(value: string): string {
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

/** Millisecondi come li scrive un italiano: "1,8 s". Stesso arrotondamento di prima. */
function formatSeconds(ms: number): string {
  const seconds = Math.round((ms / 1000) * 10) / 10
  return `${seconds.toFixed(1).replace('.', ',')} s`
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('it-IT')
}

export default function PublicScanPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PublicAnalysisResult | null>(null)
  const [responseData, setResponseData] = useState<PublicAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  // Carica info utilizzo all'avvio
  useEffect(() => {
    loadUsageInfo()
  }, [])

  const loadUsageInfo = async () => {
    try {
      const response = await fetch('/api/tools/public-scan')
      const data = await response.json()
      setUsage(data)
    } catch (error) {
      console.error('Errore caricamento info utilizzo:', error)
    }
  }

  const handleAnalyze = async () => {
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/tools/public-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.message || 'Limite giornaliero raggiunto')
        } else {
          setError(data.error || 'Errore durante l\'analisi')
        }
        return
      }

      // Gestisce sia analisi nuove che lead esistenti
      setResponseData(data)
      if (data.analysis) {
        setResult(data.analysis)
      }

      // Rimuovi eventuali errori precedenti per lead esistenti
      if (data.existingLead) {
        setError(null)
      }

      await loadUsageInfo() // Ricarica info utilizzo

    } catch (error) {
      console.error('Errore analisi:', error)
      setError('Errore di connessione. Riprova tra qualche minuto.')
    } finally {
      setLoading(false)
    }
  }

  // Limite giornaliero esaurito: stessa condizione di prima, scritta in un posto solo
  const limitReached = usage !== null && !usage.canAnalyze

  // Punteggio mostrato: stessa espressione dell'implementazione precedente
  const overallScore = result ? result.overallScore || responseData?.leadInfo?.score || 0 : 0
  const verdict = scoreVerdict(overallScore)

  const analyzedUrl = result ? result.url || result.finalUrl || '' : ''
  const isHttps = analyzedUrl.startsWith('https://')

  const checks: ToolCheckItem[] = result
    ? [
        {
          id: 'title',
          name: 'Titolo della pagina',
          status: result.seo?.hasTitle ? 'pass' : 'fail',
          statusLabel: result.seo?.hasTitle ? 'Presente' : 'Assente',
          recommendation: result.seo?.hasTitle
            ? undefined
            : 'È la riga che i motori di ricerca mostrano come titolo. Senza, il sito compare con un testo scelto da loro.',
        },
        {
          id: 'meta-description',
          name: 'Descrizione per i motori di ricerca',
          status: result.seo?.hasMetaDescription ? 'pass' : 'fail',
          statusLabel: result.seo?.hasMetaDescription ? 'Presente' : 'Assente',
          recommendation: result.seo?.hasMetaDescription
            ? undefined
            : 'È il paragrafo sotto il titolo nei risultati di ricerca. Senza, chi cerca non sa cosa aspettarsi dal sito.',
        },
        {
          id: 'h1',
          name: 'Titolo principale della pagina',
          status: result.seo?.hasH1 ? 'pass' : 'fail',
          statusLabel: result.seo?.hasH1 ? 'Presente' : 'Assente',
          recommendation: result.seo?.hasH1
            ? undefined
            : 'Dice ai motori di ricerca di cosa parla la pagina. Senza, il contenuto è più difficile da posizionare.',
        },
        {
          id: 'responsive',
          name: 'Adattamento agli smartphone',
          status: result.performance?.isResponsive ? 'pass' : 'fail',
          statusLabel: result.performance?.isResponsive ? 'Adattato' : 'Non adattato',
          recommendation: result.performance?.isResponsive
            ? undefined
            : 'Il sito non è predisposto per gli schermi piccoli: da telefono si legge male e si naviga peggio.',
        },
        {
          id: 'https',
          name: 'Connessione sicura',
          status: isHttps ? 'pass' : 'fail',
          statusLabel: isHttps ? 'Attiva' : 'Assente',
          recommendation: isHttps
            ? undefined
            : 'Il sito non usa HTTPS: il browser avvisa chi lo apre che la connessione non è protetta.',
        },
        ...((result.performance?.loadTime ?? 0) > 0
          ? [
              {
                id: 'load-time',
                name: 'Tempo di caricamento',
                status:
                  result.performance.loadTime > 3000
                    ? ('fail' as const)
                    : result.performance.loadTime > 2000
                      ? ('warning' as const)
                      : ('pass' as const),
                statusLabel:
                  result.performance.loadTime > 3000
                    ? 'Lento'
                    : result.performance.loadTime > 2000
                      ? 'Migliorabile'
                      : 'Veloce',
                value: `${formatSeconds(result.performance.loadTime)} prima che la pagina sia visibile`,
                recommendation:
                  result.performance.loadTime > 2000
                    ? 'Sopra i due secondi di attesa una parte dei visitatori chiude la pagina prima di vederla.'
                    : undefined,
              },
            ]
          : []),
        {
          id: 'tracking',
          name: 'Strumenti di statistiche',
          status: result.tracking?.hasAnyTracking ? 'pass' : 'warning',
          statusLabel: result.tracking?.hasAnyTracking ? 'Installati' : 'Non rilevati',
          recommendation: result.tracking?.hasAnyTracking
            ? undefined
            : 'Nessun sistema di statistiche rilevato: chi gestisce il sito non sa quante persone lo visitano né da dove arrivano.',
        },
        {
          id: 'social',
          name: 'Collegamenti ai social',
          status: result.social?.hasAnySocial ? 'pass' : 'warning',
          statusLabel: result.social?.hasAnySocial ? 'Presenti' : 'Nessuno',
          value: result.social?.hasAnySocial
            ? `${result.social.socialCount} collegamenti trovati nelle pagine`
            : undefined,
          recommendation: result.social?.hasAnySocial
            ? undefined
            : 'Il sito non rimanda a nessun profilo social: chi lo visita non ha modo di seguire l\'attività altrove.',
        },
      ]
    : []

  const passedChecks = checks.filter((check) => check.status === 'pass').length

  return (
    <div className="min-h-screen bg-surface">
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <ToolPageHeader
          title="Analisi gratuita di un sito web"
          description="Incolla l'indirizzo di un sito e vedi come sta: quello che legge Google, la velocità, l'adattamento agli smartphone, la connessione sicura e gli strumenti di statistiche. Senza registrarti."
          usage={usage}
          fallbackLimit={2}
        >
          <ToolUrlForm
            id="website-url"
            value={url}
            onChange={setUrl}
            onSubmit={() => handleAnalyze()}
            loading={loading}
            disabled={limitReached}
            inputType="url"
            required
            label="Indirizzo del sito da analizzare"
            placeholder="https://esempio.it"
            hint="Scrivi l'indirizzo completo, con https:// davanti."
          />
        </ToolPageHeader>

        {/* Limite giornaliero gia' esaurito quando la pagina si apre */}
        {limitReached && !error && (
          <ToolStatusMessage
            tone="warning"
            title="Hai usato tutte le analisi gratuite di oggi"
            className="mt-8"
            action={
              <LinkButton href="/register" variant="secondary">
                Crea un account gratuito
              </LinkButton>
            }
          >
            Il contatore riparte domani. Con un account gratuito hai un credito di prova per
            vedere un lead completo, analisi tecnica inclusa.
          </ToolStatusMessage>
        )}

        {/* Errore dell'analisi, o limite restituito dall'API durante l'invio */}
        {error && (
          <ToolStatusMessage
            tone="danger"
            title="Non siamo riusciti ad analizzare il sito"
            className="mt-8"
          >
            {error}
          </ToolStatusMessage>
        )}

        {/* Il sito era gia' stato analizzato per un lead in archivio */}
        {!error && responseData?.existingLead && (
          <ToolStatusMessage
            tone="accent"
            title="Questo sito è già nel database di TrovaMi"
            className="mt-8"
          >
            {responseData.leadInfo
              ? `${responseData.leadInfo.businessName || 'Questa attività'} è stata analizzata il ${formatDate(responseData.leadInfo.analyzedDate)}. Qui sotto vedi il risultato di quell'analisi: non ti è stata scalata nessuna delle analisi di oggi.`
              : responseData.message}
          </ToolStatusMessage>
        )}

        {loading && (
          <ToolLoadingState className="mt-12 sm:mt-16" label="Analisi del sito in corso" />
        )}

        {!loading && result && (
          <ToolResultPanel
            title="Risultato dell'analisi"
            subject={siteLabel(analyzedUrl) || undefined}
            className="mt-12 sm:mt-16"
          >
            <ToolScore
              value={overallScore}
              label="Punteggio complessivo"
              qualifier={verdict.word}
              tone={verdict.tone}
              caption={verdict.caption}
            />

            {result.isAccessible === false && (
              <ToolStatusMessage
                tone="warning"
                title="Il sito non ha risposto come previsto"
                className="mt-8"
              >
                {result.httpStatus
                  ? `Il server ha risposto con il codice ${result.httpStatus}. I controlli qui sotto possono essere incompleti.`
                  : 'Il server non ha risposto correttamente. I controlli qui sotto possono essere incompleti.'}
              </ToolStatusMessage>
            )}

            <ToolSummaryStats
              className="mt-8"
              items={[
                { label: 'Controlli superati', value: `${passedChecks} su ${checks.length}` },
                { label: 'Punteggio SEO', value: Math.round(result.seo?.score ?? 0) },
                {
                  label: 'Punteggio prestazioni',
                  value: Math.round(result.performance?.score ?? 0),
                },
              ]}
            />

            <ToolCheckList
              className="mt-10"
              title="Controlli eseguiti"
              description={
                result.isLimitedAnalysis
                  ? 'Sono i controlli che si possono fare dall\'esterno. Dentro TrovaMi la stessa analisi prosegue su sicurezza, cookie e conformità GDPR, accessibilità e tecnologie usate.'
                  : undefined
              }
              items={checks}
            />
          </ToolResultPanel>
        )}

        {/* Prima dell'analisi: cosa guarda il tool, detto senza gergo */}
        {!loading && !result && (
          <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
            <h2 className="text-heading font-semibold text-content">Cosa guarda questa analisi</h2>
            <p className="mt-2 max-w-2xl text-body text-content-muted">
              Sono i controlli che si possono fare dall&apos;esterno, senza accedere al sito.
              Bastano per capire se chi lo gestisce ha bisogno di aiuto.
            </p>

            <dl className="mt-6 max-w-2xl">
              {WHAT_WE_CHECK.map((item) => (
                <div key={item.term} className="border-t border-edge py-4">
                  <dt className="text-body font-medium text-content">{item.term}</dt>
                  <dd className="mt-1 text-caption text-content-muted">{item.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <ToolSignupCta
          className="mt-12 sm:mt-16"
          title="Lo stesso lavoro, su migliaia di attività italiane"
          description="Questa pagina analizza un sito alla volta, quello che scegli tu. TrovaMi passa controlli molto più approfonditi sui siti delle attività italiane e ti mostra quelle che hanno problemi che sai già risolvere, con nome, contatti e il dettaglio di cosa non va."
        />

        <ToolsCrossLinks currentSlug="public-scan" className="mt-12 sm:mt-16" />

        <section className="mt-12 border-t border-edge pt-10 sm:mt-16 sm:pt-12">
          <div className="grid gap-6 md:grid-cols-2 md:gap-12">
            <div>
              <h2 className="text-heading font-semibold text-content">
                Una mail al mese, quando c&apos;è qualcosa da dire
              </h2>
              <p className="mt-2 text-body text-content-muted">
                Opportunità selezionate e modi concreti per proporre i tuoi servizi. Niente altro.
              </p>
            </div>
            <div className="md:pt-1">
              <NewsletterForm
                placeholder="La tua email"
                buttonText="Iscriviti"
                source="public_scan"
                variant="inline"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
