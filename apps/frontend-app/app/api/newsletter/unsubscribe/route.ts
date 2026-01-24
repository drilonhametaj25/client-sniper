/**
 * API per disiscrizione newsletter via token sicuro
 * GET: Processa unsubscribe e redirect a pagina conferma
 *
 * Usato da: Link in footer delle email newsletter
 * Usage: /api/newsletter/unsubscribe?token=xxx
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'

    // Verifica token presente
    if (!token) {
      console.warn('⚠️ Unsubscribe: token mancante')
      return NextResponse.redirect(
        new URL('/newsletter/unsubscribe?error=missing_token', appUrl)
      )
    }

    // Trova utente per unsubscribe_token
    const { data: user, error: findError } = await getSupabaseAdmin()
      .from('users')
      .select('id, email')
      .eq('unsubscribe_token', token)
      .single()

    if (findError || !user) {
      console.warn('⚠️ Unsubscribe: token non valido', token)
      return NextResponse.redirect(
        new URL('/newsletter/unsubscribe?error=invalid_token', appUrl)
      )
    }

    // Aggiorna utente: newsletter_subscribed = false
    const { error: updateError } = await getSupabaseAdmin()
      .from('users')
      .update({
        newsletter_subscribed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Unsubscribe: errore update', updateError)
      return NextResponse.redirect(
        new URL('/newsletter/unsubscribe?error=update_failed', appUrl)
      )
    }

    // Log dell'operazione per tracciamento
    await getSupabaseAdmin().from('notification_logs').insert({
      user_id: user.id,
      notification_type: 'newsletter_unsubscribe',
      channel: 'email',
      subject: 'Newsletter Unsubscribe',
      status: 'sent',
      metadata: { email: user.email, action: 'unsubscribed' }
    })

    console.log(`✅ Utente ${user.email} disiscritto dalla newsletter`)

    // Redirect a pagina conferma
    return NextResponse.redirect(
      new URL('/newsletter/unsubscribe?success=true', appUrl)
    )

  } catch (error) {
    console.error('❌ Errore unsubscribe:', error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    return NextResponse.redirect(
      new URL('/newsletter/unsubscribe?error=server_error', appUrl)
    )
  }
}
