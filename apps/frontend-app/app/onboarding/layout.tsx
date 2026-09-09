/**
 * Layout per Onboarding
 *
 * Layout minimale senza navbar per un flow immersivo: solo il marchio e
 * l'uscita di sicurezza ("Salta per ora"). Niente vetro, niente gradienti:
 * la pagina e' una superficie neutra, il contenuto e' l'interfaccia.
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
    <div className="min-h-screen bg-surface">
      {/* Header minimo: marchio a sinistra, uscita a destra.
          E' alto quanto la navbar globale e la copre (z sopra la sua): durante
          l'onboarding non ci sono altre destinazioni da mostrare. */}
      <header className="fixed inset-x-0 top-0 z-[60] border-b border-edge bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="focus-ring -ml-2 inline-flex h-11 items-center gap-2 rounded-control px-2 text-content"
          >
            <Target className="h-4 w-4 text-accent-ink" aria-hidden="true" />
            <span className="text-body font-semibold">TrovaMi</span>
          </Link>

          <Link
            href="/dashboard"
            className="focus-ring -mr-2 inline-flex h-11 items-center rounded-control px-2 text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
          >
            Salta per ora
          </Link>
        </div>
      </header>

      <div className="pt-16">{children}</div>
    </div>
  )
}
