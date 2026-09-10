/**
 * ToolSignupCta — l'invito a registrarsi, quieto, una volta sola.
 *
 * Percorso: apps/frontend-app/components/tools/ToolSignupCta.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Non è una fascia colorata: è una sezione neutra con una frase onesta e UN
 * bottone. Va messa DOPO il risultato, quando l'utente ha già visto il valore,
 * e una volta sola per pagina.
 *
 * `variant` resta `secondary` sulle pagine che hanno il form di analisi: lì il
 * bottone primario è "Analizza". Usa `primary` solo dove non c'è un form
 * (l'indice /tools).
 *
 * Usato da: tutte le pagine app/tools/(...)/page.tsx e app/tools/page.tsx.
 */

'use client'

import { ArrowRight } from 'lucide-react'
import LinkButton from '@/components/ui/LinkButton'
import { cn } from '@/lib/utils/cn'

export interface ToolSignupCtaProps {
  /** Il titolo. Ogni tool può dire la sua: "aziende con problemi SEO", ... */
  title?: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  /** Riga sotto il bottone, in piccolo */
  note?: string
  /** `primary` solo dove la pagina non ha già un bottone primario */
  variant?: 'primary' | 'secondary'
  className?: string
}

export default function ToolSignupCta({
  title = 'Aziende con questi problemi, vicino a te',
  description = 'TrovaMi passa gli stessi controlli sui siti delle attività italiane e ti mostra quelle che hanno problemi che sai già risolvere, con nome, contatti e il dettaglio di cosa non va.',
  ctaLabel = 'Crea un account gratuito',
  ctaHref = '/register',
  note = 'Include 1 credito di prova. Nessuna carta di credito.',
  variant = 'secondary',
  className,
}: ToolSignupCtaProps) {
  return (
    <section className={cn('border-t border-edge pt-10 sm:pt-12', className)}>
      <h2 className="max-w-2xl text-heading font-semibold text-content">{title}</h2>
      <p className="mt-2 max-w-2xl text-body text-content-muted">{description}</p>

      <LinkButton href={ctaHref} variant={variant} icon={<ArrowRight />} className="mt-6">
        {ctaLabel}
      </LinkButton>

      {note && <p className="mt-3 text-caption text-content-subtle">{note}</p>}
    </section>
  )
}

export { ToolSignupCta }
