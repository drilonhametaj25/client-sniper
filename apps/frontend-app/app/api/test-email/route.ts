/**
 * API endpoint per test invio email
 * Usato per: Testare il servizio email Resend
 * Chiamato da: Test manuali
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email richiesta' }, { status: 400 })
    }

    let result = false

    if (type === 'confirmation') {
      const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token=test-token&email=${encodeURIComponent(email)}`
      result = await emailService.sendConfirmationEmail(email, confirmationUrl)
    } else if (type === 'welcome') {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
      result = await emailService.sendWelcomeEmail(email, dashboardUrl)
    } else {
      return NextResponse.json({ error: 'Tipo non valido. Usa: confirmation o welcome' }, { status: 400 })
    }

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: `Email ${type} inviata a ${email}` 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Errore invio email' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Errore API email:', error)
    return NextResponse.json({ 
      error: 'Errore interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
