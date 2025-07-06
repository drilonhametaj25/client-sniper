// Componente toggle per cambiare tema dell'applicazione
// Mostra tre opzioni: Chiaro, Scuro, Sistema
// Design minimale Apple/Linear con transizioni fluide
// Include tooltip e icone intuitive

'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react'

interface ThemeToggleProps {
  variant?: 'dropdown' | 'buttons' | 'compact'
  showLabel?: boolean
  className?: string
}

const themeOptions = [
  {
    value: 'light' as const,
    label: 'Chiaro',
    icon: Sun,
    description: 'Tema chiaro sempre attivo'
  },
  {
    value: 'dark' as const,
    label: 'Scuro',
    icon: Moon,
    description: 'Tema scuro sempre attivo'
  },
  {
    value: 'system' as const,
    label: 'Sistema',
    icon: Monitor,
    description: 'Segue le preferenze del sistema'
  }
]

export default function ThemeToggle({ 
  variant = 'dropdown', 
  showLabel = true,
  className = '' 
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const currentTheme = themeOptions.find(option => option.value === theme) || themeOptions[2]
  const CurrentIcon = currentTheme.icon

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
            Tema:
          </span>
        )}
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isActive = theme === option.value
          
          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`
                p-2 rounded-lg transition-all duration-200 
                ${isActive 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              title={option.description}
            >
              <Icon className="w-4 h-4" />
            </button>
          )
        })}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={() => {
          const currentIndex = themeOptions.findIndex(option => option.value === theme)
          const nextIndex = (currentIndex + 1) % themeOptions.length
          setTheme(themeOptions[nextIndex].value)
        }}
        className={`
          p-2 rounded-lg transition-all duration-200 
          text-gray-500 dark:text-gray-400 
          hover:bg-gray-100 dark:hover:bg-gray-800
          ${className}
        `}
        title={`Tema attuale: ${currentTheme.label}. Clicca per cambiare.`}
      >
        <CurrentIcon className="w-4 h-4" />
      </button>
    )
  }

  // Variant: dropdown (default)
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center space-x-2 px-3 py-2 rounded-lg 
          text-gray-700 dark:text-gray-300 
          hover:bg-gray-100 dark:hover:bg-gray-800 
          transition-colors duration-200 
          border border-gray-300 dark:border-gray-600
        "
      >
        <CurrentIcon className="w-4 h-4" />
        {showLabel && <span className="text-sm">{currentTheme.label}</span>}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="
          absolute right-0 mt-2 w-48 
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700 
          rounded-lg shadow-lg 
          py-1 z-50
        ">
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isActive = theme === option.value
            
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 text-left
                  transition-colors duration-200
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                </div>
                {isActive && (
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Overlay per chiudere dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
