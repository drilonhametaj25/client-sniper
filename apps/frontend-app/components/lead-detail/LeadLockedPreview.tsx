/**
 * LeadLockedPreview — Anteprima per lead NON sbloccati.
 *
 * Non mostra contatti né dettagli dell'analisi: solo cosa si ottiene con lo
 * sblocco e la CTA che apre UnlockLeadModal (l'unico flusso che può consumare
 * un credito, sempre con conferma esplicita). Guardare questa pagina non
 * costa mai nulla.
 *
 * Usato da: app/lead/[id]/page.tsx
 */

'use client'

import { Lock, Phone, Search, MessageSquareText, Euro, Zap } from 'lucide-react'

interface LeadLockedPreviewProps {
  category?: string | null
  city?: string | null
  onUnlock: () => void
}

const BENEFITS = [
  { icon: Phone, text: 'Contatti diretti: telefono, email e sito web' },
  { icon: Search, text: 'Analisi completa del sito con i problemi da risolvere' },
  { icon: MessageSquareText, text: 'Template pronti per email, WhatsApp e telefonate' },
  { icon: Euro, text: 'Preventivo automatico basato sui difetti rilevati' }
]

export default function LeadLockedPreview({ category, city, onUnlock }: LeadLockedPreviewProps) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Lock className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Questo lead è ancora bloccato
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        Sblocca questa attività{category ? ` (${category}` : ''}
        {category && city ? `, ${city})` : category ? ')' : city ? ` di ${city}` : ''} per
        vedere contatti, analisi e strumenti di vendita. Lo sblocco costa 1 credito e
        richiede sempre la tua conferma.
      </p>

      <ul className="max-w-md mx-auto text-left space-y-3 mb-8">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <Icon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onUnlock}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
      >
        <Zap className="h-5 w-5" />
        Sblocca questo lead
      </button>
    </section>
  )
}
