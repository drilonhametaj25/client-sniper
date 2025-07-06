// Theme Context: gestisce il sistema di temi chiaro/scuro per tutta l'applicazione
// Utilizzato da tutti i componenti per applicare il tema corrente
// Supporta persistenza locale e sincronizzazione con preferenze utente database
// Include modalità auto che segue le preferenze di sistema

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark' // Il tema effettivo applicato (risolve 'system')
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // Determina il tema effettivo basato su sistema e preferenze
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Calcola il tema attuale da applicare
  const calculateActualTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return getSystemTheme()
    }
    return currentTheme
  }

  // Applica il tema al documento
  const applyTheme = (newActualTheme: 'light' | 'dark') => {
    if (typeof window === 'undefined') return

    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newActualTheme)
    
    // Aggiorna anche il colore della barra di stato per mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', newActualTheme === 'dark' ? '#0f172a' : '#ffffff')
    }
  }

  // Carica tema iniziale dal localStorage o dal profilo utente
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadInitialTheme = async () => {
      let initialTheme: Theme = 'system'

      // Se l'utente è loggato, usa il tema dal profilo
      if (user?.preferred_theme) {
        initialTheme = user.preferred_theme as Theme
      } else {
        // Altrimenti carica dal localStorage
        const savedTheme = localStorage.getItem('theme') as Theme
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          initialTheme = savedTheme
        }
      }

      setThemeState(initialTheme)
      const resolvedTheme = calculateActualTheme(initialTheme)
      setActualTheme(resolvedTheme)
      applyTheme(resolvedTheme)
    }

    loadInitialTheme()
  }, [user])

  // Ascolta cambiamenti nelle preferenze di sistema
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        const newActualTheme = getSystemTheme()
        setActualTheme(newActualTheme)
        applyTheme(newActualTheme)
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [theme])

  // Salva tema nel database se utente loggato, altrimenti localStorage
  const saveThemePreference = async (newTheme: Theme) => {
    if (user) {
      try {
        const response = await fetch('/api/user/theme', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: newTheme }),
        })
        
        if (!response.ok) {
          console.warn('Errore nel salvare tema nel profilo utente')
        }
      } catch (error) {
        console.warn('Errore nel salvare tema nel profilo utente:', error)
      }
    } else {
      // Salva nel localStorage per utenti non loggati
      localStorage.setItem('theme', newTheme)
    }
  }

  // Funzione per cambiare tema
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    const newActualTheme = calculateActualTheme(newTheme)
    setActualTheme(newActualTheme)
    applyTheme(newActualTheme)
    saveThemePreference(newTheme)
  }

  // Funzione per alternare tra chiaro e scuro (esclude system)
  const toggleTheme = () => {
    const newTheme = actualTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
