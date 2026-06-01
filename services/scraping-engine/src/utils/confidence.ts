/**
 * Modello di Confidenza dei segnali di analisi
 *
 * Principio guida del prodotto: "fiducia prima del volume".
 * Ogni segnale tecnico (es. "manca il title", "nessun tracking", "sito offline")
 * non è più un booleano assoluto, ma porta con sé un livello di confidenza:
 *   - confirmed     -> abbiamo prove dirette (es. richiesta di rete intercettata)
 *   - suspected     -> indizi deboli, potrebbe essere un falso positivo
 *   - unverifiable  -> non siamo riusciti a verificare (rendering JS fallito, iframe cross-origin, ecc.)
 *
 * Solo i difetti `confirmed` vengono trattati come reali quando decidiamo se
 * pubblicare un lead o metterlo in quarantena (nascosto agli utenti).
 *
 * Questo modulo si integra con AnalysisReliability (vedi types/LeadAnalysis.ts):
 * AnalysisReliability descrive l'affidabilità dell'INTERA analisi, mentre qui
 * descriviamo la confidenza del SINGOLO segnale e calcoliamo la decisione finale
 * di pubblicazione del lead.
 *
 * Parte del modulo services/scraping-engine.
 */

export type SignalConfidence = 'confirmed' | 'suspected' | 'unverifiable'

/**
 * Un valore osservato insieme alla confidenza con cui lo abbiamo osservato.
 * `evidence` è una breve descrizione leggibile del perché abbiamo questa confidenza
 * (utile per debug, audit e per mostrare "perché" all'utente).
 */
export interface Signal<T> {
  value: T
  confidence: SignalConfidence
  evidence?: string
}

/**
 * Verdetto sulla raggiungibilità del sito.
 * Distinguiamo l'assenza CERTA dall'assenza SOSPETTA: un timeout non significa
 * che il sito non esista, significa solo che non siamo riusciti a raggiungerlo ora.
 */
export type ReachabilityVerdict =
  | 'online'              // il sito risponde
  | 'offline_confirmed'   // DNS non risolve o connessione rifiutata in modo ripetuto -> sito davvero assente
  | 'offline_suspected'   // timeout/reset ripetuti -> potrebbe essere vivo ma lento/protetto
  | 'uncertain'           // un singolo errore transitorio non confermato -> va ri-verificato

/**
 * Decisione finale a livello di lead: lo pubblichiamo o lo mettiamo in quarantena?
 * I lead in quarantena NON vengono mostrati agli utenti (scelta: "nascosti del tutto").
 */
export interface LeadConfidenceDecision {
  score: number                          // 0-100, confidenza complessiva sui dati del lead
  status: 'published' | 'quarantine'
  reasons: string[]                      // motivi della quarantena / incertezze rilevate
  needsRecheck: boolean                  // true se va ri-analizzato (es. raggiungibilità incerta)
}

// --- Costruttori comodi -----------------------------------------------------

export function signal<T>(value: T, confidence: SignalConfidence, evidence?: string): Signal<T> {
  return { value, confidence, evidence }
}

export const confirmed = <T>(value: T, evidence?: string): Signal<T> =>
  signal(value, 'confirmed', evidence)

export const suspected = <T>(value: T, evidence?: string): Signal<T> =>
  signal(value, 'suspected', evidence)

export const unverifiable = <T>(value: T, evidence?: string): Signal<T> =>
  signal(value, 'unverifiable', evidence)

// --- Logica di difetto ------------------------------------------------------

/**
 * Un difetto (es. "manca il tracking") conta come REALE solo se è confermato.
 * Un difetto solo "suspected" o "unverifiable" NON deve abbassare lo score del
 * lead né essere mostrato come problema certo: è qui che nascevano i falsi positivi.
 *
 * @param defectSignal segnale dove value=true significa "il difetto è presente"
 */
export function isConfirmedDefect(defectSignal: Signal<boolean>): boolean {
  return defectSignal.value === true && defectSignal.confidence === 'confirmed'
}

/** Soglia minima di confidenza per pubblicare un lead. Sotto questa -> quarantena. */
export const PUBLISH_CONFIDENCE_THRESHOLD = 60

/** Peso (penalità in punti di confidenza) per ciascun tipo di incertezza. */
const CONFIDENCE_PENALTIES = {
  reachabilityUncertain: 45,        // non sappiamo se il sito è davvero giù
  reachabilitySuspectedOffline: 35, // pensiamo sia giù ma non è confermato
  websiteOwnershipUnverified: 30,   // il sito non sembra appartenere all'azienda
  noContactData: 20,                // nessun contatto utile (telefono/email)
  contactDataSuspected: 15,         // contatti estratti con bassa affidabilità
  manyUnverifiableSignals: 15,      // troppi segnali tecnici non verificabili
} as const

/**
 * Calcola la decisione di pubblicazione di un lead a partire dagli indicatori
 * di affidabilità raccolti durante l'analisi e l'estrazione contatti.
 *
 * Tutti gli input sono opzionali: ciò che non viene passato non penalizza.
 */
export function decideLeadPublication(input: {
  reachability?: ReachabilityVerdict
  websiteOwnershipVerified?: boolean | null // null = non applicabile (es. nessun sito)
  hasReliableContact?: boolean
  hasSuspectedContact?: boolean
  unverifiableSignalsCount?: number
}): LeadConfidenceDecision {
  let score = 100
  const reasons: string[] = []
  let needsRecheck = false

  // 1) Raggiungibilità: è la causa principale dei falsi "sito assente".
  switch (input.reachability) {
    case 'uncertain':
      score -= CONFIDENCE_PENALTIES.reachabilityUncertain
      reasons.push('Raggiungibilità del sito incerta (errore transitorio non confermato)')
      needsRecheck = true
      break
    case 'offline_suspected':
      score -= CONFIDENCE_PENALTIES.reachabilitySuspectedOffline
      reasons.push('Sito sospetto offline ma non confermato (possibile timeout/rate-limit)')
      needsRecheck = true
      break
    // 'online' e 'offline_confirmed' sono entrambi stati CERTI: nessuna penalità.
  }

  // 2) Proprietà del sito: il sito scrapeato è davvero dell'azienda?
  if (input.websiteOwnershipVerified === false) {
    score -= CONFIDENCE_PENALTIES.websiteOwnershipUnverified
    reasons.push("Il sito non sembra appartenere all'azienda (nessun riferimento al nome/contatti)")
  }

  // 3) Contatti: senza un contatto affidabile il lead è poco azionabile.
  if (input.hasReliableContact === false) {
    if (input.hasSuspectedContact) {
      score -= CONFIDENCE_PENALTIES.contactDataSuspected
      reasons.push('Contatti estratti con bassa affidabilità')
    } else {
      score -= CONFIDENCE_PENALTIES.noContactData
      reasons.push('Nessun contatto affidabile (telefono/email)')
    }
  }

  // 4) Troppi segnali non verificabili = analisi poco solida.
  if ((input.unverifiableSignalsCount ?? 0) >= 4) {
    score -= CONFIDENCE_PENALTIES.manyUnverifiableSignals
    reasons.push('Diversi segnali tecnici non verificabili in modo affidabile')
  }

  score = Math.max(0, Math.min(100, score))
  const status: LeadConfidenceDecision['status'] =
    score >= PUBLISH_CONFIDENCE_THRESHOLD ? 'published' : 'quarantine'

  return { score, status, reasons, needsRecheck }
}
