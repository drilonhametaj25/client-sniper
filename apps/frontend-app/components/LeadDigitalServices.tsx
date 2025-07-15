/**
 * Componente per visualizzare servizi digitali suggeriti per lead specifico
 * Usato per: Mostrare agli utenti PRO i servizi consigliati per il lead
 * Chiamato da: Pagina dettaglio lead per utenti PRO
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePlanStatus } from '@/hooks/usePlanStatus'
import { useDigitalServices, useProposedServices, type DigitalService } from '@/hooks/useDigitalServices'
import {
  Plus,
  CheckCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Repeat,
  User,
  Building2,
  BookOpen,
  Briefcase,
  ExternalLink,
  Lightbulb,
  Clock
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Link from 'next/link'

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

  // State per modal proposta servizio
  const [proposalModal, setProposalModal] = useState<ServiceProposalModal>({
    isOpen: false,
    service: null,
    customPrice: '',
    notes: '',
    priceType: 'freelance'
  })
  
  const [isProposing, setIsProposing] = useState(false)

  // Carica servizi e servizi proposti per questo lead
  useEffect(() => {
    if (user) {
      fetchServices()
      if (lead.id && fetchProposedServices) {
        fetchProposedServices(lead.id)
      }
    }
  }, [user, lead.id])

  // Determina servizi raccomandati basandosi sull'analisi del lead
  const getRecommendedServices = () => {
    if (!lead.analysis || !services.length) return []
    
    const recommendations = []
    const analysis = lead.analysis
    
    // Logica di raccomandazione basata sull'analisi
    if (!analysis.seo?.hasTitle || !analysis.seo?.hasMetaDescription) {
      recommendations.push(...services.filter(s => s.category === 'seo'))
    }
    
    if (!analysis.tracking?.hasGoogleAnalytics) {
      recommendations.push(...services.filter(s => s.name.includes('Analytics')))
    }
    
    if (!analysis.social?.profiles?.length) {
      recommendations.push(...services.filter(s => s.category === 'social'))
    }
    
    if (!lead.website_url) {
      recommendations.push(...services.filter(s => s.name.includes('sito') || s.name.includes('landing')))
    }
    
    // Rimuovi duplicati e limitato a 6
    const uniqueRecs: DigitalService[] = []
    const seenIds = new Set()
    
    for (const rec of recommendations) {
      if (!seenIds.has(rec.id)) {
        seenIds.add(rec.id)
        uniqueRecs.push(rec)
      }
    }
    
    return uniqueRecs.slice(0, 6)
  }

  const recommendedServices = getRecommendedServices()

  // Gestione proposta servizio
  const handleProposeService = (service: DigitalService) => {
    setProposalModal({
      isOpen: true,
      service,
      customPrice: '',
      notes: '',
      priceType: 'freelance'
    })
  }

  const handleSubmitProposal = async () => {
    if (!proposalModal.service) return
    
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
        setProposalModal({
          isOpen: false,
          service: null,
          customPrice: '',
          notes: '',
          priceType: 'freelance'
        })
        
        // Ricarica i servizi proposti
        if (fetchProposedServices) {
          fetchProposedServices(lead.id)
        }
      }
    } finally {
      setIsProposing(false)
    }
  }

  // Mostra loading se i servizi non sono ancora caricati
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Non mostrare se non è utente PRO
  if (!planStatus.canAccessPremium) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border-2 border-dashed border-blue-200 dark:border-blue-700">
        <div className="text-center">
          <Briefcase className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Servizi Consigliati - Solo PRO
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Scopri quali servizi digitali puoi offrire a questo lead basandoti sull'analisi del loro sito web
          </p>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            Upgrade a PRO
          </Button>
        </div>
      </div>
    )
  }

  // Servizi già proposti per questo lead
  const proposedServiceIds = new Set(proposedServices.map(ps => ps.service_id))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Servizi Consigliati
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Basati sull'analisi tecnica del loro sito web
            </p>
          </div>
        </div>
        
        <Link href="/digital-services" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
          <span>Vedi tutti i servizi</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Mostra errore se non può caricare i servizi */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Errore nel caricamento dei servizi</span>
          </div>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
        </div>
      )}

      {/* Servizi raccomandati */}
      {recommendedServices.length > 0 ? (
        <div className="space-y-4">
          {recommendedServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onPropose={() => handleProposeService(service)}
              isProposed={proposedServiceIds.has(service.id)}
              isRecommended={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <Lightbulb className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nessun servizio consigliato al momento
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            L'analisi del sito web non ha rilevato aree di miglioramento specifiche
          </p>
          <Link href="/digital-services">
            <Button variant="secondary" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Esplora tutti i servizi
            </Button>
          </Link>
        </div>
      )}

      {/* Call to action per vedere tutti i servizi */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Vuoi vedere tutti i servizi disponibili?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Esplora il catalogo completo con prezzi medi di mercato
            </p>
          </div>
          <Link href="/digital-services">
            <Button variant="secondary" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Catalogo completo
            </Button>
          </Link>
        </div>
      </div>

      {/* Modal per proposta servizio */}
      {proposalModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Proponi servizio a {lead.business_name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Servizio
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {proposalModal.service?.name}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo di prezzo
                </label>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setProposalModal(prev => ({ ...prev, priceType: 'freelance' }))}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      proposalModal.priceType === 'freelance'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <User className="w-4 h-4 inline mr-1" />
                    Freelance (€{proposalModal.service?.price_freelance_eur})
                  </button>
                  <button
                    onClick={() => setProposalModal(prev => ({ ...prev, priceType: 'agency' }))}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      proposalModal.priceType === 'agency'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Agenzia (€{proposalModal.service?.price_agency_eur})
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prezzo personalizzato (opzionale)
                </label>
                <Input
                  type="number"
                  placeholder="Inserisci un prezzo personalizzato"
                  value={proposalModal.customPrice}
                  onChange={(e) => setProposalModal(prev => ({ ...prev, customPrice: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Note (opzionale)
                </label>
                <textarea
                  placeholder="Aggiungi dettagli sulla proposta..."
                  value={proposalModal.notes}
                  onChange={(e) => setProposalModal(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setProposalModal(prev => ({ ...prev, isOpen: false }))}
                variant="secondary"
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSubmitProposal}
                disabled={isProposing}
                className="flex-1"
              >
                {isProposing ? 'Propongo...' : 'Proponi servizio'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ServiceCardProps {
  service: DigitalService
  onPropose: () => void
  isProposed: boolean
  isRecommended?: boolean
}

function ServiceCard({ 
  service, 
  onPropose, 
  isProposed, 
  isRecommended = false 
}: ServiceCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-lg ${isRecommended ? 'border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
      {isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-blue-500 text-white">
            <Star className="w-3 h-3 mr-1" />
            Consigliato
          </Badge>
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              {service.name}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {service.description}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Freelance</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                €{service.price_freelance_eur}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Agenzia</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                €{service.price_agency_eur}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="info" className="text-xs">
            {service.category}
          </Badge>
          <Badge variant="default" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {service.estimated_hours}h
          </Badge>
          
          {service.is_popular && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs">
              <Star className="w-3 h-3 mr-1" />
              Popolare
            </Badge>
          )}
          
          {service.is_recurring && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">
              <Repeat className="w-3 h-3 mr-1" />
              Ricorrente
            </Badge>
          )}
          
          {service.is_high_profit && (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Alta marginalità
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {showDetails ? 'Nascondi dettagli' : 'Mostra dettagli'}
          </button>
          
          {isProposed ? (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Proposto</span>
            </div>
          ) : (
            <Button
              onClick={onPropose}
              size="sm"
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Proponi
            </Button>
          )}
        </div>
        
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {service.tags.map(tag => (
                  <Badge key={tag} variant="default" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Complessità:</strong> {service.complexity_level}</p>
                <p><strong>Ore stimate:</strong> {service.estimated_hours}h</p>
                {service.is_recurring && <p><strong>Servizio ricorrente</strong></p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
