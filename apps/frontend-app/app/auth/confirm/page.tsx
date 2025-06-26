/**
 * Pagina di conferma email per registrazione utenti
 * Usato per: Gestire il token di conferma inviato via email da Supabase
 * Chiamato da: Link email di conferma
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

export default function ConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token')
      const type = searchParams.get('type')

      console.log('🔄 Confirming email with:', { token: !!token, type })

      if (!token || type !== 'signup') {
        setStatus('error')
        setMessage('Link di conferma non valido')
        return
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })

        if (error) {
          console.error('❌ Errore conferma email:', error)
          throw error
        }

        console.log('✅ Email confermata con successo')
        setStatus('success')
        setMessage('Email confermata con successo!')
        
        // Redirect al login dopo 3 secondi
        setTimeout(() => {
          router.push('/login?message=Email confermata, puoi ora effettuare il login')
        }, 3000)

      } catch (error: any) {
        console.error('❌ Errore conferma email:', error)
        setStatus('error')
        setMessage(error.message || 'Errore durante la conferma email')
      }
    }

    confirmEmail()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6">
            {status === 'loading' && (
              <Loader className="h-8 w-8 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>
          
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            {status === 'loading' && 'Conferma in corso...'}
            {status === 'success' && 'Email Confermata!'}
            {status === 'error' && 'Errore di Conferma'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {status === 'success' && (
            <p className="text-sm text-gray-500">
              Verrai reindirizzato al login tra pochi secondi...
            </p>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <button
                onClick={() => router.push('/register')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Torna alla Registrazione
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
              >
                Vai al Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
