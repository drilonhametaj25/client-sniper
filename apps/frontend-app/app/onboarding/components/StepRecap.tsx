/**
 * Step 3 onboarding: riepilogo + lancio verso la dashboard.
 * @file apps/frontend-app/app/onboarding/components/StepRecap.tsx
 */

'use client'

import { ChevronLeft, Globe, MapPin } from 'lucide-react'
import type { StepProps } from '@/lib/types/onboarding-v2'
import { SERVICE_CONFIGS } from '@/lib/types/services'
import { Badge, Button, Card } from '@/components/ui'

/** `isSaving` arriva dalla pagina: il salvataggio avviene sull'ultimo passo. */
interface StepRecapProps extends StepProps {
  isSaving?: boolean
}

export default function StepRecap({ data, onNext, onBack, isSaving = false }: StepRecapProps) {
  const services = data.services_offered

  return (
    <div>
      <h1 className="text-title font-semibold text-content sm:text-display">Tutto pronto</h1>
      <p className="mt-2 max-w-lg text-body-lg text-content-muted">
        Ecco cosa cercheremo per te da adesso in poi.
      </p>

      <Card variant="flat" padding="none" className="mt-8">
        <div className="p-6">
          <div className="text-micro uppercase tracking-wide text-content-subtle">
            Servizi che offri
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {services.length > 0 ? (
              services.map((service) => (
                <Badge key={service} variant="neutral" pill>
                  {SERVICE_CONFIGS[service]?.label ?? service}
                </Badge>
              ))
            ) : (
              <span className="text-body text-content-muted">Nessun servizio selezionato</span>
            )}
          </div>
        </div>

        <div className="border-t border-edge p-6">
          <div className="text-micro uppercase tracking-wide text-content-subtle">
            Zona di lavoro
          </div>
          <div className="mt-2 flex items-center gap-2 text-body text-content">
            {data.is_remote_nationwide ? (
              <>
                <Globe className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
                Tutta Italia, da remoto
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
                {data.operating_city}
              </>
            )}
          </div>
        </div>
      </Card>

      <p className="mt-6 text-caption text-content-muted">
        In dashboard trovi le aziende con problemi che i tuoi servizi risolvono.
        Vedere il problema è gratis; sbloccare il contatto costa 1 credito.
      </p>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} icon={<ChevronLeft />} disabled={isSaving}>
          Indietro
        </Button>

        <Button onClick={onNext} loading={isSaving} loadingText="Salvataggio…">
          Vedi i tuoi lead
        </Button>
      </div>
    </div>
  )
}
