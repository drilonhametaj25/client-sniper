// UI restyling stile Apple + Linear
// Componente Input moderno con design pulito e feedback UX
// Focus su accessibilità e micro-interazioni

'use client'

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  variant?: 'default' | 'filled'
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  variant = 'default',
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'block w-full transition-all duration-200 focus:outline-none'
  
  const variantClasses = {
    default: 'border border-gray-300 bg-white focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900',
    filled: 'border border-transparent bg-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-900/20 focus:border-gray-300'
  }
  
  const inputClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
    ${icon ? (iconPosition === 'left' ? 'pl-12' : 'pr-12') : 'px-4'}
    py-3 rounded-2xl text-base placeholder:text-gray-400
    ${className}
  `
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-900">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center pointer-events-none`}>
            <span className="text-gray-400 w-5 h-5">
              {icon}
            </span>
          </div>
        )}
        
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-gray-500 mt-1">
          {hint}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
