/**
 * Pagina di conferma disiscrizione newsletter
 * Mostra stato successo/errore basato su query params
 *
 * Usato da: Redirect dopo /api/newsletter/unsubscribe
 */

'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Mail } from 'lucide-react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  // Stato SUCCESS
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Disiscrizione Completata
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Non riceverai piu la nostra newsletter settimanale.
            Ci mancherai!
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Puoi sempre riattivare la newsletter dalle impostazioni del tuo account.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Torna alla Dashboard
            </Link>
            <Link
              href="/settings"
              className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Gestisci Preferenze Notifiche
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Stati ERROR
  const errorMessages: Record<string, string> = {
    missing_token: 'Link non valido. Manca il token di disiscrizione.',
    invalid_token: 'Token non valido o scaduto.',
    update_failed: 'Errore durante la disiscrizione. Riprova piu tardi.',
    server_error: 'Errore del server. Riprova piu tardi.'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Errore Disiscrizione
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error ? errorMessages[error] || errorMessages.server_error : errorMessages.server_error}
        </p>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Se continui ad avere problemi, puoi disattivare la newsletter direttamente dalle impostazioni del tuo account.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/settings"
            className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Vai alle Impostazioni
          </Link>
          <a
            href="mailto:supporto@trovami.pro"
            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Contatta Supporto
          </a>
        </div>
      </div>
    </div>
  )
}

// Loading fallback
function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Mail className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Elaborazione in corso...
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Attendi un momento
        </p>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <UnsubscribeContent />
    </Suspense>
  )
}
