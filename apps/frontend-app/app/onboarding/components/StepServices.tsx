/**
 * Step 2: Servizi Offerti + Livello Skill
 *
 * Selezione servizi con livello di competenza per ciascuno.
 *
 * @file apps/frontend-app/app/onboarding/components/StepServices.tsx
 */

'use client'

import { OnboardingStep2Data, SkillLevel } from '@/lib/types/onboarding'
import { ServiceType, SERVICE_CONFIGS } from '@/lib/types/services'
import { Check, Star } from 'lucide-react'

interface StepServicesProps {
  data: OnboardingStep2Data
  onChange: (data: OnboardingStep2Data) => void
}

const SKILL_LEVELS: { value: SkillLevel; label: string; color: string }[] = [
  { value: 1, label: 'Base', color: 'bg-gray-400' },
  { value: 2, label: 'Intermedio', color: 'bg-blue-500' },
  { value: 3, label: 'Expert', color: 'bg-purple-600' }
]

// Map service configs to display format
const SERVICE_OPTIONS = Object.entries(SERVICE_CONFIGS).map(([key, config]) => ({
  value: key as ServiceType,
  label: config.label,
  description: getServiceDescription(key as ServiceType),
  icon: config.icon
}))

function getServiceDescription(service: ServiceType): string {
  const descriptions: Record<ServiceType, string> = {
    seo: 'Ottimizzazione motori di ricerca',
    gdpr: 'Privacy e conformità normativa',
    analytics: 'Tracking e analisi dati',
    mobile: 'Responsive design e app',
    performance: 'Velocità e Core Web Vitals',
    development: 'Sviluppo web e software',
    design: 'UI/UX e grafica',
    social: 'Social media marketing'
  }
  return descriptions[service]
}

export default function StepServices({ data, onChange }: StepServicesProps) {
  const toggleService = (service: ServiceType) => {
    const newServices = data.services.includes(service)
      ? data.services.filter((s) => s !== service)
      : [...data.services, service]

    // Remove skill level if service is deselected
    const newSkillLevels = { ...data.skillLevels }
    if (!newServices.includes(service)) {
      delete newSkillLevels[service]
    } else if (!newSkillLevels[service]) {
      // Default to intermediate level
      newSkillLevels[service] = 2
    }

    onChange({ services: newServices, skillLevels: newSkillLevels })
  }

  const setSkillLevel = (service: ServiceType, level: SkillLevel) => {
    onChange({
      ...data,
      skillLevels: { ...data.skillLevels, [service]: level }
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Seleziona i servizi che offri e indica il tuo livello di competenza.
        </p>
      </div>

      <div className="grid gap-3">
        {SERVICE_OPTIONS.map((service) => {
          const isSelected = data.services.includes(service.value)
          const currentLevel = data.skillLevels[service.value] || 2

          return (
            <div
              key={service.value}
              className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Service Header */}
              <button
                type="button"
                onClick={() => toggleService(service.value)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Checkbox */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* Icon */}
                <span className="text-2xl">{service.icon}</span>

                {/* Content */}
                <div className="flex-1">
                  <h3
                    className={`font-medium ${
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {service.label}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {service.description}
                  </p>
                </div>
              </button>

              {/* Skill Level Selector (visible when selected) */}
              {isSelected && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                      Livello:
                    </span>
                    <div className="flex gap-2">
                      {SKILL_LEVELS.map((level) => (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => setSkillLevel(service.value, level.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            currentLevel === level.value
                              ? `${level.color} text-white`
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selection counter */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {data.services.length === 0 ? (
          <span className="text-amber-600 dark:text-amber-400">
            Seleziona almeno un servizio per continuare
          </span>
        ) : (
          <span>
            {data.services.length} servizi selezionati
          </span>
        )}
      </div>
    </div>
  )
}
