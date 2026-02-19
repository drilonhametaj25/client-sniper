/**
 * API endpoint per aggiornamento rapido dello stato CRM
 * 
 * Permette agli utenti PRO di aggiornare rapidamente lo stato di un lead
 * direttamente dalla dashboard senza aprire il pannello CRM completo.
 * Gestisce la creazione/aggiornamento di record CRM.
 * 
 * Usato da: dashboard lead, azioni rapide CRM
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isStarterOrHigher } from '@/lib/utils/plan-helpers';
import { CRMQuickUpdateRequest, CRMStatusType } from '@/lib/types/crm';

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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
    
    // Verifica il JWT
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }

    // Verifica che l'utente abbia piano PRO
    const { data: userProfile, error: profileError } = await getSupabaseAdmin()
      .from('users')
      .select('id, plan')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: 'Profilo utente non trovato' },
        { status: 404 }
      );
    }

    if (!isStarterOrHigher(userProfile.plan)) {
      return NextResponse.json(
        { error: 'Access denied. CRM is available for Starter and Agency users only.' },
        { status: 403 }
      );
    }

    // Parsing del corpo della richiesta
    const body: CRMQuickUpdateRequest = await request.json();
    const { leadId, status, notes } = body;

    // Validazione input
    if (!leadId || !status) {
      return NextResponse.json(
        { success: false, error: 'Lead ID e status sono obbligatori' },
        { status: 400 }
      );
    }

    const validStatuses: CRMStatusType[] = ['new', 'contacted', 'in_negotiation', 'won', 'lost'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status non valido' },
        { status: 400 }
      );
    }

    // Verifica che il lead esista
    const { data: lead, error: leadError } = await getSupabaseAdmin()
      .from('leads')
      .select('id, business_name')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { success: false, error: 'Lead non trovato' },
        { status: 404 }
      );
    }

    // Aggiorna o crea record CRM
    const now = new Date().toISOString()
    
    // Funzione per mappare stati frontend a stati DB
    const mapStatusToDB = (frontendStatus: CRMStatusType) => {
      switch (frontendStatus) {
        case 'new': return 'to_contact'
        case 'contacted': return 'follow_up'
        case 'in_negotiation': return 'in_negotiation'
        case 'won': return 'closed_positive'
        case 'lost': return 'closed_negative'
        default: return 'to_contact'
      }
    }
    
    const updateData = {
      lead_id: leadId,
      user_id: user.id,
      status: mapStatusToDB(status),
      note: notes,
      updated_at: now
    }

    // Prova prima ad aggiornare un record esistente
    const { data: existingRecord, error: checkError } = await getSupabaseAdmin()
      .from('crm_entries')
      .select('id')
      .eq('lead_id', leadId)
      .eq('user_id', user.id)
      .single();

    let crmResult;
    
    if (existingRecord && !checkError) {
      // Aggiorna record esistente
      const { data, error } = await getSupabaseAdmin()
        .from('crm_entries')
        .update(updateData)
        .eq('id', existingRecord.id)
        .select('lead_id, status, updated_at')
        .single();
      
      crmResult = { data, error };
    } else {
      // Crea nuovo record
      const { data, error } = await getSupabaseAdmin()
        .from('crm_entries')
        .insert({
          ...updateData,
          created_at: now
        })
        .select('lead_id, status, updated_at')
        .single();
      
      crmResult = { data, error };
    }

    if (crmResult.error || !crmResult.data) {
      console.error('Errore aggiornamento CRM:', crmResult.error);
      return NextResponse.json(
        { success: false, error: 'Errore aggiornamento stato CRM' },
        { status: 500 }
      );
    }

    // Log dell'attività per audit
    console.log(`CRM Quick Update: User ${user.id} updated lead ${leadId} to status ${status}`);

    return NextResponse.json({
      success: true,
      message: `Status aggiornato a "${status}" con successo`,
      data: {
        leadId: crmResult.data.lead_id,
        status: crmResult.data.status,
        updatedAt: crmResult.data.updated_at
      }
    });

  } catch (error) {
    console.error('Errore API CRM quick update:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
