// Sistema di notifiche toast moderno per TrovaMi
// Utilizzato per mostrare messaggi di successo, errore, info, warning
// Sostituisce gli alert nativi del browser

'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast,
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    if (newToast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = "flex items-start p-4 rounded-lg shadow-lg border max-w-sm w-full"
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200`
      case 'error':
        return `${baseStyles} bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200`
      case 'warning':
        return `${baseStyles} bg-yellow-50 dark:bg-yellow-900/50 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200`
      case 'info':
        return `${baseStyles} bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200`
      default:
        return `${baseStyles} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200`
    }
  }

  const getIcon = (type: Toast['type']) => {
    const iconProps = { className: "w-5 h-5 mr-3 mt-0.5 flex-shrink-0" }
    
    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
      case 'error':
        return <AlertCircle {...iconProps} className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
      case 'warning':
        return <AlertTriangle {...iconProps} className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
      case 'info':
        return <Info {...iconProps} className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
      default:
        return <Info {...iconProps} />
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} animate-in slide-in-from-right duration-300`}
        >
          {getIcon(toast.type)}
          <div className="flex-1">
            <p className="font-medium">{toast.title}</p>
            {toast.message && (
              <p className="text-sm opacity-90 mt-1">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
