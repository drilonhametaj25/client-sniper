'use client'

// Pannello admin per gestione feedback: visualizza lista feedback degli utenti,
// permette di filtrare per tipo, stato e rispondere alle segnalazioni
// Accessibile solo agli utenti con ruolo 'admin'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Mail, 
  HelpCircle,
  Filter, 
  Search,
  ChevronDown,
  ExternalLink,
  Eye,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Send
} from 'lucide-react'
import { FeedbackReport } from '@/../../libs/types'

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500 bg-red-50' },
  { value: 'suggestion', label: 'Suggerimento', icon: Lightbulb, color: 'text-yellow-500 bg-yellow-50' },
  { value: 'contact', label: 'Contatto', icon: Mail, color: 'text-blue-500 bg-blue-50' },
  { value: 'other', label: 'Altro', icon: HelpCircle, color: 'text-gray-500 bg-gray-50' }
] as const

const STATUS_CONFIG = [
  { value: 'open', label: 'Aperto', color: 'text-orange-600 bg-orange-50', icon: AlertTriangle },
  { value: 'in_review', label: 'In Revisione', color: 'text-blue-600 bg-blue-50', icon: Clock },
  { value: 'closed', label: 'Chiuso', color: 'text-green-600 bg-green-50', icon: CheckCircle }
] as const

export default function AdminFeedback() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState<FeedbackReport[]>([])
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<FeedbackReport[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackReport | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [adminResponse, setAdminResponse] = useState('')
  const [adminNote, setAdminNote] = useState('')

  // Redirect se non admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadFeedbacks()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [feedbacks, searchTerm, filterType, filterStatus])

  const loadFeedbacks = async () => {
    try {
      setLoadingData(true)
      
      const { data, error } = await supabase.rpc('admin_get_all_feedback')
      
      if (error) {
        return
      }
      
      setFeedbacks(data || [])
    } catch (error) {
    } finally {
      setLoadingData(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...feedbacks]
    
    // Filtro per ricerca testo
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(
        feedback => 
          feedback.message.toLowerCase().includes(lowercaseSearch) ||
          feedback.email?.toLowerCase().includes(lowercaseSearch) ||
          feedback.type.toLowerCase().includes(lowercaseSearch)
      )
    }
    
    // Filtro per tipo
    if (filterType) {
      filtered = filtered.filter(feedback => feedback.type === filterType)
    }
    
    // Filtro per stato
    if (filterStatus) {
      filtered = filtered.filter(feedback => feedback.status === filterStatus)
    }
    
    setFilteredFeedbacks(filtered)
  }

  const resetFilters = () => {
    setSearchTerm('')
    setFilterType('')
    setFilterStatus('')
    setShowFilters(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeConfig = (type: string) => {
    return FEEDBACK_TYPES.find(t => t.value === type) || FEEDBACK_TYPES[0]
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG.find(s => s.value === status) || STATUS_CONFIG[0]
  }

  const handleUpdateStatus = async (feedbackId: string, newStatus: string) => {
    try {
      setIsUpdating(true)
      
      const { data, error } = await supabase.rpc('admin_update_feedback_status', {
        feedback_id: feedbackId,
        new_status: newStatus,
        admin_response: adminResponse.trim() || null,
        internal_note: adminNote.trim() || null
      })
      
      if (error) {
        alert(`Errore: ${error.message}`)
        return
      }
      
      if (!data.success) {
        alert(`Errore: ${data.error}`)
        return
      }
      
      // Aggiorna lo stato locale
      setFeedbacks(prev =>
        prev.map(f => 
          f.id === feedbackId 
            ? { 
                ...f, 
                status: newStatus as any,
                response: adminResponse.trim() || f.response,
                admin_note: adminNote.trim() || f.admin_note
              }
            : f
        )
      )
      
      // Reset form
      setAdminResponse('')
      setAdminNote('')
      setSelectedFeedback(null)
      
    } catch (error) {
      alert('Si è verificato un errore durante l\'aggiornamento')
    } finally {
      setIsUpdating(false)
    }
  }

  const openFeedbackDetail = (feedback: FeedbackReport) => {
    setSelectedFeedback(feedback)
    setAdminResponse(feedback.response || '')
    setAdminNote(feedback.admin_note || '')
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <MessageSquare className="mr-2" /> Gestione Feedback
          </h1>
          <p className="text-gray-500">
            Segnalazioni, suggerimenti e richieste degli utenti
          </p>
        </div>
      </div>
      
      {/* Statistiche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex justify-between">
            <h3 className="text-gray-500 font-medium">Totale Feedback</h3>
            <MessageSquare className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{feedbacks.length}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex justify-between">
            <h3 className="text-gray-500 font-medium">Aperti</h3>
            <AlertTriangle className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold">
            {feedbacks.filter(f => f.status === 'open').length}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex justify-between">
            <h3 className="text-gray-500 font-medium">In Revisione</h3>
            <Clock className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold">
            {feedbacks.filter(f => f.status === 'in_review').length}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex justify-between">
            <h3 className="text-gray-500 font-medium">Chiusi</h3>
            <CheckCircle className="text-green-500" />
          </div>
          <p className="text-2xl font-bold">
            {feedbacks.filter(f => f.status === 'closed').length}
          </p>
        </div>
      </div>
      
      {/* Filtri e ricerca */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div className="relative w-full md:w-96 mb-4 md:mb-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2" size={16} />
              Filtri 
              <ChevronDown className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} size={16} />
            </button>
            
            {(filterType || filterStatus) && (
              <button 
                className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                onClick={resetFilters}
              >
                Reset
              </button>
            )}
          </div>
        </div>
        
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Tutti i tipi</option>
                {FEEDBACK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Tutti gli stati</option>
                {STATUS_CONFIG.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Tabella feedback */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data / Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messaggio
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loadingData ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Caricamento feedback...</p>
                  </td>
                </tr>
              ) : filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    {searchTerm || filterType || filterStatus ? (
                      <p className="text-gray-500">Nessun feedback corrisponde ai criteri di ricerca</p>
                    ) : (
                      <p className="text-gray-500">Nessun feedback trovato</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredFeedbacks.map((feedback) => {
                  const typeConfig = getTypeConfig(feedback.type)
                  const statusConfig = getStatusConfig(feedback.status)
                  const TypeIcon = typeConfig.icon
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <tr key={feedback.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {typeConfig.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(feedback.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {feedback.email || 'Utente anonimo'}
                            </div>
                            {feedback.user_id && (
                              <div className="text-xs text-gray-500">
                                ID: {feedback.user_id.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {feedback.message}
                        </div>
                        {feedback.page_url && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-xs">{feedback.page_url}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button 
                          onClick={() => openFeedbackDetail(feedback)}
                          className="text-blue-600 hover:text-blue-900 flex items-center justify-center mx-auto"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal dettaglio feedback */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  {(() => {
                    const typeConfig = getTypeConfig(selectedFeedback.type)
                    const TypeIcon = typeConfig.icon
                    return (
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                    )
                  })()}
                  <div>
                    <h3 className="text-lg font-bold">
                      {getTypeConfig(selectedFeedback.type).label}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(selectedFeedback.created_at)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFeedback(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Contenuto */}
            <div className="p-6 space-y-6">
              {/* Info utente */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Informazioni utente</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p><strong>Email:</strong> {selectedFeedback.email || 'Non fornita'}</p>
                  {selectedFeedback.user_id && (
                    <p><strong>User ID:</strong> {selectedFeedback.user_id}</p>
                  )}
                  {selectedFeedback.page_url && (
                    <p><strong>Pagina:</strong> 
                      <a 
                        href={selectedFeedback.page_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        {selectedFeedback.page_url}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Messaggio */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Messaggio</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedFeedback.message}</p>
                </div>
              </div>

              {/* Stato attuale */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Stato attuale</h4>
                <div className="flex items-center space-x-2">
                  {(() => {
                    const statusConfig = getStatusConfig(selectedFeedback.status)
                    const StatusIcon = statusConfig.icon
                    return (
                      <span className={`px-3 py-1 inline-flex text-sm font-medium rounded-full ${statusConfig.color}`}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {statusConfig.label}
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* Risposta admin */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Risposta all'utente</h4>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Scrivi una risposta da inviare all'utente (opzionale)..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Nota interna */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Nota interna (admin only)</h4>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Aggiungi una nota interna per altri admin..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Azioni */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {STATUS_CONFIG.map(status => {
                  const StatusIcon = status.icon
                  return (
                    <button
                      key={status.value}
                      onClick={() => handleUpdateStatus(selectedFeedback.id, status.value)}
                      disabled={isUpdating || selectedFeedback.status === status.value}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        selectedFeedback.status === status.value
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : `hover:${status.color} border border-current`
                      }`}
                    >
                      {isUpdating ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <StatusIcon className="w-4 h-4 mr-2" />
                      )}
                      {status.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
