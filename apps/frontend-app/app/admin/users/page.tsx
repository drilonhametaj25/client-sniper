'use client'

// Pannello admin per gestione utenti: visualizza lista utenti, statistiche,
// permette promozione/degradamento ruoli, modifica crediti e piani
// Accessibile solo agli utenti con ruolo 'admin'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getBasePlanType } from '@/lib/utils/plan-helpers'
import { 
  Users, 
  Crown, 
  Zap, 
  Search, 
  Filter, 
  ChevronDown,
  Edit2,
  Shield,
  CreditCard,
  Calendar,
  Mail,
  UserCheck,
  UserX,
  AlertTriangle,
  Plus,
  RefreshCw
} from 'lucide-react'

interface User {
  id: string
  email: string
  role: 'admin' | 'client'
  plan: 'free' | 'starter' | 'pro'
  credits_remaining: number
  email_confirmed_at: string | null
  created_at: string
  last_sign_in_at: string | null
  status: 'active' | 'inactive' | 'cancelled'
  stripe_customer_id?: string
  stripe_subscription_id?: string
}

export default function AdminUsers() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [filterPlan, setFilterPlan] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  // Stato per tracciare gli errori di caricamento

  // Redirect se non admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadUsers()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [users, searchTerm, filterRole, filterPlan])

  const loadUsers = async () => {
    try {
      setLoadingData(true)
      setLoadingError(null) // Reset eventuali errori precedenti
      
      
      const { data, error } = await supabase.rpc('admin_get_complete_users')
      
      if (error) {
        // Messaggio di errore user-friendly con suggerimenti
        setLoadingError(`Errore nel caricamento degli utenti: ${error.message}. 
          Verifica che la funzione RPC sia stata aggiornata correttamente sul database. 
          Se l'errore persiste, contatta il supporto tecnico.`)
        setLoadingData(false)
        return
      } 
      
      if (!data || data.length === 0) {
        setLoadingError("Nessun utente trovato nel sistema. Potrebbe essere un problema di permessi o dati vuoti.")
        setLoadingData(false)
        return
      }
      
      
      // Converti i dati nel formato User
      const mergedUsers: User[] = data.map((user: any) => ({
        id: user.id,
        email: user.email,
        role: user.role || 'client',
        plan: user.plan || 'free',
        credits_remaining: user.credits_remaining || 0,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        status: user.status || 'active',
        stripe_customer_id: user.stripe_customer_id,
        stripe_subscription_id: user.stripe_subscription_id
      }))
      
      setUsers(mergedUsers)
      
      setUsers(mergedUsers)
    } catch (error) {
      let errorMessage = 'Si è verificato un errore imprevisto durante il caricamento degli utenti.'
      
      // Gestione specifica degli errori comuni
      if (error instanceof Error) {
        if (error.message.includes('permission denied') || error.message.includes('accesso negato')) {
          errorMessage = 'Permessi insufficienti per accedere ai dati degli utenti. Verifica di avere il ruolo admin.'
        } else if (error.message.includes('column') && error.message.includes('ambiguous')) {
          errorMessage = 'Errore di ambiguità nella query SQL. La funzione RPC deve essere aggiornata.'
        } else {
          errorMessage = `Errore: ${error.message}`
        }
      }
      
      setLoadingError(errorMessage)
    } finally {
      setLoadingData(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...users]

    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterRole) {
      filtered = filtered.filter(u => u.role === filterRole)
    }

    if (filterPlan) {
      filtered = filtered.filter(u => u.plan === filterPlan)
    }

    setFilteredUsers(filtered)
  }

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (error) throw error
      
      // Aggiorna la lista locale
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, ...updates } : u
      ))
      
      setEditingUser(null)
      alert('Utente aggiornato con successo!')
    } catch (error) {
      alert('Errore durante l\'aggiornamento dell\'utente')
    }
  }

  const promoteToAdmin = async (userId: string) => {
    if (confirm('Sei sicuro di voler promuovere questo utente ad admin? Avrà accesso completo al sistema.')) {
      await updateUser(userId, { role: 'admin' })
    }
  }

  const demoteFromAdmin = async (userId: string) => {
    if (confirm('Sei sicuro di voler rimuovere i privilegi admin da questo utente?')) {
      await updateUser(userId, { role: 'client' })
    }
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: { label: 'Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: Shield },
      client: { label: 'Client', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Users }
    }
    return badges[role as keyof typeof badges] || badges.client
  }

  const getPlanBadge = (plan: string) => {
    const badges = {
      free: { label: 'Free', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
      starter: { label: 'Starter', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      pro: { label: 'Pro', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' }
    }
    return badges[plan as keyof typeof badges] || badges.free
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: 'Attivo', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      inactive: { label: 'Inattivo', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
      cancelled: { label: 'Cancellato', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' }
    }
    return badges[status as keyof typeof badges] || badges.active
  }

  const getStats = () => {
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      clients: users.filter(u => u.role === 'client').length,
      confirmed: users.filter(u => u.email_confirmed_at).length,
      unconfirmed: users.filter(u => !u.email_confirmed_at).length,
      freePlan: users.filter(u => getBasePlanType(u.plan) === 'free').length,
      starterPlan: users.filter(u => getBasePlanType(u.plan) === 'starter').length,
      proPlan: users.filter(u => getBasePlanType(u.plan) === 'pro').length,
      agencyPlan: users.filter(u => getBasePlanType(u.plan) === 'agency').length
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Caricamento utenti...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const stats = getStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Gestione <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Utenti</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Visualizza e gestisci tutti gli utenti del sistema
          </p>
        </div>
        
        {/* Error Message */}
        {loadingError && (
          <div className="bg-red-50 dark:bg-red-900/50 border-l-4 border-red-500 p-4 mb-8">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-200 font-medium">
                {loadingError}
              </p>
            </div>
            <p className="mt-2 text-sm text-red-700">
              Se vedi l'errore "column reference 'id' is ambiguous", è necessario eseguire lo script SQL per risolvere il problema.
              Consulta il file <code>database/ISTRUZIONI_FIX_ADMIN_DEFINITIVO.md</code> per istruzioni dettagliate.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Totali</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Admin</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.clients}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Client</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Confermati</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.freePlan}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Free</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.starterPlan}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Starter</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.proPlan}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Pro</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.agencyPlan}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Agency</div>
          </div>
        </div>

        {/* Filtri e Controlli */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Filtri</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <button
                onClick={loadUsers}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Aggiorna</span>
              </button>
            </div>
          </div>

          {/* Filtri Espandibili */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ruolo</label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Tutti i ruoli</option>
                    <option value="admin">Admin</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Piano</label>
                  <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Tutti i piani</option>
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista Utenti */}
        <div className="space-y-4">
          {filteredUsers.map((u) => {
            const roleBadge = getRoleBadge(u.role)
            const planBadge = getPlanBadge(u.plan)
            const statusBadge = getStatusBadge(u.status)
            
            return (
              <div
                key={u.id}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Info Utente */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {u.email}
                      </h3>
                      
                      <div className="flex items-center space-x-2">
                        <roleBadge.icon className="h-4 w-4" />
                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      </div>
                      
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${planBadge.color}`}>
                        {planBadge.label}
                      </span>
                      
                      {!u.email_confirmed_at && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-lg flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Non confermato
                        </span>
                      )}

                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Crediti: {u.credits_remaining}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Registrato: {new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <span>
                          Ultimo accesso: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Mai'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      title="Modifica"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    
                    {u.role === 'client' ? (
                      <button
                        onClick={() => promoteToAdmin(u.id)}
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        title="Promuovi ad Admin"
                      >
                        <Crown className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => demoteFromAdmin(u.id)}
                        className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Rimuovi Admin"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal Modifica Utente */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Modifica Utente
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Piano
                  </label>
                  <select
                    value={editingUser.plan}
                    onChange={(e) => setEditingUser({...editingUser, plan: e.target.value as any})}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Crediti
                  </label>
                  <input
                    type="number"
                    value={editingUser.credits_remaining}
                    onChange={(e) => setEditingUser({...editingUser, credits_remaining: parseInt(e.target.value) || 0})}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stato
                  </label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({...editingUser, status: e.target.value as any})}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="active">Attivo</option>
                    <option value="inactive">Inattivo</option>
                    <option value="cancelled">Cancellato</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => updateUser(editingUser.id, {
                    plan: editingUser.plan,
                    credits_remaining: editingUser.credits_remaining,
                    status: editingUser.status
                  })}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Salva
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nessun utente trovato</h3>
            <p className="text-gray-600 dark:text-gray-400">Prova a modificare i filtri di ricerca</p>
          </div>
        )}
      </div>
    </div>
  )
}
