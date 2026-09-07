/**
 * Pagination — paginazione italiana della lista lead.
 * I totali arrivano dal server (/api/leads), qui solo la UI.
 *
 * Usato da: app/dashboard/page.tsx
 */

'use client'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, total, perPage, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const buttonClass =
    'px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} di {total} lead
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className={buttonClass}>
          Precedente
        </button>
        {[...Array(Math.min(5, totalPages))].map((_, i) => {
          const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
          if (pageNum > totalPages) return null
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                pageNum === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {pageNum}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={buttonClass}
        >
          Successiva
        </button>
      </div>
    </div>
  )
}
