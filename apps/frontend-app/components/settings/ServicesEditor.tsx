/**
 * ServicesEditor — L'UNICO posto dove l'utente sceglie i servizi che offre.
 * Usato da: onboarding (StepServices) e /settings (tab "Servizi").
 *
 * I servizi selezionati finiscono in users.services_offered, il campo che
 * guida TUTTO il matching (filtro "Solo per i miei servizi", % match sulle
 * card, sezione "Per te"). Prima l'onboarding scriveva un campo diverso
 * (specialization) che il matching non leggeva: il wizard non serviva a nulla.
 *
 * Presentazione: guida in apps/frontend-app/DESIGN.md.
 * Il componente e' SOLO la griglia di scelta: la frase che spiega la
 * conseguenza ("questi servizi decidono quali clienti ti mostriamo") la
 * scrive chi lo usa, cosi' non viene ripetuta due volte nella stessa pagina.
 */

'use client'

import {
  Check,
  Code2,
  Gauge,
  LineChart,
  Palette,
  Scale,
  Search,
  Smartphone,
  Users,
  type LucideIcon
} from 'lucide-react'
import { SERVICE_CONFIGS, type ServiceType } from '@/lib/types/services'
import { cn } from '@/lib/utils/cn'

/**
 * Icone di sistema al posto delle emoji di SERVICE_CONFIGS.
 * Vive qui perche' e' una scelta di presentazione: i dati non cambiano.
 */
const SERVICE_ICONS: Record<ServiceType, LucideIcon> = {
  seo: Search,
  gdpr: Scale,
  analytics: LineChart,
  mobile: Smartphone,
  performance: Gauge,
  development: Code2,
  design: Palette,
  social: Users
}

interface ServicesEditorProps {
  value: ServiceType[]
  onChange: (services: ServiceType[]) => void
  /** layout più compatto per l'uso dentro /settings */
  compact?: boolean
}

export default function ServicesEditor({ value, onChange, compact = false }: ServicesEditorProps) {
  const toggle = (service: ServiceType) => {
    if (value.includes(service)) {
      onChange(value.filter(s => s !== service))
    } else {
      onChange([...value, service])
    }
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'
      )}
    >
      {Object.values(SERVICE_CONFIGS).map(config => {
        const selected = value.includes(config.type)
        const Icon = SERVICE_ICONS[config.type]

        return (
          <button
            key={config.type}
            type="button"
            onClick={() => toggle(config.type)}
            aria-pressed={selected}
            className={cn(
              'focus-ring flex min-h-control w-full items-start gap-3 rounded-card border p-4 text-left',
              'transition-[background-color,border-color] duration-fast ease-soft',
              selected
                ? 'border-accent bg-accent-soft'
                : 'border-edge bg-surface-elevated hover:border-edge-strong'
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                selected ? 'text-accent-ink' : 'text-content-subtle'
              )}
              aria-hidden="true"
            />

            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium text-content">{config.label}</span>
              {!compact && (
                <span className="mt-0.5 block text-caption text-content-muted">
                  {config.description}
                </span>
              )}
            </span>

            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border',
                'transition-colors duration-fast ease-soft',
                selected ? 'border-accent bg-accent text-accent-on' : 'border-edge-strong'
              )}
              aria-hidden="true"
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
