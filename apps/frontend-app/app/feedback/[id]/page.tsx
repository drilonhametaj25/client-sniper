// Pagina di dettaglio per un singolo feedback pubblico
// Mostra messaggio completo, risposta admin, voti, e futura cronologia
// Stile minimale Apple/Linear per una lettura ottimale

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FeedbackDetails } from '@/../../libs/types'
import { 
  ArrowUp, 
  ArrowDown, 
  MessageSquare, 
  Bug,
  Lightbulb,
  Mail,
  HelpCircle,
  CheckCircle,
  Calendar,
  Flag,
  ArrowLeft,
  User,
  Shield
} from 'lucide-react'
import Link from 'next/link'

const FEEDBACK_TYPES = {
  bug: { icon: Bug, color: 'text-red-500', label: 'Bug' },
  suggestion: { icon: Lightbulb, color: 'text-yellow-500', label: 'Funzionalità' },
  contact: { icon: Mail, color: 'text-blue-500', label: 'Contatto' },
  other: { icon: HelpCircle, color: 'text-gray-500', label: 'Altro' }
}

export default function FeedbackDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { user, getAccessToken } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [votingUp, setVotingUp] = useState(false)
  const [votingDown, setVotingDown] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

  useEffect(() => {
    loadFeedback()
  }, [params.id])

  const loadFeedback = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/feedback/${params.id}`)
      const result = await response.json()

      if (result.success) {
        setFeedback(result.data)
      } else {
        console.error('Errore nel caricamento del feedback:', result.error)
      }
    } catch (error) {
      console.error('Errore nel caricamento del feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) {
      alert('Devi essere loggato per votare')
      return
    }

    if (!feedback) return

    const token = getAccessToken()
    if (!token) {
      alert('Sessione scaduta, effettua nuovamente il login')
      return
    }

    const isVotingUp = voteType === 'up'
    const setVotingState = isVotingUp ? setVotingUp : setVotingDown

    if (isVotingUp && votingUp) return
    if (!isVotingUp && votingDown) return

    setVotingState(true)

    try {
      const response = await fetch('/api/feedback/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feedbackId: feedback.id,
          voteType
        })
      })

      const result = await response.json()

      if (result.success) {
        setFeedback(prev => prev ? {
          ...prev,
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          user_vote: prev.user_vote === voteType ? null : voteType
        } : null)
      } else {
        alert(result.error || 'Errore durante il voto')
      }
    } catch (error) {
      alert('Errore durante il voto')
    } finally {
      setVotingState(false)
    }
  }

  const handleReport = async () => {
    if (!user) {
      alert('Devi essere loggato per segnalare contenuti')
      return
    }

    if (!feedback || !reportReason.trim()) {
      alert('Inserisci una motivazione per la segnalazione')
      return
    }

    const token = getAccessToken()
    if (!token) {
      alert('Sessione scaduta, effettua nuovamente il login')
      return
    }

    setSubmittingReport(true)

    try {
      const response = await fetch('/api/feedback/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feedbackId: feedback.id,
          reason: reportReason.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('Segnalazione inviata con successo')
        setShowReportModal(false)
        setReportReason('')
      } else {
        alert(result.error || 'Errore durante la segnalazione')
      }
    } catch (error) {
      alert('Errore durante la segnalazione')
    } finally {
      setSubmittingReport(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento feedback...</p>
        </div>
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Feedback non trovato</h1>
          <p className="text-gray-600 mb-8">
            Il feedback che stai cercando non esiste o non è pubblico.
          </p>
          <Link 
            href="/feedback" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna ai feedback</span>
          </Link>
        </div>
      </div>
    )
  }

  const feedbackType = FEEDBACK_TYPES[feedback.type as keyof typeof FEEDBACK_TYPES]
  const TypeIcon = feedbackType.icon
  const score = feedback.upvotes - feedback.downvotes

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/feedback" 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Torna ai feedback</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              {/* Voti */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleVote('up')}
                  disabled={votingUp}
                  className={`p-2 rounded-lg transition-colors ${
                    feedback.user_vote === 'up'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${votingUp ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                
                <span className={`font-semibold ${
                  score > 0 ? 'text-green-600' : 
                  score < 0 ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {score > 0 ? '+' : ''}{score}
                </span>
                
                <button
                  onClick={() => handleVote('down')}
                  disabled={votingDown}
                  className={`p-2 rounded-lg transition-colors ${
                    feedback.user_vote === 'down'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${votingDown ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Report */}
              {user && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Segnala contenuto inappropriato"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {/* Header del feedback */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl ${
                feedbackType.color.includes('red') ? 'bg-red-50' :
                feedbackType.color.includes('yellow') ? 'bg-yellow-50' :
                feedbackType.color.includes('blue') ? 'bg-blue-50' :
                'bg-gray-50'
              }`}>
                <TypeIcon className={`w-6 h-6 ${feedbackType.color}`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    feedbackType.color.includes('red') ? 'bg-red-100 text-red-800' :
                    feedbackType.color.includes('yellow') ? 'bg-yellow-100 text-yellow-800' :
                    feedbackType.color.includes('blue') ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {feedbackType.label}
                  </span>
                  
                  <span className="text-sm text-gray-500">
                    {new Date(feedback.created_at).toLocaleDateString('it-IT', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {feedback.title}
                </h1>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{feedback.upvotes} voti positivi</span>
                  <span>{feedback.downvotes} voti negativi</span>
                  {feedback.admin_response && (
                    <span className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Risposta admin</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messaggio principale */}
          <div className="p-6">
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {feedback.message}
              </p>
            </div>
          </div>

          {/* Risposta admin */}
          {feedback.admin_response && (
            <div className="p-6 bg-green-50 border-t border-green-100">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-semibold text-green-800">
                      Risposta del team
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Ufficiale
                    </span>
                  </div>
                  <div className="prose prose-green max-w-none">
                    <p className="text-green-700 leading-relaxed whitespace-pre-wrap">
                      {feedback.admin_response}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal per segnalazione */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Flag className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Segnala contenuto inappropriato
              </h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Spiega perché questo feedback viola le nostre linee guida:
            </p>
            
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Spam, contenuto offensivo, informazioni false..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={4}
            />
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleReport}
                disabled={submittingReport || !reportReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {submittingReport ? 'Invio...' : 'Segnala'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
