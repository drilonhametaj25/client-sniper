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
    console.log('🔔 Webhook auth chiamato')
    console.log('📅 Timestamp:', new Date().toISOString())
    console.log('🔗 URL chiamante:', request.url)
    
    // Log headers per debug
    const headers = Object.fromEntries(request.headers.entries())
    console.log('📋 Headers ricevuti:', {
      authorization: headers.authorization ? 'presente' : 'mancante',
      'content-type': headers['content-type'],
      'user-agent': headers['user-agent']
    })

    // Verifica che la richiesta provenga da Supabase
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET

    console.log('🔐 Verifica auth:', {
      hasAuthHeader: !!authHeader,
      hasSecret: !!expectedSecret,
      secretLength: expectedSecret?.length || 0
    })

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      console.error('❌ Autorizzazione fallita')
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.text()
    console.log('📄 Body ricevuto (primi 200 char):', body.substring(0, 200))

    let event: SupabaseAuthEvent
    try {
      event = JSON.parse(body)
    } catch (parseError) {
      console.error('❌ Errore parsing JSON:', parseError)
      return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
    }
    
    console.log('🔔 Evento webhook ricevuto:', {
      type: event.type,
      table: event.table,
      schema: event.schema,
      recordId: event.record?.id,
      userEmail: event.record?.email,
      emailConfirmed: event.record?.email_confirmed_at
    })

    // Gestisci eventi della tabella auth.users
    if (event.table !== 'users' || event.schema !== 'auth') {
      console.log('ℹ️ Evento ignorato - non è auth.users')
      return NextResponse.json({ received: true, ignored: true })
    }

    const user = event.record
    
    if (!user || !user.email) {
      console.log('⚠️ Evento ignorato - mancano dati utente')
      return NextResponse.json({ received: true, ignored: true })
    }

    // Nuovo utente registrato (INSERT)
    if (event.type === 'INSERT') {
      console.log('👤 Processando nuovo utente:', user.email)
      
      try {
        // Crea record utente nella tabella custom users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            plan: 'free',
            credits_remaining: 2,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()

        if (userError) {
          console.error('❌ Errore creazione record utente:', userError)
        } else {
          console.log('✅ Record utente creato/aggiornato:', userData)
        }

        // Se l'email non è ancora confermata, invia email di conferma personalizzata
        if (!user.email_confirmed_at && user.confirmation_token) {
          console.log('📧 Inviando email di conferma personalizzata via Resend')
          
          const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://client-sniper-frontend-app.vercel.app'}/auth/confirm?token=${user.confirmation_token}&type=signup`
          
          try {
            const emailSent = await emailService.sendConfirmationEmail(
              user.email,
              confirmationUrl
            )

            if (emailSent) {
              console.log('✅ Email di conferma inviata')
            } else {
              console.log('⚠️ Email di conferma non inviata (errore servizio)')
            }
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
      console.log('✅ Utente ha confermato email:', user.email)
      
      const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://client-sniper-frontend-app.vercel.app'}/dashboard`
      
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
