'use client'

import { Users, Flame, Eye, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

interface CompetitorBadgeProps {
  viewCount: number
  unlockCount: number
  isHot?: boolean
  variant?: 'inline' | 'full'
}

export default function CompetitorBadge({
  viewCount,
  unlockCount,
  isHot = false,
  variant = 'inline'
}: CompetitorBadgeProps) {
  const competitionLevel = getCompetitionLevel(unlockCount)

  if (variant === 'inline') {
    if (competitionLevel === 'low') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
          <Eye className="w-3 h-3" />
          Esclusivo
        </span>
      )
    }

    if (competitionLevel === 'high' || isHot) {
      return (
        <motion.span
          initial={{ scale: 0.9 }}
          animate={{ scale: [0.9, 1.05, 1] }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full"
        >
          <Flame className="w-3 h-3" />
          Molto richiesto
        </motion.span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
        <Users className="w-3 h-3" />
        {unlockCount} interessati
      </span>
    )
  }

  // Full variant
  return (
    <div className={`p-3 rounded-lg border ${
      competitionLevel === 'high' || isHot
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : competitionLevel === 'medium'
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          competitionLevel === 'high' || isHot
            ? 'bg-red-100 dark:bg-red-800/50'
            : competitionLevel === 'medium'
            ? 'bg-amber-100 dark:bg-amber-800/50'
            : 'bg-green-100 dark:bg-green-800/50'
        }`}>
          {competitionLevel === 'high' || isHot ? (
            <Flame className={`w-5 h-5 ${
              competitionLevel === 'high' || isHot
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            }`} />
          ) : competitionLevel === 'medium' ? (
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
        </div>

        <div className="flex-1">
          <p className={`font-medium ${
            competitionLevel === 'high' || isHot
              ? 'text-red-700 dark:text-red-300'
              : competitionLevel === 'medium'
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-green-700 dark:text-green-300'
          }`}>
            {getCompetitionTitle(competitionLevel, isHot)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getCompetitionMessage(viewCount, unlockCount, isHot)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {viewCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Visualizzazioni</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {unlockCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Utenti interessati</p>
        </div>
      </div>
    </div>
  )
}

function getCompetitionLevel(unlockCount: number): 'low' | 'medium' | 'high' {
  if (unlockCount <= 2) return 'low'
  if (unlockCount <= 5) return 'medium'
  return 'high'
}

function getCompetitionTitle(level: 'low' | 'medium' | 'high', isHot: boolean): string {
  if (isHot) return 'Lead molto richiesto!'
  if (level === 'high') return 'Alta competizione'
  if (level === 'medium') return 'Competizione moderata'
  return 'Lead esclusivo'
}

function getCompetitionMessage(viewCount: number, unlockCount: number, isHot: boolean): string {
  if (isHot) {
    return `${unlockCount} utenti hanno già mostrato interesse negli ultimi giorni`
  }
  if (unlockCount > 5) {
    return `${unlockCount} utenti interessati - agisci velocemente!`
  }
  if (unlockCount > 2) {
    return `${unlockCount} altri utenti hanno visto questo lead`
  }
  return 'Pochi utenti lo hanno visto - opportunità esclusiva!'
}
