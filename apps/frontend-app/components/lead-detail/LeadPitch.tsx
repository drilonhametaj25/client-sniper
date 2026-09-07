/**
 * LeadPitch — "Cosa puoi vendergli": l'unica superficie di raccomandazioni
 * della pagina dettaglio lead.
 *
 * Rileva i servizi vendibili dall'analisi (service-detection), li incrocia con
 * i servizi offerti dall'utente (match-calculation) e mostra UNA sola stima di
 * valore onesta: il range totalBudget calcolato da detectServices. Nessuna
 * percentuale inventata, nessuna stima di conversione.
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CheckCircle2, Lightbulb } from 'lucide-react'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch } from '@/lib/utils/match-calculation'
import { SERVICE_CONFIGS, formatBudget, ServiceType } from '@/lib/types/services'

interface LeadPitchProps {
  analysis: any
  userServices?: string[]
}

export default function LeadPitch({ analysis, userServices }: LeadPitchProps) {
  const detected = useMemo(() => detectServices(analysis), [analysis])
  const match = useMemo(
    () => calculateMatch(detected, (userServices || []) as ServiceType[]),
    [detected, userServices]
  )

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
        Cosa puoi vendergli
      </h2>

      {detected.services.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          L&apos;analisi automatica non ha evidenziato interventi da proporre: il sito
          sembra in buone condizioni generali.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {detected.services.map(service => {
              const config = SERVICE_CONFIGS[service.type]
              const isMatched = match.matchedServices.includes(service.type)
              return (
                <span
                  key={service.type}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
                  title={service.specificIssues.join(' · ')}
                >
                  <span aria-hidden="true">{config.icon}</span>
                  {config.label}
                  <span className="opacity-70">
                    · {service.issueCount} {service.issueCount === 1 ? 'problema' : 'problemi'}
                  </span>
                  {isMatched && (
                    <CheckCircle2 className="h-4 w-4" aria-label="Nel tuo profilo servizi" />
                  )}
                </span>
              )
            })}
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Valore stimato dei lavori
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatBudget(detected.totalBudget)}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Stima basata sui problemi rilevati dall&apos;analisi automatica: usala come
              punto di partenza per il tuo preventivo.
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            {userServices && userServices.length > 0 ? (
              match.reason
            ) : (
              <>
                <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Configura i tuoi servizi
                </Link>{' '}
                per vedere quali interventi corrispondono al tuo profilo.
              </>
            )}
          </p>
        </>
      )}
    </section>
  )
}
