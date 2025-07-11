// Pagina pubblica per visualizzare feedback degli utenti
// Stile moderno Apple/Linear con filtri, ordinamento e sistema di voti
// Accessibile a tutti, voti solo per utenti registrati

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PublicFeedback } from '@/../../libs/types'
import { 
  ArrowUp, 
  ArrowDown, 
  MessageSquare, 
  Filter, 
  SortDesc,
  Bug,
  Lightbulb,
  Mail,
  HelpCircle,
  CheckCircle,
  Calendar,
  TrendingUp,
  Flag,
  Plus
} from 'lucide-react'

const FEEDBACK_TYPES = [
  { value: '', label: 'Tutti i tipi', icon: MessageSquare },
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500' },
  { value: 'suggestion', label: 'Funzionalità', icon: Lightbulb, color: 'text-yellow-500' },
  { value: 'contact', label: 'Contatto', icon: Mail, color: 'text-blue-500' },
  { value: 'other', label: 'Altro', icon: HelpCircle, color: 'text-gray-500' }
]

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Più recenti', icon: Calendar },
  { value: 'upvotes', label: 'Più votati', icon: TrendingUp },
  { value: 'controversial', label: 'Più discussi', icon: MessageSquare }
]

export default function PublicFeedbackPage() {
  const { user, getAccessToken } = useAuth()
  const [feedbacks, setFeedbacks] = useState<PublicFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({})
  const [showFeedbackWidget, setShowFeedbackWidget] = useState(false)

  // Carica feedback pubblici
  const loadFeedbacks = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page
      setLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy
      })

      if (selectedType) {
        params.append('type', selectedType)
      }

      const response = await fetch(`/api/feedback/public?${params}`)
      const result = await response.json()

      if (result.success) {
        if (reset) {
          setFeedbacks(result.data)
          setPage(1)
        } else {
          setFeedbacks(prev => [...prev, ...result.data])
        }
        setHasMore(result.pagination.hasMore)
      }
    } catch (error) {
      // Errore nel caricamento
    } finally {
      setLoading(false)
    }
  }

  // Effetto per ricaricare quando cambiano filtri
  useEffect(() => {
    loadFeedbacks(true)
  }, [selectedType, sortBy])

  // Caricamento iniziale
  useEffect(() => {
    loadFeedbacks(true)
  }, [])

  // Gestisce voto
  const handleVote = async (feedbackId: string, voteType: 'up' | 'down') => {
    if (!user) {
      alert('Devi essere loggato per votare')
      return
    }

    if (votingStates[feedbackId]) return

    const token = getAccessToken()
    if (!token) {
      alert('Sessione scaduta, effettua nuovamente il login')
      return
    }

    setVotingStates(prev => ({ ...prev, [feedbackId]: true }))

    try {
      const response = await fetch('/api/feedback/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feedbackId,
          voteType
        })
      })

      const result = await response.json()

      if (result.success) {
        // Aggiorna il feedback nella lista
        setFeedbacks(prev => prev.map(feedback => {
          if (feedback.id === feedbackId) {
            return {
              ...feedback,
              upvotes: result.upvotes,
              downvotes: result.downvotes,
              user_vote: feedback.user_vote === voteType ? null : voteType
            }
          }
          return feedback
        }))
      } else {
        alert(result.error || 'Errore durante il voto')
      }
    } catch (error) {
      alert('Errore durante il voto')
    } finally {
      setVotingStates(prev => ({ ...prev, [feedbackId]: false }))
    }
  }

  // Segnala contenuto inappropriato
  const handleReport = async (feedbackId: string) => {
    if (!user) {
      alert('Devi essere loggato per segnalare contenuti')
      return
    }

    const reason = prompt('Motivo della segnalazione (minimo 10 caratteri):')
    if (!reason || reason.trim().length < 10) {
      return
    }

    try {
      const response = await fetch('/api/feedback/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackId,
          reason: reason.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('Segnalazione inviata con successo')
      } else {
        alert(result.error || 'Errore durante la segnalazione')
      }
    } catch (error) {
      alert('Errore durante la segnalazione')
    }
  }

  // Carica altri feedback
  const loadMore = () => {
    setPage(prev => prev + 1)
    loadFeedbacks(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Oggi'
    if (diffDays === 2) return 'Ieri'
    if (diffDays <= 7) return `${diffDays - 1} giorni fa`
    return date.toLocaleDateString('it-IT')
  }

  const getTypeIcon = (type: string) => {
    const feedbackType = FEEDBACK_TYPES.find(t => t.value === type)
    return feedbackType ? feedbackType.icon : MessageSquare
  }

  const getTypeColor = (type: string) => {
    const feedbackType = FEEDBACK_TYPES.find(t => t.value === type)
    return feedbackType?.color || 'text-gray-500'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Feedback Community
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Condividi idee, segnala bug e aiuta a migliorare la piattaforma
              </p>
            </div>
            
            <button
              onClick={() => setShowFeedbackWidget(true)}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Filtri e ordinamento */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filtro tipo */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Filter className="inline w-4 h-4 mr-1" />
                Tipo di feedback
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {FEEDBACK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordinamento */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <SortDesc className="inline w-4 h-4 mr-1" />
                Ordina per
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista feedback */}
        <div className="space-y-4">
          {loading && feedbacks.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Caricamento feedback...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Nessun feedback trovato</p>
              <p className="text-sm text-gray-400 mt-1">
                Prova a cambiare i filtri o sii il primo a condividere un feedback!
              </p>
            </div>
          ) : (
            feedbacks.map((feedback) => {
              const TypeIcon = getTypeIcon(feedback.type)
              const isUpvoted = feedback.user_vote === 'up'
              const isDownvoted = feedback.user_vote === 'down'

              return (
                <div key={feedback.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    {/* Colonna voti */}
                    <div className="flex flex-col items-center space-y-1 min-w-[60px]">
                      <button
                        onClick={() => handleVote(feedback.id, 'up')}
                        disabled={!user || votingStates[feedback.id]}
                        className={`p-2 rounded-lg transition-colors ${
                          isUpvoted 
                            ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                            : user 
                              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400' 
                              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        }`}
                        title={user ? 'Vota positivo' : 'Accedi per votare'}
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>
                      
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {feedback.upvotes - feedback.downvotes}
                      </span>
                      
                      <button
                        onClick={() => handleVote(feedback.id, 'down')}
                        disabled={!user || votingStates[feedback.id]}
                        className={`p-2 rounded-lg transition-colors ${
                          isDownvoted 
                            ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' 
                            : user 
                              ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400' 
                              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        }`}
                        title={user ? 'Vota negativo' : 'Accedi per votare'}
                      >
                        <ArrowDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Contenuto feedback */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`w-5 h-5 ${getTypeColor(feedback.type)}`} />
                          <span className={`text-sm font-medium ${getTypeColor(feedback.type)}`}>
                            {FEEDBACK_TYPES.find(t => t.value === feedback.type)?.label}
                          </span>
                          {feedback.has_admin_response && (
                            <span className="flex items-center text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Risposto
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatDate(feedback.created_at)}</span>
                          {user && (
                            <button
                              onClick={() => handleReport(feedback.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Segnala contenuto inappropriato"
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {feedback.title}
                      </h3>

                      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                        {feedback.message}
                      </p>

                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-4">
                          <span>{feedback.upvotes} 👍</span>
                          <span>{feedback.downvotes} 👎</span>
                        </div>
                        
                        <a
                          href={`/feedback/${feedback.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          Visualizza dettagli →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Carica altro */}
        {hasMore && !loading && feedbacks.length > 0 && (
          <div className="text-center py-6">
            <button
              onClick={loadMore}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg border dark:border-gray-600 transition-colors"
            >
              Carica altri feedback
            </button>
          </div>
        )}

        {loading && feedbacks.length > 0 && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  )
}
