/**
 * API per tracking eventi SEO e analytics
 * Utilizzata da: componenti frontend per tracciare conversioni
 * Gestisce: Google Analytics 4, Search Console events, custom metrics
 */

import { NextRequest, NextResponse } from 'next/server'

interface SEOEvent {
  event: string
  page?: string
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
  value?: number
  custom_parameters?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const events: SEOEvent[] = await request.json()
    
    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events must be an array' },
        { status: 400 }
      )
    }
    
    const results = await Promise.allSettled([
      // Google Analytics 4 tracking
      trackToGA4(events),
      // Internal analytics storage
      storeInternalAnalytics(events)
    ])
    
    return NextResponse.json({
      success: true,
      tracked_events: events.length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : null)
    })
    
  } catch (error: any) {
    console.error('SEO tracking error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}

async function trackToGA4(events: SEOEvent[]) {
  const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect'
  const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  const GA4_API_SECRET = process.env.GA4_API_SECRET
  
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    console.warn('GA4 credentials not configured')
    return { success: false, reason: 'GA4 not configured' }
  }
  
  for (const event of events) {
    try {
      const payload = {
        client_id: generateClientId(),
        events: [{
          name: event.event,
          parameters: {
            page_location: event.page || 'https://trovami.pro',
            source: event.source || 'direct',
            medium: event.medium || 'organic',
            campaign: event.campaign,
            content: event.content,
            term: event.term,
            value: event.value,
            ...event.custom_parameters
          }
        }]
      }
      
      await fetch(`${GA4_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      console.error('GA4 tracking failed:', error)
    }
  }
  
  return { success: true, tracked: events.length }
}

async function storeInternalAnalytics(events: SEOEvent[]) {
  // Store in Supabase for internal analytics
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, reason: 'Supabase not configured' }
    }
    
    const analyticsData = events.map(event => ({
      event_name: event.event,
      page_url: event.page,
      source: event.source,
      medium: event.medium,
      campaign: event.campaign,
      properties: {
        content: event.content,
        term: event.term,
        value: event.value,
        ...event.custom_parameters
      },
      created_at: new Date().toISOString()
    }))
    
    const response = await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify(analyticsData)
    })
    
    return { success: response.ok, stored: analyticsData.length }
  } catch (error) {
    console.error('Internal analytics storage failed:', error)
    return { success: false, reason: error }
  }
}

function generateClientId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

// GET endpoint per health check
export async function GET() {
  return NextResponse.json({
    message: 'SEO tracking endpoint active',
    supported_events: [
      'page_view',
      'newsletter_signup', 
      'public_scan_completed',
      'account_created',
      'lead_viewed',
      'upgrade_clicked',
      'demo_requested'
    ],
    integrations: {
      ga4: !!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  })
}
