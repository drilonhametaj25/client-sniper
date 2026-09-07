/**
 * Pagina impostazioni account utente a tab - TrovaMi
 * Usato per: Profilo, servizi offerti, piano, notifiche e sicurezza account
 * Chiamato da: Dashboard navbar, profilo utente
 * I contenuti vivono in components/settings/tabs/* — questa pagina è solo la shell.
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings as SettingsIcon,
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/dashboard"
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
            <div className="flex items-center">
              <SettingsIcon className="w-5 h-5 text-gray-400 mr-2" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Impostazioni Account</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Sezioni impostazioni"
          className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={activeTab === id}
              aria-controls={`panel-${id}`}
              onClick={() => selectTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
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
