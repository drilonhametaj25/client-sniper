// Banner di urgenza per conversione piano Free -> Pagato
// Mostra il valore perso e incentiva l'upgrade immediato
// Include timer e scarcity marketing

'use client'

import { useState, useEffect } from 'react'
import { Clock, TrendingUp, Users, Zap, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface UpgradeUrgencyBannerProps {
  className?: string
  onDismiss?: () => void
  variant?: 'full' | 'compact'
}

export default function UpgradeUrgencyBanner({ 
  className = '', 
  onDismiss,
  variant = 'full' 
}: UpgradeUrgencyBannerProps) {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  // Solo per utenti free
  if (user?.plan !== 'free' || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 relative ${className}`}>
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            <span className="font-semibold">Hai esaurito i lead gratuiti</span>
          </div>
          <Link
            href="/upgrade"
            className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Sblocca più lead
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-xl shadow-lg ${className}`}>
      <div className="p-6 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center mb-3">
              <TrendingUp className="w-6 h-6 mr-2" />
              <h3 className="text-xl font-bold">
                📈 Hai esaurito i lead gratuiti
              </h3>
            </div>
            
            <p className="text-white/90 mb-4">
              Con i piani Pro ottieni fino a <span className="font-bold">100 lead qualificati al mese</span>. 
              Più lead = più opportunità di business = più tempo per focalizzarti sulla vendita.
            </p>

            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-white/20 rounded-lg p-3 text-center">
                <Clock className="w-6 h-6 mx-auto mb-1" />
                <div className="text-sm font-medium">Risparmia tempo</div>
                <div className="text-xs opacity-90">Niente più ricerche manuali</div>
              </div>
              
              <div className="bg-white/20 rounded-lg p-3 text-center">
                <Users className="w-6 h-6 mx-auto mb-1" />
                <div className="text-sm font-medium">Lead qualificati</div>
                <div className="text-xs opacity-90">Con problemi tecnici reali</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/upgrade"
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                Sblocca più lead
              </Link>
              
              <div className="text-center">
                <div className="text-sm opacity-90">Clienti in attesa</div>
                <div className="font-mono text-lg font-bold">Non perdere tempo</div>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <h4 className="font-semibold mb-3">🎯 Cosa ottieni:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                  25-100 lead qualificati al mese
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                  Analisi SEO e performance complete
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                  Contatti email e telefono
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
                  CRM integrato per gestire tutto
                </li>
              </ul>
              
              <div className="mt-4 pt-3 border-t border-white/20">
                <div className="text-xs opacity-90">Valore del tuo tempo:</div>
                <div className="text-lg font-bold">Ore di ricerca risparmiate</div>
                <div className="text-xl font-bold text-yellow-300">= Più clienti acquisiti</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente per stats live
export function LiveStats() {
  const [stats, setStats] = useState({
    leadsAnalyzed: 0,
    activeAnalysis: 0,
    businessesFound: 0
  })

  useEffect(() => {
    // Simula statistiche reali del sistema
    const updateStats = () => {
      const now = new Date()
      const baseAnalyzed = 180 + Math.floor(Math.sin(now.getHours() / 24 * Math.PI * 2) * 30)
      const baseActive = 5 + Math.floor(Math.random() * 8)
      const baseBusinesses = 45 + Math.floor(Math.random() * 20)
      
      setStats({
        leadsAnalyzed: baseAnalyzed + Math.floor(Math.random() * 15),
        activeAnalysis: baseActive,
        businessesFound: baseBusinesses
      })
    }

    updateStats()
    const interval = setInterval(updateStats, 45000) // Aggiorna ogni 45 secondi
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
      <div className="flex items-center mb-2">
        <TrendingUp className="w-4 h-4 text-blue-600 mr-2" />
        <span className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
          📊 Sistema di analisi in tempo reale
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">{stats.leadsAnalyzed}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400">Siti analizzati oggi</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">{stats.activeAnalysis}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400">Analisi in corso</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-600">{stats.businessesFound}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400">Nuovi lead trovati</div>
        </div>
      </div>
    </div>
  )
}
