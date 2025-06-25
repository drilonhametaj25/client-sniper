// UI restyling stile Apple + Linear
// Componente Card moderno con glassmorphism e design minimale
// Utilizzato in tutto il sistema per mantenere consistenza visiva

'use client'

import { ReactNode } from 'react'
import { customClasses } from '@/lib/design-tokens'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'elevated'
  padding?: 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
}

export default function Card({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'lg',
  hover = true 
}: CardProps) {
  const baseClasses = 'rounded-2xl transition-all duration-200'
  
  const variantClasses = {
    default: 'bg-white border border-gray-200/50 shadow-sm',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-sm',
    elevated: 'bg-white border border-gray-200/50 shadow-lg'
  }
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8',
    xl: 'p-10'
  }
  
  const hoverClasses = hover ? 'hover:shadow-md hover:border-gray-300/50 hover:-translate-y-0.5' : ''
  
  return (
    <div className={`
      ${baseClasses}
      ${variantClasses[variant]}
      ${paddingClasses[padding]}
      ${hoverClasses}
      ${className}
    `}>
      {children}
    </div>
  )
}
