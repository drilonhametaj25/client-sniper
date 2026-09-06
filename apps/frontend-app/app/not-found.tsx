/**
 * Pagina 404 globale - mostrata quando una route non esiste
 * Usata da: Next.js App Router (convenzione not-found.tsx)
 */

import Link from 'next/link'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
          <SearchX className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">404</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pagina non trovata
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Torna alla home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Vai alla dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
