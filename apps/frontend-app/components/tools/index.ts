/**
 * Primitive dei tool pubblici — punto d'ingresso unico.
 *
 * Percorso: apps/frontend-app/components/tools/index.ts
 * Guida: apps/frontend-app/DESIGN.md
 *
 *   import { ToolPageHeader, ToolUrlForm, ToolScore } from '@/components/tools'
 *
 * Coprono l'anatomia comune alle sei pagine di /tools: intestazione, form URL,
 * contatore, attesa, punteggio, elenco dei controlli, invito a registrarsi e
 * rimandi agli altri tool. Quello che è specifico di un tool (elenco delle
 * tecnologie, criteri WCAG, header HTTP) resta nella sua pagina.
 *
 * Le primitive di base (Button, Card, Badge, Input, ...) restano in
 * '@/components/ui': queste ci stanno sopra, non le sostituiscono.
 */

export { default as ToolPageHeader, ToolUsageNote } from './ToolPageHeader'
export type { ToolPageHeaderProps, ToolUsageNoteProps, ToolUsage } from './ToolPageHeader'

export { default as ToolUrlForm } from './ToolUrlForm'
export type { ToolUrlFormProps } from './ToolUrlForm'

export { default as ToolScore, toolScoreVerdict } from './ToolScore'
export type { ToolScoreProps } from './ToolScore'

export { default as ToolCheckList, ToolCheckRow } from './ToolCheckList'
export type { ToolCheckListProps, ToolCheckRowProps, ToolCheckItem } from './ToolCheckList'

export {
  default as ToolStatusLabel,
  TOOL_STATUS_META,
  TOOL_TONE_TEXT,
  TOOL_TONE_DOT,
} from './ToolStatusLabel'
export type { ToolStatusLabelProps, ToolCheckStatus, ToolTone } from './ToolStatusLabel'

export { default as ToolSummaryStats } from './ToolSummaryStats'
export type { ToolSummaryStatsProps, ToolStat } from './ToolSummaryStats'

export { default as ToolStatusMessage } from './ToolStatusMessage'
export type { ToolStatusMessageProps, ToolMessageTone } from './ToolStatusMessage'

export { default as ToolLoadingState } from './ToolLoadingState'
export type { ToolLoadingStateProps } from './ToolLoadingState'

export { default as ToolResultPanel } from './ToolResultPanel'
export type { ToolResultPanelProps } from './ToolResultPanel'

export { default as ToolSignupCta } from './ToolSignupCta'
export type { ToolSignupCtaProps } from './ToolSignupCta'

export { default as ToolsCrossLinks } from './ToolsCrossLinks'
export type { ToolsCrossLinksProps } from './ToolsCrossLinks'

export { TOOLS, getTool, publicTools } from './catalog'
export type { ToolEntry, ToolSlug } from './catalog'
