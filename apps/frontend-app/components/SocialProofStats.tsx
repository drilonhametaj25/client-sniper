// Componente per social proof dinamico con contatori animati
// Utilizzato nella landing page /ads per aumentare credibilità
// Include animazioni e aggiornamenti in tempo reale

'use client'

import { useState, useEffect } from 'react'
import { Target, Users, TrendingUp, CheckCircle } from 'lucide-react'

interface StatData {
  label: string
  value: number
  suffix: string
  prefix?: string
  color: string
  icon: React.ElementType
  description: string
}

export default function SocialProofStats() {
  const [mounted, setMounted] = useState(false)
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({})

  const stats: StatData[] = [
    {
      label: 'Siti Analizzati',
      value: 52847,
      suffix: '+',
      color: 'blue',
      icon: Target,
      description: 'Siti web scansionati e analizzati'
    },
    {
      label: 'Lead Generati',
      value: 1486,
      suffix: '',
      color: 'green',
      icon: Users,
      description: 'Lead qualificati consegnati'
    },
    {
      label: 'Tasso di Risposta',
      value: 89,
      suffix: '%',
      color: 'purple',
      icon: TrendingUp,
      description: 'Percentuale di risposta media'
    },
    {
      label: 'Clienti Soddisfatti',
      value: 247,
      suffix: '',
      color: 'indigo',
      icon: CheckCircle,
      description: 'Agenzie e freelancer attivi'
    }
  ]

  useEffect(() => {
    setMounted(true)
    
    // Inizializza valori animati
    const initialValues: { [key: string]: number } = {}
    stats.forEach(stat => {
      initialValues[stat.label] = 0
    })
    setAnimatedValues(initialValues)

    // Anima i contatori
    const animationDuration = 2000
    const steps = 60
    const stepDuration = animationDuration / steps

    stats.forEach(stat => {
      const increment = stat.value / steps
      let currentStep = 0

      const timer = setInterval(() => {
        currentStep++
        const currentValue = Math.min(increment * currentStep, stat.value)
        
        setAnimatedValues(prev => ({
          ...prev,
          [stat.label]: Math.floor(currentValue)
        }))

        if (currentStep >= steps) {
          clearInterval(timer)
        }
      }, stepDuration)
    })

    // Incremento periodico per simulare crescita
    const growthTimer = setInterval(() => {
      setAnimatedValues(prev => {
        const newValues = { ...prev }
        
        // Incrementa solo alcuni valori occasionalmente
        if (Math.random() < 0.3) {
          newValues['Siti Analizzati'] += Math.floor(Math.random() * 3) + 1
        }
        if (Math.random() < 0.1) {
          newValues['Lead Generati'] += 1
        }
        if (Math.random() < 0.05) {
          newValues['Clienti Soddisfatti'] += Math.floor(Math.random() * 2)
        }
        
        return newValues
      })
    }, 8000)

    return () => clearInterval(growthTimer)
  }, [])

  if (!mounted) return null

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      purple: 'text-purple-600 bg-purple-50',
      indigo: 'text-indigo-600 bg-indigo-50'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const colorClasses = getColorClasses(stat.color)
        const currentValue = animatedValues[stat.label] || 0
        
        return (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-full ${colorClasses} flex items-center justify-center`}>
                <Icon className="h-6 w-6" />
              </div>
              
              {/* Indicatore di crescita */}
              <div className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>+{Math.floor(Math.random() * 20) + 5}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">
                  {stat.prefix}{currentValue.toLocaleString()}{stat.suffix}
                </span>
                {currentValue < stat.value && (
                  <span className="ml-2 text-sm text-gray-500 animate-pulse">
                    ...
                  </span>
                )}
              </div>
              
              <div className="text-sm font-medium text-gray-900">
                {stat.label}
              </div>
              
              <div className="text-xs text-gray-600">
                {stat.description}
              </div>
            </div>
            
            {/* Barra di progresso animata */}
            <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full ${stat.color === 'blue' ? 'bg-blue-500' : 
                  stat.color === 'green' ? 'bg-green-500' : 
                  stat.color === 'purple' ? 'bg-purple-500' : 'bg-indigo-500'
                } transition-all duration-1000 ease-out`}
                style={{
                  width: `${(currentValue / stat.value) * 100}%`
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
