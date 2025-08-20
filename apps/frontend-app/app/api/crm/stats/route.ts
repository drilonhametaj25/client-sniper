/**
 * API per statistiche CRM - Endpoint per recuperare metriche e contatori
 * Restituisce contatori per stati, follow-up scaduti e totali
 * Solo per utenti PRO autenticati
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isProOrHigher } from '@/lib/utils/plan-helpers';

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

// Client per operazioni amministrative (usa service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token di autorizzazione mancante' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verifica il JWT usando service role
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }

    // Verifica piano PRO o superiore
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('plan, status')
      .eq('id', user.id)
      .single();

    if (!userData || !isProOrHigher(userData.plan || '')) {
      return NextResponse.json(
        { 
          error: 'Access denied. CRM is available for PRO and AGENCY users only.',
          currentPlan: userData?.plan || 'free'
        }, 
        { status: 403 }
      );
    }

    // Recupera statistiche CRM usando la funzione RPC
    const { data: stats, error } = await supabaseAdmin
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
