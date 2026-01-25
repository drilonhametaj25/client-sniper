/**
 * Componente Progress Bar Onboarding
 *
 * Mostra avanzamento step con indicatori visivi.
 *
 * @file apps/frontend-app/app/onboarding/components/OnboardingProgress.tsx
 */

'use client'

import { OnboardingStepConfig } from '@/lib/types/onboarding'
import { Check } from 'lucide-react'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  steps: OnboardingStepConfig[]
}

export default function OnboardingProgress({
  currentStep,
  totalSteps,
  steps
}: OnboardingProgressProps) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <div className="mb-8">
      {/* Progress Bar */}
      <div className="relative mb-4">
        {/* Background */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* Progress Fill */}
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep

            return (
              <div
                key={step.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : isCurrent
                    ? 'bg-white dark:bg-gray-800 border-2 border-blue-500 text-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Info */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">{steps[currentStep - 1]?.icon}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Step {currentStep} di {totalSteps}
          </span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {steps[currentStep - 1]?.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {steps[currentStep - 1]?.subtitle}
        </p>
      </div>
    </div>
  )
}
