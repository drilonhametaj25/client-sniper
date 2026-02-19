/**
 * Score Distribution Component
 * Mostra distribuzione qualita' lead per fascia di score
 * 0-30 = Alta opportunita', 31-60 = Media, 61-100 = Bassa
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Star,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'

interface ScoreData {
  high: number // 0-30 (alta opportunita')
  medium: number // 31-60
  low: number // 61-100
  total: number
  avgScore: number
}

const SCORE_RANGES = [
  {
    key: 'high',
    label: 'Alta Opportunita\'',
    range: '0-30',
    description: 'Lead con molti problemi tecnici',
    color: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    bgLight: 'bg-green-50 dark:bg-green-900/20'
  },
  {
    key: 'medium',
    label: 'Media Opportunita\'',
    range: '31-60',
    description: 'Lead con alcuni problemi',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    bgLight: 'bg-yellow-50 dark:bg-yellow-900/20'
  },
  {
    key: 'low',
    label: 'Bassa Opportunita\'',
    range: '61-100',
    description: 'Siti gia\' ottimizzati',
    color: 'bg-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    bgLight: 'bg-red-50 dark:bg-red-900/20'
  }
]

export function ScoreDistribution() {
  const [data, setData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadScoreData()
  }, [])

  const loadScoreData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Carica lead dell'utente sbloccati
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        setError('Non autenticato')
        return
      }

      // Query lead sbloccati con score
      const { data: unlockedLeads, error: queryError } = await supabase
        .from('user_unlocked_leads')
        .select(`
          lead_id,
          leads (
            id,
            score
          )
        `)
        .eq('user_id', session.data.session.user.id)

      if (queryError) {
        throw new Error('Errore caricamento dati')
      }

      // Aggrega per fascia di score
      const scores: ScoreData = {
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
        avgScore: 0
      }

      let totalScore = 0

      unlockedLeads?.forEach((item: any) => {
        const score = item.leads?.score || 50
        scores.total++
        totalScore += score

        if (score <= 30) {
          scores.high++
        } else if (score <= 60) {
          scores.medium++
        } else {
          scores.low++
        }
      })

      scores.avgScore = scores.total > 0 ? Math.round(totalScore / scores.total) : 0

      setData(scores)
    } catch (err) {
      console.error('Score distribution error:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  // Calcola percentuali
  const percentages = useMemo(() => {
    if (!data || data.total === 0) return { high: 0, medium: 0, low: 0 }
    return {
      high: Math.round((data.high / data.total) * 100),
      medium: Math.round((data.medium / data.total) * 100),
      low: Math.round((data.low / data.total) * 100)
    }
  }, [data])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <button
            onClick={loadScoreData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Riprova
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Distribuzione Qualita'
          </h3>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Nessun lead sbloccato. Sblocca dei lead per vedere la distribuzione.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Distribuzione Qualita'
          </h3>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {data.total} lead totali
        </div>
      </div>

      {/* Score medio */}
      <div className="text-center mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Score Medio</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.avgScore}
          </span>
          <span className="text-gray-400">/100</span>
          {data.avgScore <= 40 ? (
            <TrendingUp className="w-5 h-5 text-green-500" />
          ) : data.avgScore <= 60 ? (
            <TrendingDown className="w-5 h-5 text-yellow-500" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-500" />
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {data.avgScore <= 40
            ? 'Ottimo! Lead con alto potenziale'
            : data.avgScore <= 60
            ? 'Buono - Lead con opportunita\''
            : 'Lead con siti gia\' ottimizzati'}
        </p>
      </div>

      {/* Barre distribuzione */}
      <div className="space-y-4">
        {SCORE_RANGES.map((range) => {
          const count = data[range.key as keyof ScoreData] as number
          const percentage = percentages[range.key as keyof typeof percentages]

          return (
            <div key={range.key} className={`p-3 rounded-lg ${range.bgLight}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className={`font-medium ${range.textColor}`}>
                    {range.label}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    (score {range.range})
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${range.textColor}`}>{count}</span>
                  <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                </div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full ${range.color} rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {range.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* Insight */}
      {data.high > data.low && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            <strong>Ottimo!</strong> La maggior parte dei tuoi lead ha alto potenziale di vendita.
          </p>
        </div>
      )}

      {data.low > data.high && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Suggerimento:</strong> Cerca lead con score piu' basso per maggiori opportunita'.
          </p>
        </div>
      )}
    </div>
  )
}
