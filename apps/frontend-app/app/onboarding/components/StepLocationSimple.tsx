/**
 * StepLocationSimple - Step 3 del nuovo onboarding
 *
 * Input città principale + checkbox remoto.
 * Una delle due opzioni richiesta per continuare.
 */

'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Globe, AlertCircle } from 'lucide-react'
import type { StepProps } from '@/lib/types/onboarding-v2'
import { validateStep3 } from '@/lib/types/onboarding-v2'

export default function StepLocationSimple({
  data,
  onUpdate,
  onNext,
  onBack
}: StepProps) {
  const [showError, setShowError] = useState(false)

  const isValid = validateStep3(data)

  const handleCityChange = (value: string) => {
    onUpdate({ operating_city: value })
    setShowError(false)
  }

  const handleRemoteChange = (checked: boolean) => {
    onUpdate({ is_remote_nationwide: checked })
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
          Dove lavori?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Ti mostreremo opportunità nella tua zona
        </p>
      </div>

      {/* City Input */}
      <div className="mb-6">
        <label
          htmlFor="city"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          <MapPin className="inline w-4 h-4 mr-1" />
          Città principale
        </label>
        <input
          type="text"
          id="city"
          value={data.operating_city || ''}
          onChange={(e) => handleCityChange(e.target.value)}
          placeholder="es. Milano, Roma, Napoli..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-sm text-gray-500 dark:text-gray-400">oppure</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Remote Checkbox */}
      <label
        className={`
          flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
          ${data.is_remote_nationwide
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
          }
        `}
      >
        <input
          type="checkbox"
          checked={data.is_remote_nationwide || false}
          onChange={(e) => handleRemoteChange(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Lavoro in remoto per tutta Italia
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Vedrai opportunità da tutte le città italiane
          </p>
        </div>
      </label>

      {/* Help text */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
        Puoi sempre modificare queste preferenze dalle impostazioni
      </p>

      {/* Error message */}
      {showError && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-4 justify-center">
          <AlertCircle className="w-4 h-4" />
          Inserisci una città o seleziona "remoto"
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
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
