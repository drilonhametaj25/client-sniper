/**
 * Job di ri-analisi di massa dei lead (Fase 4)
 *
 * Riprocessa i lead esistenti col nuovo motore "trust-first": ricalcola
 * raggiungibilità, segnali tecnici e confidenza, e aggiorna lo stato
 * (published/quarantine) di ogni lead. Serve a ripulire il database storico,
 * i cui dati non sono affidabili, mantenendo gli account utente.
 *
 * Uso:
 *   tsx src/scripts/recheck-leads.ts            # solo i lead con needs_recheck = true
 *   tsx src/scripts/recheck-leads.ts --all      # TUTTI i lead con un sito web
 *   tsx src/scripts/recheck-leads.ts --all --limit 200
 *
 * Variabili d'ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { EnhancedWebsiteAnalyzer } from '../analyzers/enhanced-website-analyzer'
import { decideLeadPublication } from '../utils/confidence'

interface LeadRow {
  id: string
  business_name: string
  website_url: string | null
  phone: string | null
}

const BATCH_SIZE = 25
const DELAY_BETWEEN_LEADS_MS = 800

function parseArgs() {
  const args = process.argv.slice(2)
  const all = args.includes('--all')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] || '0', 10) || 0 : 0
  return { all, limit }
}

function phoneTail(phone?: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 8 ? digits.slice(-8) : ''
}

/** Verifica di proprietà del sito: il telefono del lead compare tra i contatti del sito? */
function verifyOwnership(lead: LeadRow, analysis: any): boolean | null {
  if (!analysis?.isAccessible || !analysis.content) return null
  const sitePhones = (analysis.content.phoneNumbers || []).map((p: string) => phoneTail(p)).filter(Boolean)
  const bizPhone = phoneTail(lead.phone)
  if (bizPhone && sitePhones.includes(bizPhone)) return true
  if (bizPhone && sitePhones.length > 0) return false
  return null
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  const { all, limit } = parseArgs()

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variabili mancanti: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const analyzer = new EnhancedWebsiteAnalyzer()

  console.log(`🔁 Ri-analisi lead — modalità: ${all ? 'TUTTI' : 'solo needs_recheck'}${limit ? `, limite ${limit}` : ''}`)

  let processed = 0
  let published = 0
  let quarantined = 0
  let offset = 0

  while (true) {
    const pageSize = limit ? Math.min(BATCH_SIZE, limit - processed) : BATCH_SIZE
    if (pageSize <= 0) break

    let query = supabase
      .from('leads')
      .select('id, business_name, website_url, phone')
      .not('website_url', 'is', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (!all) query = query.eq('needs_recheck', true)

    const { data: leads, error } = await query
    if (error) {
      console.error('❌ Errore lettura lead:', error.message)
      break
    }
    if (!leads || leads.length === 0) break

    for (const lead of leads as LeadRow[]) {
      try {
        const analysis = await analyzer.analyzeWebsite(lead.website_url!)
        const ownership = verifyOwnership(lead, analysis)

        let unverifiable = 0
        if ((analysis as any).tracking?.detectionConfidence === 'unverifiable') unverifiable++
        if ((analysis as any).gdpr?.cookieBannerConfidence === 'unverifiable') unverifiable++

        const decision = decideLeadPublication({
          reachability: (analysis as any).reachabilityVerdict,
          websiteOwnershipVerified: ownership,
          hasReliableContact: !!lead.phone ||
            !!((analysis as any).content?.phoneNumbers?.length) ||
            !!((analysis as any).content?.emailAddresses?.length),
          unverifiableSignalsCount: unverifiable
        })

        const { error: updErr } = await supabase
          .from('leads')
          .update({
            status: decision.status,
            confidence_score: decision.score,
            needs_recheck: decision.needsRecheck,
            quarantine_reasons: decision.reasons,
            reachability_verdict: (analysis as any).reachabilityVerdict || null,
            website_analysis: analysis,
            score: analysis.overallScore,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id)

        if (updErr) {
          console.error(`  ⚠️ Update fallito ${lead.business_name}: ${updErr.message}`)
        } else {
          processed++
          if (decision.status === 'published') published++; else quarantined++
          console.log(`  ${decision.status === 'published' ? '✅' : '🚧'} ${lead.business_name} → ${decision.status} (conf ${decision.score})`)
        }
      } catch (e) {
        console.error(`  ❌ Errore analisi ${lead.business_name}:`, e instanceof Error ? e.message : e)
      }

      await delay(DELAY_BETWEEN_LEADS_MS)
    }

    offset += leads.length
    if (limit && processed >= limit) break
  }

  console.log(`\n📊 Fatto. Processati: ${processed} | Pubblicati: ${published} | In quarantena: ${quarantined}`)
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Errore fatale:', err)
  process.exit(1)
})
