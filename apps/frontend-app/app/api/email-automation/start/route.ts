/**
 * API: Start Email Sequence
 *
 * Avvia una sequenza email per un utente specifico.
 * Usato da:
 * - Signup flow (welcome sequence)
 * - Webhooks (post-action sequences)
 * - Admin panel (manual triggers)
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startSequence, SEQUENCES } from '@/lib/services/email-sequences'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, sequenceType, metadata, internal } = body

    // Verifica autorizzazione
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'development-secret'

    // Se è una chiamata interna (dal server) o ha il cron secret
    const isInternalCall = internal === true && authHeader === `Bearer ${cronSecret}`

    if (!isInternalCall) {
      // Verifica che sia un utente autenticato
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await getSupabase().auth.getUser(token)

      if (authError || !user) {
        return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
      }

      // Utente può solo avviare sequenze per se stesso
      if (userId && userId !== user.id) {
        return NextResponse.json({ error: 'Non puoi avviare sequenze per altri utenti' }, { status: 403 })
      }

      // Se non specificato userId, usa quello del token
      body.userId = body.userId || user.id
    }

    // Valida parametri
    if (!body.userId) {
      return NextResponse.json({ error: 'userId è richiesto' }, { status: 400 })
    }

    if (!sequenceType) {
      return NextResponse.json({ error: 'sequenceType è richiesto' }, { status: 400 })
    }

    // Verifica che il tipo sequenza esista
    if (!SEQUENCES[sequenceType as keyof typeof SEQUENCES]) {
      return NextResponse.json(
        {
          error: 'Tipo sequenza non valido',
          validTypes: Object.keys(SEQUENCES)
        },
        { status: 400 }
      )
    }

    // Avvia la sequenza
    const result = await startSequence(
      body.userId,
      sequenceType as keyof typeof SEQUENCES,
      metadata || {}
    )

    if (result.success) {
      console.log(`✅ Started ${sequenceType} sequence for user ${body.userId}`)
      return NextResponse.json({
        success: true,
        sequenceId: result.sequenceId,
        message: `Sequenza ${sequenceType} avviata con successo`
      })
    } else {
      console.log(`⚠️ Failed to start ${sequenceType} for user ${body.userId}: ${result.error}`)
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error starting sequence:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'email-automation-start',
    description: 'API per avviare sequenze email',
    availableSequences: Object.keys(SEQUENCES),
    usage: {
      method: 'POST',
      body: {
        userId: 'string (required)',
        sequenceType: 'string (required) - one of: ' + Object.keys(SEQUENCES).join(', '),
        metadata: 'object (optional) - additional data for the sequence'
      }
    }
  })
}
