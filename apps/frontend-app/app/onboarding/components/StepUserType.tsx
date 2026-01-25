/**
 * Step 1: Tipo Utente
 *
 * Selezione tipo professionista: Freelancer, Agency, Consultant
 *
 * @file apps/frontend-app/app/onboarding/components/StepUserType.tsx
 */

'use client'

import { OnboardingStep1Data, UserType } from '@/lib/types/onboarding'
import { User, Building2, Briefcase, Check } from 'lucide-react'

interface StepUserTypeProps {
  data: OnboardingStep1Data
  onChange: (data: OnboardingStep1Data) => void
}

const USER_TYPE_OPTIONS: {
  value: UserType
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'freelancer',
    label: 'Freelancer',
    description: 'Lavoro in autonomia, gestisco progetti individualmente',
    icon: <User className="w-8 h-8" />
  },
  {
    value: 'agency',
    label: 'Agenzia',
    description: 'Gestisco un team e lavoro su progetti multipli',
    icon: <Building2 className="w-8 h-8" />
  },
  {
    value: 'consultant',
    label: 'Consulente',
    description: 'Offro consulenza strategica e coordinamento',
    icon: <Briefcase className="w-8 h-8" />
  }
]

export default function StepUserType({ data, onChange }: StepUserTypeProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <p className="text-gray-600 dark:text-gray-400">
          Questo ci aiuta a personalizzare la tua esperienza e mostrarti i lead più rilevanti.
        </p>
      </div>

      <div className="grid gap-4">
        {USER_TYPE_OPTIONS.map((option) => {
          const isSelected = data.userType === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ userType: option.value })}
              className={`relative flex items-center gap-4 p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {option.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3
                  className={`text-lg font-semibold mb-1 ${
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {option.label}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>
              </div>

              {/* Check indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
