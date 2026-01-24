/**
 * API endpoint per gestione CRM personale
 * Permette agli utenti PRO di gestire le entry CRM dei loro lead sbloccati
 * Utilizzato da: /crm page, dashboard CRM widgets
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isProOrHigher } from '@/lib/utils/plan-helpers';

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }

    // Verifica che l'utente sia PRO e attivo
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('plan, status, role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Errore nel recupero dati utente:', userError);
      return NextResponse.json({ error: 'Errore nel recupero dati utente' }, { status: 500 });
    }

    // Verifica piano PRO o superiore (include pro_monthly, pro_annual, agency_monthly, agency_annual)
    if (!isProOrHigher(userData?.plan || '')) {
      return NextResponse.json({ 
        error: 'Piano PRO richiesto', 
        current_plan: userData?.plan || 'unknown',
        message: 'Il CRM è disponibile solo per utenti con piano PRO o AGENCY'
      }, { status: 403 });
    }

    // Verifica che il piano sia attivo
    if (userData?.status === 'inactive') {
      return NextResponse.json({ 
        error: 'Piano disattivato', 
        message: 'Il tuo piano è temporaneamente disattivato. Riattivalo per accedere al CRM',
        status: userData.status
      }, { status: 403 });
    }

    // Se il piano è cancellato, nega l'accesso
    if (userData?.status === 'cancelled') {
      return NextResponse.json({ 
        error: 'Piano cancellato', 
        message: 'Il tuo piano è stato cancellato. Aggiorna il piano per accedere al CRM'
      }, { status: 403 });
    }


    // Prima controlla se ci sono lead sbloccati dall'utente nella tabella user_unlocked_leads
    const { data: unlockedLeads, error: unlockedError } = await getSupabaseAdmin()
      .from('user_unlocked_leads')
      .select(`
        lead_id,
        unlocked_at,
        leads (
          id, business_name, website_url, city, category, score, analysis
        )
      `)
      .eq('user_id', user.id);

    // AGGIUNGE: Controlla anche i lead con assigned_to (sistema legacy)
    const { data: assignedLeads, error: assignedError } = await getSupabaseAdmin()
      .from('leads')
      .select('id, business_name, website_url, city, category, score, analysis, updated_at')
      .eq('assigned_to', user.id);


    // Controlla se esistono entry CRM per questo utente
    const { data: existingEntries, error: entriesError } = await getSupabaseAdmin()
      .from('crm_entries')
      .select('id, lead_id, user_id')
      .eq('user_id', user.id);


    // Prima prova con RPC, poi fallback su query dirette
    let crmEntries = [];
    let stats = null;

    try {
      // Prova RPC per entry CRM
      const { data: rpcEntries, error: rpcError } = await getSupabaseAdmin()
        .rpc('get_user_crm_entries');

      if (rpcError) {
        
        // Fallback: query diretta con JOIN esplicito
        let { data: directEntries, error: directError } = await getSupabaseAdmin()
          .from('crm_entries')
          .select(`
            id, lead_id, status, note, follow_up_date, attachments, created_at, updated_at,
            leads!crm_entries_lead_id_fkey (
              business_name, website_url, city, category, score, analysis
            )
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (directError) {
          console.error('Direct query failed:', directError);
          return NextResponse.json({ error: 'Failed to fetch CRM entries' }, { status: 500 });
        }

        if (directError) {
          console.error('Direct query failed:', directError);
          return NextResponse.json({ error: 'Failed to fetch CRM entries' }, { status: 500 });
        }

        // Se non ci sono entry CRM ma ci sono lead sbloccati, creiamole automaticamente
        if ((!directEntries || directEntries.length === 0) && unlockedLeads && unlockedLeads.length > 0) {
          
          const newEntries = unlockedLeads.map((unlockedLead: any) => ({
            user_id: user.id,
            lead_id: unlockedLead.lead_id,
            status: 'to_contact',
            note: null,
            follow_up_date: null,
            attachments: []
          }));

          const { data: createdEntries, error: createError } = await getSupabaseAdmin()
            .from('crm_entries')
            .insert(newEntries)
            .select(`
              id, lead_id, status, note, follow_up_date, attachments, created_at, updated_at,
              leads!crm_entries_lead_id_fkey (
                business_name, website_url, city, category, score, analysis
              )
            `);

          if (createError) {
            console.error('Failed to create CRM entries:', createError);
          } else {
            directEntries = createdEntries;
          }
        }

        // Trasforma i dati nel formato atteso
        crmEntries = directEntries?.map((entry: any) => ({
          ...entry,
          lead_business_name: entry.leads?.business_name,
          lead_website_url: entry.leads?.website_url,
          lead_city: entry.leads?.city,
          lead_category: entry.leads?.category,
          lead_score: entry.leads?.score,
          lead_analysis: entry.leads?.analysis
        })) || [];
      } else {
        crmEntries = rpcEntries || [];
      }

      // Prova RPC per statistiche
      const { data: rpcStats, error: statsError } = await getSupabaseAdmin()
        .rpc('get_user_crm_stats', { user_id: user.id });

      if (statsError) {
        
        // Fallback: calcola statistiche manualmente
        const now = new Date();
        stats = {
          total_entries: crmEntries.length,
          to_contact: crmEntries.filter((e: any) => e.status === 'to_contact').length,
          in_negotiation: crmEntries.filter((e: any) => e.status === 'in_negotiation').length,
          closed_positive: crmEntries.filter((e: any) => e.status === 'closed_positive').length,
          closed_negative: crmEntries.filter((e: any) => e.status === 'closed_negative').length,
          on_hold: crmEntries.filter((e: any) => e.status === 'on_hold').length,
          follow_up: crmEntries.filter((e: any) => e.status === 'follow_up').length,
          overdue_follow_ups: crmEntries.filter((e: any) => 
            e.follow_up_date && new Date(e.follow_up_date) < now
          ).length
        };
        
      } else {
        stats = rpcStats || null;
      }

    } catch (rpcError) {
      console.error('RPC error:', rpcError);
      return NextResponse.json({ error: 'Database function error' }, { status: 500 });
    }

    return NextResponse.json({
      entries: crmEntries || [],
      stats: stats || {
        total_entries: 0,
        to_contact: 0,
        in_negotiation: 0,
        closed_positive: 0,
        closed_negative: 0,
        on_hold: 0,
        follow_up: 0,
        overdue_follow_ups: 0
      }
    });

  } catch (error) {
    console.error('Error in CRM API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }

    // Verifica che l'utente sia PRO
    // Verifica che l'utente sia PRO o superiore (POST)
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (userError || !isProOrHigher(userData?.plan || '')) {
      return NextResponse.json({ 
        error: 'Piano PRO richiesto',
        current_plan: userData?.plan || 'unknown',
        message: 'La creazione/modifica entry CRM richiede piano PRO o AGENCY'
      }, { status: 403 });
    }

    const body = await request.json();
    const { lead_id, status, note, follow_up_date, attachments } = body;

    if (!lead_id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Upsert entry CRM - prima prova RPC, poi fallback su query diretta
    let entryId = null;
    
    try {
      const { data: rpcResult, error: upsertError } = await getSupabaseAdmin()
        .rpc('upsert_crm_entry', {
          p_lead_id: lead_id,
          p_status: status,
          p_note: note,
          p_follow_up_date: follow_up_date,
          p_attachments: attachments
        });

      if (upsertError) {
        
        // Fallback: verifica se l'entry esiste già
        const { data: existingEntry, error: checkError } = await getSupabaseAdmin()
          .from('crm_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('lead_id', lead_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing entry:', checkError);
          return NextResponse.json({ error: 'Failed to check existing entry' }, { status: 500 });
        }

        let directResult;
        if (existingEntry) {
          // Update existing entry
          const { data: updateResult, error: updateError } = await getSupabaseAdmin()
            .from('crm_entries')
            .update({
              status: status || 'to_contact',
              note: note,
              follow_up_date: follow_up_date,
              attachments: attachments || [],
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('lead_id', lead_id)
            .select('id')
            .single();

          if (updateError) {
            console.error('Direct update failed:', updateError);
            return NextResponse.json({ error: 'Failed to update CRM entry' }, { status: 500 });
          }
          directResult = updateResult;
        } else {
          // Insert new entry
          const { data: insertResult, error: insertError } = await getSupabaseAdmin()
            .from('crm_entries')
            .insert({
              user_id: user.id,
              lead_id: lead_id,
              status: status || 'to_contact',
              note: note,
              follow_up_date: follow_up_date,
              attachments: attachments || []
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('Direct insert failed:', insertError);
            return NextResponse.json({ error: 'Failed to create CRM entry' }, { status: 500 });
          }
          directResult = insertResult;
        }

        entryId = directResult?.id;
      } else {
        entryId = rpcResult;
      }
    } catch (error) {
      console.error('Upsert error:', error);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry_id: entryId });

  } catch (error) {
    console.error('Error in CRM POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
