/**
 * API endpoint per gestire email personalizzate
 * Usato per: Inviare email di conferma, benvenuto e notifiche
 * Chiamato da: Sistema di autenticazione, webhook, dashboard admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailService } from '@/lib/email-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EmailRequest {
  type: 'confirmation' | 'welcome' | 'custom'
  to: string
  confirmationUrl?: string
  dashboardUrl?: string
  customTemplate?: {
    subject: string
    html: string
    text: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, to, confirmationUrl, dashboardUrl, customTemplate }: EmailRequest = await request.json()

    if (!to || !type) {
      return NextResponse.json(
        { error: 'Email destinatario e tipo sono richiesti' },
        { status: 400 }
      )
    }

    let success = false

    switch (type) {
      case 'confirmation':
        if (!confirmationUrl) {
          return NextResponse.json(
            { error: 'URL di conferma richiesto' },
            { status: 400 }
          )
        }
        success = await emailService.sendConfirmationEmail(to, confirmationUrl)
        break

      case 'welcome':
        if (!dashboardUrl) {
          return NextResponse.json(
            { error: 'URL dashboard richiesto' },
            { status: 400 }
          )
        }
        success = await emailService.sendWelcomeEmail(to, dashboardUrl)
        break

      case 'custom':
        if (!customTemplate) {
          return NextResponse.json(
            { error: 'Template personalizzato richiesto' },
            { status: 400 }
          )
        }
        success = await emailService.sendEmail({
          to,
          template: customTemplate
        })
        break

      default:
        return NextResponse.json(
          { error: 'Tipo email non supportato' },
          { status: 400 }
        )
    }

    if (success) {
      // Log dell'email inviata (opzionale)
      console.log(`✅ Email ${type} inviata a ${to}`)
      
      return NextResponse.json({
        success: true,
        message: 'Email inviata con successo'
      })
    } else {
      return NextResponse.json(
        { error: 'Errore durante l\'invio dell\'email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Errore API email:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Endpoint per testare il servizio email (solo in development)
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Non disponibile in produzione' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const testEmail = searchParams.get('email')

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Parametro email richiesto per il test' },
        { status: 400 }
      )
    }

    // Invia email di test
    const success = await emailService.sendConfirmationEmail(
      testEmail,
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://client-sniper-frontend-app.vercel.app'}/confirm?token=test123`
    )

    return NextResponse.json({
      success,
      message: success ? 'Email di test inviata' : 'Errore invio email di test'
    })

  } catch (error) {
    console.error('Errore test email:', error)
    return NextResponse.json(
      { error: 'Errore durante il test' },
      { status: 500 }
    )
  }
}
