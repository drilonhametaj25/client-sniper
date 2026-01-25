/**
 * Step 5: Industry Preferences
 *
 * Selezione settori/categorie preferiti e da escludere.
 *
 * @file apps/frontend-app/app/onboarding/components/StepIndustries.tsx
 */

'use client'

import { useState } from 'react'
import { OnboardingStep5Data, BUSINESS_CATEGORIES } from '@/lib/types/onboarding'
import { Heart, Ban, Search, Check, X } from 'lucide-react'

interface StepIndustriesProps {
  data: OnboardingStep5Data
  onChange: (data: OnboardingStep5Data) => void
}

type TabType = 'preferred' | 'excluded'

export default function StepIndustries({ data, onChange }: StepIndustriesProps) {
  const [activeTab, setActiveTab] = useState<TabType>('preferred')
  const [search, setSearch] = useState('')

  const togglePreferred = (category: string) => {
    // Remove from excluded if present
    const newExcluded = data.excludedIndustries.filter((c) => c !== category)

    const newPreferred = data.preferredIndustries.includes(category)
      ? data.preferredIndustries.filter((c) => c !== category)
      : [...data.preferredIndustries, category]

    onChange({
      preferredIndustries: newPreferred,
      excludedIndustries: newExcluded
    })
  }

  const toggleExcluded = (category: string) => {
    // Remove from preferred if present
    const newPreferred = data.preferredIndustries.filter((c) => c !== category)

    const newExcluded = data.excludedIndustries.includes(category)
      ? data.excludedIndustries.filter((c) => c !== category)
      : [...data.excludedIndustries, category]

    onChange({
      preferredIndustries: newPreferred,
      excludedIndustries: newExcluded
    })
  }

  // Filter categories based on search
  const filteredCategories = BUSINESS_CATEGORIES.filter((cat) =>
    cat.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Indica i settori con cui preferisci lavorare e quelli che vuoi evitare.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('preferred')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'preferred'
              ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          Preferiti
          {data.preferredIndustries.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
              {data.preferredIndustries.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('excluded')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'excluded'
              ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Ban className="w-4 h-4" />
          Esclusi
          {data.excludedIndustries.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs">
              {data.excludedIndustries.length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca settore..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Selected Tags for current tab */}
      {activeTab === 'preferred' && data.preferredIndustries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.preferredIndustries.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm"
            >
              {cat}
              <button
                type="button"
                onClick={() => togglePreferred(cat)}
                className="hover:text-green-900 dark:hover:text-green-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {activeTab === 'excluded' && data.excludedIndustries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.excludedIndustries.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm"
            >
              {cat}
              <button
                type="button"
                onClick={() => toggleExcluded(cat)}
                className="hover:text-red-900 dark:hover:text-red-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
        {filteredCategories.map((category) => {
          const isPreferred = data.preferredIndustries.includes(category)
          const isExcluded = data.excludedIndustries.includes(category)
          const isSelected =
            (activeTab === 'preferred' && isPreferred) ||
            (activeTab === 'excluded' && isExcluded)

          // Determine styling based on state
          let buttonClass = 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'

          if (activeTab === 'preferred') {
            if (isPreferred) {
              buttonClass = 'bg-green-500 text-white'
            } else if (isExcluded) {
              buttonClass = 'bg-red-100 dark:bg-red-900/30 text-red-400 dark:text-red-500 opacity-50'
            }
          } else {
            if (isExcluded) {
              buttonClass = 'bg-red-500 text-white'
            } else if (isPreferred) {
              buttonClass = 'bg-green-100 dark:bg-green-900/30 text-green-400 dark:text-green-500 opacity-50'
            }
          }

          const handleClick = () => {
            if (activeTab === 'preferred') {
              togglePreferred(category)
            } else {
              toggleExcluded(category)
            }
          }

          return (
            <button
              key={category}
              type="button"
              onClick={handleClick}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${buttonClass}`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="truncate">{category}</span>
            </button>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nessun settore trovato per "{search}"
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {activeTab === 'preferred' ? (
            <>
              <strong>Settori preferiti:</strong> Vedrai più lead da questi settori nella sezione "Per Te".
            </>
          ) : (
            <>
              <strong>Settori esclusi:</strong> I lead di questi settori avranno priorità più bassa.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
