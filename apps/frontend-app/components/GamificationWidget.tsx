'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Flame, Trophy, Star, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  xp_reward: number
  unlockedAt?: string
}

interface GamificationData {
  streak: {
    current: number
    longest: number
    lastActivityDate: string | null
  }
  stats: {
    totalLeadsUnlocked: number
    totalLeadsContacted: number
    totalDealsWon: number
    totalDealsValue: number
  }
  xp: {
    total: number
    level: number
    currentLevelXp: number
    neededForNextLevel: number
    progressPercent: number
  }
  achievements: {
    unlocked: Achievement[]
    available: Achievement[]
    unlockedCount: number
    totalCount: number
  }
}

export default function GamificationWidget() {
  const { session } = useAuth()
  const [data, setData] = useState<GamificationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAchievements, setShowAchievements] = useState(false)

  useEffect(() => {
    if (session?.access_token) {
      fetchGamification()
      // Registra attività
      registerActivity()
    }
  }, [session?.access_token])

  const fetchGamification = async () => {
    try {
      const res = await fetch('/api/gamification', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (err) {
      console.error('Error fetching gamification:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const registerActivity = async () => {
    try {
      await fetch('/api/gamification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ action: 'activity' })
      })
    } catch (err) {
      console.error('Error registering activity:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  if (!data) return null

  const levelNames = [
    'Novizio', 'Esploratore', 'Ricercatore', 'Hunter',
    'Networker', 'Stratega', 'Expert', 'Master', 'Legend', 'Champion'
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header con Streak e Level */}
      <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="flex items-center justify-between">
          {/* Streak */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <Flame className="w-8 h-8 text-white" />
              </div>
              {data.streak.current > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-gray-900"
                >
                  {data.streak.current}
                </motion.div>
              )}
            </div>
            <div>
              <p className="text-white/80 text-sm">Streak attuale</p>
              <p className="text-white font-bold text-xl">
                {data.streak.current} {data.streak.current === 1 ? 'giorno' : 'giorni'}
              </p>
              {data.streak.longest > data.streak.current && (
                <p className="text-white/60 text-xs">Record: {data.streak.longest}</p>
              )}
            </div>
          </div>

          {/* Level */}
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <Star className="w-5 h-5 text-yellow-300" />
              <span className="text-white font-bold">Liv. {data.xp.level}</span>
            </div>
            <p className="text-white/80 text-sm">{levelNames[data.xp.level - 1] || 'Champion'}</p>
            <p className="text-white/60 text-xs">{data.xp.total} XP</p>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/80 mb-1">
            <span>Livello {data.xp.level}</span>
            <span>Livello {data.xp.level + 1}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-yellow-400"
              initial={{ width: 0 }}
              animate={{ width: `${data.xp.progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-center text-xs text-white/60 mt-1">
            {data.xp.currentLevelXp} / {data.xp.neededForNextLevel} XP
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-4 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.stats.totalLeadsUnlocked}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Lead sbloccati</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.stats.totalLeadsContacted}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Contattati</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.stats.totalDealsWon}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Deal chiusi</p>
        </div>
      </div>

      {/* Achievements Toggle */}
      <button
        onClick={() => setShowAchievements(!showAchievements)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span className="font-medium text-gray-900 dark:text-white">
            Achievement ({data.achievements.unlockedCount}/{data.achievements.totalCount})
          </span>
        </div>
        {showAchievements ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Achievements List */}
      <AnimatePresence>
        {showAchievements && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4 grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {data.achievements.available.map((achievement) => {
                const isUnlocked = data.achievements.unlocked.some(
                  (ua) => ua.id === achievement.id
                )

                return (
                  <div
                    key={achievement.id}
                    className={`p-3 rounded-lg border ${
                      isUnlocked
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{achievement.icon}</span>
                      <span className={`text-sm font-medium ${
                        isUnlocked
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {achievement.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {achievement.description}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-gray-500">+{achievement.xp_reward} XP</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Achievement Hint */}
      {!showAchievements && data.achievements.unlockedCount < data.achievements.totalCount && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Prossimo obiettivo: {getNextAchievementHint(data)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getNextAchievementHint(data: GamificationData): string {
  const { stats, streak, achievements } = data
  const unlockedIds = new Set(achievements.unlocked.map((a) => a.id))

  // Verifica quali achievement mancano e suggerisci il più vicino
  if (!unlockedIds.has('first_unlock') && stats.totalLeadsUnlocked === 0) {
    return 'Sblocca il tuo primo lead!'
  }
  if (!unlockedIds.has('unlock_10') && stats.totalLeadsUnlocked < 10) {
    return `Sblocca ${10 - stats.totalLeadsUnlocked} altri lead`
  }
  if (!unlockedIds.has('first_contact') && stats.totalLeadsContacted === 0) {
    return 'Contatta il tuo primo lead!'
  }
  if (!unlockedIds.has('streak_3') && streak.current < 3) {
    return `Mantieni lo streak per ${3 - streak.current} giorni`
  }
  if (!unlockedIds.has('streak_7') && streak.current < 7) {
    return `Streak di 7 giorni (mancano ${7 - streak.current})`
  }
  if (!unlockedIds.has('first_deal') && stats.totalDealsWon === 0) {
    return 'Chiudi il tuo primo deal!'
  }

  return 'Continua ad usare TrovaMi.pro!'
}
