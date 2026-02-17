/**
 * API Route per richiedere reset password
 * Usato per: Inviare email di reset password tramite Supabase
 * Chiamato da: Form in /forgot-password
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Usa service role per operazioni admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email richiesta' },
        { status: 400 }
      )
    }

    // Valida formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trovami.pro'

    // Invia email di reset tramite Supabase
    // Supabase gestisce automaticamente:
    // - Verifica se l'email esiste
    // - Generazione del token
    // - Invio dell'email
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`
    })

    if (error) {
      console.error('Errore Supabase resetPasswordForEmail:', error)

      // Non rivelare se l'email esiste o meno per motivi di sicurezza
      // Restituisci sempre successo per prevenire email enumeration
      return NextResponse.json({
        success: true,
        message: 'Se l\'indirizzo email esiste nel nostro sistema, riceverai un\'email con le istruzioni per reimpostare la password.'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Se l\'indirizzo email esiste nel nostro sistema, riceverai un\'email con le istruzioni per reimpostare la password.'
    })

  } catch (error: any) {
    console.error('Errore API forgot-password:', error)

    return NextResponse.json(
      { error: 'Errore durante l\'elaborazione della richiesta' },
      { status: 500 }
    )
  }
}
