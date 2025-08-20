/**
 * Componente per visualizzare servizi digitali suggeriti per lead specifico
 * Usato per: Mostrare agli utenti PRO i servizi consigliati per il lead
 * Chiamato da: Pagina dettaglio lead per utenti PRO
 * OTTIMIZZATO: Prevenzione chiamate duplicate con cache globale
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePlanStatus } from '@/hooks/usePlanStatus'
import { useDigitalServices, useProposedServices, type DigitalService } from '@/hooks/useDigitalServices'
import { isProOrHigher } from '@/lib/utils/plan-helpers'
import {
  Plus,
  CheckCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Briefcase,
  Lightbulb,
} from 'lucide-react'

interface LeadDigitalServicesProps {
  lead: {
    id: string
    business_name: string
    city: string
    category: string
    website_url?: string
    analysis?: any
  }
}

interface ServiceProposalModal {
  isOpen: boolean
  service: DigitalService | null
  customPrice: string
  notes: string
  priceType: 'freelance' | 'agency'
}

export default function LeadDigitalServices({ lead }: LeadDigitalServicesProps) {
  const { user } = useAuth()
  const planStatus = usePlanStatus()
  const { services, isLoading, error, fetchServices, proposeService } = useDigitalServices()
  const { proposedServices, fetchProposedServices } = useProposedServices()

  // OTTIMIZZAZIONE: Ref per prevenire chiamate multiple e duplicati
  const hasLoadedRef = useRef(false)
  const mountedRef = useRef(true)
  const lastUserIdRef = useRef<string | null>(null)

  // State per modal proposta servizio
  const [proposalModal, setProposalModal] = useState<ServiceProposalModal>({
    isOpen: false,
    service: null,
    customPrice: '',
    notes: '',
    priceType: 'freelance'
  })
  
  const [isProposing, setIsProposing] = useState(false)

  // OTTIMIZZAZIONE: Memoizza la condizione per caricare i dati
  const shouldLoadData = useMemo(() => {
    if (!user || !lead.id || !mountedRef.current) return false
    if (!isProOrHigher(user.plan || 'free')) return false
    if (planStatus.status !== 'active') return false
    
    // Carica solo se l'utente è cambiato o non abbiamo mai caricato
    return lastUserIdRef.current !== user.id || !hasLoadedRef.current
  }, [user?.id, user?.plan, lead.id, planStatus.status])

  // OTTIMIZZAZIONE: Carica dati solo quando necessario, evita duplicati
  useEffect(() => {
    if (!shouldLoadData || hasLoadedRef.current) return
    
    const loadData = async () => {
      try {
        hasLoadedRef.current = true
        lastUserIdRef.current = user?.id || null
        
        console.log('🔄 Loading digital services for lead (OPTIMIZED):', lead.id)
        
        // Carica in parallelo ma con cache per evitare duplicati
        await Promise.allSettled([
          fetchServices({}), // Cache interna nel hook
          fetchProposedServices(lead.id) // Cache interna nel hook
        ])
      } catch (error) {
        console.error('Errore caricamento servizi digitali:', error)
        hasLoadedRef.current = false // Reset in caso di errore
      }
    }

    loadData()
    
    return () => {
      mountedRef.current = false
    }
  }, [shouldLoadData, lead.id, fetchServices, fetchProposedServices, user?.id])

  // OTTIMIZZAZIONE: Raccomandazioni memoizzate
  const recommendedServices = useMemo(() => {
    if (!lead.analysis || !services.length) return []
    
    const recommendations: DigitalService[] = []
    const analysis = lead.analysis
    
    // SEO services se mancano meta tag
    if (analysis.seo && (!analysis.seo.hasTitle || !analysis.seo.hasMetaDescription)) {
      recommendations.push(...services.filter(s => s.category === 'seo'))
    }
    
    // Analytics se non ha tracking
    if (analysis.tracking && !analysis.tracking.hasGoogleAnalytics) {
      recommendations.push(...services.filter(s => s.name.includes('Analytics')))
    }
    
    // Social se non ha presenza social
    if (analysis.social && !analysis.social.hasAnySocial) {
      recommendations.push(...services.filter(s => s.category === 'social'))
    }
    
    if (!lead.website_url) {
      recommendations.push(...services.filter(s => s.category === 'website'))
    }
    
    return recommendations.slice(0, 6) // Limita a 6 raccomandazioni
  }, [lead.analysis, lead.website_url, services])

  // Handler per proposta servizio
  const handleProposeService = async () => {
    if (!proposalModal.service || isProposing) return
    
    setIsProposing(true)
    
    try {
      const customPrice = proposalModal.customPrice ? parseFloat(proposalModal.customPrice) : undefined
      
      const success = await proposeService(
        lead.id,
        proposalModal.service.id,
        customPrice,
        proposalModal.notes
      )
      
      if (success) {
        // Ricarica servizi proposti
        await fetchProposedServices(lead.id)
        
        // Chiudi modal
        setProposalModal({
          isOpen: false,
          service: null,
          customPrice: '',
          notes: '',
          priceType: 'freelance'
        })
      }
      
    } catch (error) {
      console.error('Errore proposta servizio:', error)
    } finally {
      setIsProposing(false)
    }
  }

  // Verifica se l'utente ha accesso ai servizi digitali
  if (!user || !isProOrHigher(user.plan || 'free')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <div className="text-center">
          <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Servizi Digitali
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Upgrade al piano PRO per vedere servizi personalizzati per questo lead
          </p>
          <a 
            href="/settings/subscription"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Upgrade Piano
          </a>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Errore Caricamento
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Briefcase className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Servizi Digitali Consigliati
            </h2>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {recommendedServices.length} raccomandazioni
          </span>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400">
          Basato sull'analisi del sito di <strong>{lead.business_name}</strong>, 
          ecco i servizi che potresti proporre per migliorare la loro presenza digitale.
        </p>
      </div>

      {/* Servizi Raccomandati */}
      {recommendedServices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Star className="h-5 w-5 text-yellow-500 mr-2" />
            Raccomandazioni Automatiche
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedServices.map((service) => {
              const isProposed = proposedServices.some(ps => ps.service_id === service.id)
              
              return (
                <div
                  key={service.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {service.name}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {service.category}
                      </span>
                    </div>
                    
                    {service.is_popular && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Popolare
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-500">Da:</span>
                      <span className="font-semibold text-gray-900 dark:text-white ml-1">
                        €{service.price_freelance_eur}
                      </span>
                    </div>
                    
                    {isProposed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Proposto
                      </span>
                    ) : (
                      <button
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        onClick={() => setProposalModal({
                          isOpen: true,
                          service,
                          customPrice: service.price_freelance_eur.toString(),
                          notes: '',
                          priceType: 'freelance'
                        })}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Proponi
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Servizi Già Proposti */}
      {proposedServices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Servizi Proposti ({proposedServices.length})
          </h3>
          
          <div className="space-y-3">
            {proposedServices.map((ps) => (
              <div
                key={ps.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {ps.digital_services.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    €{ps.custom_price_eur || ps.digital_services.price_freelance_eur}
                    {ps.notes && ` • ${ps.notes}`}
                  </p>
                </div>
                
                <span 
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    ps.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    ps.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    ps.status === 'in_negotiation' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ps.status === 'proposed' && 'In Attesa'}
                  {ps.status === 'accepted' && 'Accettato'}
                  {ps.status === 'rejected' && 'Rifiutato'}
                  {ps.status === 'in_negotiation' && 'In Trattativa'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Proposta Servizio */}
      {proposalModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setProposalModal({...proposalModal, isOpen: false})} />
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Proponi Servizio
              </h3>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {proposalModal.service?.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {proposalModal.service?.description}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prezzo Personalizzato (€)
                  </label>
                  <input
                    type="number"
                    value={proposalModal.customPrice}
                    onChange={(e) => setProposalModal({...proposalModal, customPrice: e.target.value})}
                    placeholder={`Prezzo base: €${proposalModal.service?.price_freelance_eur}`}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Note (opzionale)
                  </label>
                  <textarea
                    value={proposalModal.notes}
                    onChange={(e) => setProposalModal({...proposalModal, notes: e.target.value})}
                    rows={3}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Aggiungi dettagli sulla tua proposta..."
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => setProposalModal({...proposalModal, isOpen: false})}
                  disabled={isProposing}
                >
                  Annulla
                </button>
                <button
                  className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleProposeService}
                  disabled={isProposing}
                >
                  {isProposing ? 'Proponendo...' : 'Proponi Servizio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
