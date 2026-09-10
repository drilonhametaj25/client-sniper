/**
 * ToolsCrossLinks — i rimandi agli altri tool, in fondo a ogni pagina.
 *
 * Percorso: apps/frontend-app/components/tools/ToolsCrossLinks.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Legge il catalogo (catalog.ts), esclude il tool corrente e ne mostra tre in
 * card sobrie. Sostituisce le sezioni "Altri Tool Gratuiti" scritte a mano in
 * ogni pagina, ognuna con colori diversi.
 *
 * Usato da: tutte le pagine app/tools/(...)/page.tsx.
 */

'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/utils/cn'
import { TOOLS, type ToolSlug } from './catalog'

export interface ToolsCrossLinksProps {
  /** Il tool su cui siamo: viene escluso dall'elenco */
  currentSlug?: ToolSlug
  /** Elenco esplicito, se vuoi decidere tu quali mostrare e in che ordine */
  slugs?: ToolSlug[]
  title?: string
  /** Quanti mostrarne (default 3) */
  limit?: number
  className?: string
}

export default function ToolsCrossLinks({
  currentSlug,
  slugs,
  title = 'Altri tool gratuiti',
  limit = 3,
  className,
}: ToolsCrossLinksProps) {
  const pool = slugs
    ? (slugs.map((slug) => TOOLS.find((tool) => tool.slug === slug)).filter(Boolean) as typeof TOOLS)
    : TOOLS.filter((tool) => !tool.requiresAuth)

  const items = pool.filter((tool) => tool.slug !== currentSlug).slice(0, limit)

  if (items.length === 0) return null

  return (
    <section className={cn('border-t border-edge pt-10 sm:pt-12', className)}>
      <h2 className="text-heading font-semibold text-content">{title}</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((tool) => {
          const Icon = tool.icon

          return (
            <Link key={tool.slug} href={tool.href} className="focus-ring rounded-card">
              <Card interactive padding="md" className="h-full">
                <Icon className="h-5 w-5 text-content-subtle" aria-hidden="true" />
                <p className="mt-3 text-body font-medium text-content">{tool.name}</p>
                <p className="mt-1 text-caption text-content-muted">{tool.tagline}</p>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export { ToolsCrossLinks }
