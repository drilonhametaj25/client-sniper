/**
 * API Admin per downgrade manuale utenti - TrovaMi.pro
 * Permette agli admin di fare downgrade di un utente a piano free
 * Usato per gestire casi di pagamenti falliti o cancellazioni manuali
 * Endpoint: POST /api/admin/downgrade-user
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '@/lib/auth-middleware'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Verifica ruolo admin
async function verifyAdminAccess(userId: string) {
  const { data: userData, error } = await getSupabaseAdmin()
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || userData?.role !== 'admin') {
    return false
  }

  return true
}

export async function POST(request: NextRequest) {
  try {
    // Autenticazione unificata
    const { user, error: authError } = await authenticateUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const isAdmin = await verifyAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

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

    // Ottieni i crediti del piano free dal database
    const { data: freePlanData } = await getSupabaseAdmin()
      .from('plans')
      .select('max_credits')
      .eq('name', 'free')
      .single()

    const freeCredits = freePlanData?.max_credits || 5
    const previousPlan = targetUser.plan
    const previousCredits = targetUser.credits_remaining

    // Esegui il downgrade
    const { error: updateError } = await getSupabaseAdmin()
      .from('users')
      .update({
        plan: 'free',
        credits_remaining: freeCredits,
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
        newCredits: freeCredits
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
    // Autenticazione unificata
    const { user, error: authError } = await authenticateUser(request)

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || 'Non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const isAdmin = await verifyAdminAccess(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

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
