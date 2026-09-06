/**
 * Paywall server-side - TrovaMi
 * Verifica che un utente abbia sbloccato un lead prima di restituire
 * contatti, arricchimenti o preventivi.
 * Usato da: /api/leads/[id]/enrich, /api/leads/[id]/quotation, /api/leads/[id]/quotation/pdf
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ritorna true se l'utente ha sbloccato il lead.
 * `admin` deve essere un client service-role.
 */
export async function isLeadUnlocked(
  admin: SupabaseClient,
  userId: string,
  leadId: string
): Promise<boolean> {
  const { data, error } = await admin
    .from('user_unlocked_leads')
    .select('id')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .maybeSingle()

  if (error) {
    console.error('isLeadUnlocked error:', error)
    return false
  }
  return !!data
}

/**
 * Ritorna l'insieme dei lead sbloccati dall'utente tra quelli passati.
 */
export async function getUnlockedSet(
  admin: SupabaseClient,
  userId: string,
  leadIds: string[]
): Promise<Set<string>> {
  if (leadIds.length === 0) return new Set()

  const { data, error } = await admin
    .from('user_unlocked_leads')
    .select('lead_id')
    .eq('user_id', userId)
    .in('lead_id', leadIds)

  if (error) {
    console.error('getUnlockedSet error:', error)
    return new Set()
  }
  return new Set((data || []).map(r => r.lead_id))
}
