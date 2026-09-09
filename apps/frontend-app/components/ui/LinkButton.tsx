/**
 * LinkButton — un link che ha l'aspetto di un Button.
 *
 * Percorso: apps/frontend-app/components/ui/LinkButton.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Serve nelle pagine pubbliche (landing, prezzi, login, registrazione) dove
 * quasi ogni azione e' una NAVIGAZIONE: semanticamente e' un <a>, quindi non
 * puo' essere un <button>, ma deve avere la stessa forma e la stessa gerarchia.
 *
 * Le classi rispecchiano quelle di `Button.tsx`: se cambia la forma dei
 * bottoni, va aggiornato anche questo file. Le regole restano le stesse:
 * in una schermata c'e' UN solo `primary`, niente gradienti, altezza md = 44px.
 */

'use client'

import Link from 'next/link'
import { AnchorHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export type LinkButtonVariant = 'primary' | 'secondary' | 'ghost'
export type LinkButtonSize = 'md' | 'lg'

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children?: ReactNode
  variant?: LinkButtonVariant
  size?: LinkButtonSize
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const base =
  'focus-ring inline-flex items-center justify-center gap-2 ' +
  'rounded-control font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color] duration-fast ease-soft tap-highlight-none'

const variants: Record<LinkButtonVariant, string> = {
  primary: 'bg-accent text-accent-on hover:bg-accent-hover',
  secondary:
    'bg-surface-elevated text-content border border-edge hover:bg-surface-subtle',
  ghost: 'text-content-muted hover:bg-surface-subtle hover:text-content',
}

const sizes: Record<LinkButtonSize, string> = {
  md: 'h-11 px-4 text-body [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-12 px-6 text-body-lg [&_svg]:h-5 [&_svg]:w-5',
}

export default function LinkButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  fullWidth = false,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {icon}
        </span>
      )}
    </Link>
  )
}

export { LinkButton }
