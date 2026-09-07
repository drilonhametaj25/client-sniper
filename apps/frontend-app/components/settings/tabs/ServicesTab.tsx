/**
 * Tab Servizi — servizi offerti, budget preferito e preferenze lead - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Servizi")
 * Salva su: users (services_offered, preferred_min_budget, preferred_max_budget)
 * Usa il componente condiviso ServicesEditor (stessa UI dell'onboarding).
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { RefreshCw, Save } from 'lucide-react'
import ServicesEditor from '@/components/settings/ServicesEditor'
import LeadPreferencesSection from '@/components/settings/LeadPreferencesSection'
import type { ServiceType } from '@/lib/types/services'

export default function ServicesTab() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [servicesOffered, setServicesOffered] = useState<ServiceType[]>([])
  const [preferredMinBudget, setPreferredMinBudget] = useState<number | ''>('')
  const [preferredMaxBudget, setPreferredMaxBudget] = useState<number | ''>('')
  const [savingServices, setSavingServices] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('services_offered, preferred_min_budget, preferred_max_budget')
          .eq('id', user.id)
          .single()

        setServicesOffered((dbUser?.services_offered || []) as ServiceType[])
        setPreferredMinBudget(dbUser?.preferred_min_budget || '')
        setPreferredMaxBudget(dbUser?.preferred_max_budget || '')
      } catch (error) {
        console.error('Errore caricamento servizi:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const handleSaveServices = async () => {
    if (!user?.id) return
    setSavingServices(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          services_offered: servicesOffered,
          preferred_min_budget: preferredMinBudget === '' ? null : Number(preferredMinBudget),
          preferred_max_budget: preferredMaxBudget === '' ? null : Number(preferredMaxBudget)
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Servizi e preferenze salvati con successo!')

      // Refresh profile per aggiornare AuthContext
      if (refreshProfile) {
        await refreshProfile()
      }
    } catch (error: any) {
      console.error('Errore salvataggio servizi:', error)
      toast.error('Errore', error.message)
    } finally {
      setSavingServices(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* I Tuoi Servizi - Match Calculation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-4">
          <span className="text-xl mr-2" aria-hidden="true">🎯</span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">I Tuoi Servizi</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Questi servizi decidono quali clienti ti mostriamo.
        </p>

        {/* Selezione Servizi (componente condiviso con l'onboarding) */}
        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Servizi che offri
          </label>
          <ServicesEditor
            value={servicesOffered}
            onChange={setServicesOffered}
            compact
          />
          {servicesOffered.length > 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
              {servicesOffered.length} servizi selezionati
            </p>
          )}
        </div>

        {/* Preferenze Budget (opzionale) */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Range budget preferito (opzionale)
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            I lead con budget in questo range avranno un match score più alto
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  type="number"
                  placeholder="Min (es. 500)"
                  value={preferredMinBudget}
                  onChange={(e) => setPreferredMinBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  min="0"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <span className="text-gray-400">-</span>
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  type="number"
                  placeholder="Max (es. 5000)"
                  value={preferredMaxBudget}
                  onChange={(e) => setPreferredMaxBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  min="0"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottone Salva */}
        <button
          onClick={handleSaveServices}
          disabled={savingServices}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {savingServices ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salva Preferenze Servizi
            </>
          )}
        </button>
      </div>

      {/* Preferenze Lead - Configurazione Avanzata */}
      <LeadPreferencesSection />
    </div>
  )
}
