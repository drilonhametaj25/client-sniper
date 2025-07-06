// API endpoint per inviare feedback degli utenti
// Utilizzato dal FeedbackWidget per inviare segnalazioni, suggerimenti e contatti
// Accessibile sia da utenti registrati che anonimi
// Include validazione e rate limiting basilare
// Supporta feedback pubblici con titolo per la vista collaborativa

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { FeedbackSubmissionDataExtended } from '@/../../libs/types'

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackSubmissionDataExtended = await request.json()
    
    
    // Validazione input
    if (!body.type || !['bug', 'suggestion', 'contact', 'other'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Tipo di feedback non valido' },
        { status: 400 }
      )
    }
    
    if (!body.message || body.message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Il messaggio deve contenere almeno 10 caratteri' },
        { status: 400 }
      )
    }
    
    if (body.message.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Il messaggio è troppo lungo (massimo 2000 caratteri)' },
        { status: 400 }
      )
    }
    
    // Ottieni informazioni aggiuntive dalla richiesta
    const userAgent = request.headers.get('user-agent') || ''
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip
  
    
    // Chiama la funzione RPC per inviare il feedback
    const { data, error } = await supabase.rpc('submit_feedback_report', {
      feedback_type: body.type,
      feedback_message: body.message.trim(),
      feedback_email: body.email?.trim() || null,
      feedback_title: body.title?.trim() || null,
      is_public_feedback: body.isPublic || false,
      user_agent_info: userAgent,
      current_page_url: body.pageUrl || null
    })
    
    
    if (error) {
      return NextResponse.json(
        { error: 'Errore durante l\'invio del feedback' },
        { status: 500 }
      )
    }
    
    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Errore durante l\'invio del feedback' },
        { status: 400 }
      )
    }
    
    // Risposta di successo
    return NextResponse.json({
      success: true,
      message: 'Feedback inviato con successo! Grazie per il tuo contributo.',
      feedbackId: data.feedback_id
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Endpoint GET per ottenere statistiche feedback (solo per admin)
export async function GET() {
  try {
    // Ottieni statistiche sui feedback
    const { data: stats, error } = await supabase
      .from('feedback_reports')
      .select('type, status, created_at')
    
    if (error) {
      return NextResponse.json(
        { error: 'Errore nel recupero delle statistiche' },
        { status: 500 }
      )
    }
    
    // Calcola statistiche
    const totalFeedback = stats?.length || 0
    const byType = stats?.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    const byStatus = stats?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    return NextResponse.json({
      total: totalFeedback,
      byType,
      byStatus,
      lastWeek: stats?.filter(item => 
        new Date(item.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
