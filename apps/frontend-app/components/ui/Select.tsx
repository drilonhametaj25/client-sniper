/**
 * Select — menu a tendina nativo.
 *
 * Percorso: apps/frontend-app/components/ui/Select.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Nativo di proposito: su mobile apre il picker di sistema, e' accessibile
 * da tastiera senza codice nostro e non introduce un secondo linguaggio
 * visivo. Stessa altezza (44px), stesso bordo e stesso focus dell'Input.
 *
 * Uso con `options`:
 *   <Select label="Ordina per" options={[{ value: 'recenti', label: 'Piu' recenti' }]} />
 * oppure con <option> come children.
 */

'use client'

import { SelectHTMLAttributes, ReactNode, forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options?: SelectOption[]
  /** Voce iniziale non selezionabile (es. "Tutte le citta'") */
  placeholder?: string
  variant?: 'default' | 'filled'
  children?: ReactNode
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    hint,
    options,
    placeholder,
    variant = 'default',
    className,
    children,
    id,
    ...props
  },
  ref
) {
  const autoId = useId()
  const selectId = id ?? `select-${autoId}`
  const messageId = `${selectId}-msg`
  const message = error ?? hint

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-caption font-medium text-content"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'focus-ring block h-11 w-full appearance-none rounded-control',
            'pl-3.5 pr-9 text-body text-content',
            'transition-[border-color,background-color] duration-fast ease-soft',
            'disabled:cursor-not-allowed disabled:opacity-50',
            variant === 'filled'
              ? 'border border-transparent bg-surface-subtle hover:border-edge'
              : 'border border-edge bg-surface-elevated hover:border-edge-strong',
            error && 'border-danger-edge',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle"
          aria-hidden="true"
        />
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

export default Select
export { Select }
