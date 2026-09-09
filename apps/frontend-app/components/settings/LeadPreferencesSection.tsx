/**
 * Lead Preferences Section for Settings Page
 *
 * Riepilogo (in sola lettura) delle preferenze che alimentano la sezione
 * "Per te", con il link per modificarle nel wizard.
 *
 * @file apps/frontend-app/components/settings/LeadPreferencesSection.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Badge, Card, CardTitle, Skeleton } from '@/components/ui'

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value)
  }

  if (loading) {
    return <Skeleton className="h-56 w-full rounded-card" />
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-center gap-2.5 text-body text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      </Card>
    )
  }

  const hasCompletedOnboarding = !!profile?.onboardingCompletedAt
  const locations = [...(profile?.preferredCities || []), ...(profile?.preferredRegions || [])]

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Preferenze per la sezione «Per te»</CardTitle>
          <p className="mt-1 text-body text-content-muted">
            Affinano l'ordine con cui ti proponiamo i lead.
          </p>
        </div>

        <Link
          href="/onboarding"
          className="focus-ring inline-flex h-11 shrink-0 items-center justify-center rounded-control border border-edge bg-surface-elevated px-4 text-body font-medium text-content transition-colors duration-fast ease-soft hover:bg-surface-subtle"
        >
          {hasCompletedOnboarding ? 'Modifica' : 'Configura'}
        </Link>
      </div>

      {!hasCompletedOnboarding && (
        <div className="mt-6 rounded-card border border-warning-edge bg-warning-soft p-4">
          <p className="text-body font-medium text-warning">Configurazione da completare</p>
          <p className="mt-1 text-body text-content-muted">
            Finisci il wizard per ricevere lead scelti su misura nella sezione «Per te».
          </p>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-micro uppercase tracking-wide text-content-subtle">Tipo di profilo</dt>
          <dd className="mt-1 text-body text-content">
            {profile?.userType ? getUserTypeLabel(profile.userType) : 'Non specificato'}
          </dd>
        </div>

        <div>
          <dt className="text-micro uppercase tracking-wide text-content-subtle">Budget</dt>
          <dd className="mt-1 text-body tabular-nums text-content">
            {profile?.preferredMinBudget && profile?.preferredMaxBudget
              ? `${formatCurrency(profile.preferredMinBudget)} – ${formatCurrency(profile.preferredMaxBudget)}`
              : 'Non specificato'}
          </dd>
        </div>

        <div>
          <dt className="text-micro uppercase tracking-wide text-content-subtle">Zone</dt>
          <dd className="mt-1 text-body text-content">
            {profile?.isRemoteOnly ? (
              'Solo da remoto'
            ) : locations.length === 0 ? (
              'Tutte le zone'
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {locations.slice(0, 4).map((loc) => (
                  <Badge key={loc} variant="neutral" pill>
                    {loc}
                  </Badge>
                ))}
                {locations.length > 4 && (
                  <Badge variant="neutral" pill>{`+${locations.length - 4}`}</Badge>
                )}
              </span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-micro uppercase tracking-wide text-content-subtle">
            Capacità settimanale
          </dt>
          <dd className="mt-1 text-body tabular-nums text-content">
            {profile?.weeklyCapacity
              ? `${profile.weeklyCapacity - (profile.projectsInProgress || 0)} slot liberi su ${profile.weeklyCapacity}`
              : 'Non specificata'}
          </dd>
        </div>
      </dl>

      {((profile?.preferredIndustries?.length || 0) > 0 ||
        (profile?.excludedIndustries?.length || 0) > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-edge pt-6 sm:grid-cols-2">
          {profile?.preferredIndustries && profile.preferredIndustries.length > 0 && (
            <div>
              <div className="text-micro uppercase tracking-wide text-content-subtle">
                Settori che preferisci
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.preferredIndustries.slice(0, 5).map((industry) => (
                  <Badge key={industry} variant="neutral" pill>
                    {industry}
                  </Badge>
                ))}
                {profile.preferredIndustries.length > 5 && (
                  <Badge variant="neutral" pill>
                    {`+${profile.preferredIndustries.length - 5}`}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {profile?.excludedIndustries && profile.excludedIndustries.length > 0 && (
            <div>
              <div className="text-micro uppercase tracking-wide text-content-subtle">
                Settori esclusi
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.excludedIndustries.slice(0, 5).map((industry) => (
                  <Badge key={industry} variant="outline" pill>
                    {industry}
                  </Badge>
                ))}
                {profile.excludedIndustries.length > 5 && (
                  <Badge variant="outline" pill>
                    {`+${profile.excludedIndustries.length - 5}`}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
