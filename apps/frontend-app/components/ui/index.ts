/**
 * Primitive UI di TrovaMi — punto d'ingresso unico.
 *
 * Percorso: apps/frontend-app/components/ui/index.ts
 * Guida: apps/frontend-app/DESIGN.md
 *
 *   import { Button, Card, Badge, EmptyState } from '@/components/ui'
 *
 * Restano validi anche gli import diretti (default export) usati dalle
 * pagine esistenti: import Button from '@/components/ui/Button'
 */

export { default as Button } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'

export { default as LinkButton } from './LinkButton'
export type { LinkButtonProps, LinkButtonVariant, LinkButtonSize } from './LinkButton'

export { default as Card, CardHeader, CardBody, CardFooter, CardTitle } from './Card'
export type { CardProps, CardPadding, CardSectionProps } from './Card'

export { default as Badge } from './Badge'
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge'

export { default as Input } from './Input'
export type { InputProps } from './Input'

export { default as Select } from './Select'
export type { SelectProps, SelectOption } from './Select'

export { default as EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

export { default as Skeleton, SkeletonText, SkeletonCard, SkeletonList } from './Skeleton'
export type { SkeletonProps } from './Skeleton'

export { default as LoadingSpinner } from './loading-spinner'

export { cn } from '@/lib/utils/cn'
