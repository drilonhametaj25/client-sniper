// Questo file raccoglie le metriche di fine run del scraping engine
// È parte del modulo services/scraping-engine
// Singleton a livello di modulo: viene usato da scraping-job-runner (raccolta)
// e da index.ts (riepilogo finale + allarme rottura selettori).
// ⚠️ Aggiornare se si aggiungono nuovi contatori o si cambia il formato del summary

export interface ZoneMetricsEntry {
  zone: string
  found: number
  saved: number
}

export interface RunMetricsSummary {
  zonesProcessed: number
  zonesFailed: number
  businessesFound: number
  businessesWithWebsite: number
  leadsSaved: number
  leadsQuarantined: number
  saveErrors: number
  analysisFailures: number
  zones: ZoneMetricsEntry[]
}

export type CounterName =
  | 'zonesProcessed'
  | 'zonesFailed'
  | 'businessesFound'
  | 'businessesWithWebsite'
  | 'leadsSaved'
  | 'leadsQuarantined'
  | 'saveErrors'
  | 'analysisFailures'

// Stato singleton del run corrente
const state: RunMetricsSummary = createEmptyState()

function createEmptyState(): RunMetricsSummary {
  return {
    zonesProcessed: 0,
    zonesFailed: 0,
    businessesFound: 0,
    businessesWithWebsite: 0,
    leadsSaved: 0,
    leadsQuarantined: 0,
    saveErrors: 0,
    analysisFailures: 0,
    zones: []
  }
}

/**
 * Incrementa un contatore (default +1).
 */
export function increment(counter: CounterName, by: number = 1): void {
  state[counter] += by
}

/**
 * Registra il risultato di una zona processata (con successo).
 * Incrementa zonesProcessed e businessesFound, e aggiunge l'entry per-zona.
 */
export function recordZone(zone: string, found: number, saved: number): void {
  state.zonesProcessed += 1
  state.businessesFound += found
  state.zones.push({ zone, found, saved })
}

/**
 * Registra il risultato di un batch di salvataggi lead.
 */
export function recordSave(saved: number, errors: number, quarantined: number = 0): void {
  state.leadsSaved += saved
  state.saveErrors += errors
  state.leadsQuarantined += quarantined
}

/**
 * Ritorna una copia del riepilogo corrente.
 */
export function getSummary(): RunMetricsSummary {
  return { ...state, zones: state.zones.map(z => ({ ...z })) }
}

/**
 * Azzera le metriche (usato all'inizio di ogni run, utile in modalità cron
 * dove lo stesso processo esegue più cicli).
 */
export function reset(): void {
  Object.assign(state, createEmptyState())
}
