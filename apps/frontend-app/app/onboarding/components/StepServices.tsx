/**
 * Step 1 onboarding: "Cosa vendi?"
 * Scrive users.services_offered — il campo che guida il matching dei lead.
 * @file apps/frontend-app/app/onboarding/components/StepServices.tsx
 */

'use client'

import type { StepProps } from '@/lib/types/onboarding-v2'
import { validateStep1 } from '@/lib/types/onboarding-v2'
import ServicesEditor from '@/components/settings/ServicesEditor'

export default function StepServices({ data, onUpdate, onNext }: StepProps) {
  const isValid = validateStep1(data)

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🎯</div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Cosa vendi?
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Ti mostreremo le aziende della tua zona che hanno bisogno
          esattamente di questi servizi.
        </p>
      </div>

      <ServicesEditor
        value={data.services_offered}
        onChange={(services) => onUpdate({ services_offered: services })}
      />

      <button
        onClick={onNext}
        disabled={!isValid}
        className="mt-8 w-full py-3 rounded-xl font-semibold text-white transition-colors
          bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
      >
        {isValid ? 'Continua' : 'Seleziona almeno un servizio'}
      </button>
    </div>
  )
}
