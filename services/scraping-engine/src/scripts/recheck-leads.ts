/**
 * Job di ri-analisi di massa dei lead (Fase 4)
 *
 * Riprocessa i lead esistenti col nuovo motore "trust-first": ricalcola
 * raggiungibilità, segnali tecnici e confidenza, e aggiorna lo stato
 * (published/quarantine) di ogni lead. Serve a ripulire il database storico,
 * i cui dati non sono affidabili, mantenendo gli account utente.
 *
 * Uso:
 *   tsx src/scripts/recheck-leads.ts                 # priorità: needs_recheck, poi last_verified_at più vecchio
 *   tsx src/scripts/recheck-leads.ts --all           # TUTTI i lead con un sito web
 *   tsx src/scripts/recheck-leads.ts --limit 300     # limite (usato dal workflow notturno)
 *   tsx src/scripts/recheck-leads.ts --rescore-only  # SOLO ri-scoring offline (nessun re-scrape):
 *                                                    # ricalcola opportunity score v2 dalle analisi
 *                                                    # già salvate — backfill di migliaia di lead in minuti
 *
 * Variabili d'ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { EnhancedWebsiteAnalyzer } from '../analyzers/enhanced-website-analyzer'
import { decideLeadPublication } from '../utils/confidence'
import { computeOpportunityScore } from '../scoring/opportunity-score'
import { selectBestEmail } from '../utils/email-selection'
import { fetchPsi } from '../utils/psi'

interface LeadRow {
  id: string
  business_name: string
  website_url: string | null
  phone: string | null
  email?: string | null
}

const BATCH_SIZE = 25
const DELAY_BETWEEN_LEADS_MS = 800

function parseArgs() {
  const args = process.argv.slice(2)
  const all = args.includes('--all')
  const rescoreOnly = args.includes('--rescore-only')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] || '0', 10) || 0 : 0
  return { all, limit, rescoreOnly }
}

/**
 * Ri-scoring OFFLINE: ricalcola l'opportunity score v2 dalle website_analysis
 * già in database, senza re-scrape. Ideale per il backfill iniziale.
 */
async function rescoreOnly(supabase: SupabaseClient, limit: number) {
  console.log(`🧮 Ri-scoring offline (v2)${limit ? ` — limite ${limit}` : ''}`)
  let processed = 0
  let errors = 0
  const pageSize = 200

  for (let offset = 0; ; offset += pageSize) {
    if (limit && processed >= limit) break

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, business_name, website_url, phone, email, website_analysis, score_version')
      .not('website_analysis', 'is', null)
      .neq('score_version', 2)
      .order('created_at', { ascending: true })
      .range(0, pageSize - 1) // sempre la prima pagina: le righe processate escono dal filtro (score_version=2)

    if (error) {
      console.error('❌ Errore lettura lead:', error.message)
      break
    }
    if (!leads || leads.length === 0) break

    for (const lead of leads as any[]) {
      if (limit && processed >= limit) break
      try {
        const analysis = lead.website_analysis
        const opportunity = computeOpportunityScore(analysis, {
          hasWebsite: !!lead.website_url,
          phone: lead.phone,
          email: lead.email,
          rating: null,
          reviewsCount: null
        }, {
          confirmedAbsence: analysis?.reachabilityVerdict === 'offline_confirmed' ||
            analysis?.websiteStatus === 'parked'
        })

        const { error: updErr } = await supabase
          .from('leads')
          .update({
            score: opportunity.score,
            score_version: 2,
            needed_roles: opportunity.neededRoles.length > 0 ? opportunity.neededRoles : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id)

        if (updErr) {
          errors++
          if (errors <= 10) console.error(`  ⚠️ ${lead.business_name}: ${updErr.message}`)
        } else {
          processed++
          if (processed % 100 === 0) console.log(`  ... ${processed} ri-scorati`)
        }
      } catch (e) {
        errors++
      }
    }

    if (leads.length < pageSize) break
  }

  console.log(`\n📊 Ri-scoring completato. Processati: ${processed} | Errori: ${errors}`)
  process.exit(errors > processed ? 1 : 0)
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
  const { all, limit, rescoreOnly: rescoreMode } = parseArgs()

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variabili mancanti: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  if (rescoreMode) {
    await rescoreOnly(supabase, limit)
    return
  }

  const analyzer = new EnhancedWebsiteAnalyzer()

  console.log(`🔁 Ri-analisi lead — modalità: ${all ? 'TUTTI' : 'needs_recheck + più vecchi'}${limit ? `, limite ${limit}` : ''}`)

  let processed = 0
  let published = 0
  let quarantined = 0
  let offset = 0

  while (true) {
    const pageSize = limit ? Math.min(BATCH_SIZE, limit - processed) : BATCH_SIZE
    if (pageSize <= 0) break

    let query = supabase
      .from('leads')
      .select('id, business_name, website_url, phone, email')
      .not('website_url', 'is', null)
      .order('last_verified_at', { ascending: true, nullsFirst: true })
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
          unverifiableSignalsCount: unverifiable,
          analysisReliability: (analysis as any).reliability?.overallConfidence,
          analysisMethod: (analysis as any).reliability?.analysisMethod
        })

        // Email: selezione + verifica MX (aggiorna anche i lead storici)
        let selectedEmail: Awaited<ReturnType<typeof selectBestEmail>> = null
        try {
          selectedEmail = await selectBestEmail({
            websiteUrl: lead.website_url,
            analyzerEmails: (analysis as any).content?.emailAddresses || []
          })
        } catch { /* mai bloccante */ }

        // PSI: performance certificate da Google, solo per lead pubblicati e
        // solo se la API key è configurata (gratuita, 25k/giorno)
        const psiKey = process.env.PSI_API_KEY
        if (psiKey && decision.status === 'published' && lead.website_url) {
          const psi = await fetchPsi(lead.website_url, psiKey)
          if (psi) {
            ;(analysis as any).performance = { ...(analysis as any).performance, psi }
          }
        }

        // Opportunity score v2 ricalcolato con l'analisi fresca
        const opportunity = computeOpportunityScore(analysis as any, {
          hasWebsite: !!lead.website_url,
          phone: lead.phone,
          email: selectedEmail?.email || lead.email || null,
          rating: null,
          reviewsCount: null
        }, {
          confirmedAbsence: (analysis as any).reachabilityVerdict === 'offline_confirmed' ||
            (analysis as any).websiteStatus === 'parked'
        })

        const updatePayload: Record<string, any> = {
          status: decision.status,
          confidence_score: decision.score,
          needs_recheck: decision.needsRecheck,
          quarantine_reasons: decision.reasons,
          reachability_verdict: (analysis as any).reachabilityVerdict || null,
          website_analysis: analysis,
          score: opportunity.score,
          score_version: 2,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        if (opportunity.neededRoles.length > 0) updatePayload.needed_roles = opportunity.neededRoles
        if (selectedEmail) {
          updatePayload.email = selectedEmail.email
          updatePayload.email_confidence = selectedEmail.confidence
        }

        const { error: updErr } = await supabase
          .from('leads')
          .update(updatePayload)
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
