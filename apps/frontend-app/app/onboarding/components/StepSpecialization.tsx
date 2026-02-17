/**
 * StepSpecialization - Step 2 del nuovo onboarding
 *
 * Selezione multipla delle specializzazioni.
 * Almeno una richiesta per continuare.
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import type { StepProps } from '@/lib/types/onboarding-v2'
import {
  SPECIALIZATION_CONFIG,
  validateStep2,
  type Specialization
} from '@/lib/types/onboarding-v2'

export default function StepSpecialization({
  data,
  onUpdate,
  onNext,
  onBack
}: StepProps) {
  const [showError, setShowError] = useState(false)

  const isValid = validateStep2(data)

  const toggleSpecialization = (spec: Specialization) => {
    const current = data.specialization || []
    const updated = current.includes(spec)
      ? current.filter(s => s !== spec)
      : [...current, spec]

    onUpdate({ specialization: updated })
    setShowError(false)
  }

  const handleNext = () => {
    if (!isValid) {
      setShowError(true)
      return
    }
    onNext()
  }

  return (
    <div className="max-w-xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Cosa offri ai tuoi clienti?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Seleziona tutto quello che fai
        </p>
      </div>

      {/* Specialization Pills */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {(Object.keys(SPECIALIZATION_CONFIG) as Specialization[]).map((spec) => {
          const config = SPECIALIZATION_CONFIG[spec]
          const isSelected = data.specialization?.includes(spec) || false

          return (
            <button
              key={spec}
              onClick={() => toggleSpecialization(spec)}
              className={`
                p-4 rounded-xl border-2 text-left transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <div className={`font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {config.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {config.description}
                  </div>
                </div>
              </div>

              {/* Checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Error message */}
      {showError && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-6 justify-center">
          <AlertCircle className="w-4 h-4" />
          Seleziona almeno un servizio per continuare
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Indietro
        </button>

        <button
          onClick={handleNext}
          className={`
            inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all
            ${isValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }
          `}
        >
          Continua
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
