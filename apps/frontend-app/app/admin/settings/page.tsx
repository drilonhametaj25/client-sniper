'use client'

// Pannello admin per gestione settings: configurazione limiti piani, 
// impostazioni scraping, mantenimento sistema e controllo parametri globali
// Accessibile solo agli utenti con ruolo 'admin'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Shield, 
  Users, 
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Globe,
  Mail,
  Database,
  Clock
} from 'lucide-react'

interface Setting {
  id: number
  key: string
  value: string
  description: string
  updated_at: string
}

interface SettingGroup {
  title: string
  icon: any
  settings: Setting[]
}

export default function AdminSettings() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Redirect se non admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    try {
      setLoadingData(true)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key')

      if (error) throw error
      
      const settingsData = data || []
      setSettings(settingsData)
      
      // Inizializza formValues con i valori attuali dal database
      const currentValues = settingsData.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string>)
      
      setFormValues(currentValues)
      setHasChanges(false)

    } catch (error) {
      console.error('Errore caricamento settings:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Controlla se ci sono modifiche confrontando con i valori originali
    const originalValue = settings.find(s => s.key === key)?.value
    const hasChange = originalValue !== value
    
    setHasChanges(hasChange || Object.entries(formValues).some(([k, v]) => {
      if (k === key) return false // Ignora questo valore, lo stiamo aggiornando
      const original = settings.find(s => s.key === k)?.value
      return original !== v
    }))
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      
      // Salva solo i settings che sono cambiati
      const promises = Object.entries(formValues).map(([key, value]) => {
        const originalSetting = settings.find(s => s.key === key)
        if (originalSetting && originalSetting.value !== value) {
          return supabase.rpc('update_setting', {
            setting_key: key,
            setting_value: value
          })
        }
        return Promise.resolve()
      })

      await Promise.all(promises)
      await loadSettings() // Ricarica per vedere le modifiche
      
      // Mostra successo
      alert('Impostazioni salvate con successo!')

    } catch (error) {
      console.error('Errore salvataggio settings:', error)
      alert('Errore durante il salvataggio delle impostazioni')
    } finally {
      setSaving(false)
    }
  }

  const getSettingGroups = (): SettingGroup[] => {
    return [
      {
        title: 'Limiti Piani',
        icon: Users,
        settings: settings.filter(s => s.key.includes('_limit'))
      },
      {
        title: 'Scraping',
        icon: Target,
        settings: settings.filter(s => s.key.includes('scraping') || s.key.includes('zones'))
      },
      {
        title: 'Sistema',
        icon: Database,
        settings: settings.filter(s => ['maintenance_mode', 'default_plan', 'email_notifications'].includes(s.key))
      },
      {
        title: 'Integrations',
        icon: Globe,
        settings: settings.filter(s => s.key.includes('webhook') || s.key.includes('stripe'))
      }
    ]
  }

  const getInputType = (key: string): string => {
    if (key.includes('limit') || key.includes('max_') || key.includes('interval')) {
      return 'number'
    }
    if (key.includes('url') || key.includes('webhook')) {
      return 'url'
    }
    if (key.includes('email')) {
      return 'email'
    }
    if (key === 'maintenance_mode' || key === 'email_notifications') {
      return 'select'
    }
    if (key === 'default_plan') {
      return 'select'
    }
    return 'text'
  }

  const renderInput = (setting: Setting) => {
    const inputType = getInputType(setting.key)
    const value = formValues[setting.key] !== undefined ? formValues[setting.key] : setting.value

    if (inputType === 'select') {
      let options: { value: string; label: string }[] = []
      
      if (setting.key === 'maintenance_mode' || setting.key === 'email_notifications') {
        options = [
          { value: 'true', label: 'Abilitato' },
          { value: 'false', label: 'Disabilitato' }
        ]
      } else if (setting.key === 'default_plan') {
        options = [
          { value: 'free', label: 'Free' },
          { value: 'starter', label: 'Starter' },
          { value: 'pro', label: 'Pro' }
        ]
      }

      return (
        <select
          value={value}
          onChange={(e) => updateSetting(setting.key, e.target.value)}
          className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => updateSetting(setting.key, e.target.value)}
        placeholder={setting.description}
        className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      />
    )
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Caricamento impostazioni...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const settingGroups = getSettingGroups()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Admin</span> Settings
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Configura limiti, parametri di sistema e integrazioni
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pannello Amministrazione</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gestisci configurazioni di sistema
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={loadSettings}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                <span>Ricarica</span>
              </button>

              <button
                onClick={saveSettings}
                disabled={saving || !hasChanges}
                className={`flex items-center space-x-2 px-6 py-2 rounded-xl transition-all disabled:opacity-50 ${
                  hasChanges 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                }`}
              >
                <Save className="h-4 w-4" />
                <span>
                  {saving ? 'Salvando...' : hasChanges ? 'Salva Modifiche' : 'Nessuna Modifica'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {settingGroups.map((group, index) => (
            <div
              key={group.title}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <group.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {group.title}
                </h3>
              </div>

              <div className="space-y-6">
                {group.settings.map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      {setting.value !== formValues[setting.key] && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Modificato
                        </span>
                      )}
                    </div>
                    
                    {renderInput(setting)}
                    
                    {setting.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {setting.description}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Ultimo aggiornamento: {new Date(setting.updated_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Status Info */}
        <div className="mt-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Stato Sistema
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Database: Attivo
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Auth: Connesso
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Manutenzione: {formValues.maintenance_mode === 'true' ? 'Attiva' : 'Disattiva'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
