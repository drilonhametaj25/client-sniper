/**
 * Pagination — paginazione italiana della lista lead.
 * I totali arrivano dal server (/api/leads), qui solo la UI.
 *
 * Su mobile i numeri di pagina lasciano il posto a "Pagina 2 di 12": restano
 * Precedente/Successiva, che sono i controlli che si usano davvero sul telefono.
 *
 * Usato da: app/dashboard/page.tsx
 */

'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils/cn'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, total, perPage, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <nav
      aria-label="Navigazione fra le pagine dei risultati"
      className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-edge pt-6 sm:flex-row"
    >
      <p className="text-caption text-content-subtle">
        <span className="tabular-nums">{from}–{to}</span> di{' '}
        <span className="tabular-nums">{total}</span> lead
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<ChevronLeft />}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          Precedente
        </Button>

        <span className="px-2 text-caption tabular-nums text-content-muted sm:hidden">
          Pagina {page} di {totalPages}
        </span>

        <span className="hidden items-center gap-1 sm:flex">
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
            if (pageNum > totalPages) return null
            const isCurrent = pageNum === page
            return (
              <Button
                key={pageNum}
                variant={isCurrent ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Vai alla pagina ${pageNum}`}
                className={cn('tabular-nums', isCurrent && 'font-semibold text-content')}
              >
                {pageNum}
              </Button>
            )
          })}
        </span>

        <Button
          variant="ghost"
          size="sm"
          icon={<ChevronRight />}
          iconPosition="right"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Successiva
        </Button>
      </div>
    </nav>
  )
}
