'use client'

// Landing pubblica di TrovaMi.
// Percorso: apps/frontend-app/app/page.tsx
// Presentazione: token di DESIGN.md (nessun gradiente, nessun vetro smerigliato,
// un solo accento). Il pubblico e' un professionista del web: si mostra il
// MECCANISMO e un esempio onesto di lead, non promesse.
// La Navbar globale si nasconde da sola su "/" quando non c'e' utente: qui
// vive l'header pubblico della landing.

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowRight, Lock, Menu, X } from 'lucide-react'
import NewsletterForm from '@/components/NewsletterForm'
import StructuredFAQ from '@/components/StructuredFAQ'
import PublicPricingSection from '@/components/pricing/PublicPricingSection'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import LinkButton from '@/components/ui/LinkButton'
import { cn } from '@/lib/utils/cn'

// Il meccanismo, in tre passaggi. Niente aggettivi: cosa succede, in ordine.
const STEPS = [
  {
    title: 'Partiamo da una zona e una categoria',
    body:
      'Idraulici a Torino, ristoranti a Bergamo, studi dentistici a Bari. Raccogliamo le attività da fonti pubbliche come Google Maps e le directory di settore, e teniamo traccia di quelle già viste per non ripeterle.',
  },
  {
    title: 'Analizziamo il sito, non l’azienda',
    body:
      '78 controlli tecnici, sempre gli stessi: title e description, velocità di caricamento, HTTPS e certificato, pixel di tracciamento, immagini rotte, resa su mobile. Regole deterministiche, nessun modello che tira a indovinare.',
  },
  {
    title: 'Ti diciamo cosa puoi vendergli',
    body:
      'Ogni lead arriva con i problemi scritti in italiano e il servizio che ci puoi costruire sopra. Guardi l’elenco, scegli, e spendi un credito solo su quelli che ti interessano davvero.',
  },
]

// Dettagli dell'esempio: sono i controlli veri dell'analizzatore, scritti come
// li vedrebbe l'utente. Niente dati di aziende reali.
const EXAMPLE_ISSUES = [
  'Certificato SSL assente: il browser mostra «Non sicuro»',
  'Nessun tag title né meta description',
  'Prima schermata caricata in 4,2 s su rete mobile',
  'Nessun Google Analytics, Tag Manager o Meta Pixel',
]

export default function HomePage() {
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '#come-funziona', label: 'Come funziona' },
    { href: '#esempio', label: 'Esempio di lead' },
    { href: '#pricing', label: 'Prezzi' },
    { href: '/tools', label: 'Tool gratuiti' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      {/* Schema Markup per SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "TrovaMi",
            "description": "Piattaforma di lead generation automatica per agenzie web e freelancer. Analisi tecnica siti web e identificazione clienti potenziali.",
            "url": "https://trovami.pro",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR",
              "description": "1 lead di prova gratuito per iniziare"
            },
            "creator": {
              "@type": "Organization",
              "name": "TrovaMi Team"
            },
            "featureList": [
              "Lead generation automatica",
              "Analisi tecnica siti web",
              "Identificazione clienti potenziali",
              "Dashboard gestione lead",
              "Sistema crediti flessibile"
            ]
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "TrovaMi",
            "url": "https://trovami.pro",
            "logo": "https://trovami.pro/logo.png",
            "description": "Piattaforma professionale per audit digitali automatizzati. Aiutiamo agenzie web e consulenti a identificare opportunità di business attraverso analisi tecniche avanzate.",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "email": "support@trovami.pro"
            },
            "sameAs": [
              "https://linkedin.com/company/trovami",
              "https://twitter.com/trovami_pro"
            ]
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Audit Digitale Automatizzato per Agenzie Web",
            "description": "Servizio professionale di audit digitale che identifica aziende con criticità tecniche attraverso analisi automatizzate di SEO, performance e compliance.",
            "provider": {
              "@type": "Organization",
              "name": "TrovaMi"
            },
            "areaServed": "IT",
            "serviceType": "Audit Digitale Automatizzato",
            "audience": {
              "@type": "BusinessAudience",
              "audienceType": "Agenzie Web, Consulenti Digitali, SEO Specialist, Web Agency"
            }
          })
        }}
      />

      {/* Header pubblico: solo per i visitatori anonimi.
          Con l'utente loggato ci pensa la Navbar globale. */}
      {!user && (
        <header className="sticky top-0 z-40 border-b border-edge bg-surface">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-4">
              <Link
                href="/"
                className="focus-ring rounded-control text-heading font-semibold tracking-tight text-content"
              >
                TrovaMi
              </Link>

              <nav className="hidden items-center gap-6 md:flex" aria-label="Sezioni del sito">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden items-center gap-2 md:flex">
                <LinkButton href="/login" variant="ghost">
                  Accedi
                </LinkButton>
                <LinkButton href="/register" variant="secondary">
                  Crea un account
                </LinkButton>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Chiudi il menu' : 'Apri il menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="menu-landing"
                className="focus-ring -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-control text-content-muted transition-colors duration-fast ease-soft hover:bg-surface-subtle hover:text-content md:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>

            {mobileMenuOpen && (
              <div id="menu-landing" className="border-t border-edge py-3 md:hidden">
                <nav className="flex flex-col" aria-label="Sezioni del sito">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="focus-ring-inset flex min-h-control items-center rounded-control px-1 text-body text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="focus-ring-inset flex min-h-control items-center rounded-control px-1 text-body text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Accedi
                  </Link>
                </nav>
                <LinkButton
                  href="/register"
                  variant="secondary"
                  fullWidth
                  className="mt-3"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Crea un account
                </LinkButton>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Hero: cosa fa il prodotto e per chi, in una frase */}
      <section className={cn('px-4 pb-16 sm:px-6 lg:px-8', user ? 'pt-28' : 'pt-16 sm:pt-24')}>
        <div className="mx-auto max-w-6xl">
          <p className="text-caption text-content-subtle">Per freelance e agenzie web</p>
          <h1 className="mt-3 max-w-3xl text-title font-semibold text-content sm:text-display">
            Trova le attività vicino a te che hanno un sito da sistemare.
          </h1>
          <p className="mt-5 max-w-2xl text-body-lg text-content-muted">
            TrovaMi analizza i siti delle attività italiane — SEO, velocità, HTTPS,
            tracciamento — e ti mostra quelle con problemi che tu sai già risolvere.
            Con nome, contatti e il dettaglio tecnico di cosa non va.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton
              href="/register"
              size="lg"
              icon={<ArrowRight />}
              className="sm:w-auto"
              fullWidth
            >
              Crea un account gratuito
            </LinkButton>
            <LinkButton
              href="/tools/public-scan"
              variant="secondary"
              size="lg"
              className="sm:w-auto"
              fullWidth
            >
              Analizza un sito adesso
            </LinkButton>
          </div>

          <p className="mt-4 text-caption text-content-subtle">
            Include 1 credito di prova. Nessuna carta di credito.
          </p>
        </div>
      </section>

      {/* Ancora storica: /#features e' ancora linkato da altre pagine pubbliche */}
      <span id="features" aria-hidden="true" />

      {/* Il meccanismo */}
      <section
        id="come-funziona"
        className="border-t border-edge px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-title font-semibold text-content">Come funziona</h2>
            <p className="mt-3 text-body-lg text-content-muted">
              Non è una lista di aziende comprata da qualche parte: è un’analisi tecnica
              rifatta ogni volta, con criteri che puoi verificare da solo.
            </p>
          </div>

          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="text-caption tabular-nums text-content-subtle">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-heading font-semibold text-content">{step.title}</h3>
                <p className="mt-2 text-body text-content-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Esempio onesto: com'e' fatto un lead prima dello sblocco */}
      <section id="esempio" className="border-t border-edge px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-title font-semibold text-content">
            Un lead, prima di sbloccarlo
          </h2>
          <p className="mt-3 max-w-2xl text-body-lg text-content-muted">
            Nella dashboard vedi subito di cosa si tratta e perché ti riguarda. Il nome
            dell’azienda e i contatti restano coperti: è quello che compri con il credito.
          </p>

          <Card className="mt-8 max-w-2xl">
            <div className="flex items-start justify-between gap-4">
              <p className="text-caption text-content-subtle">Ristorante · Bergamo</p>
              <Badge size="sm">Esempio</Badge>
            </div>

            <h3 className="mt-3 text-heading font-semibold text-content">
              Il sito non è protetto da HTTPS e non ha nessun tracciamento.
            </h3>
            <p className="mt-2 text-body text-content-muted">
              Puoi proporgli la messa in sicurezza del sito e l’installazione di un
              tracciamento base, così saprà da dove arrivano le prenotazioni.
            </p>

            <div className="mt-6 border-t border-edge pt-5">
              <p className="text-micro uppercase tracking-wide text-content-subtle">
                Dettagli tecnici
              </p>
              <ul className="mt-3 space-y-2">
                {EXAMPLE_ISSUES.map((issue) => (
                  <li key={issue} className="flex items-start gap-2.5 text-caption text-content-muted">
                    <span
                      className="mt-2 h-1 w-1 shrink-0 rounded-pill bg-content-subtle"
                      aria-hidden="true"
                    />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-5">
              <p className="flex items-center gap-2 text-caption text-content-subtle">
                <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                Nome, telefono, email e indirizzo del sito si vedono dopo lo sblocco
              </p>
              <p className="text-caption text-content-muted">1 credito</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Prezzi */}
      <PublicPricingSection className="border-t border-edge" />

      {/* FAQ */}
      <StructuredFAQ className="border-t border-edge bg-surface" />

      {/* Chiusura */}
      <section className="border-t border-edge px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-2xl text-title font-semibold text-content">
            Il primo lead è di prova, e non costa niente.
          </h2>
          <p className="mt-3 max-w-2xl text-body-lg text-content-muted">
            Crei l’account, dici cosa vendi e dove lavori, e vedi subito le attività
            compatibili con i tuoi servizi.
          </p>
          <LinkButton href="/register" size="lg" icon={<ArrowRight />} className="mt-8">
            Crea un account gratuito
          </LinkButton>
        </div>
      </section>

      {/* Newsletter + footer */}
      <footer className="border-t border-edge bg-surface px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-heading font-semibold text-content">
                Una mail al mese, quando c’è qualcosa da dire
              </h2>
              <p className="mt-2 text-body text-content-muted">
                Opportunità selezionate e modi concreti per proporre i tuoi servizi.
                Niente altro.
              </p>
            </div>
            <div className="md:pt-1">
              <NewsletterForm
                placeholder="La tua email"
                buttonText="Iscriviti"
                source="homepage_footer"
                variant="inline"
              />
            </div>
          </div>

          <div className="mt-16 grid gap-10 border-t border-edge pt-10 sm:grid-cols-3">
            <div>
              <p className="text-body font-medium text-content">TrovaMi</p>
              <p className="mt-2 max-w-xs text-caption text-content-muted">
                Analisi tecnica dei siti delle attività italiane, per chi quei siti li
                sa rifare.
              </p>
            </div>

            <nav aria-label="Prodotto">
              <p className="text-caption font-medium text-content">Prodotto</p>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <Link
                    href="#come-funziona"
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Come funziona
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Prezzi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tools"
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Tool gratuiti
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Accedi
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Risorse e assistenza">
              <p className="text-caption font-medium text-content">Risorse</p>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <Link
                    href="/come-trovare-clienti"
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Come trovare clienti
                  </Link>
                </li>
                <li>
                  <Link
                    href="/lead-generation-agenzie"
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Lead generation per agenzie
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Centro assistenza
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="focus-ring rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
                  >
                    Contatti
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-edge pt-6 text-caption text-content-subtle sm:flex-row sm:items-center sm:justify-between">
            <p>© 2025 TrovaMi · P.IVA 07327360488</p>
            <div className="flex items-center gap-4">
              <Link
                href="/privacy"
                className="focus-ring rounded-control transition-colors duration-fast ease-soft hover:text-content"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="focus-ring rounded-control transition-colors duration-fast ease-soft hover:text-content"
              >
                Termini
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
