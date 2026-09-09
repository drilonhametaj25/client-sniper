/**
 * AccountStatusBar — quanto ti resta, detto in una riga.
 *
 * Percorso: apps/frontend-app/components/AccountStatusBar.tsx
 * Guida: apps/frontend-app/DESIGN.md
 *
 * Nella dashboard il soggetto sono i lead, non l'account: questa barra deve
 * arretrare. Una frase leggibile ("18 crediti rimasti su 25"), una riga di
 * contesto piccola e grigia (piano + rinnovo), una barra sottile e un link
 * quieto ai piani. Nessun badge colorato, nessun gradiente.
 *
 * Varianti:
 * - full     riga senza cornice, dentro l'intestazione di pagina (dashboard)
 * - compact  numero + barra corta (header, pannelli)
 * - minimal  solo il numero (menu, liste dense)
 *
 * "Illimitato" lo decide il DB (credits_remaining === -1), NON il nome del
 * piano: in produzione Agency e' un piano a 300 crediti/mese.
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getBasePlanType } from '@/lib/utils/plan-helpers'

interface AccountStatusBarProps {
  className?: string
  showUpgradeButton?: boolean
  variant?: 'full' | 'compact' | 'minimal'
}

export default function AccountStatusBar({
  className = '',
  showUpgradeButton = true,
  variant = 'full'
}: AccountStatusBarProps) {
  const { user } = useAuth()

  if (!user) return null

  // Estrai dati dal profilo utente (cast per accedere ai nuovi campi)
  const userAny = user as any
  const plan = userAny.plan || 'free'
  const proposalsRemaining = userAny.proposals_remaining ?? userAny.credits_remaining ?? 0
  const proposalsResetDate = userAny.proposals_reset_date
  const isFirstProposalAvailable = userAny.first_proposal_used === false

  const planConfig = getPlanConfig(plan)
  const isUnlimited = proposalsRemaining === -1
  const maxProposals = planConfig.maxProposals
  const resetType = planConfig.resetType

  // Percentuale ancora disponibile (la barra mostra quello che RESTA)
  const usedPercentage = isUnlimited
    ? 0
    : maxProposals > 0
      ? Math.round(((maxProposals - proposalsRemaining) / maxProposals) * 100)
      : 0

  const daysToReset = proposalsResetDate
    ? Math.max(0, Math.ceil((new Date(proposalsResetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const isLow = !isUnlimited && proposalsRemaining <= 3 && proposalsRemaining > 0
  const isDepleted = !isUnlimited && proposalsRemaining <= 0

  // Il colore dice solo lo stato, e sempre insieme a una parola
  const textTone = isFirstProposalAvailable
    ? 'text-content'
    : isDepleted
      ? 'text-danger'
      : isLow
        ? 'text-warning'
        : 'text-content'
  const barTone = isDepleted ? 'bg-danger' : isLow ? 'bg-warning' : 'bg-accent'
  const showBar = !isUnlimited && maxProposals > 0

  // ---- minimal: solo il numero ------------------------------------------
  if (variant === 'minimal') {
    return (
      <span className={cn('inline-flex items-center text-caption', className)}>
        {isUnlimited ? (
          <span className="text-content-muted">Crediti illimitati</span>
        ) : (
          <span className={textTone}>
            <span className="tabular-nums font-medium">{proposalsRemaining}</span> crediti
          </span>
        )}
      </span>
    )
  }

  // ---- compact: numero + barra corta -------------------------------------
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {isUnlimited ? (
          <span className="text-caption text-content-muted">Crediti illimitati</span>
        ) : (
          <>
            <span className={cn('text-caption tabular-nums', textTone)}>
              {proposalsRemaining}/{maxProposals}
            </span>
            {showBar && (
              <div
                className="h-1 w-16 overflow-hidden rounded-pill bg-surface-subtle"
                role="img"
                aria-label={`${proposalsRemaining} crediti disponibili su ${maxProposals}`}
              >
                <div className={cn('h-full rounded-pill', barTone)} style={{ width: `${100 - usedPercentage}%` }} />
              </div>
            )}
          </>
        )}

        {showUpgradeButton && !isUnlimited && (
          <Link
            href="/upgrade"
            className="focus-ring rounded-md text-caption text-accent-ink hover:underline"
          >
            Aggiorna piano
          </Link>
        )}
      </div>
    )
  }

  // ---- full: una riga sola, senza cornice --------------------------------
  // Nessuna card: in dashboard le card sono i LEAD. Lo stato dell'account e'
  // parte dell'intestazione di pagina, e la frase basta a se stessa (la barra
  // di avanzamento ripeteva un'informazione che il testo gia' dice).
  const context = [
    planConfig.label,
    !isUnlimited && resetType !== 'never' && daysToReset !== null
      ? daysToReset === 0
        ? 'si rinnova oggi'
        : `si rinnova tra ${daysToReset} ${daysToReset === 1 ? 'giorno' : 'giorni'}`
      : null
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-1', className)}>
      <div className="min-w-0">
        <p className={cn('text-body', textTone)}>
          {getStatusMessage(
            proposalsRemaining,
            maxProposals,
            isUnlimited,
            resetType,
            isFirstProposalAvailable
          )}
        </p>
        <p className="mt-0.5 text-caption text-content-subtle">{context}</p>
      </div>

      {showUpgradeButton && !isUnlimited && (
        <Link
          href="/upgrade"
          className={cn(
            'focus-ring -mr-2 inline-flex min-h-control items-center gap-1 rounded-control px-2',
            'text-caption transition-colors duration-fast ease-soft hover:bg-surface-subtle',
            isDepleted || isLow ? 'text-accent-ink' : 'text-content-muted hover:text-content'
          )}
        >
          {isDepleted ? 'Ottieni più crediti' : 'Vedi i piani'}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

// Helper: Configurazione piano.
// Usa getBasePlanType: i nomi reali sono free/starter_monthly/starter_annual/
// pro_monthly/pro_annual/agency_monthly/agency_annual (prima i Pro paganti e i
// nomi non mappati finivano nel fallback "Piano Free").
function getPlanConfig(plan: string): {
  label: string
  maxProposals: number
  isUnlimited: boolean
  resetType: 'weekly' | 'monthly' | 'never'
} {
  const base = getBasePlanType(plan)
  const annualSuffix = plan.includes('_annual') ? ' (annuale)' : ''

  switch (base) {
    case 'starter':
      return { label: `Piano Starter${annualSuffix}`, maxProposals: 25, isUnlimited: false, resetType: 'monthly' }
    case 'pro':
      return { label: `Piano Pro${annualSuffix}`, maxProposals: 100, isUnlimited: false, resetType: 'monthly' }
    case 'agency':
      return { label: `Piano Agency${annualSuffix}`, maxProposals: 300, isUnlimited: false, resetType: 'monthly' }
    default:
      return { label: 'Piano Free', maxProposals: 1, isUnlimited: false, resetType: 'never' }
  }
}

// Helper: la frase che l'utente legge. Stesse soglie di prima, italiano più
// calmo (niente punti esclamativi, niente maiuscole urlate).
function getStatusMessage(
  remaining: number,
  max: number,
  isUnlimited: boolean,
  resetType: string,
  isFirstProposalAvailable: boolean
): string {
  if (isUnlimited) {
    return 'Crediti illimitati'
  }

  if (isFirstProposalAvailable) {
    return 'Il tuo primo sblocco è gratuito'
  }

  if (remaining <= 0) {
    return resetType === 'never'
      ? 'Credito di prova esaurito'
      : 'Crediti esauriti per questo mese'
  }

  if (remaining === 1) {
    return resetType === 'never'
      ? '1 credito di prova disponibile'
      : '1 credito rimasto questo mese'
  }

  return resetType === 'never'
    ? `${remaining} crediti di prova disponibili`
    : `${remaining} crediti rimasti su ${max}`
}
