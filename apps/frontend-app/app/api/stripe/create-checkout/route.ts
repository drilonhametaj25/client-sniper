// API Route per creare sessioni di checkout Stripe
// Gestisce la creazione di sessioni di pagamento per upgrade di piano
// UPGRADE/DOWNGRADE: Se l'utente ha già una subscription, la modifica invece di crearne una nuova
// Utilizzato dal componente PlanSelector

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { priceId, planId, userEmail, autoConfirm, isAnnual } = await request.json()

    if (!priceId || !planId) {
      return NextResponse.json(
        { error: 'Price ID e Plan ID sono richiesti' },
        { status: 400 }
      )
    }

    let user = null
    let dbUserId: string | null = null

    // Se è fornita un'email (registrazione diretta), validala e usala
    if (userEmail && autoConfirm) {
      // Validazione email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userEmail)) {
        return NextResponse.json(
          { error: 'Email non valida' },
          { status: 400 }
        )
      }

      // Per la registrazione diretta, creiamo un identificatore basato su email
      user = {
        id: `email_${userEmail}`,
        email: userEmail
      }
    } else {
      // Metodo normale: utente già loggato
      const supabase = createRouteHandlerClient({ cookies })

      let sessionResult = await supabase.auth.getSession()

      // Se la sessione del cookie non è valida, prova con l'header Authorization
      if (sessionResult.error || !sessionResult.data.session?.user) {
        const authHeader = request.headers.get('authorization')

        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7)

          const supabaseWithToken = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )

          const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser(token)

          if (tokenError || !tokenUser) {
            return NextResponse.json(
              { error: 'Token di autorizzazione non valido' },
              { status: 401 }
            )
          }

          user = tokenUser
          dbUserId = tokenUser.id
        } else {
          return NextResponse.json(
            { error: 'Sessione non valida e nessun token di autorizzazione fornito' },
            { status: 401 }
          )
        }
      } else {
        user = sessionResult.data.session.user
        dbUserId = sessionResult.data.session.user.id
      }
    }

    // =====================================================
    // UPGRADE/DOWNGRADE: Verifica se l'utente ha già una subscription attiva
    // =====================================================
    if (dbUserId && !autoConfirm) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('stripe_subscription_id, stripe_customer_id, plan')
        .eq('id', dbUserId)
        .single()

      if (!userError && userData?.stripe_subscription_id) {
        console.log(`🔄 UPGRADE/DOWNGRADE: Utente ${dbUserId} ha già subscription ${userData.stripe_subscription_id}`)

        try {
          // Verifica che la subscription sia attiva su Stripe
          const existingSubscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id)

          if (existingSubscription.status === 'active' || existingSubscription.status === 'trialing') {
            console.log(`✅ Subscription attiva trovata, modifico invece di crearne una nuova`)

            // Ottieni l'item corrente della subscription
            const subscriptionItemId = existingSubscription.items.data[0]?.id

            if (!subscriptionItemId) {
              throw new Error('Subscription item non trovato')
            }

            // Aggiorna la subscription con il nuovo price (proration automatica)
            const updatedSubscription = await stripe.subscriptions.update(
              userData.stripe_subscription_id,
              {
                items: [{
                  id: subscriptionItemId,
                  price: priceId,
                }],
                proration_behavior: 'create_prorations', // Calcola proration automaticamente
                metadata: {
                  user_id: dbUserId,
                  user_email: user.email,
                  plan_id: planId,
                  is_annual: isAnnual ? 'true' : 'false',
                  upgraded_from: userData.plan,
                  upgraded_at: new Date().toISOString()
                }
              }
            )

            console.log(`✅ Subscription aggiornata: ${updatedSubscription.id}`)

            // Ottieni i crediti del nuovo piano dal database
            const { data: planData, error: planError } = await supabaseAdmin
              .from('plans')
              .select('max_credits, max_replacements_monthly')
              .eq('name', planId)
              .single()

            if (planError || !planData) {
              console.error('Piano non trovato nel database:', planId)
            }

            // Aggiorna l'utente nel database con il nuovo piano
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({
                plan: planId,
                credits_remaining: planData?.max_credits || 0,
                credits_reset_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', dbUserId)

            if (updateError) {
              console.error('Errore aggiornamento utente:', updateError)
            }

            // Reset sostituzioni per il nuovo piano
            try {
              await supabaseAdmin.rpc('reset_user_replacements', { p_user_id: dbUserId })
              console.log('✅ Sostituzioni resettate per nuovo piano')
            } catch (resetError) {
              console.error('Errore reset sostituzioni:', resetError)
            }

            // Log dell'operazione
            await supabaseAdmin
              .from('plan_status_logs')
              .insert({
                user_id: dbUserId,
                action: 'plan_change',
                previous_status: 'active',
                new_status: 'active',
                reason: `Cambio piano da ${userData.plan} a ${planId} (${isAnnual ? 'annuale' : 'mensile'})`,
                triggered_by: 'user',
                stripe_event_id: updatedSubscription.id
              })

            // Ritorna successo con redirect alla dashboard
            return NextResponse.json({
              success: true,
              message: `Piano aggiornato a ${planId}`,
              redirect: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&plan=${planId}&upgraded=true`
            })
          } else if (existingSubscription.status === 'canceled' || existingSubscription.cancel_at_period_end) {
            // Se la subscription è cancellata o in cancellazione, procedi con nuovo checkout
            console.log(`⚠️ Subscription esistente cancellata/in cancellazione, creo nuova subscription`)
            // Continua con il flusso normale di checkout
          } else {
            console.log(`⚠️ Subscription status: ${existingSubscription.status}, creo nuova subscription`)
          }
        } catch (stripeError: any) {
          console.error('Errore verifica subscription Stripe:', stripeError.message)
          // Se c'è un errore nel recuperare la subscription, procedi con nuovo checkout
        }
      }
    }

    // =====================================================
    // NUOVO UTENTE O SUBSCRIPTION NON ATTIVA: Crea checkout normale
    // =====================================================
    console.log(`🆕 Creazione nuovo checkout per utente ${user.id}`)

    // Se l'utente ha già un customer_id, usalo
    let customerId: string | undefined
    if (dbUserId) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('stripe_customer_id')
        .eq('id', dbUserId)
        .single()

      if (userData?.stripe_customer_id) {
        customerId = userData.stripe_customer_id
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
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      metadata: {
        user_id: user.id,
        user_email: user.email,
        plan_id: planId,
        auto_confirm: autoConfirm ? 'true' : 'false',
        is_annual: isAnnual ? 'true' : 'false',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email,
          plan_id: planId,
          auto_confirm: autoConfirm ? 'true' : 'false',
          is_annual: isAnnual ? 'true' : 'false',
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
