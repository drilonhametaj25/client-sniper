/**
 * LeadPitch — "Cosa puoi vendergli": la sezione che genera il lavoro.
 *
 * Rileva i servizi vendibili dall'analisi (service-detection), li incrocia con
 * i servizi offerti dall'utente (match-calculation) e mostra UNA sola stima di
 * valore onesta: il range totalBudget calcolato da detectServices. Nessuna
 * percentuale inventata, nessuna stima di conversione.
 *
 * I nomi dei lavori vengono da service-copy (italiano parlato); le etichette
 * tecniche di SERVICE_CONFIGS restano alla logica.
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch } from '@/lib/utils/match-calculation'
import { formatBudget, ServiceType } from '@/lib/types/services'
import { SERVICE_COPY } from './service-copy'
import { Card, CardTitle, cn } from '@/components/ui'

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

  const count = detected.services.length
  const primaryCopy = detected.primaryService ? SERVICE_COPY[detected.primaryService] : null
  const hasProfile = Boolean(userServices && userServices.length > 0)
  // Il numero di servizi in comune si legge meglio del punteggio di match:
  // "2 di questi lavori rientrano nei servizi che offri" invece di "Match 80%".
  const matchedCount = match.matchedServices.length

  return (
    <Card>
      <CardTitle>Cosa puoi vendergli</CardTitle>

      {count === 0 ? (
        <p className="mt-2 text-body text-content-muted">
          L&apos;analisi automatica non ha trovato interventi da proporre: il sito sembra in
          buone condizioni generali.
        </p>
      ) : (
        <>
          <p className="mt-2 text-body text-content-muted">
            {count === 1
              ? "Dall'analisi risulta un lavoro da proporre."
              : `Dall'analisi risultano ${count} lavori da proporre.`}
            {primaryCopy ? ` Il più urgente è ${primaryCopy.withArticle}.` : ''}
          </p>

          <div className="mt-6">
            <div className="text-micro text-content-subtle">Valore stimato dei lavori</div>
            {/* A 375px un range a due numeri non ci sta a 40px: scende di una voce. */}
            <div className="mt-1 text-title font-semibold tabular-nums text-content sm:text-metric">
              {formatBudget(detected.totalBudget)}
            </div>
            <p className="mt-2 max-w-md text-caption text-content-subtle">
              Stima calcolata sui problemi rilevati dall&apos;analisi: usala come punto di
              partenza per il tuo preventivo, non come prezzo finale.
            </p>
          </div>

          <ul className="mt-6">
            {detected.services.map((service, index) => {
              const copy = SERVICE_COPY[service.type]
              const isMatched = match.matchedServices.includes(service.type)
              const details = service.specificIssues.slice(0, 3).join(' · ')

              return (
                <li
                  key={service.type}
                  className={cn('flex gap-3 py-4', index > 0 && 'border-t border-edge')}
                >
                  <copy.Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-body font-medium text-content">{copy.label}</span>
                      {isMatched && (
                        <span className="inline-flex items-center gap-1 text-caption text-accent-ink">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Nel tuo profilo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-body text-content-muted">{copy.pitch}</p>
                    {details && (
                      <p className="mt-1 text-caption text-content-subtle">{details}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          <p className="mt-2 border-t border-edge pt-4 text-caption text-content-subtle">
            {hasProfile ? (
              matchedCount === 0 ? (
                'Nessuno di questi lavori rientra nei servizi che hai dichiarato.'
              ) : matchedCount === 1 ? (
                'Uno di questi lavori rientra nei servizi che offri.'
              ) : (
                `${matchedCount} di questi lavori rientrano nei servizi che offri.`
              )
            ) : (
              <>
                <Link
                  href="/settings"
                  className="focus-ring rounded-sm text-accent-ink underline-offset-4 hover:underline"
                >
                  Configura i servizi che offri
                </Link>{' '}
                per vedere subito quali di questi lavori sono nel tuo giro.
              </>
            )}
          </p>
        </>
      )}
    </Card>
  )
}
