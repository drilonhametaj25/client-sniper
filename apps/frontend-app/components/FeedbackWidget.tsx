// FeedbackWidget: componente fluttuante per raccogliere feedback dagli utenti
// Posizionato in basso a destra su tutte le pagine
// Stile UI moderno ispirato a Apple.com e Linear.app
// Supporta utenti registrati e anonimi, con opzione per feedback pubblici

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MessageSquare, X, Send, Bug, Lightbulb, Mail, HelpCircle, Globe } from 'lucide-react'
import { FeedbackSubmissionData } from '@/../../libs/types'

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Segnala un bug', icon: Bug, color: 'text-red-500' },
  { value: 'suggestion', label: 'Suggerisci una funzionalità', icon: Lightbulb, color: 'text-yellow-500' },
  { value: 'contact', label: 'Richiesta di contatto', icon: Mail, color: 'text-blue-500' },
  { value: 'other', label: 'Altro', icon: HelpCircle, color: 'text-gray-500' }
] as const

interface ExtendedFormData extends FeedbackSubmissionData {
  title?: string;
  isPublic?: boolean;
}

export default function FeedbackWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [formData, setFormData] = useState<ExtendedFormData>({
    type: 'bug',
    message: '',
    email: user?.email || '',
    title: '',
    isPublic: false
  })

  // Aggiorna l'email quando l'utente cambia
  useEffect(() => {
    if (user?.email && formData.email !== user.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email
      }))
    }
  }, [user?.email, formData.email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userAgent: navigator.userAgent,
          pageUrl: window.location.href
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setShowSuccess(true)
        setFormData({
          type: 'bug',
          message: '',
          email: user?.email || '',
          title: '',
          isPublic: false
        })
        
        // Chiudi il widget dopo 3 secondi
        setTimeout(() => {
          setShowSuccess(false)
          setIsOpen(false)
        }, 3000)
      } else {
        alert(result.error || 'Errore durante l\'invio del feedback')
      }
    } catch (error) {
      console.error('Errore invio feedback:', error)
      alert('Errore durante l\'invio del feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedType = FEEDBACK_TYPES.find(t => t.value === formData.type)

  if (showSuccess) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl max-w-sm">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Feedback inviato!</p>
              <p className="text-sm text-green-100">Grazie per il tuo contributo</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Bottone principale */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 group"
          aria-label="Invia feedback"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Modal feedback */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-96 max-w-[calc(100vw-2rem)]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              {selectedType && <selectedType.icon className={`w-5 h-5 ${selectedType.color}`} />}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invia feedback
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Tipo di feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo di feedback
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {FEEDBACK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Email (se non loggato) */}
            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email (opzionale)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="La tua email per ricevere una risposta"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            )}

            {/* Email (se loggato) */}
            {user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400"
                />
              </div>
            )}

            {/* Titolo (obbligatorio per feedback pubblici) */}
            {formData.isPublic && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titolo breve e descrittivo del problema/suggerimento"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  required={formData.isPublic}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Il titolo aiuterà altri utenti a trovare e votare il tuo feedback
                </p>
              </div>
            )}

            {/* Messaggio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Messaggio
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder={
                  formData.type === 'bug' 
                    ? 'Descrivi il problema che hai riscontrato...' 
                    : formData.type === 'suggestion'
                    ? 'Descrivi la funzionalità che vorresti vedere...'
                    : formData.type === 'contact'
                    ? 'Descrivi come possiamo aiutarti...'
                    : 'Scrivi qui il tuo messaggio...'
                }
                rows={4}
                required
                minLength={10}
                maxLength={2000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.message.length}/2000 caratteri (minimo 10)
              </p>
            </div>

            {/* Checkbox per feedback pubblico */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
              <div className="flex-1">
                <label htmlFor="isPublic" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <Globe className="w-4 h-4 mr-1 text-blue-500" />
                  Rendi pubblico questo feedback
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Il feedback sarà visibile a tutti gli utenti e potrà ricevere voti. 
                  I tuoi dati personali rimarranno privati.
                </p>
              </div>
            </div>

            {/* Pulsanti */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting || formData.message.trim().length < 10}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Invio...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Invia</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
