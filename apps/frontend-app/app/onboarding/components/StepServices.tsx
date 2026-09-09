/**
 * Step 1 onboarding: "Cosa vendi?"
 * Scrive users.services_offered — il campo che guida il matching dei lead.
 * @file apps/frontend-app/app/onboarding/components/StepServices.tsx
 */

'use client'

import type { StepProps } from '@/lib/types/onboarding-v2'
import { validateStep1 } from '@/lib/types/onboarding-v2'
import { SERVICE_CONFIGS } from '@/lib/types/services'
import ServicesEditor from '@/components/settings/ServicesEditor'
import { Button } from '@/components/ui'

export default function StepServices({ data, onUpdate, onNext }: StepProps) {
  const isValid = validateStep1(data)
  const selected = data.services_offered

  return (
    <div>
      <h1 className="text-title font-semibold text-content sm:text-display">Cosa vendi?</h1>
      <p className="mt-2 max-w-lg text-body-lg text-content-muted">
        Scegli i servizi che offri. Ti mostreremo solo le aziende che hanno
        bisogno esattamente di questi.
      </p>

      <div className="mt-8">
        <ServicesEditor
          value={selected}
          onChange={(services) => onUpdate({ services_offered: services })}
        />
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-content-muted" aria-live="polite">
          {selected.length === 0
            ? 'Scegline almeno uno per continuare.'
            : `Cercheremo aziende con problemi di ${selected
                .map((service) => SERVICE_CONFIGS[service]?.label ?? service)
                .join(', ')}.`}
        </p>

        <Button onClick={onNext} disabled={!isValid} className="sm:w-auto" fullWidth>
          Continua
        </Button>
      </div>
    </div>
  )
}
