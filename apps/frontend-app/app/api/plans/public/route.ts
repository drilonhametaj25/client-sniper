/**
 * API pubblica per i piani di abbonamento - TrovaMi
 * Endpoint: GET /api/plans/public (nessuna auth richiesta)
 * Usato da: componenti pricing pubblici (landing, /pricing)
 * Fonte di verità: tabella `plans` (solo piani is_visible, ordinati per sort_order)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 300 // cache 5 minuti

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const { data: plans, error } = await getSupabaseAdmin()
      .from('plans')
      .select(
        'id, name, price_monthly, original_price_monthly, max_credits, is_unlimited, ' +
        'features, badge_text, sort_order, is_visible, ' +
        'has_daily_alerts, has_lead_history, has_csv_export, has_statistics, ' +
        'stripe_price_id_monthly, stripe_price_id_annual'
      )
      .eq('is_visible', true)
      .order('sort_order')

    if (error) {
      console.error('Errore caricamento piani pubblici:', error)
      return NextResponse.json(
        { success: false, error: 'Errore caricamento piani' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, plans: plans || [] })
  } catch (error) {
    console.error('Errore API plans/public:', error)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
