// Questa API route gestisce la creazione delle sessioni Stripe Checkout
// È parte del modulo apps/frontend-app
// Viene chiamata quando l'utente vuole fare upgrade del piano
// ⚠️ Aggiornare se si modificano i prezzi o i piani

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, user_id, success_url, cancel_url } = body

    // Validazione input
    if (!plan || !user_id || !success_url || !cancel_url) {
      return NextResponse.json(
        { success: false, error: 'Parametri mancanti' },
        { status: 400 }
      )
    }

    if (!['starter', 'pro'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'Piano non valido' },
        { status: 400 }
      )
    }

    // Verifica che l'utente esista
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, plan')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Verifica che l'utente non abbia già questo piano
    if (user.plan === plan) {
      return NextResponse.json(
        { success: false, error: 'Hai già questo piano' },
        { status: 400 }
      )
    }

    // Configurazione prezzi
    const prices = {
      starter: {
        price_id: process.env.STRIPE_STARTER_PRICE_ID!,
        amount: 2900, // €29.00 in centesimi
      },
      pro: {
        price_id: process.env.STRIPE_PRO_PRICE_ID!,
        amount: 7900, // €79.00 in centesimi
      }
    }

    const selectedPrice = prices[plan as keyof typeof prices]

    // Crea la sessione Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPrice.price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url,
      customer_email: user.email,
      metadata: {
        user_id: user_id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          user_id: user_id,
          plan: plan,
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      success: true,
      data: {
        checkout_url: session.url,
        session_id: session.id,
      }
    })

  } catch (error) {
    console.error('Errore creazione sessione Stripe:', error)
    return NextResponse.json(
      { success: false, error: 'Errore nella creazione della sessione di pagamento' },
      { status: 500 }
    )
  }
}
