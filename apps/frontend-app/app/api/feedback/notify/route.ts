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
import { requireAdmin } from '@/lib/api/auth'
import smtpEmail from '@/lib/services/smtp-email'

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
    const auth = await requireAdmin(request)
    if (auth.errorResponse) return auth.errorResponse

    const { admin } = auth

    // Recupera dettagli feedback
    const { data: feedback, error } = await admin
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
      const { data: feedbackUser } = await admin
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
