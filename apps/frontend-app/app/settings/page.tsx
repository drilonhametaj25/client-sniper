/**
 * Pagina impostazioni account utente a tab - TrovaMi
 * Usato per: Profilo, servizi offerti, piano, notifiche e sicurezza account
 * Chiamato da: Dashboard navbar, profilo utente
 * I contenuti vivono in components/settings/tabs/* — questa pagina è solo la shell.
 * Presentazione: guida in apps/frontend-app/DESIGN.md.
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Target,
  Crown,
  Bell,
  Shield
} from 'lucide-react'
import ProfileTab from '@/components/settings/tabs/ProfileTab'
import ServicesTab from '@/components/settings/tabs/ServicesTab'
import PlanTab from '@/components/settings/tabs/PlanTab'
import NotificationsTab from '@/components/settings/tabs/NotificationsTab'
import AccountTab from '@/components/settings/tabs/AccountTab'
import { Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { id: 'profilo', label: 'Profilo', icon: User },
  { id: 'servizi', label: 'Servizi', icon: Target },
  { id: 'piano', label: 'Piano', icon: Crown },
  { id: 'notifiche', label: 'Notifiche', icon: Bell },
  { id: 'account', label: 'Account', icon: Shield },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('profilo')

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  // Sincronizza il tab attivo con l'hash dell'URL (es. /settings#piano)
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (TABS.some(t => t.id === hash)) setActiveTab(hash as TabId)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  const selectTab = (id: TabId) => {
    setActiveTab(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-6">
          <div role="status" aria-live="polite">
            <span className="sr-only">Caricamento in corso</span>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-6 h-7 w-48" />
            <Skeleton className="mt-3 h-4 w-72 max-w-full" />
            <Skeleton className="mt-8 h-11 w-full rounded-card" />
            <Skeleton className="mt-6 h-64 w-full rounded-card" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-6">
        {/* Uscita verso la dashboard */}
        <Link
          href="/dashboard"
          className="focus-ring -ml-2 inline-flex h-11 items-center gap-1.5 rounded-control px-2 text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>

        <h1 className="mt-4 text-title font-semibold text-content">Impostazioni</h1>
        <p className="mt-1 text-body text-content-muted">
          Il tuo profilo, i servizi che offri e il piano attivo.
        </p>

        {/* Navigazione a schede */}
        <div
          role="tablist"
          aria-label="Sezioni impostazioni"
          className="scrollbar-hide mt-8 flex gap-1 overflow-x-auto border-b border-edge"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                role="tab"
                id={`tab-${id}`}
                aria-selected={isActive}
                aria-controls={`panel-${id}`}
                onClick={() => selectTab(id)}
                className={cn(
                  'focus-ring-inset -mb-px flex h-11 shrink-0 items-center gap-2 whitespace-nowrap',
                  'border-b-2 px-3 text-body font-medium',
                  'transition-colors duration-fast ease-soft',
                  isActive
                    ? 'border-accent text-content'
                    : 'border-transparent text-content-muted hover:text-content'
                )}
              >
                <Icon
                  className={cn('h-4 w-4', isActive ? 'text-accent-ink' : 'text-content-subtle')}
                  aria-hidden="true"
                />
                {label}
              </button>
            )
          })}
        </div>

        {/* Pannelli */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="mt-8"
        >
          {activeTab === 'profilo' && <ProfileTab />}
          {activeTab === 'servizi' && <ServicesTab />}
          {activeTab === 'piano' && <PlanTab />}
          {activeTab === 'notifiche' && <NotificationsTab />}
          {activeTab === 'account' && <AccountTab />}
        </div>
      </div>
    </div>
  )
}
