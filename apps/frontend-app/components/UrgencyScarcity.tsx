// Componente per urgenza e scarsità nella landing page /ads
// Utilizzato per aumentare la conversione con timer dinamici
// Include elementi di gamification e pressione sociale

'use client'

import { useState, useEffect } from 'react'
import { Clock, Users, Zap, AlertCircle, CheckCircle } from 'lucide-react'

export default function UrgencyScarcity() {
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 47,
    seconds: 28
  })
  const [activeUsers, setActiveUsers] = useState(23)
  const [recentSignups, setRecentSignups] = useState([
    { name: 'Marco R.', location: 'Milano', time: '2 min fa' },
    { name: 'Laura B.', location: 'Roma', time: '5 min fa' },
    { name: 'Giuseppe V.', location: 'Napoli', time: '8 min fa' }
  ])

  useEffect(() => {
    setMounted(true)

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev
        
        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        }
        
        return { hours, minutes, seconds }
      })
    }, 1000)

    // Simula utenti attivi
    const userTimer = setInterval(() => {
      setActiveUsers(prev => {
        const change = Math.floor(Math.random() * 7) - 3 // -3 a +3
        return Math.max(15, Math.min(35, prev + change))
      })
    }, 3000)

    // Simula nuove registrazioni
    const signupTimer = setInterval(() => {
      const names = ['Andrea C.', 'Chiara F.', 'Roberto S.', 'Elena M.', 'Davide L.', 'Francesca P.']
      const locations = ['Milano', 'Roma', 'Napoli', 'Torino', 'Firenze', 'Bologna', 'Venezia']
      
      setRecentSignups(prev => {
        const newSignup = {
          name: names[Math.floor(Math.random() * names.length)],
          location: locations[Math.floor(Math.random() * locations.length)],
          time: 'appena ora'
        }
        
        // Aggiorna i tempi degli altri
        const updated = prev.map(signup => {
          const timeNum = parseInt(signup.time)
          if (signup.time === 'appena ora') return { ...signup, time: '1 min fa' }
          if (signup.time.includes('min fa')) {
            const mins = parseInt(signup.time) + 1
            return { ...signup, time: `${mins} min fa` }
          }
          return signup
        })
        
        return [newSignup, ...updated.slice(0, 2)]
      })
    }, 8000)

    return () => {
      clearInterval(timer)
      clearInterval(userTimer)
      clearInterval(signupTimer)
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-8 mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Countdown Timer */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-orange-600 mr-2" />
            <span className="text-lg font-semibold text-orange-800">
              Offerta Limitata
            </span>
          </div>
          
          <div className="text-sm text-orange-700 mb-4">
            2 lead gratuiti disponibili ancora per:
          </div>
          
          <div className="flex justify-center space-x-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {timeLeft.hours.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-600">ore</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {timeLeft.minutes.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-600">min</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {timeLeft.seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-600">sec</div>
            </div>
          </div>
        </div>

        {/* Utenti Attivi */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-green-600 mr-2" />
            <span className="text-lg font-semibold text-green-800">
              Altri stanno guardando
            </span>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 font-medium">
              {activeUsers} persone online ora
            </span>
          </div>
          
          <div className="text-sm text-green-600">
            Stanno valutando TrovaMi in questo momento
          </div>
        </div>

        {/* Registrazioni Recenti */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-blue-600 mr-2" />
            <span className="text-lg font-semibold text-blue-800">
              Appena registrati
            </span>
          </div>
          
          <div className="space-y-2">
            {recentSignups.map((signup, index) => (
              <div 
                key={index}
                className="flex items-center justify-between text-sm bg-white rounded-lg p-2 shadow-sm"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="font-medium text-gray-900">
                    {signup.name}
                  </span>
                  <span className="text-gray-600 ml-1">
                    • {signup.location}
                  </span>
                </div>
                <span className="text-gray-500 text-xs">
                  {signup.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Avviso finale */}
      <div className="mt-8 p-4 bg-orange-100 rounded-lg border border-orange-200">
        <div className="flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
          <span className="text-orange-800 font-medium">
            Disponibilità limitata - Solo per i primi 100 utenti del giorno
          </span>
        </div>
      </div>
    </div>
  )
}
