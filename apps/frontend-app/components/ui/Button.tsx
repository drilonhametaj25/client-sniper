// UI restyling stile Apple + Linear  
// Componente Button moderno con micro-animazioni e design minimale
// Supporta diverse varianti per mantenere gerarchia visiva

'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 focus:ring-gray-500 active:bg-gray-900 dark:active:bg-gray-800',
    secondary: 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
    danger: 'text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 active:bg-red-800 dark:active:bg-red-700'
  }
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }
  
  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  }
  
  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className={`animate-spin ${iconSizeClasses[size]} ${children ? 'mr-2' : ''}`} />
          {children}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className={`${iconSizeClasses[size]} ${children ? 'mr-2' : ''}`}>
              {icon}
            </span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className={`${iconSizeClasses[size]} ${children ? 'ml-2' : ''}`}>
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  )
}
