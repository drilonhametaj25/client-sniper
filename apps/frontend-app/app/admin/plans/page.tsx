/**
 * Pannello Admin per gestione piani configurabili - TrovaMi.pro
 * Permette agli admin di creare, modificare ed eliminare piani
 * Usato da: Admin dashboard per configurare pricing
 * Tutto configurabile: prezzi, features, Stripe keys, etc.
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Eye,
  EyeOff,
  Star,
  Zap,
  Info
} from 'lucide-react'

interface Plan {
  name: string
  price_monthly: number
  original_price_monthly: number
  max_credits: number
  description: string
  stripe_price_id_monthly: string
  stripe_price_id_annual: string
  max_replacements_monthly: number
  features: string[]
  is_visible: boolean
  sort_order: number
  badge_text: string
  max_niches: number
  has_daily_alerts: boolean
  has_lead_history: boolean
  has_csv_export: boolean
  has_statistics: boolean
  is_annual: boolean
  visible_fields: string[]
}

const defaultPlan: Omit<Plan, 'name'> = {
  price_monthly: 0,
  original_price_monthly: 0,
  max_credits: 0,
  description: '',
  stripe_price_id_monthly: '',
  stripe_price_id_annual: '',
  max_replacements_monthly: 0,
  features: [],
  is_visible: true,
  sort_order: 0,
  badge_text: '',
  max_niches: 1,
  has_daily_alerts: false,
  has_lead_history: false,
  has_csv_export: false,
  has_statistics: false,
  is_annual: false,
  visible_fields: ['business_name', 'website_url']
}

export default function AdminPlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [isNewPlan, setIsNewPlan] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      setLoading(true)
      
      // Ottieni il token di sessione
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Sessione scaduta, effettua nuovamente il login')
        return
      }

      const response = await fetch('/api/admin/plans', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()

      if (response.ok) {
        setPlans(data.plans)
      } else {
        console.error('Errore caricamento piani:', data.error)
        alert('Errore caricamento piani: ' + data.error)
      }
    } catch (error) {
      console.error('Errore caricamento piani:', error)
      alert('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePlan = async () => {
    if (!editingPlan || !editingPlan.name) {
      alert('Nome piano obbligatorio')
      return
    }

    setSaving(true)

    try {
      // Ottieni il token di sessione
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Sessione scaduta, effettua nuovamente il login')
        return
      }

      const response = await fetch('/api/admin/plans', {
        method: isNewPlan ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editingPlan)
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Piano ${isNewPlan ? 'creato' : 'aggiornato'} con successo`)
        setEditingPlan(null)
        setIsNewPlan(false)
        await loadPlans()
      } else {
        alert('Errore: ' + data.error)
      }
    } catch (error) {
      console.error('Errore salvataggio piano:', error)
      alert('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlan = async (planName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il piano "${planName}"?`)) {
      return
    }

    try {
      // Ottieni il token di sessione
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Sessione scaduta, effettua nuovamente il login')
        return
      }

      const response = await fetch('/api/admin/plans', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name: planName })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Piano eliminato con successo')
        await loadPlans()
      } else {
        alert('Errore: ' + data.error)
      }
    } catch (error) {
      console.error('Errore eliminazione piano:', error)
      alert('Errore durante l\'eliminazione')
    }
  }

  const startNewPlan = () => {
    setEditingPlan({ ...defaultPlan, name: '' } as Plan)
    setIsNewPlan(true)
  }

  const startEditPlan = (plan: Plan) => {
    setEditingPlan({ ...plan })
    setIsNewPlan(false)
  }

  const cancelEdit = () => {
    setEditingPlan(null)
    setIsNewPlan(false)
  }

  const updateEditingPlan = (field: keyof Plan, value: any) => {
    if (!editingPlan) return
    
    setEditingPlan(prev => prev ? { ...prev, [field]: value } : null)
  }

  const addFeature = () => {
    if (!editingPlan) return
    
    updateEditingPlan('features', [...editingPlan.features, ''])
  }

  const updateFeature = (index: number, value: string) => {
    if (!editingPlan) return
    
    const newFeatures = [...editingPlan.features]
    newFeatures[index] = value
    updateEditingPlan('features', newFeatures)
  }

  const removeFeature = (index: number) => {
    if (!editingPlan) return
    
    const newFeatures = editingPlan.features.filter((_, i) => i !== index)
    updateEditingPlan('features', newFeatures)
  }

  const availableFields = [
    'business_name',
    'website_url', 
    'phone',
    'email',
    'city',
    'category',
    'rating',
    'address'
  ]

  const toggleVisibleField = (field: string) => {
    if (!editingPlan) return
    
    const currentFields = editingPlan.visible_fields
    const newFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field]
    
    updateEditingPlan('visible_fields', newFields)
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Caricamento piani...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestione Piani Configurabili
        </h1>
        <button
          onClick={startNewPlan}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Piano
        </button>
      </div>

      {/* Lista piani esistenti */}
      <div className="grid gap-4">
        {plans.map((plan) => (
          <div key={plan.name} className="bg-white rounded-lg border p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  {!plan.is_visible && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Nascosto
                    </span>
                  )}
                  {plan.badge_text && (
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      plan.badge_text.includes('Popular') ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {plan.badge_text.includes('Popular') ? <Star className="w-3 h-3 mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                      {plan.badge_text}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Prezzo Mensile</p>
                    <p className="font-medium">
                      €{(plan.price_monthly / 100).toFixed(2)}
                      {plan.original_price_monthly > plan.price_monthly && (
                        <span className="text-sm text-gray-400 line-through ml-2">
                          €{(plan.original_price_monthly / 100).toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Crediti/Mese</p>
                    <p className="font-medium">{plan.max_credits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sostituzioni/Mese</p>
                    <p className="font-medium">{plan.max_replacements_monthly}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Max Nicchie</p>
                    <p className="font-medium">{plan.max_niches === 999 ? 'Illimitate' : plan.max_niches}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                
                <div className="text-xs text-gray-500">
                  Features: {plan.features.length} • 
                  Campi visibili: {plan.visible_fields.length} • 
                  Ordine: {plan.sort_order}
                </div>
              </div>

              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => startEditPlan(plan)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {plan.name !== 'free' && (
                  <button
                    onClick={() => handleDeletePlan(plan.name)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal di modifica */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isNewPlan ? 'Nuovo Piano' : `Modifica Piano: ${editingPlan.name}`}
                </h3>
                <button
                  onClick={cancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informazioni base */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Piano
                  </label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => updateEditingPlan('name', e.target.value)}
                    disabled={!isNewPlan}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="es: starter_monthly"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordine Visualizzazione
                  </label>
                  <input
                    type="number"
                    value={editingPlan.sort_order}
                    onChange={(e) => updateEditingPlan('sort_order', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Prezzi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prezzo Corrente (centesimi)
                  </label>
                  <input
                    type="number"
                    value={editingPlan.price_monthly}
                    onChange={(e) => updateEditingPlan('price_monthly', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1900 = €19.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prezzo Originale (centesimi)
                  </label>
                  <input
                    type="number"
                    value={editingPlan.original_price_monthly}
                    onChange={(e) => updateEditingPlan('original_price_monthly', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="2900 = €29.00"
                  />
                </div>
              </div>

              {/* Crediti e sostituzioni */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Crediti/Mese
                  </label>
                  <input
                    type="number"
                    value={editingPlan.max_credits}
                    onChange={(e) => updateEditingPlan('max_credits', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sostituzioni/Mese
                  </label>
                  <input
                    type="number"
                    value={editingPlan.max_replacements_monthly}
                    onChange={(e) => updateEditingPlan('max_replacements_monthly', parseInt(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Nicchie (999 = illimitate)
                  </label>
                  <input
                    type="number"
                    value={editingPlan.max_niches}
                    onChange={(e) => updateEditingPlan('max_niches', parseInt(e.target.value) || 1)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Descrizione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={editingPlan.description}
                  onChange={(e) => updateEditingPlan('description', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Descrizione mostrata nella pricing table"
                />
              </div>

              {/* Badge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={editingPlan.badge_text}
                  onChange={(e) => updateEditingPlan('badge_text', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Early Adopter, Most Popular, etc."
                />
              </div>

              {/* Stripe Price IDs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stripe Price ID Mensile
                  </label>
                  <input
                    type="text"
                    value={editingPlan.stripe_price_id_monthly}
                    onChange={(e) => updateEditingPlan('stripe_price_id_monthly', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="price_..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stripe Price ID Annuale
                  </label>
                  <input
                    type="text"
                    value={editingPlan.stripe_price_id_annual}
                    onChange={(e) => updateEditingPlan('stripe_price_id_annual', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="price_..."
                  />
                </div>
              </div>

              {/* Funzionalità booleane */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Funzionalità</h4>
                  {[
                    { key: 'has_daily_alerts', label: 'Alert Giornalieri' },
                    { key: 'has_lead_history', label: 'Storico Lead' },
                    { key: 'has_csv_export', label: 'Export CSV' },
                    { key: 'has_statistics', label: 'Statistiche' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingPlan[key as keyof Plan] as boolean}
                        onChange={(e) => updateEditingPlan(key as keyof Plan, e.target.checked)}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Opzioni</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPlan.is_visible}
                      onChange={(e) => updateEditingPlan('is_visible', e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Visibile nella Pricing Table
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingPlan.is_annual}
                      onChange={(e) => updateEditingPlan('is_annual', e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Piano Annuale
                  </label>
                </div>
              </div>

              {/* Features list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Features da Mostrare</h4>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Aggiungi
                  </button>
                </div>
                <div className="space-y-2">
                  {editingPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Descrizione feature"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campi visibili */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Campi Visibili ai Lead</h4>
                <div className="grid grid-cols-4 gap-2">
                  {availableFields.map((field) => (
                    <label key={field} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={editingPlan.visible_fields.includes(field)}
                        onChange={() => toggleVisibleField(field)}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {field.replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSavePlan}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salva Piano
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
