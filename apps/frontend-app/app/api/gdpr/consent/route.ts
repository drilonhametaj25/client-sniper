/**
 * API endpoint per gestire consensi GDPR
 * Usato per: Registrare e gestire consensi utente per cookie e tracking
 * Chiamato da: CookieConsent component, account settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ConsentRequest {
  consents: {
    essential: boolean
    functional: boolean
    analytics: boolean
    marketing: boolean
  }
  timestamp: string
  userAgent?: string
  source: string
}

export async function POST(request: NextRequest) {
  try {
    const { consents, timestamp, userAgent, source }: ConsentRequest = await request.json()

    // Ottieni informazioni utente se disponibili
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    let userEmail: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      // Qui dovresti validare il token JWT se necessario
      // Per ora assumiamo che l'utente sia autenticato tramite Supabase
    }

    // IP address per tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Genera session ID se utente non autenticato
    const sessionId = request.headers.get('x-session-id') || 
                     crypto.randomUUID()

    // Registra ogni tipo di consenso
    const consentTypes = [
      { type: 'essential', granted: consents.essential, purpose: 'Funzionalità essenziali del servizio' },
      { type: 'functional', granted: consents.functional, purpose: 'Miglioramenti esperienza utente' },
      { type: 'analytics', granted: consents.analytics, purpose: 'Analisi utilizzo del sito' },
      { type: 'marketing', granted: consents.marketing, purpose: 'Pubblicità personalizzata' }
    ]

    for (const consent of consentTypes) {
      try {
        // Inserisci nella tabella user_consents
        const { error: consentError } = await supabase
          .from('user_consents')
          .insert({
            user_id: userId,
            email: userEmail || `session_${sessionId}@temp.local`,
            consent_type: consent.type,
            purpose: consent.purpose,
            granted: consent.granted,
            granted_at: consent.granted ? timestamp : null,
            revoked_at: consent.granted ? null : timestamp,
            ip_address: ipAddress,
            user_agent: userAgent,
            source_page: source,
            legal_basis: consent.type === 'essential' ? 'contract' : 'consent'
          })

        if (consentError) {
          console.error(`Errore registrazione consenso ${consent.type}:`, consentError)
        }

        // Inserisci nella tabella cookie_consents per tracking specifico
        const { error: cookieError } = await supabase
          .from('cookie_consents')
          .insert({
            session_id: sessionId,
            user_id: userId,
            cookie_category: consent.type,
            cookie_name: `clientsniper_${consent.type}`,
            purpose: consent.purpose,
            consented: consent.granted,
            consent_date: timestamp,
            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 anno
            ip_address: ipAddress,
            user_agent: userAgent
          })

        if (cookieError) {
          console.error(`Errore registrazione cookie ${consent.type}:`, cookieError)
        }

      } catch (error) {
        console.error(`Errore processing consenso ${consent.type}:`, error)
      }
    }

    // Log attività GDPR generale
    try {
      const { error: logError } = await supabase
        .from('gdpr_activity_log')
        .insert({
          user_id: userId,
          email: userEmail || `session_${sessionId}@temp.local`,
          activity_type: 'consent_change',
          description: `Consensi aggiornati da ${source}`,
          request_details: {
            consents,
            source,
            sessionId: !userId ? sessionId : undefined
          },
          status: 'completed',
          completed_at: timestamp,
          ip_address: ipAddress,
          user_agent: userAgent
        })

      if (logError) {
        console.error('Errore log GDPR:', logError)
      }
    } catch (error) {
      console.error('Errore logging GDPR:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Consensi registrati con successo',
      sessionId: !userId ? sessionId : undefined
    })

  } catch (error) {
    console.error('Errore API consensi:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const email = searchParams.get('email')
    const userId = searchParams.get('userId')

    if (action === 'export' && (email || userId)) {
      // Richiesta export dati
      const { data: consents, error: consentsError } = await supabase
        .from('user_consents')
        .select('*')
        .or(userId ? `user_id.eq.${userId}` : `email.eq.${email}`)
        .order('created_at', { ascending: false })

      const { data: activities, error: activitiesError } = await supabase
        .from('gdpr_activity_log')
        .select('*')
        .or(userId ? `user_id.eq.${userId}` : `email.eq.${email}`)
        .order('requested_at', { ascending: false })

      const { data: cookies, error: cookiesError } = await supabase
        .from('cookie_consents')
        .select('*')
        .or(userId ? `user_id.eq.${userId}` : `email.eq.${email}`)
        .order('consent_date', { ascending: false })

      if (consentsError || activitiesError || cookiesError) {
        return NextResponse.json(
          { error: 'Errore recupero dati' },
          { status: 500 }
        )
      }

      // Log richiesta export
      await supabase
        .from('gdpr_activity_log')
        .insert({
          user_id: userId,
          email: email,
          activity_type: 'data_export',
          description: 'Export dati GDPR richiesto',
          status: 'completed',
          completed_at: new Date().toISOString()
        })

      return NextResponse.json({
        success: true,
        data: {
          consents,
          activities,
          cookies,
          exportDate: new Date().toISOString()
        }
      })
    }

    if (action === 'stats') {
      // Statistiche consensi (solo per admin)
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.includes('admin')) {
        return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
      }

      const { data: stats, error } = await supabase
        .from('gdpr_compliance_stats')
        .select('*')
        .limit(12)

      if (error) {
        return NextResponse.json({ error: 'Errore statistiche' }, { status: 500 })
      }

      return NextResponse.json({ stats })
    }

    return NextResponse.json({ error: 'Azione non supportata' }, { status: 400 })

  } catch (error) {
    console.error('Errore GET API consensi:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { email, userId, reason } = await request.json()

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Email o User ID richiesto' },
        { status: 400 }
      )
    }

    // Genera token di verifica
    const verificationToken = crypto.randomUUID()

    // Crea richiesta di cancellazione
    const { data: deleteRequest, error: requestError } = await supabase
      .from('data_deletion_requests')
      .insert({
        user_id: userId,
        email: email,
        reason: reason || 'Richiesta cancellazione dati GDPR',
        data_categories: ['all'],
        verification_token: verificationToken,
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      console.error('Errore creazione richiesta cancellazione:', requestError)
      return NextResponse.json(
        { error: 'Errore creazione richiesta' },
        { status: 500 }
      )
    }

    // Log attività
    await supabase
      .from('gdpr_activity_log')
      .insert({
        user_id: userId,
        email: email,
        activity_type: 'data_deletion',
        description: 'Richiesta cancellazione dati',
        request_details: { reason, token: verificationToken },
        status: 'pending'
      })

    // TODO: Invia email di verifica con link per confermare cancellazione
    // La cancellazione effettiva dovrebbe avvenire solo dopo verifica

    return NextResponse.json({
      success: true,
      message: 'Richiesta di cancellazione creata. Riceverai un\'email di verifica.',
      requestId: deleteRequest.id,
      verificationRequired: true
    })

  } catch (error) {
    console.error('Errore DELETE API consensi:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
