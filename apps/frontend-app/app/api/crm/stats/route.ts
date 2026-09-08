/**
 * API per statistiche CRM - Endpoint per recuperare metriche e contatori
 * Restituisce contatori per stati, follow-up scaduti e totali
 * Solo per utenti PRO autenticati
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api/auth';
import { isStarterOrHigher } from '@/lib/utils/plan-helpers';

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Verifica autenticazione
    const auth = await requireUser(req);
    if (auth.errorResponse) return auth.errorResponse;
    const { user, admin } = auth;

    // Verifica piano PRO o superiore
    const { data: userData } = await admin
      .from('users')
      .select('plan, status')
      .eq('id', user.id)
      .single();

    if (!userData || !isStarterOrHigher(userData.plan || '')) {
      return NextResponse.json(
        {
          error: 'Access denied. CRM is available for Starter and Agency users only.',
          currentPlan: userData?.plan || 'free'
        },
        { status: 403 }
      );
    }

    // Recupera statistiche CRM usando la funzione RPC
    const { data: stats, error } = await admin
      .rpc('get_user_crm_stats');

    if (error) {
      console.error('Errore nel recupero statistiche CRM:', error);
      return NextResponse.json({ error: 'Errore nel recupero statistiche' }, { status: 500 });
    }

    return NextResponse.json(stats?.[0] || {
      total_entries: 0,
      to_contact: 0,
      in_negotiation: 0,
      closed_positive: 0,
      closed_negative: 0,
      on_hold: 0,
      follow_up: 0,
      overdue_follow_ups: 0
    });

  } catch (error) {
    console.error('Errore API statistiche CRM:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
