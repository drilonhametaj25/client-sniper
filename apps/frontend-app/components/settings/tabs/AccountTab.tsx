/**
 * Tab Account — sicurezza (email/password), storico operazioni e zona pericolosa - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Account")
 * API: supabase.auth.updateUser (email/password), tabella plan_status_logs (storico)
 * Presentazione: guida in apps/frontend-app/DESIGN.md.
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Pause, RefreshCw, type LucideIcon } from 'lucide-react'
import { Button, Card, CardTitle, Input } from '@/components/ui'

interface PlanLog {
  action: string
  previous_status: string
  new_status: string
  reason: string
  triggered_by: string
  created_at: string
}

/** Etichetta e icona per ogni tipo di operazione sul piano. */
const LOG_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  activate: { label: 'Piano attivato', icon: CheckCircle2 },
  deactivate: { label: 'Piano disattivato', icon: Pause },
  auto_reactivate: { label: 'Riattivazione automatica', icon: RefreshCw }
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

  return (
    <div className="space-y-6">
      {/* Email */}
      <Card>
        <CardTitle>Indirizzo email</CardTitle>
        <p className="mt-1 text-body text-content-muted">
          Accedi con <span className="text-content">{user?.email}</span>. Se lo
          cambi, ti mandiamo una conferma al nuovo indirizzo.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Nuova email"
              type="email"
              placeholder="nuova@email.it"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleChangeEmail}
            disabled={!newEmail.trim()}
            loading={changingEmail}
            loadingText="Aggiornamento…"
          >
            Aggiorna
          </Button>
        </div>
      </Card>

      {/* Password */}
      <Card>
        <CardTitle>Password</CardTitle>
        <p className="mt-1 text-body text-content-muted">
          Servono almeno 6 caratteri. Ti chiediamo prima quella attuale.
        </p>

        <div className="mt-6 space-y-4">
          <Input
            label="Password attuale"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="Nuova password"
            type="password"
            autoComplete="new-password"
            hint="Almeno 6 caratteri."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Conferma nuova password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div className="mt-6 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/forgot-password"
            className="focus-ring inline-flex h-11 items-center rounded-control text-caption text-content-muted transition-colors duration-fast ease-soft hover:text-content"
          >
            Non ricordi la password attuale?
          </Link>
          <Button
            variant="secondary"
            onClick={handleChangePassword}
            disabled={!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
            loading={changingPassword}
            loadingText="Aggiornamento…"
            className="w-full sm:w-auto"
          >
            Aggiorna password
          </Button>
        </div>
      </Card>

      {/* Storico operazioni */}
      {planLogs.length > 0 && (
        <Card>
          <CardTitle>Storico operazioni</CardTitle>
          <ul className="mt-4 divide-y divide-edge">
            {planLogs.map((log, index) => {
              const entry = LOG_LABELS[log.action]
              const Icon = entry?.icon
              return (
                <li key={index} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    {Icon && (
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-body text-content">{entry?.label ?? log.action}</div>
                      {log.reason && (
                        <div className="text-caption text-content-muted">{log.reason}</div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-caption tabular-nums text-content-subtle">
                    {new Date(log.created_at).toLocaleDateString('it-IT')}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {/* Sessione e cancellazione */}
      <Card>
        <CardTitle>Il tuo account</CardTitle>

        <div className="mt-6 space-y-3">
          <Button variant="secondary" onClick={() => signOut()} fullWidth>
            Disconnetti
          </Button>

          {!confirmingDelete ? (
            <Button
              variant="ghost"
              onClick={() => setConfirmingDelete(true)}
              fullWidth
              className="text-danger hover:text-danger"
            >
              Elimina account
            </Button>
          ) : (
            <div className="rounded-card border border-danger-edge bg-danger-soft p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                <p className="text-body text-danger">
                  Elimini l'account e tutti i lead sbloccati. Non si torna indietro.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmingDelete(false)}
                  fullWidth
                >
                  Annulla
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmingDelete(false)
                    toast.info('Funzionalità in arrivo')
                  }}
                  fullWidth
                >
                  Elimina definitivamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
