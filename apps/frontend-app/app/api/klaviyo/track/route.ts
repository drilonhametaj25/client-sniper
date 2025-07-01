/**
 * API route per tracking eventi Klaviyo
 * Endpoint: POST /api/klaviyo/track
 * Traccia eventi personalizzati per segmentazione e automazione
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json()

    if (!eventData?.customer_properties?.$email) {
      return NextResponse.json(
        { success: false, message: 'Email richiesta per il tracking' },
        { status: 400 }
      )
    }

    const klaviyoApiKey = process.env.KLAVIYO_PRIVATE_KEY
    if (!klaviyoApiKey) {
      console.error('❌ KLAVIYO_PRIVATE_KEY mancante')
      return NextResponse.json(
        { success: false, message: 'Servizio temporaneamente non disponibile' },
        { status: 500 }
      )
    }

    // Formato evento per Klaviyo API v2024-06-15
    const eventPayload = {
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: eventData.event
              }
            }
          },
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email: eventData.customer_properties.$email,
                first_name: eventData.customer_properties.$first_name,
                last_name: eventData.customer_properties.$last_name
              }
            }
          },
          properties: eventData.properties || {},
          time: new Date().toISOString()
        }
      }
    }

    const response = await fetch('https://a.klaviyo.com/api/events/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-06-15'
      },
      body: JSON.stringify(eventPayload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Errore tracking Klaviyo:', errorData)
      throw new Error('Errore durante il tracking dell\'evento')
    }

    return NextResponse.json({
      success: true,
      message: 'Evento tracciato con successo'
    })

  } catch (error) {
    console.error('Errore API tracking Klaviyo:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Errore imprevisto' 
      },
      { status: 500 }
    )
  }
}
