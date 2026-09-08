/**
 * API per operazioni bulk su CRM entries
 * Permette cambio stato, eliminazione e aggiornamento multiplo
 * Solo per utenti PRO autenticati
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { isStarterOrHigher } from '@/lib/utils/plan-helpers'

export const dynamic = 'force-dynamic'

// Stati CRM validi
const VALID_STATUSES = [
  'to_contact',
  'in_negotiation',
  'closed_positive',
  'closed_negative',
  'on_hold',
  'follow_up'
]

// Azioni supportate
type BulkAction = 'change_status' | 'delete' | 'set_follow_up' | 'clear_follow_up' | 'add_note'

interface BulkRequest {
  entry_ids: string[]
  action: BulkAction
  value?: string // nuovo stato, data follow-up, o nota
}

export async function PATCH(request: NextRequest) {
  try {
    // Verifica autenticazione
    const auth = await requireUser(request)
    if (auth.errorResponse) return auth.errorResponse
    const { user, admin } = auth

    // Verifica piano PRO
    const { data: userData } = await admin
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (!userData || !isStarterOrHigher(userData.plan || '')) {
      return NextResponse.json({
        error: 'Piano Starter richiesto per operazioni bulk'
      }, { status: 403 })
    }

    // Leggi body
    const body: BulkRequest = await request.json()
    const { entry_ids, action, value } = body

    // Validazione
    if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
      return NextResponse.json({
        error: 'entry_ids deve essere un array non vuoto'
      }, { status: 400 })
    }

    if (entry_ids.length > 100) {
      return NextResponse.json({
        error: 'Massimo 100 entries per operazione bulk'
      }, { status: 400 })
    }

    if (!action) {
      return NextResponse.json({
        error: 'action richiesta: change_status | delete | set_follow_up | clear_follow_up | add_note'
      }, { status: 400 })
    }

    // Verifica che le entry appartengano all'utente
    const { data: userEntries, error: checkError } = await admin
      .from('crm_entries')
      .select('id')
      .eq('user_id', user.id)
      .in('id', entry_ids)

    if (checkError) {
      console.error('Bulk check error:', checkError)
      return NextResponse.json({ error: 'Errore verifica entries' }, { status: 500 })
    }

    const validEntryIds = userEntries?.map(e => e.id) || []
    const invalidCount = entry_ids.length - validEntryIds.length

    if (validEntryIds.length === 0) {
      return NextResponse.json({
        error: 'Nessuna entry valida trovata per questo utente'
      }, { status: 404 })
    }

    let result: { updated: number; deleted: number; errors: string[] } = {
      updated: 0,
      deleted: 0,
      errors: []
    }

    // Esegui azione
    switch (action) {
      case 'change_status':
        if (!value || !VALID_STATUSES.includes(value)) {
          return NextResponse.json({
            error: `Stato non valido. Valori accettati: ${VALID_STATUSES.join(', ')}`
          }, { status: 400 })
        }

        const { error: statusError, count: statusCount } = await admin
          .from('crm_entries')
          .update({
            status: value,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .in('id', validEntryIds)

        if (statusError) {
          console.error('Bulk status update error:', statusError)
          result.errors.push('Errore aggiornamento stato')
        } else {
          result.updated = statusCount || validEntryIds.length
        }
        break

      case 'delete':
        const { error: deleteError, count: deleteCount } = await admin
          .from('crm_entries')
          .delete()
          .eq('user_id', user.id)
          .in('id', validEntryIds)

        if (deleteError) {
          console.error('Bulk delete error:', deleteError)
          result.errors.push('Errore eliminazione entries')
        } else {
          result.deleted = deleteCount || validEntryIds.length
        }
        break

      case 'set_follow_up':
        if (!value) {
          return NextResponse.json({
            error: 'Data follow-up richiesta (formato ISO)'
          }, { status: 400 })
        }

        // Verifica formato data
        const followUpDate = new Date(value)
        if (isNaN(followUpDate.getTime())) {
          return NextResponse.json({
            error: 'Formato data non valido'
          }, { status: 400 })
        }

        const { error: followUpError, count: followUpCount } = await admin
          .from('crm_entries')
          .update({
            follow_up_date: value,
            status: 'follow_up', // Imposta automaticamente lo stato
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .in('id', validEntryIds)

        if (followUpError) {
          console.error('Bulk follow-up error:', followUpError)
          result.errors.push('Errore impostazione follow-up')
        } else {
          result.updated = followUpCount || validEntryIds.length
        }
        break

      case 'clear_follow_up':
        const { error: clearError, count: clearCount } = await admin
          .from('crm_entries')
          .update({
            follow_up_date: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .in('id', validEntryIds)

        if (clearError) {
          console.error('Bulk clear follow-up error:', clearError)
          result.errors.push('Errore rimozione follow-up')
        } else {
          result.updated = clearCount || validEntryIds.length
        }
        break

      case 'add_note':
        if (!value) {
          return NextResponse.json({
            error: 'Nota richiesta'
          }, { status: 400 })
        }

        // Per le note, aggiungiamo in append con timestamp
        const noteTimestamp = new Date().toLocaleString('it-IT')
        const notePrefix = `[${noteTimestamp}] `

        // Recupera note esistenti e aggiungi
        const { data: currentEntries } = await admin
          .from('crm_entries')
          .select('id, note')
          .eq('user_id', user.id)
          .in('id', validEntryIds)

        let noteUpdated = 0
        for (const entry of currentEntries || []) {
          const existingNote = entry.note || ''
          const newNote = existingNote
            ? `${existingNote}\n${notePrefix}${value}`
            : `${notePrefix}${value}`

          const { error: noteError } = await admin
            .from('crm_entries')
            .update({
              note: newNote,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id)
            .eq('user_id', user.id)

          if (!noteError) {
            noteUpdated++
          }
        }
        result.updated = noteUpdated
        break

      default:
        return NextResponse.json({
          error: `Azione non supportata: ${action}`
        }, { status: 400 })
    }

    // Risposta
    return NextResponse.json({
      success: true,
      action,
      requested: entry_ids.length,
      valid: validEntryIds.length,
      invalid: invalidCount,
      result
    })

  } catch (error) {
    console.error('CRM bulk error:', error)
    return NextResponse.json({
      error: 'Errore operazione bulk',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
