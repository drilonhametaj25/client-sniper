/**
 * API on-demand: arricchimento "tipo Apollo" di un lead.
 * Calcola al volo email verificate, MX/provider email, età dominio — così funziona
 * su QUALSIASI lead (anche quelli storici) senza ri-eseguire lo scraper.
 *
 * Usa il modulo Node `dns`/`net` -> runtime nodejs obbligatorio.
 * @file apps/frontend-app/app/api/leads/[id]/enrich/route.ts
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { enrichLeadFull } from '@/lib/enrichment/lead-enrichment'
import { isLeadUnlocked } from '@/lib/api/paywall'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id

    // Auth (helper unificato: Bearer token o sessione cookie)
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse
    const { user, admin } = auth

    // 🔒 PAYWALL: l'arricchimento (email verificate incluse) è riservato a chi
    // ha sbloccato il lead
    if (!(await isLeadUnlocked(admin, user.id, leadId))) {
      return NextResponse.json(
        { error: 'Sblocca il lead per accedere all\'arricchimento contatti' },
        { status: 403 }
      )
    }

    // Carica il lead
    const { data: lead, error: leadError } = await admin
      .from('leads')
      .select('id, business_name, website_url, email, analysis, website_analysis')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 })
    }

    if (!lead.website_url) {
      return NextResponse.json({ success: true, data: null, message: 'Lead senza sito web: arricchimento non disponibile' })
    }

    // Raccogli le email note: quella del lead + quelle estratte dall'analisi.
    const siteEmails = new Set<string>()
    if (lead.email) siteEmails.add(lead.email)
    const content = (lead.website_analysis as any)?.content
    if (Array.isArray(content?.emailAddresses)) {
      for (const e of content.emailAddresses) siteEmails.add(e)
    }

    const result = await enrichLeadFull(lead.website_url, Array.from(siteEmails), {
      trySmtp: true,
      businessName: lead.business_name
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Errore enrichment lead:', error)
    return NextResponse.json({ error: 'Errore durante l\'arricchimento' }, { status: 500 })
  }
}
