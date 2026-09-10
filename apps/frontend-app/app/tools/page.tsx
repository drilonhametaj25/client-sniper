/**
 * Indice dei tool pubblici di TrovaMi.
 *
 * Percorso: apps/frontend-app/app/tools/page.tsx
 * Guida: apps/frontend-app/DESIGN.md
 * Chiamata da: Navbar (voce "Tools"), landing, link interni, ricerca organica.
 *
 * Presentazione: token del design system. L'elenco dei tool è il soggetto —
 * un titolo, una riga di contesto e una griglia di card sobrie. L'icona è
 * quieta, cosa analizza è testo piccolo (non una fila di badge) e il badge
 * resta solo dove dice davvero qualcosa ("Login richiesto").
 * I dati dei tool vengono da components/tools/catalog.ts.
 */

import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { ToolSignupCta, TOOLS } from '@/components/tools'

// Forza rendering dinamico per questa pagina
export const dynamic = 'force-dynamic'

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* pt generoso: la Navbar pubblica è fissa e non lascia spazio dietro di sé */}
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
        <header className="max-w-2xl">
          <h1 className="text-title font-semibold text-content sm:text-display">
            Tool gratuiti per analizzare un sito
          </h1>
          <p className="mt-4 text-body-lg text-content-muted">
            Incolla l&apos;indirizzo di un sito e vedi cosa non va: SEO, velocità, sicurezza,
            accessibilità, tecnologie usate. Senza registrarti, fino a 3 analisi al giorno per
            ogni indirizzo IP.
          </p>
        </header>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon

            return (
              <Link key={tool.slug} href={tool.href} className="focus-ring rounded-card">
                <Card interactive className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="h-5 w-5 text-content-subtle" aria-hidden="true" />
                    {tool.badge && (
                      <Badge size="sm" variant="neutral">
                        {tool.badge}
                      </Badge>
                    )}
                  </div>

                  <h2 className="mt-4 text-heading font-semibold text-content">{tool.name}</h2>
                  <p className="mt-2 text-body text-content-muted">{tool.tagline}</p>
                  <p className="mt-4 text-caption text-content-subtle">{tool.analyzes}</p>
                </Card>
              </Link>
            )
          })}
        </div>

        <ToolSignupCta
          variant="primary"
          className="mt-16 sm:mt-20"
          title="Gli stessi controlli, sulle attività della tua zona"
          description="Questi tool analizzano un sito alla volta, quello che gli dai tu. TrovaMi fa lo stesso lavoro su migliaia di attività italiane e ti mostra quelle che hanno problemi che sai già risolvere, con nome, contatti e il dettaglio tecnico di cosa non va."
        />
      </div>
    </div>
  )
}
