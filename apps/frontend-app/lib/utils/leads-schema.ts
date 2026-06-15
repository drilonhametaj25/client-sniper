/**
 * Helper di robustezza schema per la tabella leads.
 *
 * Il sistema di confidenza (Fase 0) aggiunge la colonna `status` (published/quarantine)
 * tramite migration. Per evitare che il codice si rompa (500) su un database dove la
 * migration NON è ancora stata applicata, qui rileviamo a runtime se la colonna esiste
 * e applichiamo il filtro `status = 'published'` solo in quel caso.
 *
 * Vantaggi:
 * - L'app funziona anche prima della migration (mostra tutti i lead, nessun 500).
 * - Nessuna dipendenza d'ordine fragile tra deploy del codice e migration.
 * - Quando la migration viene applicata, il filtro si attiva da solo (auto-heal).
 */

// Cache positiva: una volta vista la colonna, è permanente per la vita del processo.
// Quando assente, ri-sondiamo (poco costoso) così si auto-attiva dopo la migration.
let statusColumnConfirmed = false

export async function leadsHasStatusColumn(supabase: any): Promise<boolean> {
  if (statusColumnConfirmed) return true
  try {
    const { error } = await supabase.from('leads').select('status').limit(1)
    if (!error) {
      statusColumnConfirmed = true
      return true
    }
    return false
  } catch {
    return false
  }
}

// Cache positiva per colonna: stesso principio di leadsHasStatusColumn ma generico.
// Utile per colonne opzionali come `website_analysis` (struttura moderna completa),
// che potrebbe non esistere su DB non ancora migrati. In quel caso il chiamante
// usa un fallback (es. la colonna legacy `analysis`).
const confirmedColumns = new Set<string>()

export async function leadsHasColumn(supabase: any, column: string): Promise<boolean> {
  if (confirmedColumns.has(column)) return true
  try {
    const { error } = await supabase.from('leads').select(column).limit(1)
    if (!error) {
      confirmedColumns.add(column)
      return true
    }
    return false
  } catch {
    return false
  }
}
