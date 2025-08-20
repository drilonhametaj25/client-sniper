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

    // Log headers per debug
    const headers = Object.fromEntries(request.headers.entries())


    // Verifica che la richiesta provenga da Supabase
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET


    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      console.error('❌ Autorizzazione fallita')
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.text()

    let event: SupabaseAuthEvent
    try {
      event = JSON.parse(body)
    } catch (parseError) {
      return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
    }
    
    // Gestisci eventi della tabella auth.users
    if (event.table !== 'users' || event.schema !== 'auth') {
      return NextResponse.json({ received: true, ignored: true })
    }

    const user = event.record
    
    if (!user || !user.email) {
      return NextResponse.json({ received: true, ignored: true })
    }

    // Nuovo utente registrato (INSERT)
    if (event.type === 'INSERT') {
      
      try {
        // Crea record utente nella tabella custom users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            plan: 'free',
            credits_remaining: 5,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()

        // Se l'email non è ancora confermata, invia email di conferma personalizzata
        if (!user.email_confirmed_at && user.confirmation_token) {
          
          const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trovami.pro'}/auth/confirm?token=${user.confirmation_token}&type=signup`
          
          try {
            const emailSent = await emailService.sendConfirmationEmail(
              user.email,
              confirmationUrl
            )

          } catch (emailError) {
            console.error('❌ Errore invio email:', emailError)
          }
        }

        return NextResponse.json({ 
          received: true, 
          processed: true, 
          action: 'user_created',
          userId: user.id 
        })

      } catch (error) {
        console.error('❌ Errore gestione nuovo utente:', error)
        return NextResponse.json({ 
          error: 'Errore interno', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 })
      }
    }

    // Utente ha confermato l'email (UPDATE)
    if (event.type === 'UPDATE' && user.email_confirmed_at && !event.old_record?.email_confirmed_at) {
      
      const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trovami.pro'}/dashboard`
      
      // Invia email di benvenuto
      const welcomeSent = await emailService.sendWelcomeEmail(
        user.email,
        dashboardUrl
      )
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
