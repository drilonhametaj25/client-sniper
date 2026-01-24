/**
 * API endpoint per inviare email di outreach ai lead
 * Supporta invio singolo e bulk con delay anti-spam
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OutreachEmailGenerator, EMAIL_TEMPLATES } from '@/lib/outreach-email-generator'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'

interface SendEmailRequest {
  leadId: string
  templateId: string
  customSubject?: string
  customBody?: string
  variables: {
    your_name: string
    your_company?: string
    your_title?: string
    your_phone?: string
    your_email?: string
    calendar_link?: string
  }
}

interface BulkSendRequest {
  leadIds: string[]
  templateId: string
  variables: {
    your_name: string
    your_company?: string
    your_title?: string
    your_phone?: string
    your_email?: string
    calendar_link?: string
  }
  delayMs?: number // Delay tra email in ms (default 5000)
}

interface Lead {
  id: string
  business_name: string
  website_url: string
  email: string | null
  phone: string | null
  city: string | null
  category: string | null
  score: number | null
  crm_status: string | null
  website_analysis?: any
  analysis?: any
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verifica che l'utente abbia un piano che permette outreach
    const { data: profile } = await supabase
      .from('users')
      .select('plan, email')
      .eq('id', user.id)
      .single()

    if (!profile || profile.plan === 'free') {
      return NextResponse.json(
        { error: 'Email outreach richiede un piano Starter o superiore' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Determina se è invio singolo o bulk
    if (body.leadIds && Array.isArray(body.leadIds)) {
      return handleBulkSend(body as BulkSendRequest, user.id, supabase)
    } else if (body.leadId) {
      return handleSingleSend(body as SendEmailRequest, user.id, supabase)
    } else {
      return NextResponse.json({ error: 'Missing leadId or leadIds' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in outreach send:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleSingleSend(
  body: SendEmailRequest,
  userId: string,
  supabase: any
) {
  const { leadId, templateId, customSubject, customBody, variables } = body

  // Carica il lead
  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !leadData) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const lead = leadData as Lead

  // Verifica che il lead abbia un'email
  if (!lead.email) {
    return NextResponse.json({ error: 'Lead does not have an email address' }, { status: 400 })
  }

  // Ottieni il template
  const template = OutreachEmailGenerator.getTemplate(templateId)
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Genera le variabili dal lead
  const analysis = lead.website_analysis || lead.analysis
  const templateVariables = OutreachEmailGenerator.generateVariablesFromLead(
    lead,
    analysis,
    variables
  )

  // Compila il template
  let compiled = OutreachEmailGenerator.compileTemplate(template, templateVariables)

  // Se ci sono subject/body custom, usali
  if (customSubject) {
    compiled.subject = customSubject
  }
  if (customBody) {
    compiled.html = customBody
    compiled.text = customBody.replace(/<[^>]*>/g, '') // Strip HTML for text version
  }

  // Genera tracking pixel URL
  const trackingId = `${leadId}-${Date.now()}`
  const trackingPixelUrl = `${APP_URL}/api/outreach/track?id=${trackingId}&type=open`

  // Aggiungi tracking pixel all'HTML
  const htmlWithTracking = compiled.html + `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`

  // Invia email tramite Resend
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${variables.your_name} <outreach@trovami.pro>`,
        reply_to: variables.your_email || undefined,
        to: [lead.email],
        subject: compiled.subject,
        html: htmlWithTracking,
        text: compiled.text,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Resend error:', errorData)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    const resendResult = await response.json()

    // Salva record dell'email inviata
    const { error: insertError } = await supabase.from('outreach_emails').insert({
      id: trackingId,
      user_id: userId,
      lead_id: leadId,
      template_id: templateId,
      subject: compiled.subject,
      recipient_email: lead.email,
      status: 'sent',
      resend_id: resendResult.id,
      sent_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Error saving outreach record:', insertError)
      // Non fallire se il salvataggio fallisce, l'email è già inviata
    }

    // Aggiorna lo stato CRM del lead se necessario
    if (lead.crm_status === 'new' || !lead.crm_status) {
      await supabase
        .from('leads')
        .update({ crm_status: 'contacted' })
        .eq('id', leadId)
    }

    return NextResponse.json({
      success: true,
      emailId: trackingId,
      resendId: resendResult.id,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

async function handleBulkSend(
  body: BulkSendRequest,
  userId: string,
  supabase: any
) {
  const { leadIds, templateId, variables, delayMs = 5000 } = body

  if (leadIds.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 emails per bulk send' },
      { status: 400 }
    )
  }

  // Carica tutti i lead
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .in('id', leadIds)

  if (leadsError || !leadsData) {
    return NextResponse.json({ error: 'Error loading leads' }, { status: 500 })
  }

  const leads = leadsData as Lead[]

  // Filtra lead con email
  const leadsWithEmail = leads.filter(l => l.email)

  if (leadsWithEmail.length === 0) {
    return NextResponse.json(
      { error: 'No leads with email addresses' },
      { status: 400 }
    )
  }

  // Ottieni il template
  const template = OutreachEmailGenerator.getTemplate(templateId)
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Inizia l'invio bulk (asincrono)
  // Restituisci subito una risposta con il numero di email da inviare
  // L'invio effettivo avverrà in background

  const results: { leadId: string; success: boolean; error?: string }[] = []
  let sentCount = 0
  let failedCount = 0

  // Per ora, inviamo in modo sincrono con delay
  // In produzione, questo dovrebbe essere gestito da una queue
  for (let i = 0; i < leadsWithEmail.length; i++) {
    const lead = leadsWithEmail[i]

    try {
      // Genera le variabili dal lead
      const analysis = lead.website_analysis || lead.analysis
      const templateVariables = OutreachEmailGenerator.generateVariablesFromLead(
        lead,
        analysis,
        variables
      )

      // Compila il template
      const compiled = OutreachEmailGenerator.compileTemplate(template, templateVariables)

      // Genera tracking pixel URL
      const trackingId = `${lead.id}-${Date.now()}`
      const trackingPixelUrl = `${APP_URL}/api/outreach/track?id=${trackingId}&type=open`

      // Aggiungi tracking pixel all'HTML
      const htmlWithTracking = compiled.html + `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`

      // Invia email
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${variables.your_name} <outreach@trovami.pro>`,
          reply_to: variables.your_email || undefined,
          to: [lead.email],
          subject: compiled.subject,
          html: htmlWithTracking,
          text: compiled.text,
        }),
      })

      if (response.ok) {
        const resendResult = await response.json()

        // Salva record
        await supabase.from('outreach_emails').insert({
          id: trackingId,
          user_id: userId,
          lead_id: lead.id,
          template_id: templateId,
          subject: compiled.subject,
          recipient_email: lead.email,
          status: 'sent',
          resend_id: resendResult.id,
          sent_at: new Date().toISOString(),
        })

        // Aggiorna stato CRM
        if (lead.crm_status === 'new' || !lead.crm_status) {
          await supabase
            .from('leads')
            .update({ crm_status: 'contacted' })
            .eq('id', lead.id)
        }

        results.push({ leadId: lead.id, success: true })
        sentCount++
      } else {
        const errorText = await response.text()
        results.push({ leadId: lead.id, success: false, error: errorText })
        failedCount++
      }
    } catch (error) {
      results.push({ leadId: lead.id, success: false, error: String(error) })
      failedCount++
    }

    // Delay tra email (anti-spam)
    if (i < leadsWithEmail.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return NextResponse.json({
    success: true,
    total: leadsWithEmail.length,
    sent: sentCount,
    failed: failedCount,
    skipped: leads.length - leadsWithEmail.length,
    results,
  })
}
