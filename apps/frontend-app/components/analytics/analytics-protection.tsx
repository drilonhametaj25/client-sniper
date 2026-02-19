/**
 * Analytics Route Protection
 * Middleware per proteggere la rotta analytics limitandola agli utenti Starter+
 *
 * Utilizzato da: app/analytics/page.tsx
 * Dipende da: AuthContext per verifica piano utente
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'

interface AnalyticsProtectionProps {
  children: React.ReactNode
}

export function AnalyticsProtection({ children }: AnalyticsProtectionProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (!loading && user && !isStarterOrHigher(user.plan || 'free')) {
      router.push('/upgrade')
      return
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!isStarterOrHigher(user.plan || 'free')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            Questa funzionalità è disponibile per gli utenti Starter e superiori
          </p>
          <button
            onClick={() => router.push('/upgrade')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aggiorna a Starter
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
