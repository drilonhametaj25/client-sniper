/**
 * API endpoint per gestione allegati CRM
 * Permette upload, download ed eliminazione allegati per lead CRM
 * Solo per utenti PRO autenticati
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isStarterOrHigher } from '@/lib/utils/plan-helpers';

// Forza rendering dinamico per questa API route
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
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
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }

    // Verifica che l'utente sia PRO o AGENCY
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('plan, role')
      .eq('id', user.id)
      .single();

    if (userError || !isStarterOrHigher(userData?.plan || '')) {
      return NextResponse.json(
        { 
          error: 'Access denied. CRM is available for PRO and AGENCY users only.',
          currentPlan: userData?.plan || 'free'
        }, 
        { status: 403 }
      );
    }

    // Verifica che il lead sia sbloccato dall'utente
    const { data: unlockedLead, error: unlockError } = await getSupabaseAdmin()
      .from('user_unlocked_leads')
      .select('lead_id')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .single();

    if (unlockError || !unlockedLead) {
      return NextResponse.json({ error: 'Lead not found or not unlocked' }, { status: 404 });
    }

    // Gestione upload file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Verifica dimensione file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Upload file su Supabase Storage
    const fileName = `crm-attachments/${user.id}/${leadId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await getSupabaseAdmin().storage
      .from('crm-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Ottieni URL pubblico del file
    const { data: urlData } = getSupabaseAdmin().storage
      .from('crm-files')
      .getPublicUrl(fileName);

    // Crea oggetto attachment
    const attachment = {
      id: crypto.randomUUID(),
      name: file.name,
      url: urlData.publicUrl,
      type: file.type,
      size: file.size,
      uploaded_at: new Date().toISOString(),
      path: fileName
    };

    // Recupera entry CRM corrente
    const { data: crmEntry, error: crmError } = await getSupabaseAdmin()
      .from('crm_entries')
      .select('attachments')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .single();

    if (crmError) {
      return NextResponse.json({ error: 'CRM entry not found' }, { status: 404 });
    }

    // Aggiungi attachment alla lista
    const currentAttachments = crmEntry.attachments || [];
    const updatedAttachments = [...currentAttachments, attachment];

    // Aggiorna entry CRM con nuovo attachment
    const { error: updateError } = await getSupabaseAdmin()
      .from('crm_entries')
      .update({
        attachments: updatedAttachments,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('lead_id', leadId);

    if (updateError) {
      console.error('Error updating CRM entry:', updateError);
      return NextResponse.json({ error: 'Failed to update CRM entry' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attachment: attachment
    });

  } catch (error) {
    console.error('Errore API upload attachment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
    }

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

    // Verifica che l'utente sia PRO o AGENCY
    const { data: userData, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('plan, role')
      .eq('id', user.id)
      .single();

    if (userError || !isStarterOrHigher(userData?.plan || '')) {
      return NextResponse.json(
        { 
          error: 'Access denied. CRM is available for PRO and AGENCY users only.',
          currentPlan: userData?.plan || 'free'
        }, 
        { status: 403 }
      );
    }

    // Recupera entry CRM corrente
    const { data: crmEntry, error: crmError } = await getSupabaseAdmin()
      .from('crm_entries')
      .select('attachments')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .single();

    if (crmError) {
      return NextResponse.json({ error: 'CRM entry not found' }, { status: 404 });
    }

    const currentAttachments = crmEntry.attachments || [];
    const attachmentToDelete = currentAttachments.find((att: any) => att.id === attachmentId);

    if (!attachmentToDelete) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Elimina file da Supabase Storage
    if (attachmentToDelete.path) {
      const { error: deleteError } = await getSupabaseAdmin().storage
        .from('crm-files')
        .remove([attachmentToDelete.path]);

      if (deleteError) {
        console.error('Error deleting file from storage:', deleteError);
      }
    }

    // Rimuovi attachment dalla lista
    const updatedAttachments = currentAttachments.filter((att: any) => att.id !== attachmentId);

    // Aggiorna entry CRM
    const { error: updateError } = await getSupabaseAdmin()
      .from('crm_entries')
      .update({
        attachments: updatedAttachments,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('lead_id', leadId);

    if (updateError) {
      console.error('Error updating CRM entry:', updateError);
      return NextResponse.json({ error: 'Failed to update CRM entry' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    });

  } catch (error) {
    console.error('Errore API delete attachment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
