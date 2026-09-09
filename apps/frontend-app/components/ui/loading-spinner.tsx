/**
 * LoadingSpinner — indicatore di caricamento puntuale.
 *
 * Percorso: apps/frontend-app/components/ui/loading-spinner.tsx
 *
 * Da usare solo dove NON si conosce la forma del contenuto in arrivo
 * (es. una mappa, un grafico). Per liste e card usare Skeleton.
 */

import { cn } from '@/lib/utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Testo per gli screen reader */
  label?: string
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
}

export default function LoadingSpinner({
  size = 'md',
  className = '',
  label = 'Caricamento in corso',
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn('animate-spin rounded-pill border-edge-strong border-t-accent', sizes[size])}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}
