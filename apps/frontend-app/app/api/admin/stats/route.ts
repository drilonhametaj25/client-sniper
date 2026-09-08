/**
 * API per statistiche amministrative generali
 * Utilizzato nel pannello admin per mostrare metrics di sistema
 * Endpoint: GET /api/admin/stats
 * Richiede: utente autenticato con role='admin' (oltre al middleware globale)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/auth';

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.errorResponse) return auth.errorResponse
    const { admin } = auth

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
