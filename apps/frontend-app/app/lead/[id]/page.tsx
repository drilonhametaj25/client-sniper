/**
 * Pagina dettaglio lead — shell sottile orientata alla vendita.
 *
 * Regola fondamentale: GUARDARE questa pagina non consuma mai crediti.
 * Se il lead non è sbloccato mostra un'anteprima bloccata con CTA che apre
 * UnlockLeadModal (l'unico flusso di sblocco del prodotto). I contatti
 * arrivano solo dalla vista my_unlocked_contacts o dalla risposta dell'API
 * di sblocco: phone/email non sono selezionabili dal client sulla tabella leads.
 *
 * Le sezioni vivono in components/lead-detail/.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import UnlockLeadModal, { UnlockResult } from '@/components/leads/UnlockLeadModal'
import LeadHeader from '@/components/lead-detail/LeadHeader'
import LeadContacts from '@/components/lead-detail/LeadContacts'
import LeadPitch from '@/components/lead-detail/LeadPitch'
import LeadProblems from '@/components/lead-detail/LeadProblems'
import LeadTechnicalDetails from '@/components/lead-detail/LeadTechnicalDetails'
import LeadActions from '@/components/lead-detail/LeadActions'
import LeadLockedPreview from '@/components/lead-detail/LeadLockedPreview'
import LeadDigitalServices from '@/components/LeadDigitalServices'

interface LeadDetail {
  id: string
  business_name: string | null
  website_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  category: string | null
  score: number
  score_version?: number | null
  needed_roles?: string[]
  issues?: string[]
  website_analysis?: any
  analysis?: any
  origin?: 'scraping' | 'manual'
  confidence_score?: number
  status?: 'published' | 'quarantine'
  reachability_verdict?: string
  created_at: string
  last_seen_at: string
}

const LEAD_COLUMNS =
  'id, business_name, website_url, address, city, category, score, analysis, website_analysis, needed_roles, issues, origin, confidence_score, status, reachability_verdict, created_at, last_seen_at'

export default function LeadDetailPage() {
  const { user, refreshProfile } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUnlockModal, setShowUnlockModal] = useState(false)

  const isAdmin = user?.role === 'admin'
  const canViewFull = unlocked || isAdmin
  const creditsRemaining = user?.proposals_remaining ?? user?.credits_remaining ?? 0

  const loadLeadDetails = useCallback(async () => {
    try {
      setLoading(true)

      // Il lead è già stato sbloccato da questo utente?
      const { data: unlockedLeads, error: unlockedError } = await supabase.rpc(
        'get_user_unlocked_leads',
        { p_user_id: user?.id }
      )
      if (unlockedError) console.error('Errore verifica lead sbloccati:', unlockedError)
      const isAlreadyUnlocked = unlockedLeads?.some((ul: any) => ul.lead_id === leadId) === true

      // Colonne esplicite: phone/email NON sono leggibili dal client (paywall a
      // livello di colonna). score_version potrebbe non esistere ancora nel DB:
      // in quel caso ripiega sulla lista senza (getOpportunity assume v1).
      let { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select(`${LEAD_COLUMNS}, score_version`)
        .eq('id', leadId)
        .single()
      if (leadError) {
        ;({ data: leadData, error: leadError } = await supabase
          .from('leads')
          .select(LEAD_COLUMNS)
          .eq('id', leadId)
          .single())
      }
      if (leadError || !leadData) {
        setError('Lead non trovato')
        return
      }

      // Contatti: SOLO per i lead sbloccati, tramite la vista my_unlocked_contacts
      // (unico canale client-side autorizzato a leggere phone/email).
      let contacts: { phone?: string | null; email?: string | null } = {}
      if (isAlreadyUnlocked) {
        const { data: contactRow } = await supabase
          .from('my_unlocked_contacts')
          .select('phone, email')
          .eq('lead_id', leadId)
          .maybeSingle()
        contacts = contactRow || {}
      }

      setLead({
        ...(leadData as any),
        phone: contacts.phone ?? null,
        email: contacts.email ?? null
      })
      setUnlocked(isAlreadyUnlocked)
    } catch (err) {
      console.error('Errore caricamento lead:', err)
      setError('Errore nel caricamento del lead')
    } finally {
      setLoading(false)
    }
  }, [user?.id, leadId])

  useEffect(() => {
    if (user && leadId) loadLeadDetails()
  }, [user?.id, leadId, loadLeadDetails])

  const handleUnlocked = (result: UnlockResult) => {
    setLead(prev => (prev ? { ...prev, phone: result.phone, email: result.email } : prev))
    setUnlocked(true)
    refreshProfile()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento dettagli lead...</p>
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Errore</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Lead non trovato'}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Torna indietro
          </button>
        </div>
      </div>
    )
  }

  const analysis = lead.website_analysis || lead.analysis || null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <LeadHeader
          businessName={lead.business_name}
          city={lead.city}
          category={lead.category}
          score={lead.score}
          scoreVersion={lead.score_version}
          createdAt={lead.created_at}
          lastSeenAt={lead.last_seen_at}
          status={lead.status}
          unlocked={canViewFull}
          isAdmin={isAdmin}
          onBack={() => router.back()}
        />

        {canViewFull ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <LeadContacts
                leadId={lead.id}
                businessName={lead.business_name}
                phone={lead.phone}
                email={lead.email}
                websiteUrl={lead.website_url}
                address={lead.address}
                city={lead.city}
              />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <LeadPitch analysis={analysis} userServices={user?.services_offered} />
              <LeadProblems analysis={analysis} />
              <LeadTechnicalDetails analysis={analysis} />
              <LeadActions
                lead={{
                  id: lead.id,
                  business_name: lead.business_name,
                  website_url: lead.website_url,
                  phone: lead.phone,
                  email: lead.email,
                  city: lead.city,
                  category: lead.category,
                  score: lead.score,
                  website_analysis: lead.website_analysis,
                  analysis: lead.analysis
                }}
                userId={user?.id}
                userPlan={user?.plan || 'free'}
              />
              <LeadDigitalServices
                lead={{
                  id: lead.id,
                  business_name: lead.business_name || '',
                  city: lead.city || '',
                  category: lead.category || '',
                  website_url: lead.website_url || undefined,
                  analysis
                }}
              />
            </div>
          </div>
        ) : (
          <LeadLockedPreview
            category={lead.category}
            city={lead.city}
            onUnlock={() => setShowUnlockModal(true)}
          />
        )}
      </div>

      <UnlockLeadModal
        isOpen={showUnlockModal}
        lead={{
          id: lead.id,
          business_name: lead.business_name,
          city: lead.city,
          category: lead.category,
          score: lead.score,
          score_version: lead.score_version
        }}
        creditsRemaining={creditsRemaining}
        onClose={() => setShowUnlockModal(false)}
        onUnlocked={handleUnlocked}
      />
    </div>
  )
}
