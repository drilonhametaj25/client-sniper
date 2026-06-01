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
