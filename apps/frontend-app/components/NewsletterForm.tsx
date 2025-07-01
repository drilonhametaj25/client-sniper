/**
 * Componente Newsletter per iscrizione Klaviyo
 * Usato in: Homepage, footer, popup, pagine pubbliche
 * Gestisce form di iscrizione con validazione e feedback
 */

'use client'

import { useState } from 'react'
import { Mail, ArrowRight, Check, AlertCircle } from 'lucide-react'
import klaviyo from '@/lib/services/klaviyo'
import { validateEmail } from '@/lib/validation'

interface NewsletterFormProps {
  title?: string
  description?: string
  placeholder?: string
  buttonText?: string
  source?: string
  className?: string
  variant?: 'default' | 'compact' | 'inline'
  showIcon?: boolean
}

export default function NewsletterForm({
  title = "Resta Aggiornato sui Nuovi Lead",
  description = "Ricevi ogni mese lead qualificati gratuiti e consigli per l'acquisizione clienti",
  placeholder = "La tua email professionale",
  buttonText = "Iscriviti Gratis",
  source = "website",
  className = "",
  variant = "default",
  showIcon = true
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmail(email)) {
      setStatus('error')
      setMessage('Inserisci un indirizzo email valido')
      return
    }

    setLoading(true)
    setStatus('idle')

    try {
      const result = await klaviyo.subscribeToNewsletter({
        email,
        first_name: firstName,
        properties: {
          source,
          interests: ['lead_generation', 'audit_digitale'],
          subscription_page: window.location.pathname
        }
      })

      if (result.success) {
        setStatus('success')
        setMessage(result.message)
        setEmail('')
        setFirstName('')
        
        // Track successful subscription
        await klaviyo.trackEvent({
          event: 'Newsletter Subscription',
          customer_properties: {
            $email: email,
            $first_name: firstName
          },
          properties: {
            source,
            page: window.location.pathname,
            timestamp: new Date().toISOString()
          }
        })
      } else {
        setStatus('error')
        setMessage(result.message)
      }
    } catch (error) {
      setStatus('error')
      setMessage('Errore imprevisto. Riprova più tardi.')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 ${className}`}>
        <div className="flex items-center mb-4">
          {showIcon && <Mail className="h-5 w-5 text-blue-600 mr-2" />}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        
        {status === 'success' ? (
          <div className="flex items-center text-green-600">
            <Check className="h-5 w-5 mr-2" />
            <span className="text-sm">{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium"
              >
                {loading ? 'Invio...' : buttonText}
              </button>
            </div>
            
            {status === 'error' && (
              <div className="flex items-center text-red-600 text-xs">
                <AlertCircle className="h-4 w-4 mr-1" />
                {message}
              </div>
            )}
          </form>
        )}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={className}>
        {status === 'success' ? (
          <div className="flex items-center justify-center text-green-600 py-4">
            <Check className="h-5 w-5 mr-2" />
            <span>{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
            >
              {loading ? 'Invio...' : (
                <>
                  {buttonText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </form>
        )}
        
        {status === 'error' && (
          <div className="flex items-center text-red-600 text-sm mt-2">
            <AlertCircle className="h-4 w-4 mr-1" />
            {message}
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={`bg-white rounded-2xl p-8 shadow-lg border border-gray-200 ${className}`}>
      <div className="text-center mb-6">
        {showIcon && (
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
        )}
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>

      {status === 'success' ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h4 className="text-lg font-semibold text-green-600 mb-2">Iscrizione Completata!</h4>
          <p className="text-gray-600">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nome (opzionale)"
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-all duration-300"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Iscrizione in corso...
              </div>
            ) : (
              <>
                {buttonText}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>

          {status === 'error' && (
            <div className="flex items-center justify-center text-red-600 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              {message}
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            Iscrivendoti accetti di ricevere email con lead gratuiti e consigli. 
            Puoi cancellare l'iscrizione in qualsiasi momento.
          </p>
        </form>
      )}
    </div>
  )
}
