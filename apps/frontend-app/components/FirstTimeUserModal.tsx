/**
 * Modal di benvenuto per nuovi utenti al primo accesso
 * Usato per: Guidare i nuovi utenti e spiegare come usare TrovaMi
 * Chiamato da: Dashboard page quando l'utente ha tutti i crediti (mai usato il tool)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Search, Unlock, Mail, ArrowRight, CheckCircle } from 'lucide-react'

interface FirstTimeUserModalProps {
  isOpen: boolean
  onClose: () => void
  onStartTour?: () => void
  userName?: string
  creditsRemaining?: number
}

export default function FirstTimeUserModal({
  isOpen,
  onClose,
  onStartTour,
  userName,
  creditsRemaining = 5
}: FirstTimeUserModalProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  // Chiudi con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      // Previeni scroll del body
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const steps = [
    {
      icon: Search,
      title: 'Trova Lead Qualificati',
      description: 'TrovaMi analizza migliaia di siti web e trova aziende con problemi tecnici che tu puoi risolvere.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: Unlock,
      title: 'Sblocca i Contatti',
      description: `Hai ${creditsRemaining} crediti gratuiti. Ogni credito sblocca email e telefono di un lead.`,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      icon: Mail,
      title: 'Contatta e Converti',
      description: 'Usa i nostri template email testati per contattare i lead e proporre i tuoi servizi.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  const handleGetStarted = () => {
    // Salva che l'utente ha visto il welcome
    localStorage.setItem('trovami_welcome_seen', 'true')
    localStorage.setItem('trovami_welcome_seen_date', new Date().toISOString())

    onClose()

    // Avvia il tour guidato se disponibile
    if (onStartTour) {
      setTimeout(() => onStartTour(), 300)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('trovami_welcome_seen', 'true')
    localStorage.setItem('trovami_welcome_seen_date', new Date().toISOString())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-60 transition-opacity"
          onClick={handleSkip}
        />

        {/* Modal Content */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all">
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl p-6 text-white text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {userName ? `Benvenuto, ${userName}!` : 'Benvenuto su TrovaMi!'}
            </h2>
            <p className="text-blue-100 text-sm">
              Sei a un passo dal trovare i tuoi primi clienti
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Steps */}
            <div className="space-y-4 mb-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-start p-4 rounded-lg transition-all ${
                    index === currentStep
                      ? 'bg-gray-50 dark:bg-gray-700 ring-2 ring-blue-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onMouseEnter={() => setCurrentStep(index)}
                >
                  <div className={`flex-shrink-0 w-10 h-10 ${step.bgColor} rounded-lg flex items-center justify-center mr-4`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {index + 1}. {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Credits Badge */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">
                    {creditsRemaining} crediti gratuiti disponibili
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Nessuna carta di credito richiesta
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleGetStarted}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Inizia a Esplorare i Lead
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>

              <button
                onClick={handleSkip}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Salta per ora
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <p className="text-xs text-center text-gray-400">
              Puoi sempre rivedere questo tutorial dalle impostazioni
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
