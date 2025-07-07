/**
 * Endpoint di debug per controllare stato CRM e lead assegnati
 * Aiuta a debuggare problemi con entry CRM mancanti
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

    // Raccoglie informazioni di debug
    const debugInfo: any = {
      user_id: user.id,
      user_email: user.email,
      timestamp: new Date().toISOString()
    };

    // 1. Controlla profilo utente
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    debugInfo.user_profile = {
      found: !userError,
      error: userError?.message,
      data: userProfile
    };

    // 2. Controlla lead assegnati
    const { data: assignedLeads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, business_name, assigned_to, created_at')
      .eq('assigned_to', user.id);

    debugInfo.assigned_leads = {
      count: assignedLeads?.length || 0,
      error: leadsError?.message,
      sample: assignedLeads?.slice(0, 3) // Prime 3 per debug
    };

    // 3. Controlla entry CRM esistenti
    const { data: crmEntries, error: crmError } = await supabaseAdmin
      .from('crm_entries')
      .select('*')
      .eq('user_id', user.id);

    debugInfo.crm_entries = {
      count: crmEntries?.length || 0,
      error: crmError?.message,
      sample: crmEntries?.slice(0, 3) // Prime 3 per debug
    };

    // 4. Testa funzioni RPC
    try {
      const { data: rpcTest, error: rpcError } = await supabaseAdmin
        .rpc('get_user_crm_entries');
      
      debugInfo.rpc_test = {
        success: !rpcError,
        error: rpcError?.message,
        result_count: rpcTest?.length || 0
      };
    } catch (e) {
      debugInfo.rpc_test = {
        success: false,
        error: 'RPC function not found or failed',
        exception: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // 5. Controlla se la tabella CRM esiste
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('crm_entries')
      .select('id')
      .limit(1);

    debugInfo.table_check = {
      exists: !tableError,
      error: tableError?.message
    };

    return NextResponse.json({
      debug_info: debugInfo,
      suggestions: [
        (assignedLeads?.length || 0) > 0 && (crmEntries?.length || 0) === 0 ? 
          'Found assigned leads but no CRM entries - entries should be auto-created' : null,
        userProfile?.plan !== 'pro' ? 
          'User is not on PRO plan - CRM access restricted' : null,
        debugInfo.rpc_test?.success === false ? 
          'RPC functions not working - using direct queries as fallback' : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
