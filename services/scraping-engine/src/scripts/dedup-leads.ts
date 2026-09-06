/**
 * Dedup + migrazione unique_key alla formula deterministica (lead-identity).
 *
 * Cosa fa:
 * 1. Ricalcola la nuova unique_key (dominio+città -> telefono -> nome) per
 *    TUTTI i lead esistenti.
 * 2. Raggruppa per nuova chiave: i gruppi >1 sono duplicati.
 * 3. Vincitore del gruppo: (a) riga referenziata da sblocchi/CRM,
 *    (b) riga con website_analysis moderna, (c) riga più recente.
 * 4. Perdenti: sblocchi e voci CRM vengono RIPUNTATI sul vincitore
 *    (mai persi: sono acquisti degli utenti), poi la riga viene eliminata.
 * 5. Aggiorna unique_key di tutte le righe superstiti alla nuova formula.
 *
 * DEFAULT: dry-run (stampa il piano). Eseguire con --apply per applicare.
 *
 * Uso:  npx tsx src/scripts/dedup-leads.ts [--apply]
 * Env:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { computeUniqueKey } from '../utils/lead-identity'

const APPLY = process.argv.includes('--apply')

interface LeadRow {
  id: string
  business_name: string | null
  website_url: string | null
  phone: string | null
  address: string | null
  city: string | null
  category: string | null
  source: string | null
  unique_key: string | null
  created_at: string
}

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti')
    process.exit(1)
  }
  return createClient(url, key)
}

async function fetchAllLeads(supabase: SupabaseClient): Promise<LeadRow[]> {
  const rows: LeadRow[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, business_name, website_url, phone, address, city, category, source, unique_key, created_at')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data as LeadRow[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}

async function fetchIdSet(
  supabase: SupabaseClient,
  table: string,
  column: string
): Promise<Set<string>> {
  const ids = new Set<string>()
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .range(from, from + pageSize - 1)
    if (error) {
      console.warn(`⚠️ Lettura ${table} fallita (${error.message}): considerata vuota`)
      return ids
    }
    for (const row of data || []) ids.add((row as any)[column])
    if (!data || data.length < pageSize) break
  }
  return ids
}

async function repointOrDrop(
  supabase: SupabaseClient,
  table: string,
  loserId: string,
  winnerId: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ lead_id: winnerId })
    .eq('lead_id', loserId)
  if (error) {
    // Conflitto unique (l'utente aveva sbloccato ENTRAMBI i duplicati):
    // la riga sul vincitore esiste già, quella del perdente si può eliminare.
    const { error: delError } = await supabase.from(table).delete().eq('lead_id', loserId)
    if (delError) {
      console.error(`   ❌ ${table}: repoint E delete falliti per ${loserId}: ${delError.message}`)
    } else {
      console.log(`   ↪️ ${table}: riga duplicata rimossa (già presente sul vincitore)`)
    }
  }
}

async function main() {
  const supabase = getSupabase()

  console.log(`🔎 Dedup lead — modalità: ${APPLY ? '⚠️ APPLY' : 'dry-run'}`)

  const [leads, modernIds, unlockedIds, crmIds] = await Promise.all([
    fetchAllLeads(supabase),
    // righe con analisi moderna
    (async () => {
      const ids = new Set<string>()
      const pageSize = 1000
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('leads')
          .select('id')
          .not('website_analysis', 'is', null)
          .range(from, from + pageSize - 1)
        if (error) { console.warn(`⚠️ ${error.message}`); break }
        for (const r of data || []) ids.add(r.id)
        if (!data || data.length < pageSize) break
      }
      return ids
    })(),
    fetchIdSet(supabase, 'user_unlocked_leads', 'lead_id'),
    fetchIdSet(supabase, 'crm_entries', 'lead_id')
  ])

  console.log(`📋 ${leads.length} lead totali, ${modernIds.size} con analisi moderna, ${unlockedIds.size} sbloccati, ${crmIds.size} in CRM`)

  // Raggruppa per nuova chiave
  const groups = new Map<string, LeadRow[]>()
  for (const lead of leads) {
    const key = computeUniqueKey({
      source: lead.source || 'google_maps',
      name: lead.business_name,
      website: lead.website_url,
      phone: lead.phone,
      city: lead.city
    })
    const group = groups.get(key)
    if (group) group.push(lead)
    else groups.set(key, [lead])
  }

  const referenced = (id: string) => unlockedIds.has(id) || crmIds.has(id)

  let dupGroups = 0
  let losersTotal = 0
  let keysToUpdate = 0
  const plan: Array<{ key: string; winner: LeadRow; losers: LeadRow[] }> = []

  for (const [key, group] of groups) {
    if (group.length > 1) {
      dupGroups++
      // Ordina per priorità vincitore
      const sorted = [...group].sort((a, b) => {
        const refDiff = Number(referenced(b.id)) - Number(referenced(a.id))
        if (refDiff !== 0) return refDiff
        const modDiff = Number(modernIds.has(b.id)) - Number(modernIds.has(a.id))
        if (modDiff !== 0) return modDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      const [winner, ...losers] = sorted
      losersTotal += losers.length
      plan.push({ key, winner, losers })
    }
    const survivor = group.length > 1 ? plan[plan.length - 1].winner : group[0]
    if (survivor.unique_key !== key) keysToUpdate++
  }

  console.log(`\n📊 PIANO:`)
  console.log(`   Gruppi duplicati: ${dupGroups}`)
  console.log(`   Righe da eliminare: ${losersTotal}`)
  console.log(`   unique_key da migrare alla nuova formula: ${keysToUpdate}`)

  for (const { key, winner, losers } of plan.slice(0, 20)) {
    console.log(`\n   🔑 ${key}`)
    console.log(`      ✅ vince ${winner.id} (${winner.business_name}, ${winner.city}) ref=${referenced(winner.id)} modern=${modernIds.has(winner.id)}`)
    for (const l of losers) {
      console.log(`      ❌ perde ${l.id} (${l.business_name}, ${l.city}) ref=${referenced(l.id)}`)
    }
  }
  if (plan.length > 20) console.log(`   ... e altri ${plan.length - 20} gruppi`)

  if (!APPLY) {
    console.log('\n✋ Dry-run: nessuna modifica. Rieseguire con --apply per applicare.')
    return
  }

  console.log('\n⚠️ APPLICAZIONE IN CORSO...')

  // 1) Dedup: ripunta riferimenti e elimina i perdenti
  for (const { key, winner, losers } of plan) {
    for (const loser of losers) {
      if (unlockedIds.has(loser.id)) {
        await repointOrDrop(supabase, 'user_unlocked_leads', loser.id, winner.id)
      }
      if (crmIds.has(loser.id)) {
        await repointOrDrop(supabase, 'crm_entries', loser.id, winner.id)
      }
      const { error } = await supabase.from('leads').delete().eq('id', loser.id)
      if (error) {
        console.error(`   ❌ Delete ${loser.id} fallita: ${error.message}`)
      }
    }
  }
  console.log(`✅ Duplicati rimossi (${losersTotal} righe)`)

  // 2) Migra le unique_key superstiti alla nuova formula
  let updated = 0
  let updateErrors = 0
  for (const [key, group] of groups) {
    const winner = group.length > 1
      ? plan.find(p => p.key === key)!.winner
      : group[0]
    if (winner.unique_key === key) continue
    const { error } = await supabase
      .from('leads')
      .update({ unique_key: key })
      .eq('id', winner.id)
    if (error) {
      updateErrors++
      if (updateErrors <= 10) console.error(`   ❌ unique_key ${winner.id}: ${error.message}`)
    } else {
      updated++
    }
  }
  console.log(`✅ unique_key migrate: ${updated} (errori: ${updateErrors})`)
  console.log('🏁 Dedup completato.')
}

main().catch(err => {
  console.error('🚨 Errore fatale:', err)
  process.exit(1)
})
