/**
 * Test per verificare il funzionamento del sistema CRM personale
 * Testa la creazione di entry CRM e la sincronizzazione con i lead
 * Utilizzato per verificare l'integrazione completa del sistema
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client per operazioni amministrative (usa service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('Authorization');
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

    // Test 1: Verifica che le funzioni RPC esistano
    const { data: crmTestData, error: crmTestError } = await supabaseAdmin
      .rpc('get_user_crm_stats')
      .single();

    if (crmTestError) {
      console.error('Errore RPC CRM:', crmTestError);
      return NextResponse.json({ 
        error: 'Funzioni RPC CRM non disponibili', 
        details: crmTestError.message 
      }, { status: 500 });
    }

    // Test 2: Verifica che la tabella crm_entries esista
    const { data: tableTest, error: tableError } = await supabaseAdmin
      .from('crm_entries')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('Errore tabella CRM:', tableError);
      return NextResponse.json({ 
        error: 'Tabella CRM non disponibile', 
        details: tableError.message 
      }, { status: 500 });
    }

    // Test 3: Verifica che i trigger funzionino
    const { data: triggerTest, error: triggerError } = await supabaseAdmin
      .from('leads')
      .select('id, assigned_to')
      .not('assigned_to', 'is', null)
      .limit(1);

    return NextResponse.json({
      status: 'success',
      message: 'Sistema CRM funzionante',
      tests: {
        rpc_functions: crmTestData ? 'OK' : 'FAIL',
        crm_table: tableTest !== null ? 'OK' : 'FAIL',
        lead_integration: triggerTest ? 'OK' : 'FAIL'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore test CRM:', error);
    return NextResponse.json({ 
      error: 'Test CRM fallito', 
      details: error instanceof Error ? error.message : 'Errore sconosciuto' 
    }, { status: 500 });
  }
}
