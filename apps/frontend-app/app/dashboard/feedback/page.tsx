'use client'

/**
 * Dashboard: I miei Feedback
 *
 * Mostra tutti i feedback inviati dall'utente (pubblici e privati).
 * Include stato, risposte admin, e filtri per tipo/stato.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Mail,
  HelpCircle,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Shield
} from 'lucide-react'

interface UserFeedback {
  id: string
  title: string | null
  type: 'bug' | 'suggestion' | 'contact' | 'other'
  message: string
  is_public: boolean
  status: 'open' | 'in_review' | 'closed'
  response: string | null
  created_at: string
  upvotes: number
  downvotes: number
}

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  { value: 'suggestion', label: 'Suggerimento', icon: Lightbulb, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
  { value: 'contact', label: 'Contatto', icon: Mail, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { value: 'other', label: 'Altro', icon: HelpCircle, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800' }
] as const

const STATUS_CONFIG = [
  { value: 'open', label: 'Aperto', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', icon: AlertTriangle },
  { value: 'in_review', label: 'In Revisione', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', icon: Clock },
  { value: 'closed', label: 'Chiuso', color: 'text-green-600 bg-green-50 dark:bg-green-900/20', icon: CheckCircle }
] as const

export default function MyFeedbackPage() {
  const { user, getAccessToken, loading: authLoading } = useAuth()
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadFeedbacks()
    }
  }, [user, filterType, filterStatus])

  const loadFeedbacks = async () => {
    try {
      setLoading(true)
      const token = getAccessToken()

      if (!token) {
        console.error('No access token')
        return
      }

      const params = new URLSearchParams()
      if (filterType) params.append('type', filterType)
      if (filterStatus) params.append('status', filterStatus)

      const response = await fetch(`/api/feedback/my?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (result.success) {
        setFeedbacks(result.data)
      } else {
        console.error('Error loading feedbacks:', result.error)
      }
    } catch (error) {
      console.error('Error loading feedbacks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeConfig = (type: string) => {
    return FEEDBACK_TYPES.find(t => t.value === type) || FEEDBACK_TYPES[3]
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG.find(s => s.value === status) || STATUS_CONFIG[0]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const resetFilters = () => {
    setFilterType('')
    setFilterStatus('')
  }

  // Stats
  const stats = {
    total: feedbacks.length,
    open: feedbacks.filter(f => f.status === 'open').length,
    responded: feedbacks.filter(f => f.response).length
  }

  if (authLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <MessageSquare className="mr-3 text-blue-500" />
          I miei Feedback
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Visualizza lo stato dei tuoi feedback e le risposte del team
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Totale</span>
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Aperti</span>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.open}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Con risposta</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.responded}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Filter className="w-4 h-4 mr-2 text-gray-500" />
          <span className="text-gray-700 dark:text-gray-300">Filtri</span>
          {showFilters ? (
            <ChevronUp className="w-4 h-4 ml-2 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
          )}
          {(filterType || filterStatus) && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
              Attivi
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Tutti i tipi</option>
                  {FEEDBACK_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stato
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Tutti gli stati</option>
                  {STATUS_CONFIG.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {(filterType || filterStatus) && (
              <button
                onClick={resetFilters}
                className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Rimuovi filtri
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nessun feedback trovato
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filterType || filterStatus
              ? 'Prova a modificare i filtri di ricerca'
              : 'Non hai ancora inviato feedback. Usa il widget in basso a destra per inviarne uno!'}
          </p>
          <Link
            href="/feedback"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            Vedi feedback della community
            <ExternalLink className="w-4 h-4 ml-1" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((feedback) => {
            const typeConfig = getTypeConfig(feedback.type)
            const statusConfig = getStatusConfig(feedback.status)
            const TypeIcon = typeConfig.icon
            const StatusIcon = statusConfig.icon
            const isExpanded = expandedId === feedback.id

            return (
              <div
                key={feedback.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
              >
                {/* Card Header */}
                <button
                  onClick={() => toggleExpanded(feedback.id)}
                  className="w-full p-4 flex items-start justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {statusConfig.label}
                        </span>
                        {feedback.is_public ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                            <Globe className="w-3 h-3 inline mr-1" />
                            Pubblico
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            <Lock className="w-3 h-3 inline mr-1" />
                            Privato
                          </span>
                        )}
                        {feedback.response && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Risposta
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {feedback.title || feedback.message.substring(0, 60) + '...'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(feedback.created_at)} • {typeConfig.label}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Card Content (Expanded) */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                    {/* Message */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Il tuo messaggio
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                          {feedback.message}
                        </p>
                      </div>
                    </div>

                    {/* Admin Response */}
                    {feedback.response && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center">
                          <Shield className="w-4 h-4 mr-1" />
                          Risposta del team
                        </h4>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-500">
                          <p className="text-green-800 dark:text-green-300 whitespace-pre-wrap text-sm">
                            {feedback.response}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Public link */}
                    {feedback.is_public && (
                      <div className="mt-4 flex justify-end">
                        <Link
                          href={`/feedback/${feedback.id}`}
                          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Vedi pagina pubblica
                          <ExternalLink className="w-4 h-4 ml-1" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
