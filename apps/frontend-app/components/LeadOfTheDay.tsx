'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Star, MapPin, Globe, Phone, Mail, ExternalLink, Sparkles, Lock, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface Lead {
  id: string
  business_name: string
  city: string
  category: string
  score: number
  website: string
  email?: string
  phone?: string
  issues: string[]
}

export default function LeadOfTheDay() {
  const { session, user } = useAuth()
  const [lead, setLead] = useState<Lead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if dismissed today
    const dismissedDate = localStorage.getItem('lead_of_day_dismissed')
    const today = new Date().toDateString()
    if (dismissedDate === today) {
      setDismissed(true)
      setIsLoading(false)
      return
    }

    if (session?.access_token) {
      fetchLeadOfDay()
    }
  }, [session?.access_token])

  const fetchLeadOfDay = async () => {
    try {
      // Fetch un lead con score basso (alto potenziale) non ancora sbloccato
      const res = await fetch('/api/leads?limit=1&sortBy=score&sortOrder=asc&unlockedOnly=false', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const data = await res.json()

      if (data.leads && data.leads.length > 0) {
        setLead(data.leads[0])
      }
    } catch (err) {
      console.error('Error fetching lead of the day:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('lead_of_day_dismissed', new Date().toDateString())
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-amber-200 dark:border-gray-600 p-4 animate-pulse">
        <div className="h-24 bg-amber-100 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  if (dismissed || !lead) return null

  const isPro = user?.plan && user.plan !== 'free'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-amber-200 dark:border-amber-800/30 overflow-hidden mb-6"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white" />
          <span className="text-white font-semibold">Lead del Giorno</span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/70 hover:text-white text-sm"
        >
          Nascondi
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Score */}
          <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
            lead.score <= 30
              ? 'bg-green-100 dark:bg-green-900/50'
              : lead.score <= 50
              ? 'bg-amber-100 dark:bg-amber-900/50'
              : 'bg-red-100 dark:bg-red-900/50'
          }`}>
            <span className={`text-2xl font-bold ${
              lead.score <= 30
                ? 'text-green-600 dark:text-green-400'
                : lead.score <= 50
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {lead.score}
            </span>
            <span className="text-xs text-gray-500">score</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {lead.business_name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{lead.city}</span>
              <span className="text-gray-400">•</span>
              <span>{lead.category}</span>
            </div>

            {/* Issues preview */}
            {lead.issues && lead.issues.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  {lead.issues.length} problemi rilevati
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex flex-col gap-2">
            {isPro ? (
              <Link
                href={`/dashboard?leadId=${lead.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Vedi dettagli
              </Link>
            ) : (
              <Link
                href="/upgrade"
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Lock className="w-4 h-4" />
                Sblocca
              </Link>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 pt-4 border-t border-amber-200 dark:border-gray-600 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {lead.website?.replace(/^https?:\/\//, '').split('/')[0] || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {lead.email ? 'Disponibile' : 'Da trovare'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {lead.phone ? 'Disponibile' : 'Da trovare'}
            </span>
          </div>
        </div>

        {/* Why this lead */}
        <div className="mt-4 p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <Star className="w-4 h-4 inline mr-1" />
            <strong>Perché questo lead?</strong> Score basso significa che il loro sito ha problemi evidenti.
            È il momento perfetto per proporre i tuoi servizi!
          </p>
        </div>
      </div>
    </motion.div>
  )
}
