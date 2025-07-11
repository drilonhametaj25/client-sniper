/**
 * Pagina impostazioni account utente con gestione disattivazione piano - TrovaMi
 * Usato per: Gestire piano, fatturazione, disattivazione/riattivazione abbonamento
 * Chiamato da: Dashboard navbar, profilo utente
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  CreditCard, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Settings as SettingsIcon,
  ArrowLeft,
  Crown,
  Calendar,
  Pause,
  Play,
  X,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import InactivePlanBanner from '@/components/InactivePlanBanner'
import { usePlanStatus } from '@/hooks/usePlanStatus'

interface UserData {
  id: string
  email: string
  plan: string
  status: string
  credits_remaining: number
  deactivated_at?: string
  deactivation_reason?: string
  deactivation_scheduled_at?: string
  subscription_end_date?: string
  reactivated_at?: string
  stripe_subscription_id?: string
  created_at: string
}

interface PlanLog {
  action: string
  previous_status: string
  new_status: string
  reason: string
  triggered_by: string
  created_at: string
}

export default function SettingsPage() {
  const { user, signOut, refreshProfile } = useAuth()
  const router = useRouter()
  const planStatus = usePlanStatus()
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [planLogs, setPlanLogs] = useState<PlanLog[]>([])
  const [loading, setLoading] = useState(true)
  const [deactivating, setDeactivating] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivationReason, setDeactivationReason] = useState('')
  
  // Stati per cambio email e password
  const [changingEmail, setChangingEmail] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    // Carica i dati senza forzare il refresh per evitare loop
    loadUserData()
  }, [user])

  const loadUserData = async () => {
    if (!user?.id) return
    
    try {
      
      // Usa i dati dell'AuthContext che sono aggiornati e completi
      const currentUserData: UserData = {
        id: user.id,
        email: user.email || 'email@example.com',
        plan: user.plan || 'free',
        status: 'active', // Default per compatibilità
        credits_remaining: user.credits_remaining || 0,
        created_at: user.created_at || new Date().toISOString()
      }
      
      setUserData(currentUserData)

      // Carica i log del piano se l'utente ha un piano attivo
      if (user.plan && user.plan !== 'free') {
        await loadPlanLogs()
      } else {
        setPlanLogs([])
      }

    } catch (error) {
      console.error('Errore caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPlanLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('plan_status_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Errore caricamento log piano:', error)
        return
      }

      setPlanLogs(data || [])
    } catch (error) {
      console.error('Errore caricamento log piano:', error)
    }
  }

  const handleDeactivatePlan = async () => {
    setDeactivating(true)
    
    try {
      
      // Usa la stessa logica identica del PlanSelector che funziona
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !currentSession?.access_token) {
        console.error('❌ Debug: Sessione invalida - sessionError:', sessionError, 'token:', currentSession?.access_token)
        throw new Error('Sessione non valida o token mancante')
      }


      const response = await fetch('/api/plan/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ reason: deactivationReason }),
      })

      const result = await response.json()

      if (result.success) {
        // Gestisci diversi tipi di successo
        if (result.cancellation_scheduled) {
          // Cancellazione programmata - rimane attivo fino alla scadenza
          alert(`✅ ${result.message}\n\nIl tuo piano rimane attivo fino alla fine del periodo già pagato.`)
          
          setUserData(prev => prev ? { 
            ...prev, 
            // Lo status rimane 'active' perché l'abbonamento è ancora valido
            deactivation_reason: deactivationReason,
            deactivation_scheduled_at: new Date().toISOString(),
            subscription_end_date: result.access_until
          } : null)
        } else if (result.cleanup_performed) {
          // Pulizia automatica - piano disattivato immediatamente
          alert(`✅ ${result.message}`)
          
          setUserData(prev => prev ? { 
            ...prev, 
            status: 'inactive',
            plan: 'free',
            deactivated_at: new Date().toISOString(),
            deactivation_reason: 'Piano disattivato automaticamente'
          } : null)
        } else {
          // Disattivazione immediata normale
          alert(`✅ ${result.message}`)
          
          setUserData(prev => prev ? { 
            ...prev, 
            status: result.status || 'inactive',
            deactivated_at: result.deactivated_at || new Date().toISOString(),
            deactivation_reason: deactivationReason 
          } : null)
        }
        
        setShowDeactivateModal(false)
        setDeactivationReason('')
        
        // Ricarica i dati per essere sicuri e mostrare i log aggiornati
        await loadUserData()
        await loadPlanLogs()
      } else {
        alert('Errore durante la disattivazione: ' + result.error)
      }
    } catch (error) {
      console.error('Errore disattivazione:', error)
      alert('Errore durante la disattivazione del piano')
    } finally {
      setDeactivating(false)
    }
  }

  const handleReactivatePlan = async () => {
    setReactivating(true)
    
    try {
      // Ottieni il token di accesso corrente dalla sessione Supabase
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !currentSession?.access_token) {
        throw new Error('Sessione non valida o token mancante')
      }

      const response = await fetch('/api/plan/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      })

      const result = await response.json()

      if (result.success) {
        // Aggiorna i dati locali
        setUserData(prev => prev ? { 
          ...prev, 
          status: 'active',
          reactivated_at: result.reactivated_at,
          deactivation_reason: undefined 
        } : null)
        
        // Ricarica i dati
        loadUserData()
      } else if (result.action_required === 'checkout') {
        // Reindirizza al checkout
        router.push(result.checkout_url)
      } else {
        alert('Errore durante la riattivazione: ' + result.error)
      }
    } catch (error) {
      console.error('Errore riattivazione:', error)
      alert('Errore durante la riattivazione del piano')
    } finally {
      setReactivating(false)
    }
  }

  // Funzione per cambiare email
  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      alert('Inserisci una nuova email')
      return
    }

    if (newEmail === userData?.email) {
      alert('La nuova email deve essere diversa da quella attuale')
      return
    }

    setChangingEmail(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      })

      if (error) throw error

      alert('Email aggiornata! Controlla la tua nuova casella email per confermare.')
      setNewEmail('')
    } catch (error: any) {
      console.error('Errore cambio email:', error)
      alert('Errore: ' + error.message)
    } finally {
      setChangingEmail(false)
    }
  }

  // Funzione per cambiare password
  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      alert('Compila tutti i campi')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('Le password non corrispondono')
      return
    }

    if (newPassword.length < 6) {
      alert('La password deve essere almeno di 6 caratteri')
      return
    }

    setChangingPassword(true)
    
    try {
      // Prima verifica la password attuale
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData?.email || '',
        password: currentPassword
      })

      if (signInError) {
        throw new Error('Password attuale non corretta')
      }

      // Ora cambia la password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      alert('Password aggiornata con successo!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Errore cambio password:', error)
      alert('Errore: ' + error.message)
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Errore caricamento dati</h2>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const planNames = {
    free: 'Gratuito',
    starter: 'Starter',
    pro: 'Pro'
  }

  const planColors = {
    free: 'bg-gray-100 text-gray-800',
    starter: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800'
  }

  const statusColors = {
    active: 'text-green-600',
    inactive: 'text-orange-600', 
    cancelled: 'text-red-600'
  }

  const statusLabels = {
    active: 'Attivo',
    inactive: 'Disattivato',
    cancelled: 'Cancellato'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link 
                href="/dashboard"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <SettingsIcon className="w-5 h-5 text-gray-400 mr-2" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Impostazioni Account</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          
          {/* Banner Piano Disattivato */}
          {userData.status !== 'active' && (
            <InactivePlanBanner />
          )}
          
          {/* Informazioni Account */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informazioni Account</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <div className="text-gray-900 dark:text-white">{userData.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Membro dal</label>
                <div className="text-gray-900 dark:text-white">
                  {new Date(userData.created_at).toLocaleDateString('it-IT')}
                </div>
              </div>
            </div>
          </div>

          {/* Sicurezza Account */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <SettingsIcon className="w-5 h-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sicurezza Account</h2>
            </div>
            
            <div className="space-y-6">
              {/* Cambio Email */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Cambia Email</h3>
                <div className="flex items-center space-x-3">
                  <input
                    type="email"
                    placeholder={userData.email}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button
                    onClick={handleChangeEmail}
                    disabled={changingEmail || !newEmail.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingEmail ? 'Aggiornando...' : 'Aggiorna Email'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Riceverai un'email di conferma al nuovo indirizzo
                </p>
              </div>

              {/* Cambio Password */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Cambia Password</h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Password attuale"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <input
                    type="password"
                    placeholder="Nuova password (min. 6 caratteri)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <input
                    type="password"
                    placeholder="Conferma nuova password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? 'Aggiornando...' : 'Aggiorna Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Piano Attuale */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Crown className="w-5 h-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Piano Attuale</h2>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  userData.plan === 'pro' 
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                    : userData.plan === 'starter'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {planNames[userData.plan as keyof typeof planNames]}
                </span>
                <span className={`text-sm font-medium ${statusColors[userData.status as keyof typeof statusColors]}`}>
                  {statusLabels[userData.status as keyof typeof statusLabels]}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Piano</label>
                <div className="text-gray-900 dark:text-white font-medium">
                  {planNames[userData.plan as keyof typeof planNames]}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Crediti Rimanenti</label>
                <div className="text-gray-900 dark:text-white font-medium">{userData.credits_remaining}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stato</label>
                <div className="flex items-center">
                  {userData.status === 'active' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-600 text-sm">Attivo</span>
                    </>
                  ) : userData.status === 'inactive' ? (
                    <>
                      <Pause className="w-4 h-4 text-orange-500 mr-1" />
                      <span className="text-orange-600 text-sm">Disattivato</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-red-500 mr-1" />
                      <span className="text-red-600 text-sm">Cancellato</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Caratteristiche del piano */}
            {userData.plan === 'pro' && (
              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900 rounded-xl">
                <h3 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">Caratteristiche Piano Pro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-purple-800 dark:text-purple-300">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                    100 lead al mese
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                    CRM personale integrato
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                    Gestione lead avanzata
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                    Note e follow-up
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                    Upload allegati
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                    Supporto prioritario
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                    API access
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
                    Lead scoring avanzato
                  </div>
                </div>
              </div>
            )}
            
            {userData.plan === 'starter' && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-xl">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">Caratteristiche Piano Starter</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                    25 lead al mese
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                    Analisi tecnica completa
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                    Supporto email
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                    Filtri avanzati
                  </div>
                </div>
              </div>
            )}
            
            {userData.plan === 'free' && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">Caratteristiche Piano Gratuito</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                    2 lead al mese
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                    Informazioni base
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                    Supporto community
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <Link 
                    href="/upgrade"
                    className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    Passa al piano Pro e accedi al CRM
                  </Link>
                </div>
              </div>
            )}

            {/* Dettagli disattivazione */}
            {userData.status === 'inactive' && userData.deactivated_at && (
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900 rounded-xl">
                <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                  <div>
                    <strong>Disattivato il:</strong> {new Date(userData.deactivated_at).toLocaleDateString('it-IT')}
                  </div>
                  {userData.deactivation_reason && (
                    <div>
                      <strong>Motivo:</strong> {userData.deactivation_reason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dettagli cancellazione programmata */}
            {userData.status === 'active' && userData.deactivation_scheduled_at && userData.subscription_end_date && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-xl">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                    <div className="font-medium">
                      Cancellazione programmata
                    </div>
                    <div>
                      Il tuo abbonamento è stato cancellato ma rimane <strong>attivo fino al {new Date(userData.subscription_end_date).toLocaleDateString('it-IT')}</strong>.
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                      Potrai continuare ad utilizzare tutte le funzionalità premium fino alla scadenza del periodo già pagato.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dettagli riattivazione */}
            {userData.reactivated_at && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 rounded-xl">
                <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <div>
                    <strong>Riattivato il:</strong> {new Date(userData.reactivated_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
              </div>
            )}

            {/* Azioni Piano */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Gestione Piano</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userData.status === 'active' 
                      ? 'Gestisci il tuo abbonamento e le impostazioni di fatturazione'
                      : 'Riattiva il tuo piano per accedere a tutte le funzionalità'
                    }
                  </p>
                </div>
                <div className="flex space-x-3">
                  {/* Pulsante Refresh Dati */}
                  <button
                    onClick={async () => {
                      
                      // 1. Invalida localStorage cache
                      const keys = Object.keys(localStorage)
                      keys.forEach(key => {
                        if (key.startsWith('auth_profile_') || key.startsWith('profile_cache_')) {
                          localStorage.removeItem(key)
                        }
                      })
                      
                      // 2. Invalida sessionStorage cache  
                      const sessionKeys = Object.keys(sessionStorage)
                      sessionKeys.forEach(key => {
                        if (key.startsWith('auth_profile_') || key.startsWith('profile_cache_')) {
                          sessionStorage.removeItem(key)
                        }
                      })
                      
                      // 3. Refresh del profilo AuthContext
                      await refreshProfile()
                      
                      // 4. Ricarica dati locali
                      setTimeout(() => {
                        loadUserData()
                      }, 500) // Piccolo delay per permettere al context di aggiornarsi
                      
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Aggiorna i dati del profilo"
                  >
                    <RefreshCw className="w-4 h-4 mr-2 inline" />
                    Aggiorna
                  </button>
                  
                  {userData.status === 'active' && userData.plan !== 'free' && (
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      className="px-4 py-2 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900 transition-colors"
                    >
                      <Pause className="w-4 h-4 mr-2 inline" />
                      Disattiva Piano
                    </button>
                  )}
                  
                  {userData.status === 'inactive' && (
                    <button
                      onClick={handleReactivatePlan}
                      disabled={reactivating}
                      className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 mr-2 inline" />
                      {reactivating ? 'Riattivando...' : 'Riattiva Piano'}
                    </button>
                  )}
                  
                  <Link
                    href="/upgrade"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    {userData.status === 'active' ? 'Cambia Piano' : 'Scegli Piano'}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Storico Operazioni */}
          {planLogs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Storico Operazioni</h2>
              
              <div className="space-y-3">
                {planLogs.map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {log.action === 'activate' && '✅ Piano attivato'}
                        {log.action === 'deactivate' && '⏸️ Piano disattivato'}
                        {log.action === 'auto_reactivate' && '🔄 Riattivazione automatica'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{log.reason}</div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Azioni Account */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Azioni Account</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => signOut()}
                className="w-full text-left px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
              >
                Disconnetti
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Sei sicuro di voler eliminare il tuo account? Questa azione non può essere annullata.')) {
                    alert('Funzionalità in arrivo')
                  }
                }}
                className="w-full text-left px-4 py-3 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
              >
                Elimina Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Disattivazione */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <Pause className="w-6 h-6 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Disattiva Piano</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Disattivando il piano perderai l'accesso alle funzionalità premium. 
              Potrai riattivarlo in qualsiasi momento.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo della disattivazione (opzionale)
              </label>
              <textarea
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="Aiutaci a migliorare..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeactivatePlan}
                disabled={deactivating}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {deactivating ? 'Disattivando...' : 'Disattiva Piano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
