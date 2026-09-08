/**
 * API Admin per downgrade manuale utenti - TrovaMi.pro
 * Permette agli admin di fare downgrade di un utente a piano free
 * Usato per gestire casi di pagamenti falliti o cancellazioni manuali
 * Endpoint: POST /api/admin/downgrade-user
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSupabaseAdmin } from '@/lib/api/auth'

export async function POST(request: NextRequest) {
  try {
    // Autenticazione unificata (401) + verifica ruolo admin (403)
    const auth = await requireAdmin(request)
    if (auth.errorResponse) return auth.errorResponse
    const { user } = auth

    const body = await request.json()
    const { email, userId: targetUserId, reason } = body

    // Validazione: serve email o userId
    if (!email && !targetUserId) {
      return NextResponse.json(
        { error: 'Specifica email o userId dell\'utente da downgrade' },
        { status: 400 }
      )
    }

    // Trova l'utente target
    let targetQuery = getSupabaseAdmin()
      .from('users')
      .select('id, email, plan, status, credits_remaining, stripe_subscription_id')

    if (email) {
      targetQuery = targetQuery.eq('email', email)
    } else {
      targetQuery = targetQuery.eq('id', targetUserId)
    }

    const { data: targetUser, error: targetError } = await targetQuery.single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Non permettere downgrade se già free
    if (targetUser.plan === 'free') {
      return NextResponse.json(
        { error: 'L\'utente ha già il piano free' },
        { status: 400 }
      )
    }

    const previousPlan = targetUser.plan
    const previousCredits = targetUser.credits_remaining

    // Esegui il downgrade con 0 crediti (ha gia usato il test)
    const { error: updateError } = await getSupabaseAdmin()
      .from('users')
      .update({
        plan: 'free',
        credits_remaining: 0,
        proposals_remaining: 0,
        proposals_reset_type: 'none',
        proposals_reset_date: null,
        status: 'cancelled',
        stripe_subscription_id: null,
        deactivated_at: new Date().toISOString(),
        deactivation_reason: reason || 'Downgrade manuale da admin'
      })
      .eq('id', targetUser.id)

    if (updateError) {
      console.error('Errore downgrade utente:', updateError)
      return NextResponse.json(
        { error: 'Errore durante il downgrade' },
        { status: 500 }
      )
    }

    // Log dell'operazione in plan_status_logs
    const { error: logError } = await getSupabaseAdmin()
      .from('plan_status_logs')
      .insert({
        user_id: targetUser.id,
        action: 'admin_downgrade',
        previous_status: previousPlan,
        new_status: 'free',
        reason: reason || `Admin downgrade by ${user.id} - Previous plan: ${previousPlan}`,
        triggered_by: 'admin_panel',
        stripe_event_id: null
      })

    if (logError) {
      console.error('Errore log downgrade:', logError)
      // Non fallire l'operazione per errore di log
    }

    console.log(`✅ Admin ${user.id} ha fatto downgrade di ${targetUser.email} da ${previousPlan} a free`)

    return NextResponse.json({
      success: true,
      message: `Utente ${targetUser.email} downgraded a piano free`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        previousPlan,
        previousCredits,
        newPlan: 'free',
        newCredits: 0
      }
    })

  } catch (error) {
    console.error('Errore POST admin downgrade-user:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// GET per verificare stato utente prima del downgrade
export async function GET(request: NextRequest) {
  try {
    // Autenticazione unificata (401) + verifica ruolo admin (403)
    const auth = await requireAdmin(request)
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Specifica email come query parameter' },
        { status: 400 }
      )
    }

    // Trova l'utente
    const { data: targetUser, error: targetError } = await getSupabaseAdmin()
      .from('users')
      .select('id, email, plan, status, credits_remaining, stripe_subscription_id, stripe_customer_id, deactivated_at, deactivation_reason')
      .eq('email', email)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Conta i log di pagamenti falliti recenti
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: failedPayments } = await getSupabaseAdmin()
      .from('plan_status_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUser.id)
      .eq('action', 'payment_failed')
      .gte('created_at', thirtyDaysAgo.toISOString())

    return NextResponse.json({
      user: targetUser,
      failedPaymentsLast30Days: failedPayments || 0,
      canDowngrade: targetUser.plan !== 'free'
    })

  } catch (error) {
    console.error('Errore GET admin downgrade-user:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
