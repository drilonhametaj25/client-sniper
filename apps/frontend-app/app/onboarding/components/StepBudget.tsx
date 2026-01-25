/**
 * Step 3: Budget Range Preferito
 *
 * Selezione range budget progetti con slider.
 *
 * @file apps/frontend-app/app/onboarding/components/StepBudget.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { OnboardingStep3Data } from '@/lib/types/onboarding'
import { Euro, TrendingUp } from 'lucide-react'

interface StepBudgetProps {
  data: OnboardingStep3Data
  onChange: (data: OnboardingStep3Data) => void
}

// Budget presets
const BUDGET_PRESETS = [
  { label: 'Piccoli progetti', min: 200, max: 1000 },
  { label: 'Progetti medi', min: 500, max: 3000 },
  { label: 'Progetti grandi', min: 2000, max: 10000 },
  { label: 'Enterprise', min: 5000, max: 50000 }
]

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value)
}

export default function StepBudget({ data, onChange }: StepBudgetProps) {
  const [minValue, setMinValue] = useState(data.budgetMin)
  const [maxValue, setMaxValue] = useState(data.budgetMax)

  // Sync with parent on change
  useEffect(() => {
    const debounce = setTimeout(() => {
      onChange({ budgetMin: minValue, budgetMax: maxValue })
    }, 100)
    return () => clearTimeout(debounce)
  }, [minValue, maxValue])

  const handleMinChange = (value: number) => {
    const newMin = Math.min(value, maxValue - 100)
    setMinValue(newMin)
  }

  const handleMaxChange = (value: number) => {
    const newMax = Math.max(value, minValue + 100)
    setMaxValue(newMax)
  }

  const applyPreset = (preset: typeof BUDGET_PRESETS[0]) => {
    setMinValue(preset.min)
    setMaxValue(preset.max)
  }

  // Calculate slider positions for visual
  const minPercent = (Math.log10(minValue) - Math.log10(100)) / (Math.log10(100000) - Math.log10(100)) * 100
  const maxPercent = (Math.log10(maxValue) - Math.log10(100)) / (Math.log10(100000) - Math.log10(100)) * 100

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Indica il range di budget dei progetti che preferisci gestire.
        </p>
      </div>

      {/* Current Range Display */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Da</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(minValue)}
            </p>
          </div>
          <TrendingUp className="w-6 h-6 text-gray-400" />
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">A</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(maxValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
          Seleziona un preset o usa gli slider
        </p>
        <div className="grid grid-cols-2 gap-2">
          {BUDGET_PRESETS.map((preset) => {
            const isActive = preset.min === minValue && preset.max === maxValue
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {preset.label}
                <span className="block text-xs opacity-75 mt-0.5">
                  {formatCurrency(preset.min)} - {formatCurrency(preset.max)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Manual Sliders */}
      <div className="space-y-6">
        {/* Min Budget Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Euro className="w-4 h-4" />
              Budget Minimo
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatCurrency(minValue)}
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={50000}
            step={100}
            value={minValue}
            onChange={(e) => handleMinChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>

        {/* Max Budget Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Euro className="w-4 h-4" />
              Budget Massimo
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatCurrency(maxValue)}
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={50000}
            step={100}
            value={maxValue}
            onChange={(e) => handleMaxChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
      </div>

      {/* Validation Message */}
      {minValue >= maxValue && (
        <p className="text-sm text-red-500 text-center">
          Il budget minimo deve essere inferiore al massimo
        </p>
      )}

      {/* Tip */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Suggerimento:</strong> Un range ampio ti mostrerà più lead, ma un range specifico ti darà match più precisi.
        </p>
      </div>
    </div>
  )
}
