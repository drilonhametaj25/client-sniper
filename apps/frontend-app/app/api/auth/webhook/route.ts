/**
 * Webhook per eventi di autenticazione Supabase
 * Usato per: Intercettare registrazioni e inviare email personalizzate
 * Chiamato da: Supabase Auth quando avvengono eventi di signup/confirm
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailService } from '@/lib/email-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SupabaseAuthEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: any
  schema: string
  old_record: any
}

export async function POST(request: NextRequest) {
  try {
    // Verifica che la richiesta provenga da Supabase
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const event: SupabaseAuthEvent = await request.json()
    
    console.log('🔔 Webhook auth ricevuto:', {
      type: event.type,
      table: event.table,
      userId: event.record?.id
    })

    // Gestisci eventi della tabella auth.users
    if (event.table !== 'users') {
      return NextResponse.json({ received: true })
    }

    const user = event.record
    
    // Nuovo utente registrato (INSERT)
    if (event.type === 'INSERT' && user && user.email && !user.email_confirmed_at) {
      console.log('👤 Nuovo utente registrato:', user.email)
      
      // Genera URL di conferma personalizzato
      const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm?token=${user.confirmation_token}&type=signup&redirect_to=${encodeURIComponent('/dashboard')}`
      
      // Invia email di conferma personalizzata
      const emailSent = await emailService.sendConfirmationEmail(
        user.email,
        confirmationUrl
      )

      if (emailSent) {
        console.log('✅ Email di conferma personalizzata inviata a:', user.email)
      } else {
        console.error('❌ Errore invio email di conferma a:', user.email)
      }

      // Crea record utente nella tabella custom users se non esiste
      try {
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            plan: 'free',
            credits_remaining: 2,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })

        if (userError) {
          console.error('Errore creazione record utente:', userError)
        } else {
          console.log('✅ Record utente creato nella tabella custom')
        }
      } catch (error) {
        console.error('Errore database:', error)
      }
    }

    // Utente ha confermato l'email (UPDATE)
    if (event.type === 'UPDATE' && user && user.email && user.email_confirmed_at && !event.old_record?.email_confirmed_at) {
      console.log('✅ Utente ha confermato l\'email:', user.email)
      
      const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`
      
      // Invia email di benvenuto
      const welcomeSent = await emailService.sendWelcomeEmail(
        user.email,
        dashboardUrl
      )

      if (welcomeSent) {
        console.log('🎉 Email di benvenuto inviata a:', user.email)
      } else {
        console.error('❌ Errore invio email di benvenuto a:', user.email)
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Errore webhook auth:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
