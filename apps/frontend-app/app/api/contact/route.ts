/**
 * API endpoint per gestire messaggi di contatto
 * Usato per: Ricevere e processare richieste dal form contatti
 * Chiamato da: Pagina /contact
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailService } from '@/lib/email-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ContactRequest {
  name: string
  email: string
  subject: string
  message: string
  type: string
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message, type }: ContactRequest = await request.json()

    // Validazione base
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Tutti i campi obbligatori devono essere compilati' },
        { status: 400 }
      )
    }

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      )
    }

    // Salva nel database (opzionale - per tracking supporto)
    try {
      const { error: dbError } = await supabase
        .from('contact_messages')
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
          type: type || 'generale',
          created_at: new Date().toISOString(),
          status: 'nuovo'
        })

      if (dbError) {
        console.error('Errore salvataggio messaggio:', dbError)
        // Non fallire se il DB non è disponibile
      }
    } catch (dbError) {
      console.error('Errore database contatti:', dbError)
      // Continua anche se il salvataggio fallisce
    }

    // Invia email di notifica al team
    try {
      const notificationTemplate = {
        subject: `[TrovaMi] Nuovo messaggio: ${subject}`,
        html: `
          <h2>Nuovo messaggio di contatto</h2>
          <p><strong>Da:</strong> ${name} (${email})</p>
          <p><strong>Tipo:</strong> ${type}</p>
          <p><strong>Oggetto:</strong> ${subject}</p>
          <p><strong>Messaggio:</strong></p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
        `,
        text: `
Nuovo messaggio di contatto

Da: ${name} (${email})
Tipo: ${type}
Oggetto: ${subject}

Messaggio:
${message}

Data: ${new Date().toLocaleString('it-IT')}
        `
      }

      await emailService.sendEmail({
        to: 'support@trovami.pro',
        template: notificationTemplate
      })
    } catch (emailError) {
      console.error('Errore invio email notifica:', emailError)
      // Non fallire se l'email non va
    }

    // Invia email di conferma all'utente
    try {
      const confirmationTemplate = {
        subject: '✅ Messaggio ricevuto - TrovaMi',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Grazie per averci contattato!</h2>
            <p>Ciao ${name},</p>
            <p>Abbiamo ricevuto il tuo messaggio e ti risponderemo entro 24 ore.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #666;">Il tuo messaggio:</h3>
              <p><strong>Oggetto:</strong> ${subject}</p>
              <p><strong>Tipo:</strong> ${type}</p>
              <p><strong>Messaggio:</strong> ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}</p>
            </div>
             <p>Se hai bisogno di assistenza immediata, puoi anche scriverci direttamente a <a href="mailto:support@trovami.pro">support@trovami.pro</a>.</p>

            <p>Cordiali saluti,<br>Il Team TrovaMi</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              Questo è un messaggio automatico. Non rispondere a questa email.
            </p>
          </div>
        `,
        text: `
Grazie per averci contattato!

Ciao ${name},

Abbiamo ricevuto il tuo messaggio e ti risponderemo entro 24 ore.

Il tuo messaggio:
Oggetto: ${subject}
Tipo: ${type}
Messaggio: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}

Se hai bisogno di assistenza immediata, puoi anche scriverci direttamente a support@trovami.pro.

Cordiali saluti,
Il Team TrovaMi
        `
      }

      await emailService.sendEmail({
        to: email,
        template: confirmationTemplate
      })
    } catch (emailError) {
      console.error('Errore invio email conferma:', emailError)
      // Non fallire se l'email non va
    }

    return NextResponse.json({
      success: true,
      message: 'Messaggio inviato con successo. Ti risponderemo entro 24 ore.'
    })

  } catch (error) {
    console.error('Errore API contatti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server. Riprova più tardi.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Endpoint per statistiche supporto (solo admin)
  try {
    const authHeader = request.headers.get('authorization')
    
    // Basic auth check (implementare logica admin appropriata)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Statistiche messaggi ultimi 30 giorni
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: stats, error } = await supabase
      .from('contact_messages')
      .select('type, status, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('Errore fetch statistiche:', error)
      return NextResponse.json({ error: 'Errore database' }, { status: 500 })
    }

    // Aggrega statistiche
    const analytics = {
      total: stats?.length || 0,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      lastWeek: 0
    }

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    stats?.forEach(msg => {
      // Count by type
      analytics.byType[msg.type] = (analytics.byType[msg.type] || 0) + 1
      
      // Count by status  
      analytics.byStatus[msg.status] = (analytics.byStatus[msg.status] || 0) + 1
      
      // Count last week
      if (new Date(msg.created_at) >= oneWeekAgo) {
        analytics.lastWeek++
      }
    })

    return NextResponse.json({ analytics })

  } catch (error) {
    console.error('Errore statistiche contatti:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
