/**
 * API per statistiche amministrative generali
 * Utilizzato nel pannello admin per mostrare metrics di sistema
 * Endpoint: GET /api/admin/stats
 * Richiede: utente autenticato con role='admin' (oltre al middleware globale)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser } from '@/lib/auth-middleware';

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

// Client per operazioni amministrative (usa service role)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticateUser(request)
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accesso riservato agli admin' }, { status: 403 })
    }

    // Conteggi senza caricare le tabelle in memoria
    const [usersCount, leadsCount] = await Promise.all([
      admin.from('users').select('*', { count: 'exact', head: true }),
      admin.from('leads').select('*', { count: 'exact', head: true }),
    ])

    if (usersCount.error) throw usersCount.error
    if (leadsCount.error) throw leadsCount.error

    return NextResponse.json({
      users_count: usersCount.count ?? 0,
      leads_count: leadsCount.count ?? 0,
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
