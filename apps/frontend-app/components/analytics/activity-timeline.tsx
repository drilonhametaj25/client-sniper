/**
 * Activity Timeline Component
 * Mostra timeline attivita' recenti: lead sbloccati, status CRM cambiati, ecc.
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Clock,
  Unlock,
  TrendingUp,
  CheckCircle,
  XCircle,
  Phone,
  RotateCcw,
  Pause,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface Activity {
  id: string
  type: 'unlock' | 'status_change' | 'note_added' | 'follow_up_set'
  timestamp: string
  description: string
  metadata?: {
    leadName?: string
    oldStatus?: string
    newStatus?: string
    city?: string
  }
}

const STATUS_ICONS: Record<string, any> = {
  to_contact: Phone,
  in_negotiation: TrendingUp,
  follow_up: RotateCcw,
  on_hold: Pause,
  closed_positive: CheckCircle,
  closed_negative: XCircle
}

const STATUS_LABELS: Record<string, string> = {
  to_contact: 'Da Contattare',
  in_negotiation: 'In Trattativa',
  follow_up: 'Follow-up',
  on_hold: 'In Attesa',
  closed_positive: 'Chiuso OK',
  closed_negative: 'Chiuso KO'
}

const STATUS_COLORS: Record<string, string> = {
  to_contact: 'text-blue-500',
  in_negotiation: 'text-yellow-500',
  follow_up: 'text-purple-500',
  on_hold: 'text-gray-500',
  closed_positive: 'text-green-500',
  closed_negative: 'text-red-500'
}

export function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    setLoading(true)
    setError(null)

    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        setError('Non autenticato')
        return
      }

      const userId = session.data.session.user.id
      const allActivities: Activity[] = []

      // 1. Carica lead sbloccati recenti
      const { data: unlockedLeads, error: unlockError } = await supabase
        .from('user_unlocked_leads')
        .select(`
          id,
          unlocked_at,
          leads (
            business_name,
            city
          )
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(10)

      if (!unlockError && unlockedLeads) {
        unlockedLeads.forEach((item: any) => {
          allActivities.push({
            id: `unlock-${item.id}`,
            type: 'unlock',
            timestamp: item.unlocked_at,
            description: `Lead sbloccato: ${item.leads?.business_name || 'N/A'}`,
            metadata: {
              leadName: item.leads?.business_name,
              city: item.leads?.city
            }
          })
        })
      }

      // 2. Carica modifiche CRM recenti
      const { data: crmEntries, error: crmError } = await supabase
        .from('crm_entries')
        .select(`
          id,
          status,
          updated_at,
          note,
          leads!crm_entries_lead_id_fkey (
            business_name,
            city
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(15)

      if (!crmError && crmEntries) {
        crmEntries.forEach((item: any) => {
          allActivities.push({
            id: `crm-${item.id}`,
            type: 'status_change',
            timestamp: item.updated_at,
            description: `${item.leads?.business_name || 'Lead'} - ${STATUS_LABELS[item.status] || item.status}`,
            metadata: {
              leadName: item.leads?.business_name,
              newStatus: item.status,
              city: item.leads?.city
            }
          })
        })
      }

      // Ordina per timestamp (piu' recente prima)
      allActivities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Prendi solo le prime 15 attivita'
      setActivities(allActivities.slice(0, 15))
    } catch (err) {
      console.error('Activity timeline error:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  // Formatta data relativa
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Adesso'
    if (diffMins < 60) return `${diffMins} min fa`
    if (diffHours < 24) return `${diffHours} ore fa`
    if (diffDays < 7) return `${diffDays} giorni fa`
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  // Ottieni icona per tipo attivita'
  const getActivityIcon = (activity: Activity) => {
    if (activity.type === 'unlock') {
      return <Unlock className="w-4 h-4 text-blue-500" />
    }
    if (activity.type === 'status_change' && activity.metadata?.newStatus) {
      const Icon = STATUS_ICONS[activity.metadata.newStatus] || FileText
      const color = STATUS_COLORS[activity.metadata.newStatus] || 'text-gray-500'
      return <Icon className={`w-4 h-4 ${color}`} />
    }
    return <FileText className="w-4 h-4 text-gray-500" />
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm sm:text-base">{error}</p>
          <button
            onClick={loadActivities}
            className="mt-4 px-4 py-2.5 min-h-[44px] bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Riprova
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Attivita' Recenti
          </h3>
        </div>
        <button
          onClick={loadActivities}
          className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Aggiorna"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Nessuna attivita' recente
        </p>
      ) : (
        <div className="relative">
          {/* Linea verticale */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />

          {/* Eventi */}
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex items-start gap-4 relative">
                {/* Icona con sfondo */}
                <div className="relative z-10 p-1.5 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-200 dark:border-gray-700">
                  {getActivityIcon(activity)}
                </div>

                {/* Contenuto */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                    {activity.metadata?.city && (
                      <span className="text-xs text-gray-400">
                        • {activity.metadata.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
