/**
 * Componente per mostrare stato piano disattivato - TrovaMi
 * Usato per: Informare l'utente dello stato del piano e fornire opzioni di riattivazione
 * Chiamato da: Dashboard, Settings, qualsiasi pagina che richiede piano attivo
 */

'use client'

import { useState } from 'react'
import { AlertTriangle, CreditCard, RefreshCw, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePlanStatus } from '@/hooks/usePlanStatus'

interface InactivePlanBannerProps {
  showDetails?: boolean
  className?: string
}

export default function InactivePlanBanner({ 
  showDetails = true, 
  className = "" 
}: InactivePlanBannerProps) {
  const planStatus = usePlanStatus()
  const [reactivating, setReactivating] = useState(false)

  // Non mostrare se il piano è attivo
  if (planStatus.status === 'active' || planStatus.isLoading) {
    return null
  }

  const handleReactivate = async () => {
    setReactivating(true)
    
    try {
      const response = await fetch('/api/plan/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        // Ricarica la pagina per aggiornare lo stato
        window.location.reload()
      } else if (result.action_required === 'checkout') {
        // Reindirizza al checkout
        window.location.href = result.checkout_url
      } else {
        alert('Errore durante la riattivazione: ' + result.error)
      }
    } catch (error) {
      console.error('Errore riattivazione:', error)
      alert('Errore durante la riattivazione del piano')
    } finally {
      setReactivating(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className={`bg-orange-50 border border-orange-200 rounded-2xl p-6 ${className}`}>
      <div className="flex items-start">
        <AlertTriangle className="w-6 h-6 text-orange-500 mr-3 mt-1 flex-shrink-0" />
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            Piano {planStatus.status === 'inactive' ? 'Disattivato' : 'Cancellato'}
          </h3>
          
          <p className="text-orange-800 mb-4">
            {planStatus.status === 'inactive' ? (
              <>
                Hai disattivato temporaneamente il tuo piano {planStatus.plan}. 
                Puoi riattivarlo in qualsiasi momento per continuare ad accedere alle funzionalità premium.
              </>
            ) : (
              <>
                Il tuo piano {planStatus.plan} è stato cancellato. 
                Sottoscrivi un nuovo piano per continuare ad utilizzare TrovaMi.
              </>
            )}
          </p>

          {showDetails && planStatus.deactivated_at && (
            <div className="bg-orange-100 rounded-xl p-4 mb-4">
              <div className="text-sm text-orange-800 space-y-1">
                <div>
                  <strong>Data disattivazione:</strong> {formatDate(planStatus.deactivated_at)}
                </div>
                {planStatus.deactivation_reason && (
                  <div>
                    <strong>Motivo:</strong> {planStatus.deactivation_reason}
                  </div>
                )}
                {planStatus.reactivated_at && (
                  <div>
                    <strong>Ultima riattivazione:</strong> {formatDate(planStatus.reactivated_at)}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {planStatus.status === 'inactive' && (
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${reactivating ? 'animate-spin' : ''}`} />
                {reactivating ? 'Riattivando...' : 'Riattiva Piano'}
              </button>
            )}
            
            <Link
              href="/upgrade"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {planStatus.status === 'inactive' ? 'Cambia Piano' : 'Scegli Piano'}
            </Link>
            
            <Link
              href="/settings"
              className="inline-flex items-center px-4 py-2 border border-orange-300 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Impostazioni
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente mini per navbar o sezioni small
export function InactivePlanIndicator() {
  const planStatus = usePlanStatus()

  if (planStatus.status === 'active' || planStatus.isLoading) {
    return null
  }

  return (
    <div className="flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
      <AlertTriangle className="w-3 h-3 mr-1" />
      Piano {planStatus.status === 'inactive' ? 'disattivato' : 'cancellato'}
    </div>
  )
}
