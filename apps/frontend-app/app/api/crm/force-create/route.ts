/**
 * Endpoint per forzare la creazione delle entry CRM per lead assegnati
 * Utilizzato quando le entry non sono state create automaticamente
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client per operazioni amministrative (usa service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

    // Verifica che l'utente sia PRO
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (userError || userData?.plan !== 'pro') {
      return NextResponse.json({ error: 'PRO plan required' }, { status: 403 });
    }

    // Trova tutti i lead assegnati all'utente
    const { data: assignedLeads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, business_name')
      .eq('assigned_to', user.id);

    if (leadsError) {
      return NextResponse.json({ error: 'Failed to fetch assigned leads' }, { status: 500 });
    }

    if (!assignedLeads || assignedLeads.length === 0) {
      return NextResponse.json({ 
        message: 'No assigned leads found',
        created_count: 0
      });
    }

    // Trova le entry CRM esistenti
    const { data: existingEntries, error: entriesError } = await supabaseAdmin
      .from('crm_entries')
      .select('lead_id')
      .eq('user_id', user.id);

    if (entriesError) {
      return NextResponse.json({ error: 'Failed to check existing entries' }, { status: 500 });
    }

    const existingLeadIds = new Set(existingEntries?.map(e => e.lead_id) || []);
    
    // Filtra i lead che non hanno ancora entry CRM
    const leadsToCreate = assignedLeads.filter(lead => !existingLeadIds.has(lead.id));

    if (leadsToCreate.length === 0) {
      return NextResponse.json({ 
        message: 'All assigned leads already have CRM entries',
        created_count: 0,
        existing_count: existingEntries?.length || 0
      });
    }

    // Crea le entry CRM mancanti
    const newEntries = leadsToCreate.map(lead => ({
      user_id: user.id,
      lead_id: lead.id,
      status: 'to_contact',
      note: null,
      follow_up_date: null,
      attachments: []
    }));

    const { data: createdEntries, error: createError } = await supabaseAdmin
      .from('crm_entries')
      .insert(newEntries)
      .select('id, lead_id');

    if (createError) {
      console.error('Failed to create CRM entries:', createError);
      return NextResponse.json({ error: 'Failed to create CRM entries' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdEntries?.length || 0} new CRM entries`,
      created_count: createdEntries?.length || 0,
      existing_count: existingEntries?.length || 0,
      total_assigned_leads: assignedLeads.length,
      created_for_leads: leadsToCreate.map(l => ({ id: l.id, name: l.business_name }))
    });

  } catch (error) {
    console.error('Error in force-create API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
