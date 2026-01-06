/**
 * Componente per visualizzare Lead Score avanzato
 * Mostra breakdown, raccomandazioni, probabilità conversione
 */

'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Target,
  Zap,
  Shield,
  Smartphone,
  BarChart3,
  Globe,
  FileText,
  ChevronDown,
  ChevronUp,
  Flame,
  Snowflake,
  ThermometerSun
} from 'lucide-react'

interface ScoreBreakdown {
  seo: number
  performance: number
  mobile: number
  tracking: number
  gdpr: number
  content: number
  technical: number
}

interface Recommendation {
  service: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  price: number
  impact: string
}

interface LeadScoreData {
  overall_score: number
  breakdown: ScoreBreakdown
  quality: 'hot' | 'warm' | 'cold' | 'unqualified'
  quality_label: string
  conversion_probability: number
  estimated_deal_value: number
  estimated_monthly_revenue: number
  recommendations: Recommendation[]
  quick_wins: string[]
  urgency_score: number
}

interface LeadScoreCardProps {
  data: LeadScoreData
  businessName?: string
}

const BREAKDOWN_CONFIG: Record<keyof ScoreBreakdown, { label: string; icon: any; color: string }> = {
  seo: { label: 'SEO', icon: Globe, color: 'text-blue-500' },
  performance: { label: 'Performance', icon: Zap, color: 'text-yellow-500' },
  mobile: { label: 'Mobile', icon: Smartphone, color: 'text-purple-500' },
  tracking: { label: 'Analytics', icon: BarChart3, color: 'text-green-500' },
  gdpr: { label: 'GDPR', icon: Shield, color: 'text-red-500' },
  content: { label: 'Contenuti', icon: FileText, color: 'text-orange-500' },
  technical: { label: 'Tecnico', icon: Target, color: 'text-gray-500' }
}

const QUALITY_CONFIG = {
  hot: { icon: Flame, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  warm: { icon: ThermometerSun, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  cold: { icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  unqualified: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' }
}

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}

export default function LeadScoreCard({ data, businessName }: LeadScoreCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const qualityConfig = QUALITY_CONFIG[data.quality]
  const QualityIcon = qualityConfig.icon

  // Calcola colore score
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Calcola colore barra (invertito: alto = opportunità)
  const getBarColor = (score: number) => {
    if (score >= 70) return 'bg-red-500' // Molte opportunità
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-green-500' // Poche opportunità
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Header con score principale */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Lead Score
          </h3>
          {businessName && (
            <p className="text-sm text-gray-500">{businessName}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Qualità */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${qualityConfig.bg}`}>
            <QualityIcon className={`w-4 h-4 ${qualityConfig.color}`} />
            <span className={`text-sm font-medium ${qualityConfig.color}`}>
              {data.quality.toUpperCase()}
            </span>
          </div>

          {/* Score */}
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(data.overall_score)}`}>
              {data.overall_score}
            </div>
            <div className="text-xs text-gray-500">/ 100</div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Conversione */}
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
            <Target className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {data.conversion_probability}%
          </div>
          <div className="text-xs text-gray-500">Prob. Conversione</div>
        </div>

        {/* Valore Deal */}
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            €{data.estimated_deal_value.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Valore Stimato</div>
        </div>

        {/* Urgenza */}
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {data.urgency_score}
          </div>
          <div className="text-xs text-gray-500">Urgenza</div>
        </div>
      </div>

      {/* Breakdown visuale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Aree di Opportunità</span>
          <span className="text-xs">(più alto = più opportunità)</span>
        </div>

        {Object.entries(data.breakdown).map(([key, value]) => {
          const config = BREAKDOWN_CONFIG[key as keyof ScoreBreakdown]
          const Icon = config.icon

          return (
            <div key={key} className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color} flex-shrink-0`} />
              <span className="text-xs text-gray-600 dark:text-gray-400 w-20">
                {config.label}
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`${getBarColor(value)} h-2 rounded-full transition-all`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-900 dark:text-white w-8 text-right">
                {value}
              </span>
            </div>
          )
        })}
      </div>

      {/* Toggle dettagli */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
      >
        {showDetails ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Nascondi dettagli
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Mostra dettagli e raccomandazioni
          </>
        )}
      </button>

      {/* Dettagli espansi */}
      {showDetails && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Quick Wins */}
          {data.quick_wins.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Quick Wins
              </h4>
              <ul className="space-y-1">
                {data.quick_wins.map((win, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raccomandazioni */}
          {data.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Servizi Consigliati
              </h4>
              <div className="space-y-2">
                {data.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[rec.priority]}`}>
                        {rec.priority === 'critical' ? 'CRITICO' :
                         rec.priority === 'high' ? 'ALTO' :
                         rec.priority === 'medium' ? 'MEDIO' : 'BASSO'}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {rec.service}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        €{rec.price}
                      </div>
                      <div className="text-xs text-gray-500">{rec.impact}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totale stimato */}
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Potenziale Totale
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    €{data.estimated_deal_value.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    + Revenue mensile ricorrente
                  </span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    €{data.estimated_monthly_revenue}/mese
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
