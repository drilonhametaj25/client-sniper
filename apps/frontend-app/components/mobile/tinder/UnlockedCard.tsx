/**
 * UnlockedCard - Vista post-sblocco con contatti
 *
 * Mostra:
 * - Animazione di successo
 * - Contatti sbloccati (telefono, email)
 * - Bottoni per chiamare/email
 * - Link al sito web
 * - Pulsante per passare al prossimo lead
 */

'use client'

import { useEffect, useState } from 'react'
import { Phone, Mail, Globe, ExternalLink, ChevronRight, CheckCircle, Copy, Check } from 'lucide-react'

interface Lead {
  id: string
  business_name?: string
  website_url?: string
  city?: string
  category?: string
  score: number
}

interface UnlockedCardProps {
  lead: Lead
  phone?: string
  email?: string
  onNext: () => void
}

export default function UnlockedCard({
  lead,
  phone,
  email,
  onNext
}: UnlockedCardProps) {
  const [showContent, setShowContent] = useState(false)
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(null)

  // Animazione di entrata
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Copia negli appunti
  const handleCopy = async (text: string, field: 'phone' | 'email') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Fallback per browser che non supportano clipboard API
      console.warn('Clipboard API non supportata')
    }
  }

  // Formatta numero telefono per chiamata
  const formatPhoneForCall = (phoneNumber: string) => {
    return phoneNumber.replace(/\s/g, '').replace(/[^\d+]/g, '')
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-gray-900">
      {/* Header con animazione successo */}
      <div className="flex flex-col items-center justify-center pt-8 pb-6">
        <div className={`transform transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>
        <h2 className={`text-2xl font-bold text-gray-900 dark:text-white transition-all duration-500 delay-100 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Lead Sbloccato!
        </h2>
        <p className={`text-gray-600 dark:text-gray-400 transition-all duration-500 delay-150 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Ecco i contatti di questo lead
        </p>
      </div>

      {/* Card con info */}
      <div className={`flex-1 px-4 transition-all duration-500 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm mx-auto">
          {/* Business info */}
          <div className="text-center mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {lead.category || 'Lead'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {lead.city || 'Posizione non disponibile'}
            </p>
          </div>

          {/* Contatti */}
          <div className="space-y-4">
            {/* Telefono */}
            {phone && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                    Telefono
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {phone}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(phone, 'phone')}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                    title="Copia"
                  >
                    {copiedField === 'phone' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  <a
                    href={`tel:${formatPhoneForCall(phone)}`}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Chiama"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                </div>
              </div>
            )}

            {/* Email */}
            {email && (
              <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                    Email
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {email}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(email, 'email')}
                    className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                    title="Copia"
                  >
                    {copiedField === 'email' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  <a
                    href={`mailto:${email}`}
                    className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    title="Invia email"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>
            )}

            {/* Website */}
            {lead.website_url && (
              <a
                href={lead.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                    Sito Web
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {lead.website_url.replace(/^https?:\/\//, '')}
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400" />
              </a>
            )}
          </div>

          {/* No contacts available */}
          {!phone && !email && (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                Nessun contatto disponibile
              </div>
              {lead.website_url && (
                <a
                  href={lead.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 flex items-center justify-center gap-1"
                >
                  Visita il sito web <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer con pulsante next */}
      <div className={`p-4 transition-all duration-500 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <button
          onClick={onNext}
          className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-4 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          Prossimo Lead
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
