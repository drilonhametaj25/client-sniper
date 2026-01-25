/**
 * Step 6: Capacità Settimanale
 *
 * Indica quanti lead/progetti puoi gestire alla settimana.
 *
 * @file apps/frontend-app/app/onboarding/components/StepCapacity.tsx
 */

'use client'

import { OnboardingStep6Data } from '@/lib/types/onboarding'
import { Calendar, Briefcase, TrendingUp, AlertCircle } from 'lucide-react'

interface StepCapacityProps {
  data: OnboardingStep6Data
  onChange: (data: OnboardingStep6Data) => void
}

// Capacity presets
const CAPACITY_PRESETS = [
  { value: 3, label: 'Pochi', description: 'Focus su qualità', icon: '🎯' },
  { value: 5, label: 'Moderati', description: 'Bilanciato', icon: '⚖️' },
  { value: 10, label: 'Molti', description: 'Alta produttività', icon: '🚀' },
  { value: 20, label: 'Massimo', description: 'Team/Agency', icon: '🏢' }
]

export default function StepCapacity({ data, onChange }: StepCapacityProps) {
  const availableCapacity = Math.max(0, data.weeklyCapacity - data.projectsInProgress)
  const capacityPercentage = (data.projectsInProgress / data.weeklyCapacity) * 100

  // Determine capacity status
  let capacityStatus: 'available' | 'busy' | 'full'
  let statusColor: string
  let statusLabel: string

  if (capacityPercentage >= 100) {
    capacityStatus = 'full'
    statusColor = 'text-red-600 dark:text-red-400'
    statusLabel = 'Capacità piena'
  } else if (capacityPercentage >= 70) {
    capacityStatus = 'busy'
    statusColor = 'text-amber-600 dark:text-amber-400'
    statusLabel = 'Quasi al limite'
  } else {
    capacityStatus = 'available'
    statusColor = 'text-green-600 dark:text-green-400'
    statusLabel = 'Disponibile'
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Indica la tua capacità settimanale per bilanciare il carico di lavoro.
        </p>
      </div>

      {/* Capacity Summary Card */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 ${statusColor}`} />
            <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {availableCapacity} / {data.weeklyCapacity}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              capacityStatus === 'full'
                ? 'bg-red-500'
                : capacityStatus === 'busy'
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, capacityPercentage)}%` }}
          />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
          {availableCapacity === 0
            ? 'Non hai slot disponibili questa settimana'
            : `${availableCapacity} slot disponibili per nuovi progetti`}
        </p>
      </div>

      {/* Weekly Capacity Selection */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Calendar className="w-4 h-4" />
          Quanti lead/progetti puoi gestire a settimana?
        </label>

        <div className="grid grid-cols-2 gap-3">
          {CAPACITY_PRESETS.map((preset) => {
            const isSelected = data.weeklyCapacity === preset.value
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    weeklyCapacity: preset.value,
                    projectsInProgress: Math.min(data.projectsInProgress, preset.value)
                  })
                }
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{preset.icon}</span>
                  <span
                    className={`font-semibold ${
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {preset.value}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {preset.label} - {preset.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Custom Value */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Valore personalizzato
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {data.weeklyCapacity} lead/settimana
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={data.weeklyCapacity}
            onChange={(e) =>
              onChange({
                ...data,
                weeklyCapacity: parseInt(e.target.value),
                projectsInProgress: Math.min(
                  data.projectsInProgress,
                  parseInt(e.target.value)
                )
              })
            }
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span>
            <span>50</span>
          </div>
        </div>
      </div>

      {/* Projects In Progress */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Briefcase className="w-4 h-4" />
          Quanti progetti hai in corso adesso?
        </label>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...data,
                projectsInProgress: Math.max(0, data.projectsInProgress - 1)
              })
            }
            disabled={data.projectsInProgress === 0}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold text-xl hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            -
          </button>

          <div className="flex-1 text-center">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {data.projectsInProgress}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              progetti in corso
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onChange({
                ...data,
                projectsInProgress: Math.min(
                  data.weeklyCapacity,
                  data.projectsInProgress + 1
                )
              })
            }
            disabled={data.projectsInProgress >= data.weeklyCapacity}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold text-xl hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Info Box */}
      {capacityStatus === 'full' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              Capacità piena
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Ti mostreremo meno lead nella sezione "Per Te" finché non liberi slot.
              Aggiorna questo numero quando completi un progetto.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Riepilogo:</strong> Puoi gestire fino a {data.weeklyCapacity} lead/settimana.
          {data.projectsInProgress > 0 && (
            <> Con {data.projectsInProgress} progetti in corso, hai {availableCapacity} slot disponibili.</>
          )}
        </p>
      </div>
    </div>
  )
}
