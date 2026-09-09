/**
 * Tab Servizi — servizi offerti, budget preferito e preferenze lead - TrovaMi
 * Usato da: app/settings/page.tsx (tab "Servizi")
 * Salva su: users (services_offered, preferred_min_budget, preferred_max_budget)
 * Usa il componente condiviso ServicesEditor (stessa UI dell'onboarding).
 * Presentazione: guida in apps/frontend-app/DESIGN.md.
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { Euro } from 'lucide-react'
import ServicesEditor from '@/components/settings/ServicesEditor'
import LeadPreferencesSection from '@/components/settings/LeadPreferencesSection'
import { Button, Card, CardTitle, Input, Skeleton } from '@/components/ui'
import { SERVICE_CONFIGS, type ServiceType } from '@/lib/types/services'

export default function ServicesTab() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [servicesOffered, setServicesOffered] = useState<ServiceType[]>([])
  const [preferredMinBudget, setPreferredMinBudget] = useState<number | ''>('')
  const [preferredMaxBudget, setPreferredMaxBudget] = useState<number | ''>('')
  const [savingServices, setSavingServices] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('services_offered, preferred_min_budget, preferred_max_budget')
          .eq('id', user.id)
          .single()

        setServicesOffered((dbUser?.services_offered || []) as ServiceType[])
        setPreferredMinBudget(dbUser?.preferred_min_budget || '')
        setPreferredMaxBudget(dbUser?.preferred_max_budget || '')
      } catch (error) {
        console.error('Errore caricamento servizi:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const handleSaveServices = async () => {
    if (!user?.id) return
    setSavingServices(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          services_offered: servicesOffered,
          preferred_min_budget: preferredMinBudget === '' ? null : Number(preferredMinBudget),
          preferred_max_budget: preferredMaxBudget === '' ? null : Number(preferredMaxBudget)
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Servizi e preferenze salvati con successo!')

      // Refresh profile per aggiornare AuthContext
      if (refreshProfile) {
        await refreshProfile()
      }
    } catch (error: any) {
      console.error('Errore salvataggio servizi:', error)
      toast.error('Errore', error.message)
    } finally {
      setSavingServices(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <span className="sr-only">Caricamento in corso</span>
        <Skeleton className="h-96 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Servizi offerti: il controllo che decide quali lead vede l'utente */}
      <Card>
        <CardTitle>I tuoi servizi</CardTitle>
        <p className="mt-1 text-body text-content-muted">
          Questi servizi decidono quali clienti ti mostriamo: cerchiamo aziende
          con i problemi che sai risolvere.
        </p>

        <div className="mt-6">
          <ServicesEditor value={servicesOffered} onChange={setServicesOffered} compact />
          <p className="mt-3 text-caption text-content-muted" aria-live="polite">
            {servicesOffered.length === 0
              ? 'Nessun servizio selezionato: la dashboard ti mostra tutti i lead, senza priorità.'
              : `Cercheremo aziende con problemi di ${servicesOffered
                  .map((service) => SERVICE_CONFIGS[service]?.label ?? service)
                  .join(', ')}.`}
          </p>
        </div>

        {/* Budget preferito (opzionale) */}
        <div className="mt-6 border-t border-edge pt-6">
          <h3 className="text-body font-medium text-content">Budget preferito</h3>
          <p className="mt-1 text-caption text-content-muted">
            Opzionale. I lead con un budget stimato in questo intervallo salgono
            nella tua lista.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Minimo"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="500"
              icon={<Euro />}
              className="tabular-nums"
              value={preferredMinBudget}
              onChange={(e) =>
                setPreferredMinBudget(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
            <Input
              label="Massimo"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="5000"
              icon={<Euro />}
              className="tabular-nums"
              value={preferredMaxBudget}
              onChange={(e) =>
                setPreferredMaxBudget(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveServices} loading={savingServices} loadingText="Salvataggio…">
            Salva preferenze
          </Button>
        </div>
      </Card>

      {/* Preferenze Lead - Configurazione Avanzata */}
      <LeadPreferencesSection />
    </div>
  )
}
