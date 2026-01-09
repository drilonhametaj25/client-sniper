/**
 * API: Feedback Notify
 *
 * Endpoint per inviare email di notifica quando l'admin risponde a un feedback.
 * Solo admin autorizzati possono chiamare questo endpoint.
 *
 * Usato da: /admin/feedback (pannello admin)
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import smtpEmail from '@/lib/services/smtp-email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedbackId, adminResponse } = body

    if (!feedbackId || !adminResponse) {
      return NextResponse.json(
        { error: 'Parametri mancanti: feedbackId e adminResponse richiesti' },
        { status: 400 }
      )
    }

    // Verifica autorizzazione admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verifica utente
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso riservato agli admin' },
        { status: 403 }
      )
    }

    // Recupera dettagli feedback
    const { data: feedback, error } = await supabase
      .from('feedback_reports')
      .select('id, title, type, user_id, email')
      .eq('id', feedbackId)
      .single()

    if (error || !feedback) {
      return NextResponse.json(
        { error: 'Feedback non trovato' },
        { status: 404 }
      )
    }

    // Recupera email destinatario
    let recipientEmail = feedback.email

    // Se non c'è email nel feedback, prova a recuperarla dall'utente
    if (!recipientEmail && feedback.user_id) {
      const { data: feedbackUser } = await supabase
        .from('users')
        .select('email')
        .eq('id', feedback.user_id)
        .single()

      recipientEmail = feedbackUser?.email
    }

    // Se ancora non abbiamo email, non possiamo inviare
    if (!recipientEmail) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: 'Nessuna email disponibile per questo utente'
      })
    }

    // Invia email
    const emailSent = await smtpEmail.sendFeedbackResponseEmail(
      recipientEmail,
      feedback.title,
      feedback.type,
      adminResponse,
      feedbackId
    )

    console.log(`📧 Feedback notify: ${emailSent ? '✅ Email inviata' : '❌ Errore invio'} a ${recipientEmail}`)

    return NextResponse.json({
      success: true,
      emailSent,
      message: emailSent ? 'Email inviata con successo' : 'Errore durante l\'invio dell\'email'
    })

  } catch (error) {
    console.error('Error sending feedback notification:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
