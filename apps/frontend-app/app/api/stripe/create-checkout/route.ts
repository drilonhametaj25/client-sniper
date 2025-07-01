// API Route per creare sessioni di checkout Stripe
// Gestisce la creazione di sessioni di pagamento per upgrade di piano
// Utilizzato dal componente PlanSelector

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

export async function POST(request: NextRequest) {
  try {
    const { priceId, planId, userEmail, autoConfirm } = await request.json()

    if (!priceId || !planId) {
      return NextResponse.json(
        { error: 'Price ID e Plan ID sono richiesti' },
        { status: 400 }
      )
    }

    let user = null

    // Se è fornita un'email (registrazione diretta), usala
    if (userEmail && autoConfirm) {
      // Per la registrazione diretta, creiamo un utente "virtuale" per Stripe
      // L'aggiornamento del database avverrà nel webhook dopo il pagamento
      user = {
        id: 'temp_' + Date.now(), // ID temporaneo
        email: userEmail
      }
    } else {
      // Metodo normale: utente già loggato
      // Prima prova con il cookie (Next.js route handler)
      const supabase = createRouteHandlerClient({ cookies })
      
      let sessionResult = await supabase.auth.getSession()

      // Se la sessione del cookie non è valida, prova con l'header Authorization
      if (sessionResult.error || !sessionResult.data.session?.user) {
        const authHeader = request.headers.get('authorization')
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7)
          
          // Crea un client temporaneo con il token
          const supabaseWithToken = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          
          // Imposta la sessione con il token
          const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser(token)
          
          if (tokenError || !tokenUser) {
            return NextResponse.json(
              { error: 'Token di autorizzazione non valido' },
              { status: 401 }
            )
          }
          
          user = tokenUser
        } else {
          return NextResponse.json(
            { error: 'Sessione non valida e nessun token di autorizzazione fornito' },
            { status: 401 }
          )
        }
      } else {
        user = sessionResult.data.session.user
      }
    }

    // Crea la sessione di checkout Stripe
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${autoConfirm ? 'register' : 'dashboard'}?checkout=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        user_email: user.email, // Importante per il webhook
        plan_id: planId,
        auto_confirm: autoConfirm ? 'true' : 'false',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email,
          plan_id: planId,
          auto_confirm: autoConfirm ? 'true' : 'false',
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Errore durante la creazione del checkout:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
