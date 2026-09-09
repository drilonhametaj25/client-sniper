/**
 * Pagina dettaglio lead — un dossier, non un cruscotto.
 *
 * Regola fondamentale: GUARDARE questa pagina non consuma mai crediti.
 * Se il lead non è sbloccato mostra già il quadro (attività, problema
 * principale, cosa gli si può vendere e quanto vale) e tiene nascosti solo nome
 * e contatti, con la CTA che apre UnlockLeadModal (l'unico flusso di sblocco del
 * prodotto). I contatti arrivano solo dalla vista my_unlocked_contacts o dalla
 * risposta dell'API di sblocco: phone/email non sono selezionabili dal client
 * sulla tabella leads.
 *
 * Ordine della vista sbloccata: prima quello che ha comprato (i contatti), poi
 * il lavoro che ci può fare, poi i problemi, poi gli strumenti. Il gergo sta in
 * fondo, dentro i dettagli tecnici chiusi.
 *
 * Le sezioni vivono in components/lead-detail/.
 */

'use client'

import { ReactNode, useCallback, useEffect, useState } from 'react'
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
import ReportLeadIssueButton from '@/components/ReportLeadIssueButton'
import { Button, EmptyState, Skeleton, SkeletonCard } from '@/components/ui'

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

/** Colonna di lettura: un dossier si legge in una colonna sola. */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">{children}</div>
    </div>
  )
}

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
    // Lo scheletro ha la forma del dossier: intestazione + due blocchi.
    return (
      <PageShell>
        <div role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Caricamento del lead in corso</span>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-6 h-7 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-8 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </PageShell>
    )
  }

  if (error || !lead) {
    return (
      <PageShell>
        <EmptyState
          icon={<AlertTriangle />}
          title={error || 'Lead non trovato'}
          description="Il lead potrebbe essere stato rimosso oppure il link non è più valido."
          action={
            <Button variant="secondary" onClick={() => router.back()}>
              Torna indietro
            </Button>
          }
        />
      </PageShell>
    )
  }

  const analysis = lead.website_analysis || lead.analysis || null

  return (
    <PageShell>
      <LeadHeader
        businessName={lead.business_name}
        city={lead.city}
        category={lead.category}
        score={lead.score}
        scoreVersion={lead.score_version}
        createdAt={lead.created_at}
        lastSeenAt={lead.last_seen_at}
        status={lead.status}
        analysis={analysis}
        unlocked={canViewFull}
        isAdmin={isAdmin}
        onBack={() => router.back()}
      />

      <div className="mt-8 space-y-6">
        {canViewFull ? (
          <>
            {/* Prima quello che ha comprato */}
            <LeadContacts
              leadId={lead.id}
              businessName={lead.business_name}
              phone={lead.phone}
              email={lead.email}
              websiteUrl={lead.website_url}
              address={lead.address}
              city={lead.city}
            />

            <LeadPitch analysis={analysis} userServices={user?.services_offered} />
            <LeadProblems analysis={analysis} />

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

            <LeadTechnicalDetails
              analysis={analysis}
              score={lead.score}
              scoreVersion={lead.score_version}
            />

            {/* Segnalazione dati errati: alimenta la quarantena automatica */}
            <div className="flex justify-center pt-2">
              <ReportLeadIssueButton leadId={lead.id} />
            </div>
          </>
        ) : (
          <>
            {/* Bloccato: il valore si vede, il contatto no */}
            <LeadPitch analysis={analysis} userServices={user?.services_offered} />
            <LeadLockedPreview
              analysis={analysis}
              creditsRemaining={creditsRemaining}
              onUnlock={() => setShowUnlockModal(true)}
            />
          </>
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
    </PageShell>
  )
}
