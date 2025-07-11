/**
 * Hook per controllo stato piano e limitazioni accesso - TrovaMi
 * Usato per: Verificare se l'utente può accedere a funzionalità premium
 * Chiamato da: Tutte le pagine che richiedono un piano attivo
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface PlanStatus {
  plan: string
  status: 'active' | 'inactive' | 'cancelled'
  deactivated_at?: string
  deactivation_reason?: string
  reactivated_at?: string
  credits_remaining: number
  canAccessPremium: boolean
  isLoading: boolean
  error?: string
}

interface PlanLimitations {
  canUnlockLeads: boolean
  canViewContacts: boolean
  canExportData: boolean
  maxLeadsPerMonth: number
  message?: string
}

export function usePlanStatus(): PlanStatus {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [planStatus, setPlanStatus] = useState<PlanStatus>({
    plan: 'free',
    status: 'active',
    credits_remaining: 0,
    canAccessPremium: false,
    isLoading: true
  })

  useEffect(() => {
    if (!user) {
      setPlanStatus(prev => ({ ...prev, isLoading: false }))
      return
    }

    loadPlanStatus()
  }, [user])

  const loadPlanStatus = async () => {
    try {
      // ⚡ OTTIMIZZAZIONE: Usa i dati dell'AuthContext che sono già completi e aggiornati
      // Evita query duplicate e problemi di sincronizzazione
      
      if (!user) {
        setPlanStatus(prev => ({ ...prev, isLoading: false }))
        return
      }

      
      // Usa i dati già disponibili dall'AuthContext che sono affidabili
      const canAccessPremium = (user.status === 'active' && user.plan && user.plan !== 'free') || false

      setPlanStatus({
        plan: user.plan || 'free',
        status: user.status || 'active',
        credits_remaining: user.credits_remaining || 0,
        deactivated_at: user.deactivated_at,
        deactivation_reason: user.deactivation_reason,
        reactivated_at: user.reactivated_at,
        canAccessPremium,
        isLoading: false
      })

    } catch (error) {
      console.error('Errore caricamento stato piano:', error)
      setPlanStatus(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Errore caricamento stato piano' 
      }))
    }
  }

  return planStatus
}

export function usePlanLimitations(): PlanLimitations {
  const planStatus = usePlanStatus()

  if (planStatus.isLoading) {
    return {
      canUnlockLeads: false,
      canViewContacts: false,
      canExportData: false,
      maxLeadsPerMonth: 0
    }
  }

  // Piano disattivato
  if (planStatus.status === 'inactive') {
    return {
      canUnlockLeads: false,
      canViewContacts: false,
      canExportData: false,
      maxLeadsPerMonth: 0,
      message: 'Il tuo piano è disattivato. Riattivalo per accedere alle funzionalità premium.'
    }
  }

  // Piano cancellato
  if (planStatus.status === 'cancelled') {
    return {
      canUnlockLeads: false,
      canViewContacts: false,
      canExportData: false,
      maxLeadsPerMonth: 0,
      message: 'Il tuo piano è stato cancellato. Sottoscrivi un nuovo piano per continuare.'
    }
  }

  // Limitazioni in base al piano
  switch (planStatus.plan) {
    case 'free':
      return {
        canUnlockLeads: planStatus.credits_remaining > 0,
        canViewContacts: false,
        canExportData: false,
        maxLeadsPerMonth: 2,
        message: planStatus.credits_remaining === 0 ? 
          'Hai esaurito i crediti gratuiti. Fai l\'upgrade per continuare.' : undefined
      }

    case 'starter':
      return {
        canUnlockLeads: planStatus.credits_remaining > 0,
        canViewContacts: true,
        canExportData: false,
        maxLeadsPerMonth: 25,
        message: planStatus.credits_remaining === 0 ? 
          'Hai esaurito i crediti del piano Starter.' : undefined
      }

    case 'pro':
      return {
        canUnlockLeads: planStatus.credits_remaining > 0,
        canViewContacts: true,
        canExportData: true,
        maxLeadsPerMonth: 100,
        message: planStatus.credits_remaining === 0 ? 
          'Hai esaurito i crediti del piano Pro.' : undefined
      }

    default:
      return {
        canUnlockLeads: false,
        canViewContacts: false,
        canExportData: false,
        maxLeadsPerMonth: 0,
        message: 'Piano non riconosciuto.'
      }
  }
}
