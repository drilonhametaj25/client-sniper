/**
 * Pannello Admin per gestione richieste sostituzione lead - TrovaMi.pro
 * Permette agli admin di visualizzare e processare richieste di sostituzione
 * Usato da: Admin dashboard
 * Accessibile solo da utenti con ruolo admin
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Check, 
  X, 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  ExternalLink
} from 'lucide-react'

interface ReplacementRequest {
  id: string
  user_id: string
  lead_id: string
  lead_details: {
    business_name: string
    website_url?: string
    phone?: string
    city: string
    category: string
  }
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_response?: string
  created_at: string
  processed_at?: string
  replacement_credit_given: boolean
  user: {
    id: string
    email: string
    plan: string
  }
  processed_by_user?: {
    id: string
    email: string
  }
}

interface Statistics {
  total: number
  pending: number
  approved: number
  rejected: number
}

export default function AdminReplacementManagement() {
  const [requests, setRequests] = useState<ReplacementRequest[]>([])
  const [statistics, setStatistics] = useState<Statistics>({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<ReplacementRequest | null>(null)
  const [adminResponse, setAdminResponse] = useState('')

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    try {
      setLoading(true)
      
      // Ottieni il token di sessione
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Sessione scaduta, effettua nuovamente il login')
        return
      }

      const response = await fetch(`/api/admin/replacements?status=${filter}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()

      if (response.ok) {
        setRequests(data.requests)
        setStatistics(data.statistics)
      } else {
        console.error('Errore caricamento richieste:', data.error)
        alert('Errore caricamento richieste: ' + data.error)
      }
    } catch (error) {
      console.error('Errore caricamento richieste:', error)
      alert('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!adminResponse.trim()) {
      alert('Inserisci una risposta per l\'utente')
      return
    }

    setProcessing(requestId)

    try {
      // Ottieni il token di sessione
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Sessione scaduta, effettua nuovamente il login')
        return
      }

      const response = await fetch('/api/admin/replacements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requestId,
          action,
          adminResponse: adminResponse.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Richiesta ${action === 'approve' ? 'approvata' : 'rifiutata'} con successo`)
        setSelectedRequest(null)
        setAdminResponse('')
        await loadRequests()
      } else {
        alert('Errore: ' + data.error)
      }
    } catch (error) {
      console.error('Errore processamento richiesta:', error)
      alert('Errore durante il processamento')
    } finally {
      setProcessing(null)
    }
  }

  const filteredRequests = requests.filter(request =>
    request.lead_details.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.reason.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
            <Clock className="w-3 h-3 mr-1" />
            In attesa
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
            <Check className="w-3 h-3 mr-1" />
            Approvata
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
            <X className="w-3 h-3 mr-1" />
            Rifiutata
          </span>
        )
      default:
        return null
    }
  }

  const getPlanBadge = (plan: string) => {
    const colors = {
      free: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100',
      starter: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      pro: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      agency: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
    }
    
    const color = colors[plan as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {plan}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con statistiche */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Gestione Sostituzioni Lead
        </h1>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Totale Richieste</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statistics.pending}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Attesa</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.approved}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Approvate</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{statistics.rejected}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Rifiutate</div>
          </div>
        </div>
      </div>

      {/* Filtri e ricerca */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">In Attesa</option>
              <option value="approved">Approvate</option>
              <option value="rejected">Rifiutate</option>
            </select>
          </div>
          
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per business, email utente o motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista richieste */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento richieste...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Nessuna richiesta trovata</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {request.lead_details.business_name}
                      </h3>
                      {getStatusBadge(request.status)}
                      {getPlanBadge(request.user.plan)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <User className="w-4 h-4 inline mr-1" />
                          {request.user.email}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {request.lead_details.city} • {request.lead_details.category}
                        </p>
                        {request.lead_details.website_url && (
                          <a
                            href={request.lead_details.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 inline-flex items-center"
                          >
                            {request.lead_details.website_url}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 mb-3">
                      <p className="text-sm text-gray-800 dark:text-gray-100">
                        <strong>Motivo:</strong> {request.reason}
                      </p>
                    </div>

                    {request.admin_response && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 mb-3">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <strong>Risposta Admin:</strong> {request.admin_response}
                        </p>
                        {request.processed_by_user && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Processata da {request.processed_by_user.email} il{' '}
                            {request.processed_at ? new Date(request.processed_at).toLocaleDateString() : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="ml-4">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Processa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal processamento */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Processa Richiesta Sostituzione
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Business:</strong> {selectedRequest.lead_details.business_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Utente:</strong> {selectedRequest.user.email}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <strong>Motivo:</strong> {selectedRequest.reason}
              </p>
            </div>

            <textarea
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              placeholder="Inserisci la tua risposta per l'utente..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />

            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => handleProcessRequest(selectedRequest.id, 'approve')}
                disabled={processing === selectedRequest.id || !adminResponse.trim()}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                {processing === selectedRequest.id ? 'Elaborazione...' : 'Approva'}
              </button>
              <button
                onClick={() => handleProcessRequest(selectedRequest.id, 'reject')}
                disabled={processing === selectedRequest.id || !adminResponse.trim()}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                {processing === selectedRequest.id ? 'Elaborazione...' : 'Rifiuta'}
              </button>
              <button
                onClick={() => {
                  setSelectedRequest(null)
                  setAdminResponse('')
                }}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
