// Componente per mostrare la comparativa dei costi lead rispetto alla concorrenza
// Utilizzato per evidenziare il valore competitivo di TrovaMi.pro
// Design responsive e moderno per massimizzare la conversione

'use client'

import { useState } from 'react'
import { Info, ChevronDown, ChevronUp, Target, TrendingDown, AlertTriangle, X } from 'lucide-react'

interface CompetitorData {
  source: string
  costRange: string
  comment: string
  commentIcon: 'success' | 'warning' | 'error'
  details?: string
}

// Costo per lead calcolato dai piani reali Stripe:
// - Starter: €19/25 lead = €0.76/lead
// - Pro: €49/100 lead = €0.49/lead
// - Agency: €99/300 lead = €0.33/lead
// Range: €0.33 - €0.76 per lead

const competitorData: CompetitorData[] = [
  {
    source: 'TrovaMi.pro',
    costRange: '0,33€ – 0,76€',
    comment: 'Contatto reale già profilato',
    commentIcon: 'success',
    details: 'Include analisi SEO, pixel tracking, social presence, contatti completi e P.IVA. Lead qualificato e pronto per il contatto.'
  },
  {
    source: 'Google Ads',
    costRange: '5€ – 20€',
    comment: 'Solo click, nessun contatto diretto',
    commentIcon: 'error',
    details: 'Paghi per ogni click ma non hai garanzia di ottenere un contatto. Spesso i click sono di bassa qualità o da bot.'
  },
  {
    source: 'Facebook Ads',
    costRange: '2€ – 8€',
    comment: 'Molta dispersione e poca qualità',
    commentIcon: 'warning',
    details: 'Lead generici senza profilazione specifica. Alta probabilità di contatti non interessati o non qualificati.'
  },
  {
    source: 'Lead da agenzia',
    costRange: '10€ – 50€',
    comment: 'Pochi lead, spesso freddi',
    commentIcon: 'error',
    details: 'Lead spesso rivenduti a più agenzie, con qualità non garantita e tempi di risposta lenti.'
  }
]

const getIconForComment = (type: 'success' | 'warning' | 'error') => {
  switch (type) {
    case 'success':
      return '✅'
    case 'warning':
      return '⚠️'
    case 'error':
      return '❌'
  }
}

interface LeadCostComparisonProps {
  className?: string
  variant?: 'full' | 'compact' | 'tooltip'
}

export default function LeadCostComparison({ 
  className = '', 
  variant = 'full' 
}: LeadCostComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  if (variant === 'tooltip') {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Info className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">Perché conviene?</span>
        </button>

        {showTooltip && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowTooltip(false)}
            />
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-80">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    💡 Confronto costi per lead
                  </h4>
                  <button
                    onClick={() => setShowTooltip(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {competitorData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{item.source}:</span>
                      <span className={`font-medium ${
                        index === 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {item.costRange}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Con TrovaMi ogni lead include sito analizzato, contatti, SEO e molto altro.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 ${className}`}>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingDown className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              🎯 Lead da soli 0,33€
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Molto meno dei 5-20€ di Google Ads, già profilato e pronto
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            📊 Quanto costa davvero un lead altrove?
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Confronta i nostri prezzi con la concorrenza
          </p>
        </div>

        {/* Tabella comparativa */}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fonte
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Costo per lead
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Qualità
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {competitorData.map((item, index) => (
                <tr key={index} className={index === 0 ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 && <Target className="w-4 h-4 text-green-600 mr-2" />}
                      <span className={`text-sm font-medium ${
                        index === 0 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {item.source}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-sm font-bold ${
                      index === 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {item.costRange}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span className="mr-2">{getIconForComment(item.commentIcon)}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.comment}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sezione espandibile */}
        <div className="mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium py-2 transition-colors"
          >
            <Info className="w-4 h-4 mr-2" />
            <span>Maggiori dettagli</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </button>

          {isExpanded && (
            <div className="mt-4 space-y-3 animate-in slide-in-from-top duration-200">
              {competitorData.map((item, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{item.source}</span>
                    <span className="ml-2">{getIconForComment(item.commentIcon)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.details}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call to action */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-4">
          <div className="text-center">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              🎯 Prezzo per lead da 0,33€
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Molto meno rispetto ai 5-20€ di Google Ads.<br />
              E qui il lead è già pronto, con sito, contatti, analisi SEO e Pixel inclusi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper per calcolare il costo per lead
export const calculateLeadCost = (planPrice: number, credits: number): string => {
  if (credits === 0) return '0€'
  const cost = (planPrice / credits).toFixed(2)
  return `${cost}€`
}

// Helper per ottenere il messaggio di convenienza
export const getLeadCostMessage = (planPrice: number, credits: number): string => {
  const cost = planPrice / credits
  if (cost < 0.60) {
    return `💎 Solo ${calculateLeadCost(planPrice, credits)} a lead!`
  } else if (cost < 1.00) {
    return `🔍 Costo per lead: ${calculateLeadCost(planPrice, credits)}`
  } else {
    return `📊 ${calculateLeadCost(planPrice, credits)} per lead`
  }
}
