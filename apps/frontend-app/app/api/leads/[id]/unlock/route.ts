/**
 * API per sbloccare i lead - TrovaMi
 * Tutto il consumo crediti passa dalla RPC atomica consume_credit
 * (FOR UPDATE + audit log nella stessa transazione: niente race, niente
 * decrementi persi, niente sblocchi gratis su errori silenziati).
 *
 * LOGICA:
 * - Lead già sbloccato: accesso gratuito (non consuma)
 * - Primo sblocco: gratuito per piani a pagamento (non free)
 * - Piano Agency (is_unlimited): sblocchi illimitati
 * - Altrimenti: consuma 1 credito
 *
 * TRACKING KLAVIYO (fire and forget):
 * - Lead sbloccato / crediti bassi / crediti esauriti
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { klaviyoServer } from '@/lib/services/klaviyo-server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id
    const admin = getSupabaseAdmin()

    // Autenticazione tramite Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token di autorizzazione mancante' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Verifica che il lead esista
    const { data: lead, error: leadError } = await admin
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead non trovato' }, { status: 404 })
    }

    // Consumo atomico del credito
    const { data: rpcRows, error: rpcError } = await admin
      .rpc('consume_credit', { p_user_id: user.id, p_lead_id: leadId })

    if (rpcError) {
      console.error('consume_credit RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Errore nello sblocco del lead' },
        { status: 500 }
      )
    }

    const result = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error_message || 'Sblocco non consentito' },
        { status: 403 }
      )
    }

    const creditsRemaining: number = result.is_unlimited ? -1 : (result.credits_remaining ?? 0)

    // Entry CRM (non critica: non blocca lo sblocco)
    if (!result.already_unlocked) {
      const { error: crmError } = await admin
        .from('crm_entries')
        .upsert({
          user_id: user.id,
          lead_id: leadId,
          status: 'to_contact',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, lead_id' })

      if (crmError) {
        console.error('CRM entry error:', crmError)
      }
    }

    // Contatti del lead (ora che lo sblocco è registrato)
    const { data: leadDetails } = await admin
      .from('leads')
      .select('business_name, category, city, score, phone, email')
      .eq('id', leadId)
      .single()

    // Tracking Klaviyo asincrono, solo per sblocchi nuovi
    if (!result.already_unlocked) {
      const { count: totalOpened } = await admin
        .from('user_unlocked_leads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { data: userData } = await admin
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .single()

      const plan = userData?.plan || 'free'

      klaviyoServer.trackLeadUnlocked(
        user.email!,
        {
          leadId,
          businessName: leadDetails?.business_name || 'N/A',
          category: leadDetails?.category || 'N/A',
          score: leadDetails?.score || 50,
          city: leadDetails?.city
        },
        {
          creditsRemaining,
          totalUnlocked: totalOpened || 0,
          plan
        }
      ).catch(err => console.error('Klaviyo trackLeadUnlocked error:', err))

      if (!result.is_unlimited && creditsRemaining > 0 && creditsRemaining <= 3) {
        klaviyoServer.trackCreditsLow(user.email!, creditsRemaining, plan)
          .catch(err => console.error('Klaviyo trackCreditsLow error:', err))
      }

      if (!result.is_unlimited && creditsRemaining === 0) {
        klaviyoServer.trackCreditsDepleted(user.email!, plan)
          .catch(err => console.error('Klaviyo trackCreditsDepleted error:', err))
      }
    }

    return NextResponse.json({
      success: true,
      already_opened: result.already_unlocked === true,
      message: result.already_unlocked
        ? 'Lead già sbloccato'
        : result.is_free
          ? 'Primo sblocco gratuito!'
          : 'Lead sbloccato con successo',
      is_free_proposal: result.is_free === true,
      is_unlimited: result.is_unlimited === true,
      credits_remaining: creditsRemaining,
      // Retrocompatibilità con la UI attuale
      proposals_remaining: creditsRemaining,
      phone: leadDetails?.phone || null,
      email: leadDetails?.email || null
    })

  } catch (error) {
    console.error('Errore API unlock lead:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
