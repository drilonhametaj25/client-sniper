/**
 * LeadActions — cosa fai adesso con questo lead.
 *
 * Stato trattativa CRM (vocabolario di lib/types/crm.ts, salvato via
 * /api/crm/quick-update), scrittura dell'email (EmailComposerModal), template di
 * primo contatto (ContactTemplates) e preventivo automatico (QuotationTab).
 * "Scrivi email" è l'unica azione piena della schermata sbloccata.
 *
 * La segnalazione dati errati vive in fondo alla pagina (app/lead/[id]/page.tsx):
 * è un ripensamento, non un'azione commerciale.
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { CRMStatusType, CRM_STATUS_CONFIG } from '@/lib/types/crm'
import ContactTemplates from '@/components/ContactTemplates'
import EmailComposerModal from '@/components/EmailComposerModal'
import QuotationTab from '@/components/QuotationTab'
import { Button, Card, CardTitle, Select } from '@/components/ui'

interface LeadActionsProps {
  lead: {
    id: string
    business_name?: string | null
    website_url?: string | null
    phone?: string | null
    email?: string | null
    city?: string | null
    category?: string | null
    score: number
    website_analysis?: any
    analysis?: any
  }
  userId?: string
  userPlan: string
}

/** Mappa gli stati salvati in crm_entries verso il vocabolario UI del CRM. */
const DB_TO_UI_STATUS: Record<string, CRMStatusType> = {
  to_contact: 'new',
  follow_up: 'contacted',
  in_negotiation: 'in_negotiation',
  closed_positive: 'won',
  closed_negative: 'lost'
}

const STATUS_OPTIONS = (Object.keys(CRM_STATUS_CONFIG) as CRMStatusType[]).map(status => ({
  value: status,
  label: CRM_STATUS_CONFIG[status].label
}))

export default function LeadActions({ lead, userId, userPlan }: LeadActionsProps) {
  const { success, error: toastError } = useToast()
  const [crmStatus, setCrmStatus] = useState<CRMStatusType | ''>('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('crm_entries')
      .select('status')
      .eq('lead_id', lead.id)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.status && DB_TO_UI_STATUS[data.status]) {
          setCrmStatus(DB_TO_UI_STATUS[data.status])
        }
      })
    return () => {
      cancelled = true
    }
  }, [lead.id, userId])

  const updateCrmStatus = async (newStatus: CRMStatusType) => {
    setSavingStatus(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        toastError('Sessione scaduta', 'Effettua nuovamente il login.')
        return
      }
      const response = await fetch('/api/crm/quick-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: lead.id,
          status: newStatus,
          notes: `Stato aggiornato dalla pagina dettaglio lead a ${newStatus}`
        })
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        toastError('Aggiornamento non riuscito', result.error || 'Riprova tra qualche istante.')
        return
      }
      setCrmStatus(newStatus)
      success('Stato aggiornato', CRM_STATUS_CONFIG[newStatus].label)
    } catch (err) {
      console.error('Errore aggiornamento stato CRM:', err)
      toastError('Errore di rete', 'Controlla la connessione e riprova.')
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stato trattativa CRM + l'unica azione piena della pagina */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>La tua trattativa</CardTitle>
            <p className="mt-1 text-body text-content-muted">
              Segna a che punto sei: lo ritrovi nel CRM insieme agli altri lead.
            </p>
          </div>

          {lead.email && (
            <Button icon={<Send />} onClick={() => setShowEmailModal(true)}>
              Scrivi email
            </Button>
          )}
        </div>

        <div className="mt-5 sm:max-w-xs">
          <Select
            aria-label="Stato della trattativa"
            value={crmStatus}
            onChange={e => updateCrmStatus(e.target.value as CRMStatusType)}
            disabled={savingStatus}
            placeholder="Imposta uno stato"
            options={STATUS_OPTIONS}
            hint={crmStatus ? CRM_STATUS_CONFIG[crmStatus].description : undefined}
          />
        </div>
      </Card>

      {/* Template di primo contatto (email, WhatsApp, telefono, LinkedIn) */}
      <ContactTemplates
        lead={{
          id: lead.id,
          business_name: lead.business_name || undefined,
          website_url: lead.website_url || undefined,
          city: lead.city || undefined,
          category: lead.category || undefined,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          score: lead.score,
          analysis: lead.analysis,
          website_analysis: lead.website_analysis
        }}
        userPlan={userPlan}
      />

      {/* Preventivo automatico */}
      <Card>
        <CardTitle>Preventivo automatico</CardTitle>
        <div className="mt-4">
          <QuotationTab leadId={lead.id} businessName={lead.business_name || ''} />
        </div>
      </Card>

      {showEmailModal && lead.email && (
        <EmailComposerModal
          isOpen={showEmailModal}
          lead={{
            id: lead.id,
            business_name: lead.business_name || '',
            email: lead.email,
            website_url: lead.website_url || '',
            city: lead.city || undefined,
            category: lead.category || undefined,
            score: lead.score,
            website_analysis: lead.website_analysis,
            analysis: lead.analysis
          }}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  )
}
