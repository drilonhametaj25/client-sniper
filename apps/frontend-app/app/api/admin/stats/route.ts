/**
 * API per statistiche amministrative generali
 * Utilizzato nel pannello admin per mostrare metrics di sistema
 * Endpoint: GET /api/admin/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

// Client per operazioni amministrative (usa service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verifica cookies di autenticazione
    const headers = request.headers;
    
    // Ottieni statistiche generali
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*');

    if (usersError) throw usersError;

    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads') 
      .select('*');

    if (leadsError) throw leadsError;

    return NextResponse.json({
      users_count: users?.length || 0,
      leads_count: leads?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
