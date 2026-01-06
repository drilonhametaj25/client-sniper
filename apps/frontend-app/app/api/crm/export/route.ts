/**
 * API per esportazione dati CRM
 * Supporta formato CSV con filtri per stato e data
 * Solo per utenti PRO autenticati
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isProOrHigher } from '@/lib/utils/plan-helpers'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Stati CRM disponibili
const CRM_STATUSES = [
  'to_contact',
  'in_negotiation',
  'closed_positive',
  'closed_negative',
  'on_hold',
  'follow_up'
]

// Mappa stati per export leggibile
const STATUS_LABELS: Record<string, string> = {
  to_contact: 'Da Contattare',
  in_negotiation: 'In Trattativa',
  closed_positive: 'Chiuso Positivo',
  closed_negative: 'Chiuso Negativo',
  on_hold: 'In Attesa',
  follow_up: 'Follow-up'
}

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verifica piano PRO
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('plan, status')
      .eq('id', user.id)
      .single()

    if (!userData || !isProOrHigher(userData.plan || '')) {
      return NextResponse.json({
        error: 'Piano PRO richiesto per export'
      }, { status: 403 })
    }

    // Parametri di query
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv' // csv | json
    const status = searchParams.get('status') // filtro per stato
    const from = searchParams.get('from') // data inizio (ISO string)
    const to = searchParams.get('to') // data fine (ISO string)

    // Query CRM entries con dati lead
    let query = supabaseAdmin
      .from('crm_entries')
      .select(`
        id,
        lead_id,
        status,
        note,
        follow_up_date,
        created_at,
        updated_at,
        leads!crm_entries_lead_id_fkey (
          business_name,
          website_url,
          city,
          category,
          score,
          phone,
          email,
          address
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    // Applica filtri
    if (status && CRM_STATUSES.includes(status)) {
      query = query.eq('status', status)
    }
    if (from) {
      query = query.gte('created_at', from)
    }
    if (to) {
      query = query.lte('created_at', to)
    }

    const { data: entries, error: queryError } = await query

    if (queryError) {
      console.error('Export query error:', queryError)
      return NextResponse.json({ error: 'Errore nel recupero dati' }, { status: 500 })
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'Nessun dato da esportare' }, { status: 404 })
    }

    // Prepara dati per export
    const exportData = entries.map((entry: any) => ({
      id: entry.id,
      lead_id: entry.lead_id,
      business_name: entry.leads?.business_name || '',
      website: entry.leads?.website_url || '',
      phone: entry.leads?.phone || '',
      email: entry.leads?.email || '',
      city: entry.leads?.city || '',
      category: entry.leads?.category || '',
      address: entry.leads?.address || '',
      score: entry.leads?.score || 0,
      status: STATUS_LABELS[entry.status] || entry.status,
      status_code: entry.status,
      note: entry.note || '',
      follow_up_date: entry.follow_up_date || '',
      created_at: entry.created_at,
      updated_at: entry.updated_at
    }))

    // Export in formato richiesto
    if (format === 'json') {
      return NextResponse.json({
        exported_at: new Date().toISOString(),
        total_records: exportData.length,
        data: exportData
      })
    }

    // Default: CSV
    const csvContent = generateCSV(exportData)
    const filename = `crm-export-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('CRM export error:', error)
    return NextResponse.json({
      error: 'Errore durante export',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Genera contenuto CSV dai dati
 */
function generateCSV(data: any[]): string {
  if (data.length === 0) return ''

  // Headers
  const headers = [
    'ID',
    'Azienda',
    'Sito Web',
    'Telefono',
    'Email',
    'Città',
    'Categoria',
    'Indirizzo',
    'Score',
    'Stato',
    'Note',
    'Data Follow-up',
    'Data Creazione',
    'Ultimo Aggiornamento'
  ]

  // Rows
  const rows = data.map(item => [
    item.id,
    escapeCSV(item.business_name),
    escapeCSV(item.website),
    escapeCSV(item.phone),
    escapeCSV(item.email),
    escapeCSV(item.city),
    escapeCSV(item.category),
    escapeCSV(item.address),
    item.score,
    escapeCSV(item.status),
    escapeCSV(item.note),
    item.follow_up_date ? formatDate(item.follow_up_date) : '',
    formatDate(item.created_at),
    formatDate(item.updated_at)
  ])

  // BOM per Excel compatibility + content
  const BOM = '\uFEFF'
  const csvLines = [
    headers.join(';'), // Usa ; per migliore compatibilità con Excel italiano
    ...rows.map(row => row.join(';'))
  ]

  return BOM + csvLines.join('\n')
}

/**
 * Escape valore per CSV
 */
function escapeCSV(value: string | null | undefined): string {
  if (!value) return ''
  const str = String(value)
  // Se contiene separatore, virgolette o newline, wrappa in virgolette
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Formatta data per export
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}
