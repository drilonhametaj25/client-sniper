/**
 * QuotationTab - Tab per visualizzare il preventivo automatico generato
 * Mostra servizi consigliati con prezzi, ROI stimato, e opzione download PDF
 */

'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Mail,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Euro,
  Calendar,
  Zap,
  Shield,
  Search,
  Smartphone,
  BarChart3,
  FileCheck,
  Code
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ServiceQuotation {
  service: string
  description: string
  basePrice: number
  adjustedPrice: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedDays: number
  roiEstimate: string
  category: 'seo' | 'performance' | 'security' | 'design' | 'content' | 'compliance' | 'marketing' | 'development'
}

interface Quotation {
  leadId: string
  businessName: string
  websiteUrl: string
  services: ServiceQuotation[]
  subtotal: number
  discount?: {
    percentage: number
    reason: string
  }
  total: number
  validUntil: Date
  paymentTerms: string
  generatedAt: Date
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise'
  estimatedTotalDays: number
  roiSummary: string
}

interface QuotationTabProps {
  leadId: string
  businessName: string
}

const getCategoryIcon = (category: ServiceQuotation['category']) => {
  switch (category) {
    case 'seo':
      return <Search className="w-4 h-4" />
    case 'performance':
      return <Zap className="w-4 h-4" />
    case 'security':
      return <Shield className="w-4 h-4" />
    case 'design':
      return <Smartphone className="w-4 h-4" />
    case 'content':
      return <FileText className="w-4 h-4" />
    case 'compliance':
      return <FileCheck className="w-4 h-4" />
    case 'marketing':
      return <BarChart3 className="w-4 h-4" />
    case 'development':
      return <Code className="w-4 h-4" />
    default:
      return <FileText className="w-4 h-4" />
  }
}

const getCategoryColor = (category: ServiceQuotation['category']) => {
  switch (category) {
    case 'seo':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'performance':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'security':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'design':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'content':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'compliance':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'marketing':
      return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
    case 'development':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getPriorityColor = (priority: ServiceQuotation['priority']) => {
  switch (priority) {
    case 'critical':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300 dark:border-purple-700'
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
    case 'low':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
  }
}

const getPriorityLabel = (priority: ServiceQuotation['priority']) => {
  switch (priority) {
    case 'critical':
      return 'Critico'
    case 'high':
      return 'Alta'
    case 'medium':
      return 'Media'
    case 'low':
      return 'Bassa'
    default:
      return priority
  }
}

const getComplexityLabel = (complexity: Quotation['complexity']) => {
  switch (complexity) {
    case 'simple':
      return 'Semplice'
    case 'medium':
      return 'Media'
    case 'complex':
      return 'Complesso'
    case 'enterprise':
      return 'Enterprise'
    default:
      return complexity
  }
}

const getComplexityColor = (complexity: Quotation['complexity']) => {
  switch (complexity) {
    case 'simple':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'complex':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'enterprise':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function QuotationTab({ leadId, businessName }: QuotationTabProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set())
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadQuotation()
  }, [leadId])

  const loadQuotation = async () => {
    try {
      setLoading(true)
      setError(null)

      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        setError('Sessione scaduta')
        return
      }

      const response = await fetch(`/api/leads/${leadId}/quotation`, {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore nel caricamento del preventivo')
      }

      const data = await response.json()
      setQuotation(data)

      // Seleziona tutti i servizi di default
      if (data.services) {
        setSelectedServices(new Set(data.services.map((_: any, i: number) => i)))
      }
    } catch (err) {
      console.error('Error loading quotation:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  const toggleService = (index: number) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const toggleServiceSelection = (index: number) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const getSelectedTotal = () => {
    if (!quotation) return 0
    return quotation.services
      .filter((_, i) => selectedServices.has(i))
      .reduce((sum, s) => sum + s.adjustedPrice, 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Generazione preventivo...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={loadQuotation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Riprova
        </button>
      </div>
    )
  }

  if (!quotation || quotation.services.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Nessun intervento necessario
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Il sito è già ben ottimizzato. Non sono stati identificati problemi che richiedono interventi.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">Preventivo Automatico</h3>
            <p className="text-blue-100 text-sm">
              Generato il {new Date(quotation.generatedAt).toLocaleDateString('it-IT')}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getComplexityColor(quotation.complexity)}`}>
            {getComplexityLabel(quotation.complexity)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{formatCurrency(quotation.total)}</div>
            <div className="text-blue-100 text-sm">Totale Stimato</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{quotation.services.length}</div>
            <div className="text-blue-100 text-sm">Servizi</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{quotation.estimatedTotalDays}</div>
            <div className="text-blue-100 text-sm">Giorni</div>
          </div>
        </div>

        {quotation.discount && (
          <div className="mt-4 bg-white/10 rounded-lg p-3 text-center">
            <span className="text-sm">
              {quotation.discount.reason}: <strong>-{quotation.discount.percentage}%</strong> (Risparmi {formatCurrency(quotation.subtotal - quotation.total)})
            </span>
          </div>
        )}
      </div>

      {/* ROI Summary */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">ROI Stimato</h4>
            <p className="text-sm text-green-700 dark:text-green-300">{quotation.roiSummary}</p>
          </div>
        </div>
      </div>

      {/* Lista Servizi */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Servizi Consigliati
        </h4>

        {quotation.services.map((service, index) => {
          const isExpanded = expandedServices.has(index)
          const isSelected = selectedServices.has(index)

          return (
            <div
              key={index}
              className={`border rounded-xl overflow-hidden transition-all ${
                isSelected
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleService(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleServiceSelection(index)
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    {/* Category Icon */}
                    <div className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}>
                      {getCategoryIcon(service.category)}
                    </div>

                    {/* Service Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {service.service}
                        </h5>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(service.priority)}`}>
                          {getPriorityLabel(service.priority)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  {/* Price and Expand */}
                  <div className="flex items-center space-x-4 ml-4">
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(service.adjustedPrice)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-end">
                        <Clock className="w-3 h-3 mr-1" />
                        {service.estimatedDays} giorni
                      </div>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                  <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ROI Stimato</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{service.roiEstimate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Totale Selezionato */}
      {selectedServices.size > 0 && selectedServices.size < quotation.services.length && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedServices.size} servizi selezionati
            </span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(getSelectedTotal())}
            </span>
          </div>
        </div>
      )}

      {/* Payment Terms */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
          <Euro className="w-4 h-4 mr-2" />
          Termini di Pagamento
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{quotation.paymentTerms}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          Preventivo valido fino al {new Date(quotation.validUntil).toLocaleDateString('it-IT')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            // TODO: Implementare download PDF
            alert('Funzionalità PDF in arrivo!')
          }}
          className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Scarica PDF</span>
        </button>

        <button
          onClick={() => {
            // TODO: Implementare invio email
            alert('Funzionalità Email in arrivo!')
          }}
          className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Mail className="w-4 h-4" />
          <span>Invia via Email</span>
        </button>
      </div>
    </div>
  )
}
