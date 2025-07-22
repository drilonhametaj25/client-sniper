'use client'

// Questa pagina gestisce la dashboard amministratore
// È parte del modulo apps/frontend-app
// Accessibile solo agli utenti con ruolo 'admin'
// ⚠️ Aggiornare se si aggiungono nuove funzionalità admin

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { debugUserSession } from '@/lib/auth'
import { LeadStatusBadge } from '@/components/LeadStatusBadge'
import { LeadWithCRM, CRMStatusType } from '@/lib/types/crm'
import LeadInsights from '@/components/LeadInsights'
import { 
  Target, 
  Users, 
  TrendingUp, 
  Database,
  Eye,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  Shield,
  BarChart3,
  Play,
  Cog,
  ExternalLink,
  MessageCircle,
  ChevronDown
} from 'lucide-react'

interface Lead extends LeadWithCRM {
  phone: string
  needed_roles: string[]
  issues: string[]
}

interface Stats {
  totalLeads: number
  totalUsers: number
  avgScore: number
  leadsToday: number
}

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats>({ totalLeads: 0, totalUsers: 0, avgScore: 0, leadsToday: 0 })
  const [loadingData, setLoadingData] = useState(true)
  const [filterRole, setFilterRole] = useState<string>('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [updatingCRM, setUpdatingCRM] = useState<string | null>(null)
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set())

  // Gestisce l'espansione/contrazione dei dettagli lead
  const toggleLeadExpansion = (leadId: string) => {
    setExpandedLeads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leadId)) {
        newSet.delete(leadId)
      } else {
        newSet.add(leadId)
      }
      return newSet
    })
  }

  // Gestione aggiornamento rapido stato CRM
  const handleQuickStatusUpdate = async (leadId: string, newStatus: CRMStatusType) => {
    if (!user) return
    
    setUpdatingCRM(leadId)
    
    try {
      // Ottieni il token corrente
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Sessione scaduta, effettua nuovamente il login')
        return
      }

      const response = await fetch('/api/crm/quick-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          leadId,
          status: newStatus,
          notes: `Stato aggiornato da admin dashboard a ${newStatus}`
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Aggiorna lo stato locale del lead
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, crm_status: newStatus }
              : lead
          )
        )
        
        // Mostra feedback positivo
        alert(`Status aggiornato con successo a "${newStatus}"`)
      } else {
        alert(`Errore: ${result.error}`)
      }
    } catch (error) {
      console.error('Errore aggiornamento CRM:', error)
      alert('Errore durante l\'aggiornamento dello stato CRM')
    } finally {
      setUpdatingCRM(null)
    }
  }

  // Redirect se non admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Carica dati
  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoadingData(true)

      // Carica leads
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filterRole) {
        query = query.contains('needed_roles', [filterRole])
      }

      const { data: leadsData, error: leadsError } = await query

      if (leadsError) throw leadsError

      // Carica statistiche
      const [
        { count: totalLeads },
        { count: totalUsers },
        { data: avgData },
        { count: leadsToday }
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('score'),
        supabase.from('leads').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0])
      ])

      const avgScore = avgData?.length 
        ? Math.round(avgData.reduce((sum, item) => sum + item.score, 0) / avgData.length)
        : 0

      setLeads(leadsData || [])
      setStats({
        totalLeads: totalLeads || 0,
        totalUsers: totalUsers || 0,
        avgScore,
        leadsToday: leadsToday || 0
      })

    } catch (error) {
      console.error('Errore caricamento dashboard:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const exportLeads = () => {
    const csvContent = [
      ['Business Name', 'Website', 'Phone', 'City', 'Category', 'Score', 'Needed Roles', 'Issues'].join(','),
      ...leads.map(lead => [
        lead.business_name,
        lead.website_url,
        lead.phone,
        lead.city,
        lead.category,
        lead.score,
        lead.needed_roles.join('; '),
        lead.issues.join('; ')
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      designer: 'bg-purple-100 text-purple-800',
      developer: 'bg-blue-100 text-blue-800',
      seo: 'bg-green-100 text-green-800',
      copywriter: 'bg-yellow-100 text-yellow-800',
      photographer: 'bg-pink-100 text-pink-800',
      adv: 'bg-red-100 text-red-800',
      social: 'bg-indigo-100 text-indigo-800',
      gdpr: 'bg-gray-100 text-gray-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getScoreColor = (score: number) => {
    if (score <= 30) return 'text-red-600 bg-red-50'
    if (score <= 50) return 'text-orange-600 bg-orange-50'
    if (score <= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-brand-600 dark:text-brand-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">TrovaMi Administration Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">Ciao, {user.email}</span>
              <button
                onClick={() => router.push('/logout')}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/admin/users')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Gestione</p>
                  <p className="text-lg font-bold text-gray-900">Utenti</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500">Totali</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-purple-600 group-hover:text-purple-700" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sistema</p>
                  <p className="text-lg font-bold text-gray-900">Settings</p>
                </div>
              </div>
              <div className="text-right">
                <Cog className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </button>

          <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Play className="h-8 w-8 text-white" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-100">Trigger</p>
                  <p className="text-lg font-bold text-white">Scraping</p>
                </div>
              </div>
              <button
                onClick={() => alert('Funzionalità scraping in arrivo!')}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
              >
                <Target className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* DEBUG - Rimuovi in produzione */}
          <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-white" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-100">Debug</p>
                  <p className="text-lg font-bold text-white">Sessione</p>
                </div>
              </div>
              <button
                onClick={() => {
                  debugUserSession()
                }}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
              >
                <Shield className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLeads}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgScore}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Leads Oggi</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.leadsToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Sistema</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">Attivo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Lead Database</h2>
              <div className="flex items-center space-x-3">
                {/* Filter */}
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">All Roles</option>
                  <option value="designer">Designer</option>
                  <option value="developer">Developer</option>
                  <option value="seo">SEO</option>
                  <option value="copywriter">Copywriter</option>
                  <option value="photographer">Photographer</option>
                  <option value="adv">Advertising</option>
                  <option value="social">Social Media</option>
                  <option value="gdpr">GDPR</option>
                </select>

                <button
                  onClick={loadDashboardData}
                  className="flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>

                <button
                  onClick={exportLeads}
                  className="flex items-center px-3 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <span className="sr-only">Expand</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Score
                  </th>
                  {user?.plan === 'pro' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      CRM Status
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Needed Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Issues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {leads.map((lead) => (
                  <>
                    {/* Riga principale */}
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleLeadExpansion(lead.id)}
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                          title="Mostra insights"
                        >
                          <ChevronDown className={`h-4 w-4 transform transition-transform ${
                            expandedLeads.has(lead.id) ? 'rotate-180' : ''
                          }`} />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {lead.business_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{lead.category}</div>
                          {/* Per utenti PRO, mostra il badge CRM sotto il nome */}
                          {user?.plan === 'pro' && (
                            <div className="mt-1">
                              <LeadStatusBadge 
                                status={lead.crm_status} 
                                nextFollowUp={lead.next_follow_up}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{lead.city}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{lead.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </span>
                    </td>
                    {user?.plan === 'pro' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <LeadStatusBadge 
                            status={lead.crm_status} 
                            nextFollowUp={lead.next_follow_up}
                          />
                          {/* Azioni rapide CRM */}
                          <div className="flex gap-1">
                            {lead.crm_status === 'new' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(lead.id, 'contacted')}
                                disabled={updatingCRM === lead.id}
                                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {updatingCRM === lead.id ? '...' : 'Contatta'}
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/crm?leadId=${lead.id}`)}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 inline-flex items-center gap-1"
                            >
                              <MessageCircle className="h-3 w-3" />
                              CRM
                            </button>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.needed_roles?.slice(0, 3).map((role) => (
                          <span
                            key={role}
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(role)}`}
                          >
                            {role}
                          </span>
                        ))}
                        {lead.needed_roles?.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{lead.needed_roles.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {lead.issues?.length || 0} issues
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => router.push(`/lead/${lead.id}`)}
                          className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300"
                          title="Visualizza analisi dettagliata"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {lead.website_url && (
                          <a
                            href={lead.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                            title="Visita sito web"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Riga espandibile per gli insights */}
                  {expandedLeads.has(lead.id) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
                        <LeadInsights 
                          lead={lead} 
                          userPlan={(user?.plan as 'free' | 'starter' | 'pro') || 'free'}
                        />
                      </td>
                    </tr>
                  )}
                </>
                ))}
              </tbody>
            </table>
          </div>

          {leads.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No leads found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filterRole ? `No leads need "${filterRole}" services.` : 'No leads available.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
