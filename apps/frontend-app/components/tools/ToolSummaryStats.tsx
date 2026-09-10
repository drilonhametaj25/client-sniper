/**
 * ToolSummaryStats — il riepilogo degli esiti (superati / da controllare / falliti).
 *
 * Percorso: apps/frontend-app/components/tools/ToolSummaryStats.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Sostituisce le quattro scatole colorate copiate in ogni tool: qui sono
 * numeri con la loro etichetta, allineati su una riga, senza riquadri.
 * La tinta si mette solo dove è davvero uno stato, e al massimo su una voce.
 *
 * Usato da: app/tools/seo-checker, security-check, accessibility-check,
 * tech-detector, public-scan.
 */

'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { TOOL_TONE_TEXT, type ToolTone } from './ToolStatusLabel'

export interface ToolStat {
  label: string
  value: ReactNode
  /** Tinta del numero. Ometti per il grigio normale: è il caso normale. */
  tone?: ToolTone
}

export interface ToolSummaryStatsProps {
  items: ToolStat[]
  className?: string
}

export default function ToolSummaryStats({ items, className }: ToolSummaryStatsProps) {
  if (items.length === 0) return null

  return (
    <dl className={cn('flex flex-wrap gap-x-10 gap-y-5', className)}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-caption text-content-subtle">{item.label}</dt>
          <dd
            className={cn(
              'mt-0.5 text-heading font-semibold tabular-nums',
              item.tone ? TOOL_TONE_TEXT[item.tone] : 'text-content'
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export { ToolSummaryStats }
