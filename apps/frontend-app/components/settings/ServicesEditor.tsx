/**
 * ServicesEditor — L'UNICO posto dove l'utente sceglie i servizi che offre.
 * Usato da: onboarding (StepServices) e /settings (sezione Servizi).
 *
 * I servizi selezionati finiscono in users.services_offered, il campo che
 * guida TUTTO il matching (filtro "Solo per i miei servizi", % match sulle
 * card, sezione "Per te"). Prima l'onboarding scriveva un campo diverso
 * (specialization) che il matching non leggeva: il wizard non serviva a nulla.
 */

'use client'

import { SERVICE_CONFIGS, type ServiceType } from '@/lib/types/services'

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
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {Object.values(SERVICE_CONFIGS).map(config => {
        const selected = value.includes(config.type)
        return (
          <button
            key={config.type}
            type="button"
            onClick={() => toggle(config.type)}
            aria-pressed={selected}
            className={`
              flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
              ${selected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}
            `}
          >
            <span className="text-2xl leading-none">{config.icon}</span>
            <span className="min-w-0">
              <span className={`block font-semibold text-sm ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                {config.label}
              </span>
              {!compact && (
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {config.description}
                </span>
              )}
            </span>
            <span
              className={`ml-auto mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
            >
              {selected && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
