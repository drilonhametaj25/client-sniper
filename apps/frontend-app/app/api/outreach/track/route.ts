/**
 * API endpoint per tracciare aperture email
 * Restituisce un pixel 1x1 trasparente e registra l'apertura
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Pixel trasparente 1x1 GIF
const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingId = searchParams.get('id')
    const type = searchParams.get('type')

    if (trackingId && type === 'open') {
      // Registra l'apertura in background
      // Non blocchiamo la risposta per questo
      trackEmailOpen(trackingId).catch(console.error)
    }

    // Restituisci sempre il pixel, anche in caso di errore
    return new NextResponse(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error in tracking:', error)
    // Restituisci comunque il pixel
    return new NextResponse(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
      },
    })
  }
}

async function trackEmailOpen(trackingId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verifica che l'email esista
  const { data: email, error: fetchError } = await supabase
    .from('outreach_emails')
    .select('id, opened_at, open_count')
    .eq('id', trackingId)
    .single()

  if (fetchError || !email) {
    console.log('Email not found for tracking:', trackingId)
    return
  }

  // Aggiorna il record
  const openCount = (email.open_count || 0) + 1
  const updates: any = {
    open_count: openCount,
    last_opened_at: new Date().toISOString(),
  }

  // Se è la prima apertura, imposta opened_at
  if (!email.opened_at) {
    updates.opened_at = new Date().toISOString()
    updates.status = 'opened'
  }

  const { error: updateError } = await supabase
    .from('outreach_emails')
    .update(updates)
    .eq('id', trackingId)

  if (updateError) {
    console.error('Error updating email open:', updateError)
  } else {
    console.log(`Email opened: ${trackingId} (count: ${openCount})`)
  }
}
