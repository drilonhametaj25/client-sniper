'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { X, Bell, BellOff, Plus, Trash2, Save, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SavedSearch {
  id: string
  name: string
  categories: string[]
  cities: string[]
  scoreMin: number
  scoreMax: number
  hasEmail?: boolean
  hasPhone?: boolean
  filterNoSsl: boolean
  filterSlowLoading: boolean
  filterNoAnalytics: boolean
  filterNoFacebookPixel: boolean
  alertEnabled: boolean
  alertFrequency: 'realtime' | 'daily' | 'weekly'
  matchesSinceLastAlert: number
}

interface SavedSearchFormProps {
  isOpen: boolean
  onClose: () => void
  initialFilters?: {
    categories?: string[]
    cities?: string[]
    scoreMin?: number
    scoreMax?: number
  }
  onSaved?: () => void
}

const CATEGORIES = [
  'Ristoranti', 'Bar', 'Pizzerie', 'Hotel', 'B&B',
  'Parrucchieri', 'Estetiste', 'Palestre', 'Dentisti', 'Medici',
  'Avvocati', 'Commercialisti', 'Agenzie Immobiliari', 'Negozi',
  'Elettricisti', 'Idraulici', 'Meccanici', 'Altro'
]

export default function SavedSearchForm({
  isOpen,
  onClose,
  initialFilters,
  onSaved
}: SavedSearchFormProps) {
  const { session, profile } = useAuth()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)

  // Form state per nuovo alert
  const [newSearch, setNewSearch] = useState({
    name: '',
    categories: initialFilters?.categories || [],
    cities: initialFilters?.cities || [],
    scoreMin: initialFilters?.scoreMin || 0,
    scoreMax: initialFilters?.scoreMax || 100,
    alertEnabled: true,
    alertFrequency: 'daily' as const
  })

  const tier = profile?.subscription_tier || 'free'
  const maxAlerts = tier === 'free' ? 1 : tier === 'pro' || tier === 'starter' ? 5 : 20

  useEffect(() => {
    if (isOpen && session?.access_token) {
      fetchSearches()
    }
  }, [isOpen, session?.access_token])

  useEffect(() => {
    if (initialFilters) {
      setNewSearch((prev) => ({
        ...prev,
        categories: initialFilters.categories || prev.categories,
        cities: initialFilters.cities || prev.cities,
        scoreMin: initialFilters.scoreMin ?? prev.scoreMin,
        scoreMax: initialFilters.scoreMax ?? prev.scoreMax
      }))
      setShowNewForm(true)
    }
  }, [initialFilters])

  const fetchSearches = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/saved-searches', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const data = await res.json()
      if (data.success) {
        setSearches(data.data)
      }
    } catch (err) {
      console.error('Error fetching searches:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!newSearch.name.trim()) {
      setError('Inserisci un nome per l\'alert')
      return
    }

    if (searches.length >= maxAlerts) {
      setError(`Hai raggiunto il limite di ${maxAlerts} alert. Passa a un piano superiore.`)
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newSearch)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante il salvataggio')
        return
      }

      await fetchSearches()
      setNewSearch({
        name: '',
        categories: [],
        cities: [],
        scoreMin: 0,
        scoreMax: 100,
        alertEnabled: true,
        alertFrequency: 'daily'
      })
      setShowNewForm(false)
      onSaved?.()

    } catch (err) {
      setError('Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/saved-searches/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      setSearches((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error('Error deleting search:', err)
    }
  }

  const handleToggleAlert = async (search: SavedSearch) => {
    try {
      await fetch(`/api/saved-searches/${search.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ alertEnabled: !search.alertEnabled })
      })
      setSearches((prev) =>
        prev.map((s) =>
          s.id === search.id ? { ...s, alertEnabled: !s.alertEnabled } : s
        )
      )
    } catch (err) {
      console.error('Error toggling alert:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Lead Alerts
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ricevi notifiche quando arrivano nuovi lead che corrispondono ai tuoi criteri
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Existing Alerts */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">
                I tuoi Alert ({searches.length}/{maxAlerts})
              </h3>
              {searches.length < maxAlerts && !showNewForm && (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nuovo Alert
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : searches.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Bell className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Non hai ancora creato nessun alert
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {searches.map((search) => (
                  <div
                    key={search.id}
                    className={`p-3 rounded-lg border ${
                      search.alertEnabled
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {search.name}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            search.alertEnabled
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                            {search.alertEnabled ? 'Attivo' : 'Disattivo'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {search.categories.length > 0 && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                              {search.categories.length} categorie
                            </span>
                          )}
                          {search.cities.length > 0 && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                              {search.cities.length} città
                            </span>
                          )}
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                            Score: {search.scoreMin}-{search.scoreMax}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleToggleAlert(search)}
                          className={`p-2 rounded-lg transition-colors ${
                            search.alertEnabled
                              ? 'hover:bg-blue-200 dark:hover:bg-blue-800'
                              : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title={search.alertEnabled ? 'Disattiva' : 'Attiva'}
                        >
                          {search.alertEnabled ? (
                            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <BellOff className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(search.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Alert Form */}
          <AnimatePresence>
            {showNewForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200 dark:border-gray-700 pt-4"
              >
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  Crea nuovo Alert
                </h3>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome dell'Alert *
                    </label>
                    <input
                      type="text"
                      value={newSearch.name}
                      onChange={(e) => setNewSearch({ ...newSearch, name: e.target.value })}
                      placeholder="Es. Ristoranti Milano"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Categorie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Categorie
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.slice(0, 8).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            const cats = newSearch.categories.includes(cat)
                              ? newSearch.categories.filter((c) => c !== cat)
                              : [...newSearch.categories, cat]
                            setNewSearch({ ...newSearch, categories: cats })
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            newSearch.categories.includes(cat)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Score Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Score minimo
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newSearch.scoreMin}
                        onChange={(e) => setNewSearch({ ...newSearch, scoreMin: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Score massimo
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newSearch.scoreMax}
                        onChange={(e) => setNewSearch({ ...newSearch, scoreMax: parseInt(e.target.value) || 100 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Frequenza */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Frequenza notifiche
                    </label>
                    <div className="flex gap-2">
                      {(['realtime', 'daily', 'weekly'] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setNewSearch({ ...newSearch, alertFrequency: freq })}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                            newSearch.alertFrequency === freq
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {freq === 'realtime' ? 'Immediata' : freq === 'daily' ? 'Giornaliera' : 'Settimanale'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowNewForm(false)
                        setError(null)
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Salvataggio...' : 'Salva Alert'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upgrade CTA */}
          {searches.length >= maxAlerts && tier === 'free' && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white">
              <h4 className="font-semibold mb-1">Vuoi più Alert?</h4>
              <p className="text-sm text-white/80 mb-3">
                Con il piano Pro puoi creare fino a 5 alert personalizzati
              </p>
              <a
                href="/upgrade"
                className="inline-block px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Passa a Pro
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
