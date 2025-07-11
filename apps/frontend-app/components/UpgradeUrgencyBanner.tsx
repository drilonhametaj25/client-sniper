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
  const [timeLeft, setTimeLeft] = useState('')
  const [dismissed, setDismissed] = useState(false)

  // Solo per utenti free
  if (user?.plan !== 'free' || dismissed) {
    return null
  }

  useEffect(() => {
    // Timer che aggiorna ogni secondo fino alle 23:59 di oggi
    const updateTimer = () => {
      const now = new Date()
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)
      
      const diff = endOfDay.getTime() - now.getTime()
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setTimeLeft('00:00:00')
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-4 relative ${className}`}>
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            <span className="font-semibold">Solo oggi: 50% sconto!</span>
          </div>
          <Link
            href="/upgrade"
            className="bg-white text-orange-600 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Approfitta ora
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-xl shadow-lg ${className}`}>
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
              <Clock className="w-6 h-6 mr-2" />
              <h3 className="text-xl font-bold">
                ⚡ Offerta lancio limitata
              </h3>
            </div>
            
            <p className="text-white/90 mb-4">
              Hai utilizzato i tuoi 2 lead gratuiti. Sblocca il potenziale completo con il 
              <span className="font-bold"> 50% di sconto</span> sui primi 3 mesi!
            </p>

            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-white/20 rounded-lg p-3 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-1" />
                <div className="text-sm font-medium">Lead qualificati</div>
                <div className="text-xs opacity-90">Con analisi completa</div>
              </div>
              
              <div className="bg-white/20 rounded-lg p-3 text-center">
                <Users className="w-6 h-6 mx-auto mb-1" />
                <div className="text-sm font-medium">137 agenzie</div>
                <div className="text-xs opacity-90">Già si fidano di noi</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/upgrade"
                className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                Sblocca ora con -50%
              </Link>
              
              {timeLeft && (
                <div className="text-center">
                  <div className="text-sm opacity-90">Scade tra:</div>
                  <div className="font-mono text-lg font-bold">{timeLeft}</div>
                </div>
              )}
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
                <div className="text-xs opacity-90">Valore normale:</div>
                <div className="text-lg font-bold line-through">€49/mese</div>
                <div className="text-xl font-bold text-yellow-300">€24,50/mese (primi 3 mesi)</div>
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
    leadsToday: 0,
    activeUsers: 0,
    conversions: 0
  })

  useEffect(() => {
    // Simula statistiche in tempo reale
    const updateStats = () => {
      const now = new Date()
      const baseLeads = 45 + Math.floor(Math.sin(now.getHours() / 24 * Math.PI * 2) * 15)
      const baseUsers = 12 + Math.floor(Math.random() * 8)
      const baseConversions = 3 + Math.floor(Math.random() * 4)
      
      setStats({
        leadsToday: baseLeads + Math.floor(Math.random() * 10),
        activeUsers: baseUsers,
        conversions: baseConversions
      })
    }

    updateStats()
    const interval = setInterval(updateStats, 30000) // Aggiorna ogni 30 secondi
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
      <div className="flex items-center mb-2">
        <TrendingUp className="w-4 h-4 text-blue-600 mr-2" />
        <span className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
          📊 Attività in tempo reale
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">{stats.leadsToday}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400">Lead sbloccati oggi</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">{stats.activeUsers}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400">Utenti online ora</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-600">{stats.conversions}</div>
          <div className="text-xs text-blue-700 dark:text-blue-400">Upgrade oggi</div>
        </div>
      </div>
    </div>
  )
}
