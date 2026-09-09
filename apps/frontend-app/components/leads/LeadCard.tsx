/**
 * LeadCard — LA card lead della dashboard (layout lista, una colonna).
 *
 * La card deve rispondere in due secondi a tre domande:
 *   CHE COS'E'      → "Ristorante a Bergamo" (occhiello, piccolo e grigio)
 *   PERCHE' VALE    → il problema principale in italiano, ed e' la cosa piu'
 *                     grande della card (il punteggio NON e' il protagonista:
 *                     compare come una parola + un numero piccolo)
 *   PERCHE' ORA     → freschezza onesta ("Mai sbloccato" / "Sbloccato da N")
 *
 * Bloccato: nome azienda e contatti restano nascosti — e' quello che si compra.
 * Sbloccato: nome attivita', contatti, stato CRM (Starter+) e "Apri dettaglio".
 *
 * Il blu pieno in questa schermata significa UNA cosa sola: "costa un credito".
 * Per questo "Apri dettaglio" (gratis) e' un bottone secondario.
 *
 * Usato da: app/dashboard/page.tsx (lo sblocco passa da UnlockLeadModal).
 */

'use client'

import { ExternalLink, Phone, Mail, ArrowRight, Check, Lightbulb } from 'lucide-react'
import { Badge, Button, Card, Select } from '@/components/ui'
import { cn } from '@/lib/utils/cn'
import { getOpportunity, type Opportunity } from '@/lib/utils/opportunity'
import { translateCategory } from '@/lib/utils/categories'
import { getDomain, getTimeAgo } from '@/lib/utils/lead-card-helpers'
import {
  extractProblemKeysFromAnalysis,
  getMainProblem,
  translateProblems
} from '@/lib/utils/problem-translator'
import { detectServices } from '@/lib/utils/service-detection'
import { calculateMatch } from '@/lib/utils/match-calculation'
import type { ServiceType } from '@/lib/types/services'
import type { DashboardLead } from '@/lib/hooks/useLeads'
import type { CRMStatusType } from '@/lib/types/crm'

const CRM_QUICK_OPTIONS: Array<{ value: CRMStatusType; label: string }> = [
  { value: 'new', label: 'Nuovo' },
  { value: 'contacted', label: 'Contattato' },
  { value: 'in_negotiation', label: 'In trattativa' },
  { value: 'won', label: 'Vinto' },
  { value: 'lost', label: 'Perso' }
]

/**
 * Etichette di presentazione dei servizi, in italiano corrente.
 * La semantica resta in lib/types/services.ts: qui si traduce solo per la frase
 * di match ("Cerca sito nuovo e SEO: li offri entrambi").
 */
const SERVICE_PHRASES: Record<ServiceType, string> = {
  seo: 'SEO',
  gdpr: 'privacy e GDPR',
  analytics: 'tracciamento delle visite',
  mobile: 'versione mobile',
  performance: 'velocità del sito',
  development: 'un sito nuovo',
  design: 'restyling grafico',
  social: 'presenza social'
}

/** "a, b e c" — elenco italiano, massimo 3 voci poi "e altri N". */
function joinServices(services: ServiceType[]): string {
  const shown = services.slice(0, 3).map(service => SERVICE_PHRASES[service]).filter(Boolean)
  const rest = services.length - shown.length
  let list =
    shown.length > 1
      ? `${shown.slice(0, -1).join(', ')} e ${shown[shown.length - 1]}`
      : shown[0] ?? ''
  if (rest > 0) list += ` e altri ${rest}`
  return list
}

/** Il match coi servizi dell'utente diventa una frase, mai una percentuale. */
function buildMatchSentence(matched: ServiceType[]): string | null {
  if (matched.length === 0) return null
  const list = joinServices(matched)
  if (!list) return null
  if (matched.length === 1) return `Cerca ${list}: è un servizio che offri.`
  if (matched.length === 2) return `Cerca ${list}: li offri entrambi.`
  return `Cerca ${list}: sono servizi che offri.`
}

/** Il colore e' solo un pallino di stato: la parola resta l'informazione. */
function opportunityDot(opportunity: Opportunity): string {
  if (opportunity.label === 'Opportunità alta') return 'bg-success'
  if (opportunity.label === 'Opportunità media') return 'bg-warning'
  return 'bg-content-subtle'
}

export interface LeadCardProps {
  lead: DashboardLead
  /** servizi offerti dall'utente, per la frase di match */
  userServices?: ServiceType[]
  onUnlock: (lead: DashboardLead) => void
  onOpenDetail: (lead: DashboardLead) => void
  /** quick-update stato CRM (Starter+); se assente il selettore non appare */
  onQuickStatus?: (leadId: string, status: CRMStatusType) => void
  /** true mentre l'update CRM di QUESTO lead è in corso */
  isUpdatingStatus?: boolean
  className?: string
}

export default function LeadCard({
  lead,
  userServices = [],
  onUnlock,
  onOpenDetail,
  onQuickStatus,
  isUpdatingStatus = false,
  className = ''
}: LeadCardProps) {
  const unlocked = lead.is_unlocked === true
  const opportunity = getOpportunity(lead.score, lead.score_version)
  const categoryLabel = translateCategory(lead.category || '')
  const analysis = lead.website_analysis || lead.analysis

  // === PERCHE' VALE: il problema principale, in italiano ===
  const problemKeys = extractProblemKeysFromAnalysis(analysis)
  const problems = translateProblems(problemKeys)
  const mainProblem = getMainProblem(problemKeys)
  const otherProblems = Math.max(0, problems.length - 1)

  const headline = mainProblem
    ? otherProblems > 1
      ? `${mainProblem.title}, e altri ${otherProblems} problemi da sistemare`
      : otherProblems === 1
        ? `${mainProblem.title}, e un altro problema da sistemare`
        : mainProblem.title
    : 'Nessun problema grave sul sito'

  // === Match coi servizi dell'utente: il segnale piu' forte che abbiamo ===
  const matchResult =
    userServices.length > 0 ? calculateMatch(detectServices(analysis), userServices) : null
  const matchSentence = matchResult ? buildMatchSentence(matchResult.matchedServices) : null

  // === CHE COS'E': categoria + citta', mai il nome finche' e' bloccato ===
  // translateCategory ha già il suo fallback ("Attività locale")
  const identity = lead.city ? `${categoryLabel} a ${lead.city}` : categoryLabel

  // === PERCHE' ORA: freschezza onesta, il pool e' condiviso e lo diciamo ===
  const unlockCount = lead.global_unlock_count ?? 0
  const freshness =
    unlockCount === 0
      ? 'Mai sbloccato'
      : `Sbloccato da ${unlockCount} ${unlockCount === 1 ? 'persona' : 'persone'}`

  // Cosa si compra con il credito
  const contactsPreview =
    lead.has_phone && lead.has_email
      ? 'Telefono ed email'
      : lead.has_phone
        ? 'Telefono'
        : lead.has_email
          ? 'Email'
          : 'Nome e sito'

  const websiteHref = lead.website_url
    ? lead.website_url.startsWith('http')
      ? lead.website_url
      : `https://${lead.website_url}`
    : null

  const linkClass =
    'focus-ring inline-flex max-w-full items-center gap-1.5 rounded-md py-0.5 text-caption ' +
    'text-content transition-colors duration-fast ease-soft hover:text-accent-ink'

  return (
    <Card padding="none" className={cn('p-5 sm:p-6', className)}>
      {/* Riga 1 — chi e', e quanto vale (piccolo, mai protagonista) */}
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-caption text-content-subtle">{identity}</p>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-caption text-content-muted">
          <span className={cn('h-1.5 w-1.5 rounded-pill', opportunityDot(opportunity))} aria-hidden="true" />
          {opportunity.label}
          <span className="tabular-nums text-content-subtle">
            {opportunity.value}
            <span className="sr-only"> su 100</span>
          </span>
        </span>
      </div>

      {/* Riga 2 — il soggetto della card */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-heading font-semibold text-content">
          {unlocked ? lead.business_name || categoryLabel : headline}
        </h3>
        {unlocked && (
          <Badge variant="success" size="sm" className="shrink-0">
            Sbloccato
          </Badge>
        )}
      </div>

      {/* Riga 3 — la spiegazione. Sbloccato: il problema arretra a una riga. */}
      {unlocked ? (
        <p className="mt-1 line-clamp-1 text-body text-content-muted">{headline}</p>
      ) : (
        mainProblem && (
          <p className="mt-1.5 line-clamp-2 text-body text-content-muted">
            {mainProblem.description}
          </p>
        )
      )}

      {/* Riga 4 — cosa puoi vendergli: il match se c'e', altrimenti la soluzione */}
      {matchSentence ? (
        <p className="mt-3 flex items-start gap-2 text-caption text-content">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
          <span className="line-clamp-2">{matchSentence}</span>
        </p>
      ) : (
        mainProblem && (
          <p className="mt-3 flex items-start gap-2 text-caption text-content-muted">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
            <span className="line-clamp-2">Puoi proporgli: {mainProblem.solution}</span>
          </p>
        )
      )}

      {/* Contatti — solo quando sono stati comprati */}
      {unlocked && (lead.phone || lead.email || websiteHref) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className={linkClass}>
              <Phone className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
              <span className="truncate">{lead.phone}</span>
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className={linkClass}>
              <Mail className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
              <span className="truncate">{lead.email}</span>
            </a>
          )}
          {websiteHref && (
            <a href={websiteHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <ExternalLink className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden="true" />
              <span className="truncate">{getDomain(lead.website_url!)}</span>
            </a>
          )}
        </div>
      )}

      {/* Piede — informazione onesta a sinistra, azione a destra */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-caption text-content-subtle">
          {freshness}
          {lead.created_at && <> · Trovato {getTimeAgo(lead.created_at)}</>}
        </p>

        <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
          {unlocked ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {onQuickStatus && lead.crm_status && (
                <div className="w-[9.5rem] sm:w-44">
                  <Select
                    aria-label="Stato nel CRM"
                    variant="filled"
                    value={lead.crm_status}
                    disabled={isUpdatingStatus}
                    onChange={(e) => onQuickStatus(lead.id, e.target.value as CRMStatusType)}
                    className="text-caption"
                  >
                    {CRM_QUICK_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <Button
                variant="secondary"
                onClick={() => onOpenDetail(lead)}
                icon={<ArrowRight />}
                iconPosition="right"
              >
                Apri dettaglio
              </Button>
            </div>
          ) : (
            <>
              <Button onClick={() => onUnlock(lead)} className="w-full sm:w-auto">
                Sblocca · 1 credito
              </Button>
              <span className="text-micro text-content-subtle sm:text-right">{contactsPreview}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
