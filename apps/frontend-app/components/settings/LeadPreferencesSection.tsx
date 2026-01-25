/**
 * Lead Preferences Section for Settings Page
 *
 * Mostra un riepilogo delle preferenze lead dell'utente con link per modificarle.
 *
 * @file apps/frontend-app/components/settings/LeadPreferencesSection.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sparkles,
  MapPin,
  Briefcase,
  DollarSign,
  Building2,
  Calendar,
  Edit,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { SERVICE_CONFIGS } from '@/lib/types/services'

interface UserProfileData {
  userType: string
  servicesOffered: string[]
  serviceSkillLevels: Record<string, number>
  preferredMinBudget: number
  preferredMaxBudget: number
  preferredCities: string[]
  preferredRegions: string[]
  isRemoteOnly: boolean
  preferredIndustries: string[]
  excludedIndustries: string[]
  weeklyCapacity: number
  projectsInProgress: number
  onboardingCompletedAt: string | null
}

export default function LeadPreferencesSection() {
  const { getAccessToken } = useAuth()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = getAccessToken()
      if (!token) {
        setError('Non autenticato')
        return
      }

      const response = await fetch('/api/onboarding/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Errore caricamento profilo')
      }

      const { data } = await response.json()
      setProfile(data)
    } catch (err) {
      console.error('Errore caricamento preferenze:', err)
      setError('Impossibile caricare le preferenze')
    } finally {
      setLoading(false)
    }
  }

  const getUserTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      freelancer: 'Freelancer',
      agency: 'Agenzia',
      consultant: 'Consulente'
    }
    return labels[type] || type
  }

  const getSkillLevelLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: 'Base',
      2: 'Intermedio',
      3: 'Expert'
    }
    return labels[level] || 'N/A'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  const hasCompletedOnboarding = !!profile?.onboardingCompletedAt

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preferenze Lead
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Personalizza i lead che vedi nella sezione "Per Te"
            </p>
          </div>
        </div>

        <Link
          href="/onboarding"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Edit className="w-4 h-4" />
          {hasCompletedOnboarding ? 'Modifica' : 'Configura'}
        </Link>
      </div>

      {/* Status Banner */}
      {!hasCompletedOnboarding && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Profilo non completato
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Completa la configurazione per ricevere lead personalizzati nella sezione "Per Te".
              </p>
            </div>
          </div>
        </div>
      )}

      {hasCompletedOnboarding && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Profilo configurato</span>
          </div>
        </div>
      )}

      {/* Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Type */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Briefcase className="w-4 h-4" />
            Tipo Profilo
          </div>
          <p className="text-gray-900 dark:text-white">
            {profile?.userType ? getUserTypeLabel(profile.userType) : 'Non specificato'}
          </p>
        </div>

        {/* Budget Range */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <DollarSign className="w-4 h-4" />
            Range Budget
          </div>
          <p className="text-gray-900 dark:text-white">
            {profile?.preferredMinBudget && profile?.preferredMaxBudget
              ? `${formatCurrency(profile.preferredMinBudget)} - ${formatCurrency(profile.preferredMaxBudget)}`
              : 'Non specificato'}
          </p>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <MapPin className="w-4 h-4" />
            Zone Preferite
          </div>
          <div className="text-gray-900 dark:text-white">
            {profile?.isRemoteOnly ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                Solo Remoto
              </span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {[...(profile?.preferredCities || []), ...(profile?.preferredRegions || [])]
                  .slice(0, 4)
                  .map((loc) => (
                    <span
                      key={loc}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                    >
                      {loc}
                    </span>
                  ))}
                {((profile?.preferredCities?.length || 0) + (profile?.preferredRegions?.length || 0)) > 4 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-500">
                    +{(profile?.preferredCities?.length || 0) + (profile?.preferredRegions?.length || 0) - 4}
                  </span>
                )}
                {((profile?.preferredCities?.length || 0) + (profile?.preferredRegions?.length || 0)) === 0 && (
                  <span className="text-gray-500 dark:text-gray-400">Tutte le zone</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Capacity */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="w-4 h-4" />
            Capacità Settimanale
          </div>
          <p className="text-gray-900 dark:text-white">
            {profile?.weeklyCapacity
              ? `${profile.weeklyCapacity - (profile.projectsInProgress || 0)} / ${profile.weeklyCapacity} slot disponibili`
              : 'Non specificato'}
          </p>
        </div>
      </div>

      {/* Services */}
      {profile?.servicesOffered && profile.servicesOffered.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Servizi Offerti
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.servicesOffered.map((service) => {
              const config = SERVICE_CONFIGS[service as keyof typeof SERVICE_CONFIGS]
              const skillLevel = profile.serviceSkillLevels?.[service]
              return (
                <div
                  key={service}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
                >
                  <span>{config?.icon || '📦'}</span>
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    {config?.label || service}
                  </span>
                  {skillLevel && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800/50 rounded text-xs text-blue-600 dark:text-blue-400">
                      {getSkillLevelLabel(skillLevel)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Industries */}
      {((profile?.preferredIndustries?.length || 0) > 0 || (profile?.excludedIndustries?.length || 0) > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preferred */}
            {profile?.preferredIndustries && profile.preferredIndustries.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="w-4 h-4 text-green-500" />
                  Settori Preferiti
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.preferredIndustries.slice(0, 5).map((industry) => (
                    <span
                      key={industry}
                      className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm"
                    >
                      {industry}
                    </span>
                  ))}
                  {profile.preferredIndustries.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-500">
                      +{profile.preferredIndustries.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Excluded */}
            {profile?.excludedIndustries && profile.excludedIndustries.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="w-4 h-4 text-red-500" />
                  Settori Esclusi
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.excludedIndustries.slice(0, 5).map((industry) => (
                    <span
                      key={industry}
                      className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm"
                    >
                      {industry}
                    </span>
                  ))}
                  {profile.excludedIndustries.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-500">
                      +{profile.excludedIndustries.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
