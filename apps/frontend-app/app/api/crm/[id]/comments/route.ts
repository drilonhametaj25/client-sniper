/**
 * API endpoint per gestione commenti e timeline CRM
 * Permette aggiunta, visualizzazione e eliminazione commenti per lead CRM
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

    // Recupera commenti dalla tabella crm_comments
    const { data: comments, error: commentsError } = await getSupabaseAdmin()
      .from('crm_comments')
      .select('*')
      .eq('user_id', user.id)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      comments: comments || []
    });

  } catch (error) {
    console.error('Errore API get comments:', error);
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

    // Valida dati input
    if (!body.content || !body.type) {
      return NextResponse.json({ error: 'Content and type are required' }, { status: 400 });
    }

    // Crea nuovo commento
    const { data: newComment, error: commentError } = await getSupabaseAdmin()
      .from('crm_comments')
      .insert({
        user_id: user.id,
        lead_id: leadId,
        content: body.content,
        type: body.type,
        metadata: body.metadata || {},
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Aggiorna timestamp entry CRM
    const { error: updateError } = await getSupabaseAdmin()
      .from('crm_entries')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('lead_id', leadId);

    if (updateError) {
      console.error('Error updating CRM entry timestamp:', updateError);
    }

    return NextResponse.json({
      success: true,
      comment: newComment
    });

  } catch (error) {
    console.error('Errore API create comment:', error);
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
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
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

    // Elimina commento (solo se appartiene all'utente)
    const { error: deleteError } = await getSupabaseAdmin()
      .from('crm_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id)
      .eq('lead_id', leadId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Errore API delete comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
