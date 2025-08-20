/**
 * Hook per gestione servizi digitali con prezzi - ClientSniper
 * Usato per: Recuperare e gestire servizi digitali per utenti PRO
 * Chiamato da: Componente dettaglio lead, sezione servizi
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiCache } from '@/lib/utils/api-cache'

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

  const fetchServices = useCallback(async (filters: ServiceFilters = {}) => {
    if (!user) return

    const cacheKey = '/api/digital-services'
    
    try {
      setIsLoading(true)
      setError(null)

      // Usa il sistema di cache globale
      const data = await apiCache.cachedFetch(cacheKey, filters, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
        }
      }, 30000) // Cache per 30 secondi

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
  }, [user, getAccessToken]) // Memoizza con dipendenze stabili

  const proposeService = useCallback(async (
    leadId: string,
    serviceId: string,
    customPrice?: number,
    notes?: string
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await fetch('/api/lead-proposed-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
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
      
      if (data.success) {
        // Invalida la cache per forzare reload
        apiCache.invalidatePattern('lead-proposed-services')
      }
      
      return data.success

    } catch (err) {
      console.error('Errore proposeService:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      return false
    }
  }, [user, getAccessToken]) // Memoizza con dipendenze stabili

  // OTTIMIZZAZIONE: Non caricare automaticamente, lasciare al componente decidere quando caricare
  // useEffect(() => {
  //   if (user) {
  //     fetchServices()
  //   }
  // }, [user])

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

  const fetchProposedServices = useCallback(async (leadId?: string) => {
    if (!user) return

    const cacheKey = '/api/lead-proposed-services'
    const params = leadId ? { lead_id: leadId } : {}

    try {
      setIsLoading(true)
      setError(null)

      // Usa il sistema di cache globale
      const data = await apiCache.cachedFetch(cacheKey, params, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
        }
      }, 15000) // Cache per 15 secondi

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
  }, [user, getAccessToken]) // Memoizza con dipendenze stabili

  const updateServiceStatus = useCallback(async (id: string, status: ProposedService['status']): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await fetch('/api/lead-proposed-services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
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
        
        // Invalida la cache per forzare reload
        apiCache.invalidatePattern('lead-proposed-services')
        return true
      }

      return false

    } catch (err) {
      console.error('Errore updateServiceStatus:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      return false
    }
  }, [user, getAccessToken]) // Memoizza

  const deleteProposedService = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await fetch(`/api/lead-proposed-services?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
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
        
        // Invalida la cache per forzare reload
        apiCache.invalidatePattern('lead-proposed-services')
        return true
      }

      return false

    } catch (err) {
      console.error('Errore deleteProposedService:', err)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      return false
    }
  }, [user, getAccessToken]) // Memoizza

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
