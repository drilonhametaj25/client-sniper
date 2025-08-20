// Componente per gestire richieste di sostituzione lead - TrovaMi.pro
// Mostra informazioni sulle sostituzioni disponibili e permette di richiederne
// Utilizzato in: Dashboard, lead details page
// Supporta: Richiesta sostituzione, stato mensile, storico richieste

'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Check, X, Clock, Info } from 'lucide-react'

interface ReplacementInfo {
  replacements_used: number
  replacements_limit: number
  replacements_remaining: number
}

interface ReplacementRequest {
  id: string
  lead_id: string
  lead_details: {
    business_name: string
    website_url?: string
    city: string
    category: string
  }
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_response?: string
  created_at: string
  processed_at?: string
}

interface LeadReplacementProps {
  leadId?: string
  leadDetails?: {
    business_name: string
    website_url?: string
    phone?: string
    city: string
    category: string
  }
}

export default function LeadReplacement({ leadId, leadDetails }: LeadReplacementProps) {
  const [replacementInfo, setReplacementInfo] = useState<ReplacementInfo | null>(null)
  const [recentRequests, setRecentRequests] = useState<ReplacementRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    loadReplacementData()
  }, [])

  const loadReplacementData = async () => {
    try {
      const response = await fetch('/api/replacements')
      const data = await response.json()

      if (response.ok) {
        setReplacementInfo(data.replacement_info)
        setRecentRequests(data.recent_requests)
      } else {
        console.error('Errore caricamento dati sostituzioni:', data.error)
      }
    } catch (error) {
      console.error('Errore caricamento sostituzioni:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReplacement = async () => {
    if (!leadId || !leadDetails || !reason.trim()) {
      alert('Tutti i campi sono obbligatori')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/replacements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          reason: reason.trim(),
          leadDetails
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Richiesta di sostituzione inviata con successo!')
        setReason('')
        setShowRequestForm(false)
        await loadReplacementData() // Ricarica dati
      } else {
        alert(data.error || 'Errore durante la richiesta')
      }
    } catch (error) {
      console.error('Errore richiesta sostituzione:', error)
      alert('Errore durante la richiesta')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <Clock className="w-3 h-3 mr-1" />
            In attesa
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <Check className="w-3 h-3 mr-1" />
            Approvata
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <X className="w-3 h-3 mr-1" />
            Rifiutata
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!replacementInfo) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-800 text-sm">
            Impossibile caricare informazioni sostituzioni
          </span>
        </div>
      </div>
    )
  }

  // Se è un componente standalone (senza leadId) mostra solo le stats
  if (!leadId) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sostituzioni Mensili
        </h3>
        
        {/* Barra progresso */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Sostituzioni utilizzate</span>
            <span>{replacementInfo.replacements_used} / {replacementInfo.replacements_limit}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ 
                width: `${replacementInfo.replacements_limit > 0 ? (replacementInfo.replacements_used / replacementInfo.replacements_limit) * 100 : 0}%` 
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Rimangono {replacementInfo.replacements_remaining} sostituzioni questo mese
          </p>
        </div>

        {/* Storico recenti */}
        {recentRequests.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Richieste Recenti</h4>
            <div className="space-y-2">
              {recentRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.lead_details.business_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Verifica se esiste già una richiesta per questo lead
  const existingRequest = recentRequests.find(r => r.lead_id === leadId)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Richiesta Sostituzione
        </h3>
        <div className="text-sm text-gray-600">
          {replacementInfo.replacements_remaining} / {replacementInfo.replacements_limit} rimaste
        </div>
      </div>

      {/* Informazioni sul lead */}
      {leadDetails && (
        <div className="bg-gray-50 rounded p-3 mb-4">
          <h4 className="font-medium text-gray-900">{leadDetails.business_name}</h4>
          <p className="text-sm text-gray-600">
            {leadDetails.city} • {leadDetails.category}
          </p>
          {leadDetails.website_url && (
            <p className="text-sm text-gray-500">{leadDetails.website_url}</p>
          )}
        </div>
      )}

      {existingRequest ? (
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">Richiesta Esistente</h4>
            {getStatusBadge(existingRequest.status)}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Motivo: {existingRequest.reason}
          </p>
          <p className="text-xs text-gray-500">
            Richiesta il {new Date(existingRequest.created_at).toLocaleDateString()}
          </p>
          {existingRequest.admin_response && (
            <div className="mt-3 p-2 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                <strong>Risposta Admin:</strong> {existingRequest.admin_response}
              </p>
            </div>
          )}
        </div>
      ) : replacementInfo.replacements_remaining <= 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Info className="w-5 h-5 text-yellow-500 mr-2" />
            <div>
              <p className="text-yellow-800 text-sm font-medium">
                Limite Sostituzioni Raggiunto
              </p>
              <p className="text-yellow-700 text-xs">
                Hai utilizzato tutte le sostituzioni disponibili per questo mese.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {!showRequestForm ? (
            <button
              onClick={() => setShowRequestForm(true)}
              className="flex items-center justify-center w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Richiedi Sostituzione Lead
            </button>
          ) : (
            <div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descrivi il problema con questo lead (es: 'numero di telefono non valido', 'attività chiusa', 'già contattato'...)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={handleRequestReplacement}
                  disabled={submitting || !reason.trim()}
                  className="flex-1 py-2 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  {submitting ? 'Invio...' : 'Invia Richiesta'}
                </button>
                <button
                  onClick={() => {
                    setShowRequestForm(false)
                    setReason('')
                  }}
                  className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info sostituzioni */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Come funziona:</strong> Se un lead non è valido o già contattato, 
          puoi richiedere una sostituzione gratuita. Il nostro team verificherà la richiesta 
          e, se approvata, riceverai un credito sostitutivo.
        </p>
      </div>
    </div>
  )
}
