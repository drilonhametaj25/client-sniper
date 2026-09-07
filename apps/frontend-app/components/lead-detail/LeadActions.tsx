/**
 * LeadActions — Azioni commerciali sul lead (solo per lead sbloccati).
 *
 * Stato trattativa CRM (vocabolario di lib/types/crm.ts, salvato via
 * /api/crm/quick-update), template di primo contatto (ContactTemplates),
 * composer email (EmailComposerModal), preventivo automatico (QuotationTab)
 * e segnalazione dati errati (ReportLeadIssueButton).
 *
 * Usato da: app/lead/[id]/page.tsx (solo vista sbloccata)
 */

'use client'

import { useEffect, useState } from 'react'
import { Briefcase, Euro, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ToastProvider'
import { CRMStatusType, CRM_STATUS_CONFIG } from '@/lib/types/crm'
import ContactTemplates from '@/components/ContactTemplates'
import EmailComposerModal from '@/components/EmailComposerModal'
import QuotationTab from '@/components/QuotationTab'
import ReportLeadIssueButton from '@/components/ReportLeadIssueButton'

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
      {/* Stato trattativa CRM */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Briefcase className="h-5 w-5 mr-2 text-purple-500" />
          Stato trattativa
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={crmStatus}
            onChange={e => updateCrmStatus(e.target.value as CRMStatusType)}
            disabled={savingStatus}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm disabled:opacity-50"
          >
            <option value="" disabled>
              Imposta uno stato
            </option>
            {(Object.keys(CRM_STATUS_CONFIG) as CRMStatusType[]).map(status => (
              <option key={status} value={status}>
                {CRM_STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>
          {crmStatus && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CRM_STATUS_CONFIG[crmStatus].color}`}>
              {CRM_STATUS_CONFIG[crmStatus].description}
            </span>
          )}
          {lead.email && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4 w-4" />
              Scrivi email
            </button>
          )}
        </div>
      </section>

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
      <section className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Euro className="h-5 w-5 mr-2 text-green-600" />
          Preventivo automatico
        </h2>
        <QuotationTab leadId={lead.id} businessName={lead.business_name || ''} />
      </section>

      {/* Segnalazione dati errati: alimenta la quarantena automatica */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
        <ReportLeadIssueButton leadId={lead.id} />
      </div>

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
