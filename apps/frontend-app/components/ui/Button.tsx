/**
 * Button — primitiva di azione.
 *
 * Percorso: apps/frontend-app/components/ui/Button.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Gerarchia: in una schermata c'e' UN solo `primary`. Tutto il resto e'
 * `secondary` o `ghost`. Niente gradienti, niente ombre colorate.
 * Altezze: md = 44px (target touch minimo). `sm` solo per barre dense desktop.
 */

'use client'

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Testo mostrato al posto di `children` durante il caricamento */
  loadingText?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  /** Bottone di sola icona: richiede `aria-label` */
  iconOnly?: boolean
  fullWidth?: boolean
}

const base =
  'focus-ring relative inline-flex items-center justify-center gap-2 ' +
  'rounded-control font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color,opacity] duration-fast ease-soft ' +
  'disabled:opacity-45 disabled:pointer-events-none tap-highlight-none'

const variants: Record<ButtonVariant, string> = {
  // Pieno d'accento: l'unica superficie colorata della schermata.
  primary: 'bg-accent text-accent-on hover:bg-accent-hover active:bg-accent-hover',
  // Superficie neutra con bordo hairline: l'azione secondaria normale.
  secondary:
    'bg-surface-elevated text-content border border-edge hover:bg-surface-subtle active:bg-surface-subtle',
  // Nessuna superficie finche' non lo tocchi.
  ghost: 'text-content-muted hover:bg-surface-subtle hover:text-content active:bg-surface-subtle',
  // Distruttivo: pieno rosso, usato solo per eliminazioni confermate.
  danger: 'bg-danger-solid text-white hover:bg-danger-solid-hover active:bg-danger-solid-hover',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-3.5 text-caption',
  md: 'h-11 px-4 text-body',
  lg: 'h-12 px-6 text-body-lg',
}

const iconOnlySizes: Record<ButtonSize, string> = {
  sm: 'h-10 w-10 p-0',
  md: 'h-11 w-11 p-0',
  lg: 'h-12 w-12 p-0',
}

const iconSizes: Record<ButtonSize, string> = {
  sm: '[&_svg]:h-4 [&_svg]:w-4',
  md: '[&_svg]:h-4 [&_svg]:w-4',
  lg: '[&_svg]:h-5 [&_svg]:w-5',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    iconOnly = false,
    fullWidth = false,
    className,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  const label = loading && loadingText ? loadingText : children

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        variants[variant],
        iconOnly ? iconOnlySizes[size] : sizes[size],
        iconSizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          {label}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="inline-flex shrink-0 items-center" aria-hidden="true">
              {icon}
            </span>
          )}
          {label}
          {icon && iconPosition === 'right' && (
            <span className="inline-flex shrink-0 items-center" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  )
})

export default Button
export { Button }
