/**
 * Layout per Onboarding
 *
 * Layout minimale senza navbar per flow di onboarding immersivo.
 * Include solo logo TrovaMi e pulsante per tornare indietro.
 *
 * @file apps/frontend-app/app/onboarding/layout.tsx
 */

import { Target } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Configura il tuo profilo | TrovaMi',
  description: 'Configura le tue preferenze per ricevere lead personalizzati'
}

export default function OnboardingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">TrovaMi</span>
            </Link>

            <Link
              href="/dashboard"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Salta per ora
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14">
        {children}
      </main>
    </div>
  )
}
