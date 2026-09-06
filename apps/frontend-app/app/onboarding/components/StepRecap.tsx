/**
 * Step 3 onboarding: riepilogo + lancio verso la dashboard.
 * @file apps/frontend-app/app/onboarding/components/StepRecap.tsx
 */

'use client'

import type { StepProps } from '@/lib/types/onboarding-v2'
import { SERVICE_CONFIGS } from '@/lib/types/services'

export default function StepRecap({ data, onNext, onBack }: StepProps) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-3">🚀</div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
        Tutto pronto!
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Ecco cosa cercheremo per te:
      </p>

      <div className="mt-6 space-y-4 text-left bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Servizi che offri
          </div>
          <div className="flex flex-wrap gap-2">
            {data.services_offered.map(s => {
              const config = SERVICE_CONFIGS[s]
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}
                >
                  {config.icon} {config.label}
                </span>
              )
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Zona di lavoro
          </div>
          <div className="text-gray-900 dark:text-white font-medium">
            {data.is_remote_nationwide ? '🇮🇹 Tutta Italia (remoto)' : `📍 ${data.operating_city}`}
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        La dashboard ti mostrerà subito le aziende con problemi che i tuoi
        servizi possono risolvere. Sbloccare un contatto costa 1 credito.
      </p>

      <div className="mt-8 flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Indietro
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-colors"
        >
          Vai ai tuoi primi clienti →
        </button>
      </div>
    </div>
  )
}
