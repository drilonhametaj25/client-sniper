/**
 * Tab Account — sicurezza (email/password), storico operazioni e zona pericolosa - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Account")
 * API: supabase.auth.updateUser (email/password), tabella plan_status_logs (storico)
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import Link from 'next/link'
import { Settings as SettingsIcon, AlertTriangle } from 'lucide-react'

interface PlanLog {
  action: string
  previous_status: string
  new_status: string
  reason: string
  triggered_by: string
  created_at: string
}

export default function AccountTab() {
  const { user, signOut } = useAuth()
  const toast = useToast()

  const [planLogs, setPlanLogs] = useState<PlanLog[]>([])
  const [changingEmail, setChangingEmail] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    const loadPlanLogs = async () => {
      if (!user?.id || !user.plan || user.plan === 'free') {
        setPlanLogs([])
        return
      }
      try {
        const { data, error } = await supabase
          .from('plan_status_logs')
          .select('*')
          .eq('user_id', user.id)
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
    loadPlanLogs()
  }, [user?.id, user?.plan])

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Inserisci una nuova email')
      return
    }
    if (newEmail === user?.email) {
      toast.error('La nuova email deve essere diversa da quella attuale')
      return
    }

    setChangingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error

      toast.success('Email aggiornata!', 'Controlla la tua nuova casella email per confermare.')
      setNewEmail('')
    } catch (error: any) {
      console.error('Errore cambio email:', error)
      toast.error('Errore', error.message)
    } finally {
      setChangingEmail(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Compila tutti i campi')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Le password non corrispondono')
      return
    }
    if (newPassword.length < 6) {
      toast.error('La password deve essere almeno di 6 caratteri')
      return
    }

    setChangingPassword(true)
    try {
      // Prima verifica la password attuale
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      })
      if (signInError) {
        throw new Error('Password attuale non corretta')
      }

      // Ora cambia la password
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Password aggiornata con successo!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Errore cambio password:', error)
      toast.error('Errore', error.message)
    } finally {
      setChangingPassword(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'

  return (
    <div className="space-y-6">
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
                placeholder={user?.email || ''}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={`flex-1 ${inputClass}`}
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
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Nuova password (min. 6 caratteri)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Conferma nuova password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? 'Aggiornando...' : 'Aggiorna Password'}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3">
                Non ricordi la password attuale?{' '}
                <Link
                  href="/forgot-password"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Reimposta password
                </Link>
              </p>
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

          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="w-full text-left px-4 py-3 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
            >
              Elimina Account
            </button>
          ) : (
            <div className="p-4 border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30 rounded-xl space-y-3">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  Sei sicuro di voler eliminare il tuo account? Questa azione non può essere annullata.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    setConfirmingDelete(false)
                    toast.info('Funzionalità in arrivo')
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Elimina definitivamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
