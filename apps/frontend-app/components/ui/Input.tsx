/**
 * Input — campo di testo.
 *
 * Percorso: apps/frontend-app/components/ui/Input.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Altezza 44px (target touch), bordo hairline, focus con l'anello d'accento.
 * La label e' collegata all'input, l'errore e' annunciato con aria-describedby.
 */

'use client'

import { InputHTMLAttributes, ReactNode, forwardRef, useId } from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  /**
   * default  superficie elevata con bordo (dentro una pagina)
   * filled    fill tenue senza bordo (dentro una toolbar o una card gia' bordata)
   */
  variant?: 'default' | 'filled'
  /** Elemento a destra dentro il campo (es. un bottone "pulisci") */
  trailing?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    icon,
    iconPosition = 'left',
    variant = 'default',
    trailing,
    className,
    id,
    ...props
  },
  ref
) {
  const autoId = useId()
  const inputId = id ?? `input-${autoId}`
  const messageId = `${inputId}-msg`
  const message = error ?? hint

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-caption font-medium text-content"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <span
            className={cn(
              'pointer-events-none absolute inset-y-0 flex items-center text-content-subtle',
              '[&_svg]:h-4 [&_svg]:w-4',
              iconPosition === 'left' ? 'left-3' : 'right-3'
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'focus-ring block h-11 w-full rounded-control text-body text-content',
            'placeholder:text-content-subtle',
            'transition-[border-color,background-color] duration-fast ease-soft',
            'disabled:cursor-not-allowed disabled:opacity-50',
            variant === 'filled'
              ? 'border border-transparent bg-surface-subtle hover:border-edge'
              : 'border border-edge bg-surface-elevated hover:border-edge-strong',
            icon && iconPosition === 'left' ? 'pl-9' : 'pl-3.5',
            (icon && iconPosition === 'right') || trailing ? 'pr-9' : 'pr-3.5',
            error && 'border-danger-edge',
            className
          )}
          {...props}
        />

        {trailing && (
          <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>
        )}
      </div>

      {message && (
        <p
          id={messageId}
          className={cn(
            'mt-1.5 text-caption',
            error ? 'text-danger' : 'text-content-subtle'
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
})

export default Input
export { Input }
