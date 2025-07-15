/**
 * Hook per gestione servizi digitali con prezzi - ClientSniper
 * Usato per: Recuperare e gestire servizi digitali per utenti PRO
 * Chiamato da: Componente dettaglio lead, sezione servizi
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface DigitalService {
  id: string
  name: string
  description: string
  price_freelance_eur: number
  price_agency_eur: number
  tags: string[]
  category: string
  complexity_level: 'low' | 'medium' | 'high'
  estimated_hours: number
  is_recurring: boolean
  is_popular: boolean
  is_high_profit: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProposedService {
  id: string
  user_id: string
  lead_id: string
  service_id: string
  custom_price_eur?: number
  notes?: string
  status: 'proposed' | 'accepted' | 'rejected' | 'in_negotiation'
  created_at: string
  updated_at: string
  digital_services: DigitalService
  leads: {
    id: string
    business_name: string
    city: string
    category: string
  }
}

export interface ServiceStats {
  total: number
  categories: number
  recurring: number
  popular: number
  highProfit: number
  avgPriceFreelance: number
  avgPriceAgency: number
}

export interface ProposedServiceStats {
  total: number
  proposed: number
  accepted: number
  rejected: number
  in_negotiation: number
  totalValue: number
  potentialValue: number
}

export interface UseDigitalServicesReturn {
  services: DigitalService[]
  servicesByCategory: Record<string, DigitalService[]>
  stats: ServiceStats
  isLoading: boolean
  error: string | null
  fetchServices: (filters?: ServiceFilters) => Promise<void>
  proposeService: (leadId: string, serviceId: string, customPrice?: number, notes?: string) => Promise<boolean>
}

export interface UseProposedServicesReturn {
  proposedServices: ProposedService[]
  stats: ProposedServiceStats
  isLoading: boolean
  error: string | null
  fetchProposedServices: (leadId?: string) => Promise<void>
  updateServiceStatus: (id: string, status: ProposedService['status']) => Promise<boolean>
  deleteProposedService: (id: string) => Promise<boolean>
}

export interface ServiceFilters {
  category?: string
  search?: string
  isRecurring?: boolean
  isPopular?: boolean
  isHighProfit?: boolean
  minPrice?: number
  maxPrice?: number
  priceType?: 'freelance' | 'agency'
}

export function useDigitalServices(): UseDigitalServicesReturn {
  const { user, getAccessToken } = useAuth()
  
  const [services, setServices] = useState<DigitalService[]>([])
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, DigitalService[]>>({})
  const [stats, setStats] = useState<ServiceStats>({
    total: 0,
    categories: 0,
    recurring: 0,
    popular: 0,
    highProfit: 0,
    avgPriceFreelance: 0,
    avgPriceAgency: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchServices = async (filters: ServiceFilters = {}) => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      // Usa il sistema di autenticazione dell'app
      const accessToken = getAccessToken()
      
      if (!accessToken) {
        throw new Error('Sessione non disponibile')
      }

      // Costruisci URL con filtri
      const searchParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/digital-services?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nel caricamento dei servizi')
      }

      const data = await response.json()
      if (data.success) {
        setServices(data.data.services)
        setServicesByCategory(data.data.servicesByCategory)
        setStats(data.data.stats)
      } else {
        throw new Error(data.error || 'Errore nel caricamento dei servizi')
      }

    } catch (err) {
      console.error('Errore fetchServices:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setIsLoading(false)
    }
  }

  const proposeService = async (
    leadId: string,
    serviceId: string,
    customPrice?: number,
    notes?: string
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const accessToken = getAccessToken()
      
      if (!accessToken) {
        throw new Error('Sessione non disponibile')
      }

      const response = await fetch('/api/lead-proposed-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          lead_id: leadId,
          service_id: serviceId,
          custom_price_eur: customPrice,
          notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nella proposta del servizio')
      }

      const data = await response.json()
      return data.success

    } catch (err) {
      console.error('Errore proposeService:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      return false
    }
  }

  // Carica servizi automaticamente quando l'utente è disponibile
  useEffect(() => {
    if (user) {
      fetchServices()
    }
  }, [user])

  return {
    services,
    servicesByCategory,
    stats,
    isLoading,
    error,
    fetchServices,
    proposeService
  }
}

export function useProposedServices(): UseProposedServicesReturn {
  const { user, getAccessToken } = useAuth()
  
  const [proposedServices, setProposedServices] = useState<ProposedService[]>([])
  const [stats, setStats] = useState<ProposedServiceStats>({
    total: 0,
    proposed: 0,
    accepted: 0,
    rejected: 0,
    in_negotiation: 0,
    totalValue: 0,
    potentialValue: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProposedServices = async (leadId?: string) => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const accessToken = getAccessToken()
      
      if (!accessToken) {
        throw new Error('Sessione non disponibile')
      }

      const searchParams = new URLSearchParams()
      if (leadId) {
        searchParams.append('lead_id', leadId)
      }

      const response = await fetch(`/api/lead-proposed-services?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nel caricamento dei servizi proposti')
      }

      const data = await response.json()
      if (data.success) {
        setProposedServices(data.data.proposedServices)
        setStats(data.data.stats)
      } else {
        throw new Error(data.error || 'Errore nel caricamento dei servizi proposti')
      }

    } catch (err) {
      console.error('Errore fetchProposedServices:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setIsLoading(false)
    }
  }

  const updateServiceStatus = async (id: string, status: ProposedService['status']): Promise<boolean> => {
    if (!user) return false

    try {
      const accessToken = getAccessToken()
      
      if (!accessToken) {
        throw new Error('Sessione non disponibile')
      }

      const response = await fetch('/api/lead-proposed-services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, status })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nell\'aggiornamento del servizio')
      }

      const data = await response.json()
      if (data.success) {
        // Aggiorna lo stato locale
        setProposedServices(prev => 
          prev.map(service => 
            service.id === id ? { ...service, status } : service
          )
        )
        return true
      }

      return false

    } catch (err) {
      console.error('Errore updateServiceStatus:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      return false
    }
  }

  const deleteProposedService = async (id: string): Promise<boolean> => {
    if (!user) return false

    try {
      const accessToken = getAccessToken()
      
      if (!accessToken) {
        throw new Error('Sessione non disponibile')
      }

      const response = await fetch(`/api/lead-proposed-services?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nell\'eliminazione del servizio')
      }

      const data = await response.json()
      if (data.success) {
        // Rimuovi dallo stato locale
        setProposedServices(prev => prev.filter(service => service.id !== id))
        return true
      }

      return false

    } catch (err) {
      console.error('Errore deleteProposedService:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      return false
    }
  }

  return {
    proposedServices,
    stats,
    isLoading,
    error,
    fetchProposedServices,
    updateServiceStatus,
    deleteProposedService
  }
}
