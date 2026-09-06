/**
 * Helper per la visualizzazione e il controllo dei crediti - TrovaMi
 * Convenzione: credits_remaining === -1 significa piano ILLIMITATO (Agency).
 * Usare SEMPRE questi helper invece di confronti diretti (n <= 0 tratta
 * erroneamente -1 come "senza crediti" e blocca gli utenti Agency).
 */

/** True se l'utente può sbloccare lead (illimitato o con crediti > 0) */
export function hasCredits(n: number | null | undefined): boolean {
  if (n === null || n === undefined) return false
  return n === -1 || n > 0
}

/** True se il valore rappresenta un piano illimitato */
export function isUnlimitedCredits(n: number | null | undefined): boolean {
  return n === -1
}

/** Formatta il saldo crediti per la UI */
export function formatCredits(n: number | null | undefined): string {
  if (n === -1) return 'Illimitati'
  return String(Math.max(0, n ?? 0))
}
