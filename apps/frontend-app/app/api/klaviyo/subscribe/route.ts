/**
 * API route per iscrizione newsletter Klaviyo
 * Endpoint: POST /api/klaviyo/subscribe
 * Gestisce l'iscrizione sicura alla newsletter
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { profile, listId } = await request.json()

    if (!profile?.email) {
      return NextResponse.json(
        { success: false, message: 'Email richiesta' },
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

    // Crea/aggiorna profilo Klaviyo
    const profilePayload = {
      data: {
        type: 'profile',
        attributes: {
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone_number: profile.phone_number,
          properties: {
            ...profile.properties,
            newsletter_source: 'trovami_website',
            subscription_date: new Date().toISOString()
          }
        }
      }
    }

    // Chiamata API Klaviyo per creare profilo
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-06-15'
      },
      body: JSON.stringify(profilePayload)
    })

    if (!profileResponse.ok) {
      const errorData = await profileResponse.json()
      console.error('Errore creazione profilo Klaviyo:', errorData)
      
      // Se profilo esiste già, continua con l'iscrizione
      if (profileResponse.status !== 409) {
        throw new Error('Errore durante la creazione del profilo')
      }
    }

    // Iscrivi alla lista newsletter
    const subscriptionPayload = {
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: {
                  email: profile.email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: 'SUBSCRIBED'
                      }
                    }
                  }
                }
              }
            ]
          }
        },
        relationships: {
          list: {
            data: {
              type: 'list',
              id: listId || process.env.KLAVIYO_NEWSLETTER_LIST_ID
            }
          }
        }
      }
    }

    const subscriptionResponse = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoApiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-06-15'
      },
      body: JSON.stringify(subscriptionPayload)
    })

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json()
      console.error('Errore iscrizione Klaviyo:', errorData)
      throw new Error('Errore durante l\'iscrizione alla newsletter')
    }

    return NextResponse.json({
      success: true,
      message: 'Iscrizione completata! Controlla la tua email.'
    })

  } catch (error) {
    console.error('Errore API iscrizione Klaviyo:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Errore imprevisto' 
      },
      { status: 500 }
    )
  }
}
