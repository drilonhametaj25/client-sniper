'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Bell, Mail, Clock, Save, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface NotificationPreferences {
  emailDigestEnabled: boolean
  emailDigestFrequency: 'realtime' | 'daily' | 'weekly'
  notifyNewLeads: boolean
  notifyHighScoreLeads: boolean
  notifyCreditsLow: boolean
  notifyCreditsReset: boolean
  notifyFollowUpReminder: boolean
  notifySavedSearchMatch: boolean
  highScoreThreshold: number
  creditsLowThreshold: number
  preferredSendHour: number
  timezone: string
}

export default function NotificationSettings() {
  const { session } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (session?.access_token) {
      fetchPreferences()
    }
  }, [session?.access_token])

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const data = await res.json()
      if (data.success) {
        setPreferences(data.data)
      }
    } catch (err) {
      console.error('Error fetching preferences:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preferences) return

    try {
      setIsSaving(true)
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(preferences)
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error saving preferences:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return
    setPreferences({ ...preferences, [key]: value })
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (!preferences) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Preferenze Notifiche
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personalizza come e quando ricevere aggiornamenti
          </p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Email Digest */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Riepilogo Email
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ricevi un riassunto dei nuovi lead
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailDigestEnabled}
                onChange={(e) => updatePreference('emailDigestEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
            </label>
          </div>

          {preferences.emailDigestEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="ml-8 space-y-3"
            >
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Frequenza
                </label>
                <div className="flex gap-2">
                  {(['realtime', 'daily', 'weekly'] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => updatePreference('emailDigestFrequency', freq)}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        preferences.emailDigestFrequency === freq
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {freq === 'realtime' ? 'Immediata' : freq === 'daily' ? 'Giornaliera' : 'Settimanale'}
                    </button>
                  ))}
                </div>
              </div>

              {preferences.emailDigestFrequency !== 'realtime' && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    Orario invio:
                  </label>
                  <select
                    value={preferences.preferredSendHour}
                    onChange={(e) => updatePreference('preferredSendHour', parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Notification Types */}
        <div className="space-y-3">
          <p className="font-medium text-gray-900 dark:text-white">
            Tipi di notifiche
          </p>

          {[
            {
              key: 'notifyNewLeads' as const,
              label: 'Nuovi lead',
              description: 'Quando vengono aggiunti nuovi lead nella tua zona'
            },
            {
              key: 'notifyHighScoreLeads' as const,
              label: 'Lead ad alto potenziale',
              description: 'Lead con score basso (siti web problematici)'
            },
            {
              key: 'notifyCreditsLow' as const,
              label: 'Crediti in esaurimento',
              description: 'Quando i crediti stanno per terminare'
            },
            {
              key: 'notifyCreditsReset' as const,
              label: 'Reset crediti',
              description: 'Quando i crediti mensili vengono ripristinati'
            },
            {
              key: 'notifyFollowUpReminder' as const,
              label: 'Promemoria follow-up',
              description: 'Ricordati di ricontattare i lead'
            },
            {
              key: 'notifySavedSearchMatch' as const,
              label: 'Match alert salvati',
              description: 'Nuovi lead che corrispondono ai tuoi alert'
            }
          ].map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2"
            >
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(e) => updatePreference(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
              </label>
            </div>
          ))}
        </div>

        {/* Thresholds */}
        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">
            Soglie
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Soglia score alto potenziale
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={50}
                  value={preferences.highScoreThreshold}
                  onChange={(e) => updatePreference('highScoreThreshold', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                  {preferences.highScoreThreshold}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Notifica se score ≤ {preferences.highScoreThreshold}
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Soglia crediti bassi
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={preferences.creditsLowThreshold}
                  onChange={(e) => updatePreference('creditsLowThreshold', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                  {preferences.creditsLowThreshold}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Notifica se crediti ≤ {preferences.creditsLowThreshold}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:opacity-50`}
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Salvato!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvataggio...' : 'Salva Preferenze'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
