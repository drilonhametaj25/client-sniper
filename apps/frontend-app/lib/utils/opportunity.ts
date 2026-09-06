/**
 * Opportunità — L'UNICO posto dove vive la semantica dello score.
 *
 * Storia: lo score v1 salvato nel DB è un "health score" del sito
 * (ALTO = sito sano = lead PEGGIORE). Lo score v2 (opportunity score,
 * calcolato dal motore rinnovato) è già ALTO = MIGLIORE opportunità.
 * La colonna leads.score_version distingue le due versioni durante la
 * transizione; questo helper normalizza tutto a "Opportunità 0-100,
 * alto = meglio" per la UI.
 *
 * REGOLA: nessun componente deve mai interpretare leads.score direttamente.
 * Usare sempre getOpportunity(score, scoreVersion).
 */

export interface Opportunity {
  /** 0-100, ALTO = migliore opportunità */
  value: number
  /** etichetta leggibile in italiano */
  label: 'Opportunità alta' | 'Opportunità media' | 'Opportunità bassa'
  /** classi Tailwind per il badge (testo + sfondo + bordo) */
  badgeClass: string
  /** classi Tailwind solo testo */
  textClass: string
}

export function getOpportunity(
  score: number | null | undefined,
  scoreVersion: number | null | undefined = 1
): Opportunity {
  const raw = typeof score === 'number' && !Number.isNaN(score) ? score : 50
  // v1 (health score): inverti. v2 (opportunity score): usa così com'è.
  const value = Math.max(0, Math.min(100, (scoreVersion ?? 1) >= 2 ? raw : 100 - raw))

  if (value >= 70) {
    return {
      value,
      label: 'Opportunità alta',
      badgeClass:
        'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800',
      textClass: 'text-green-600 dark:text-green-400'
    }
  }
  if (value >= 40) {
    return {
      value,
      label: 'Opportunità media',
      badgeClass:
        'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800',
      textClass: 'text-amber-600 dark:text-amber-400'
    }
  }
  return {
    value,
    label: 'Opportunità bassa',
    badgeClass:
      'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
    textClass: 'text-gray-500 dark:text-gray-400'
  }
}

/**
 * True se il lead è una buona opportunità (per raccomandazioni/boost).
 */
export function isHighOpportunity(
  score: number | null | undefined,
  scoreVersion: number | null | undefined = 1
): boolean {
  return getOpportunity(score, scoreVersion).value >= 60
}
