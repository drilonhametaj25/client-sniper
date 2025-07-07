/**
 * API endpoint per gestione singolo lead CRM
 * Restituisce dettagli completi di un lead specifico con analisi e allegati
 * Solo per utenti PRO autenticati
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Client per operazioni amministrative (usa service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;

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
      .select('plan, role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.plan !== 'pro') {
      return NextResponse.json({ error: 'PRO plan required' }, { status: 403 });
    }

    // Recupera il lead con dettagli completi
    const { data: leadData, error: leadError } = await supabaseAdmin
      .from('user_unlocked_leads')
      .select(`
        lead_id,
        unlocked_at,
        leads!inner (
          id,
          business_name,
          website_url,
          phone,
          email,
          address,
          city,
          category,
          score,
          analysis,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .single();

    if (leadError || !leadData) {
      return NextResponse.json({ error: 'Lead not found or not unlocked' }, { status: 404 });
    }

    // Il campo leads può essere oggetto o array, gestiamo entrambi i casi
    const lead = Array.isArray(leadData.leads) ? leadData.leads[0] : leadData.leads;
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead data not found' }, { status: 404 });
    }

    // Recupera entry CRM per questo lead
    const { data: crmEntry, error: crmError } = await supabaseAdmin
      .from('crm_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .single();

    if (crmError) {
      // Se non esiste entry CRM, creala
      const { data: newEntry, error: createError } = await supabaseAdmin
        .from('crm_entries')
        .insert({
          user_id: user.id,
          lead_id: leadId,
          status: 'to_contact',
          note: null,
          follow_up_date: null,
          attachments: []
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating CRM entry:', createError);
        return NextResponse.json({ error: 'Failed to create CRM entry' }, { status: 500 });
      }
      
      // Usa la nuova entry creata
      const result = {
        id: newEntry.id,
        lead_id: newEntry.lead_id,
        status: newEntry.status,
        note: newEntry.note,
        follow_up_date: newEntry.follow_up_date,
        attachments: newEntry.attachments || [],
        created_at: newEntry.created_at,
        updated_at: newEntry.updated_at,
        lead_business_name: lead.business_name,
        lead_website_url: lead.website_url,
        lead_phone: lead.phone,
        lead_email: lead.email,
        lead_address: lead.address,
        lead_city: lead.city,
        lead_category: lead.category,
        lead_score: lead.score,
        lead_analysis: lead.analysis
      };

      return NextResponse.json(result);
    }

    // Combina dati lead e CRM entry
    const result = {
      id: crmEntry.id,
      lead_id: crmEntry.lead_id,
      status: crmEntry.status,
      note: crmEntry.note,
      follow_up_date: crmEntry.follow_up_date,
      attachments: crmEntry.attachments || [],
      created_at: crmEntry.created_at,
      updated_at: crmEntry.updated_at,
      lead_business_name: lead.business_name,
      lead_website_url: lead.website_url,
      lead_phone: lead.phone,
      lead_email: lead.email,
      lead_address: lead.address,
      lead_city: lead.city,
      lead_category: lead.category,
      lead_score: lead.score,
      lead_analysis: lead.analysis
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Errore API lead detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await request.json();

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
      .select('plan, role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.plan !== 'pro') {
      return NextResponse.json({ error: 'PRO plan required' }, { status: 403 });
    }

    // Verifica che il lead sia sbloccato dall'utente
    const { data: unlockedLead, error: unlockError } = await supabaseAdmin
      .from('user_unlocked_leads')
      .select('lead_id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .single();

    if (unlockError || !unlockedLead) {
      return NextResponse.json({ error: 'Lead not found or not unlocked' }, { status: 404 });
    }

    // Aggiorna entry CRM
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.note !== undefined) updateData.note = body.note;
    if (body.follow_up_date !== undefined) updateData.follow_up_date = body.follow_up_date;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;

    const { data: updatedEntry, error: updateError } = await supabaseAdmin
      .from('crm_entries')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating CRM entry:', updateError);
      return NextResponse.json({ error: 'Failed to update CRM entry' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedEntry
    });

  } catch (error) {
    console.error('Errore API lead update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}