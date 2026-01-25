/**
 * Section Header Component
 *
 * Header per sezioni dashboard con titolo, descrizione e link "Vedi tutti".
 *
 * @file apps/frontend-app/components/dashboard/SectionHeader.tsx
 */

'use client'

import { ChevronRight, LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface SectionHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  iconEmoji?: string
  count?: number
  viewAllHref?: string
  viewAllLabel?: string
  className?: string
}

export default function SectionHeader({
  title,
  description,
  icon: Icon,
  iconEmoji,
  count,
  viewAllHref,
  viewAllLabel = 'Vedi tutti',
  className = ''
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Icon */}
        {(Icon || iconEmoji) && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
            {iconEmoji ? (
              <span className="text-xl">{iconEmoji}</span>
            ) : Icon ? (
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : null}
          </div>
        )}

        {/* Text */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {title}
            {count !== undefined && count > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                {count}
              </span>
            )}
          </h2>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* View All Link */}
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {viewAllLabel}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}
