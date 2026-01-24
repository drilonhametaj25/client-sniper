/**
 * Componente Sezione Competitor per Lead Detail
 * Mostra posizione di mercato, benchmark, quick wins e lista competitor
 */

'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Clock,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Globe,
  Smartphone,
  Shield,
  BarChart2
} from 'lucide-react'

// Types
export interface CompetitorInfo {
  id: string
  name: string
  website: string
  score: number
  category: string
  city: string
}

export interface BenchmarkMetric {
  name: string
  leadScore: number
  avgScore: number
  bestScore: number
  trend: 'up' | 'down' | 'stable'
}

export interface QuickWin {
  id: string
  gap: string
  category: string
  effort: 'hours' | 'days' | 'weeks'
  impact: number
  impactDescription: string
  requiredRole: string
  estimatedCost: { min: number; max: number }
  actionItems: string[]
  competitorReference?: string
}

export interface CompetitorAnalysisData {
  // Market Position
  marketPosition: 'leader' | 'challenger' | 'follower' | 'nicher'
  ranking: number
  totalCompetitors: number
  percentile: number

  // Benchmarks
  benchmarks: BenchmarkMetric[]
  overallBenchmarkScore: number

  // Quick Wins
  quickWins: QuickWin[]
  totalPotentialImprovement: number
  estimatedTotalCost: { min: number; max: number }

  // Competitors
  competitors: CompetitorInfo[]

  // Summary
  mainStrength?: string
  mainWeakness?: string
}

interface CompetitorSectionProps {
  data: CompetitorAnalysisData
  leadName?: string
}

// Config
const POSITION_CONFIG = {
  leader: {
    label: 'Leader',
    color: 'text-yellow-500',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Trophy,
    description: 'Tra i migliori della categoria'
  },
  challenger: {
    label: 'Challenger',
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: TrendingUp,
    description: 'Competitivo, con margine di crescita'
  },
  follower: {
    label: 'Follower',
    color: 'text-orange-500',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    icon: Users,
    description: 'Sotto la media, necessita miglioramenti'
  },
  nicher: {
    label: 'Nicher',
    color: 'text-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    icon: Target,
    description: 'Posizione di nicchia specifica'
  }
}

const CATEGORY_ICONS: Record<string, any> = {
  seo: Globe,
  performance: Zap,
  mobile: Smartphone,
  tracking: BarChart3,
  gdpr: Shield,
  security: Shield,
  content: BarChart2
}

const EFFORT_LABELS = {
  hours: 'Ore',
  days: 'Giorni',
  weeks: 'Settimane'
}

export default function CompetitorSection({ data, leadName }: CompetitorSectionProps) {
  const [showAllCompetitors, setShowAllCompetitors] = useState(false)
  const [expandedQuickWin, setExpandedQuickWin] = useState<string | null>(null)

  const positionConfig = POSITION_CONFIG[data.marketPosition]
  const PositionIcon = positionConfig.icon

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Market Position Card */}
      <Card className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PositionIcon className={`w-5 h-5 ${positionConfig.color}`} />
              Posizione di Mercato
            </h3>
            <p className="text-sm text-gray-500 mt-1">{positionConfig.description}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full ${positionConfig.bg}`}>
            <span className={`text-sm font-bold ${positionConfig.color}`}>
              {positionConfig.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Ranking */}
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              #{data.ranking}
            </div>
            <div className="text-xs text-gray-500">su {data.totalCompetitors}</div>
            <div className="text-xs text-gray-400 mt-1">Ranking</div>
          </div>

          {/* Percentile */}
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className={`text-2xl font-bold ${getScoreColor(data.percentile)}`}>
              {data.percentile}%
            </div>
            <div className="text-xs text-gray-500">Meglio di</div>
            <div className="text-xs text-gray-400 mt-1">Percentile</div>
          </div>

          {/* Overall Score */}
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className={`text-2xl font-bold ${getScoreColor(data.overallBenchmarkScore)}`}>
              {data.overallBenchmarkScore}
            </div>
            <div className="text-xs text-gray-500">/ 100</div>
            <div className="text-xs text-gray-400 mt-1">Score vs Media</div>
          </div>
        </div>

        {/* Strengths/Weaknesses */}
        {(data.mainStrength || data.mainWeakness) && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {data.mainStrength && (
              <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-green-700 dark:text-green-400">Punto di forza</div>
                  <div className="text-xs text-green-600 dark:text-green-500">{data.mainStrength}</div>
                </div>
              </div>
            )}
            {data.mainWeakness && (
              <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-red-700 dark:text-red-400">Da migliorare</div>
                  <div className="text-xs text-red-600 dark:text-red-500">{data.mainWeakness}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Benchmark Table */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Confronto Benchmark
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2">Metrica</th>
                <th className="pb-2 text-center">{leadName || 'Lead'}</th>
                <th className="pb-2 text-center">Media</th>
                <th className="pb-2 text-center">Best</th>
                <th className="pb-2 text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {data.benchmarks.map((benchmark, index) => {
                const Icon = CATEGORY_ICONS[benchmark.name.toLowerCase()] || BarChart3
                const isAboveAvg = benchmark.leadScore >= benchmark.avgScore

                return (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{benchmark.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`font-bold ${getScoreColor(benchmark.leadScore)}`}>
                        {benchmark.leadScore}
                      </span>
                    </td>
                    <td className="py-3 text-center text-gray-500">
                      {benchmark.avgScore}
                    </td>
                    <td className="py-3 text-center">
                      <span className="text-green-600 dark:text-green-400">{benchmark.bestScore}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex justify-center">
                        {getTrendIcon(benchmark.trend)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Visual comparison bars */}
        <div className="mt-4 space-y-3">
          {data.benchmarks.slice(0, 4).map((benchmark, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{benchmark.name}</span>
                <span className={`font-medium ${getScoreColor(benchmark.leadScore)}`}>
                  {benchmark.leadScore} vs {benchmark.avgScore} media
                </span>
              </div>
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                {/* Average marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                  style={{ left: `${benchmark.avgScore}%` }}
                />
                {/* Lead score bar */}
                <div
                  className={`h-full ${getScoreBgColor(benchmark.leadScore)} rounded-full transition-all`}
                  style={{ width: `${benchmark.leadScore}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Wins */}
      <Card className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Quick Wins
            </h3>
            <p className="text-sm text-gray-500">
              Azioni prioritarie per migliorare il posizionamento
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              +{data.totalPotentialImprovement} punti
            </div>
            <div className="text-xs text-gray-500">Miglioramento potenziale</div>
          </div>
        </div>

        <div className="space-y-3">
          {data.quickWins.slice(0, 5).map((qw) => {
            const isExpanded = expandedQuickWin === qw.id
            const CategoryIcon = CATEGORY_ICONS[qw.category] || Zap

            return (
              <div
                key={qw.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedQuickWin(isExpanded ? null : qw.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {qw.gap}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {EFFORT_LABELS[qw.effort]}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          {qw.impactDescription}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        €{qw.estimatedCost.min}-{qw.estimatedCost.max}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                    {qw.competitorReference && (
                      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-600 dark:text-blue-400">
                        <Award className="w-4 h-4 inline mr-1" />
                        {qw.competitorReference}
                      </div>
                    )}

                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Passi da seguire:
                    </div>
                    <ul className="space-y-1">
                      {qw.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>Ruolo richiesto: <strong>{qw.requiredRole}</strong></span>
                      <span>Impatto: <strong className="text-green-600">+{qw.impact} punti</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Cost summary */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Budget totale stimato
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              €{data.estimatedTotalCost.min.toLocaleString()} - €{data.estimatedTotalCost.max.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Competitor List */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Competitor ({data.competitors.length})
          </h3>
          {data.competitors.length > 5 && (
            <button
              onClick={() => setShowAllCompetitors(!showAllCompetitors)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showAllCompetitors ? 'Mostra meno' : 'Mostra tutti'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {(showAllCompetitors ? data.competitors : data.competitors.slice(0, 5)).map((comp, index) => (
            <div
              key={comp.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-200 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{comp.name}</div>
                  <div className="text-xs text-gray-500">{comp.category} · {comp.city}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-lg font-bold ${getScoreColor(comp.score)}`}>
                  {comp.score}
                </div>
                {comp.website && (
                  <a
                    href={comp.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
