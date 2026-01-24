/**
 * Componente per mostrare preview dei template email ai nuovi utenti
 * Usato per: Ridurre l'ansia da "cosa faccio dopo lo sblocco?"
 * Chiamato da: Dashboard, LeadCard sezione unlock
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Copy, Check } from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  preview: string
  category: 'first_contact' | 'follow_up' | 'proposal'
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'first_contact',
    name: 'Primo Contatto',
    subject: 'Ho notato alcuni problemi tecnici sul vostro sito',
    preview: 'Buongiorno,\n\nmi chiamo [TUO NOME] e mi occupo di sviluppo web per aziende come la vostra.\n\nHo notato che il vostro sito ha alcuni problemi tecnici che potrebbero penalizzarvi su Google e rallentare la conversione dei visitatori in clienti...',
    category: 'first_contact'
  },
  {
    id: 'value_proposition',
    name: 'Proposta di Valore',
    subject: 'Posso aiutarvi a migliorare le performance del sito',
    preview: 'Buongiorno,\n\nho analizzato il vostro sito web e ho identificato alcune opportunità di miglioramento che potrebbero aumentare significativamente la vostra visibilità online.\n\nIn particolare, ho notato che...',
    category: 'proposal'
  },
  {
    id: 'quick_audit',
    name: 'Audit Gratuito',
    subject: 'Audit gratuito del vostro sito - [NOME AZIENDA]',
    preview: 'Buongiorno,\n\ncome professionista del web, ho effettuato un\'analisi gratuita del vostro sito e ho identificato alcuni punti critici che potrebbero essere migliorati.\n\nSarei felice di condividere i risultati con voi in una breve chiamata...',
    category: 'first_contact'
  }
]

interface EmailTemplatePreviewProps {
  isOpen?: boolean
  onToggle?: () => void
  className?: string
  compact?: boolean
}

export default function EmailTemplatePreview({
  isOpen: controlledIsOpen,
  onToggle,
  className = '',
  compact = false
}: EmailTemplatePreviewProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const handleToggle = onToggle || (() => setInternalIsOpen(!internalIsOpen))

  const handleCopyTemplate = (template: EmailTemplate) => {
    const fullText = `Oggetto: ${template.subject}\n\n${template.preview}`
    navigator.clipboard.writeText(fullText)
    setCopiedId(template.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (compact) {
    return (
      <div className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
        <span className="inline-flex items-center">
          <Mail className="h-3 w-3 mr-1" />
          Template email inclusi dopo lo sblocco
        </span>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header - Cliccabile per espandere */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center">
            <Mail className="h-4 w-4 text-purple-600 dark:text-purple-300" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Template Email Pronti all'Uso
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Dopo lo sblocco avrai accesso a {EMAIL_TEMPLATES.length} template professionali
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Content - Template Preview */}
      {isOpen && (
        <div className="p-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Ecco alcuni dei template che potrai usare:
          </p>

          {EMAIL_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-1 ${
                    template.category === 'first_contact'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : template.category === 'proposal'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                  }`}>
                    {template.name}
                  </span>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {template.subject}
                  </h4>
                </div>
                <button
                  onClick={() => handleCopyTemplate(template)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copia template"
                >
                  {copiedId === template.id ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {template.preview.substring(0, 120)}...
              </p>
            </div>
          ))}

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Sblocca il lead per personalizzare i template con i dati dell'azienda
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
