/**
 * API Route per acquisto Credit Packs
 * Gestisce l'acquisto di crediti singoli "a gettone" senza sottoscrizione
 * Crea sessioni Stripe Checkout in modalità payment (one-time)
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
})

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { packId } = await request.json()

    if (!packId) {
      return NextResponse.json(
        { error: 'Pack ID richiesto' },
        { status: 400 }
      )
    }

    // Autentica l'utente
    const supabase = createRouteHandlerClient({ cookies })
    let user = null
    let dbUserId: string | null = null

    const sessionResult = await supabase.auth.getSession()

    if (sessionResult.error || !sessionResult.data.session?.user) {
      // Prova con Authorization header
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
          { error: 'Autenticazione richiesta' },
          { status: 401 }
        )
      }
    } else {
      user = sessionResult.data.session.user
      dbUserId = sessionResult.data.session.user.id
    }

    // Recupera il credit pack dal database
    const { data: pack, error: packError } = await getSupabaseAdmin()
      .from('credit_packs')
      .select('*')
      .eq('id', packId)
      .eq('is_active', true)
      .single()

    if (packError || !pack) {
      return NextResponse.json(
        { error: 'Pacchetto crediti non trovato o non disponibile' },
        { status: 404 }
      )
    }

    // Verifica se il pack ha un price_id Stripe configurato
    if (!pack.stripe_price_id) {
      return NextResponse.json(
        { error: 'Pacchetto non ancora configurato per il pagamento. Contatta il supporto.' },
        { status: 400 }
      )
    }

    // Recupera l'eventuale customer_id dell'utente
    const { data: userData } = await getSupabaseAdmin()
      .from('users')
      .select('stripe_customer_id')
      .eq('id', dbUserId)
      .single()

    // Crea la sessione di checkout Stripe (modalità payment one-time)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: pack.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?purchase=success&credits=${pack.credits}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?purchase=cancelled`,
      client_reference_id: dbUserId,
      ...(userData?.stripe_customer_id
        ? { customer: userData.stripe_customer_id }
        : { customer_email: user.email }
      ),
      metadata: {
        type: 'credit_pack',
        user_id: dbUserId,
        user_email: user.email || '',
        pack_id: packId,
        pack_name: pack.name,
        credits: pack.credits.toString(),
      },
    })

    // Crea record di acquisto pending
    const { error: purchaseError } = await getSupabaseAdmin()
      .from('credit_purchases')
      .insert({
        user_id: dbUserId,
        credit_pack_id: packId,
        credits_purchased: pack.credits,
        amount_paid_cents: pack.price_cents,
        currency: pack.currency || 'eur',
        stripe_checkout_session_id: checkoutSession.id,
        status: 'pending',
      })

    if (purchaseError) {
      console.error('Errore creazione record acquisto:', purchaseError)
      // Non blocchiamo il checkout, ma logghiamo l'errore
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Errore durante la creazione del checkout credit pack:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// GET endpoint per recuperare i credit packs disponibili
export async function GET() {
  try {
    const { data: packs, error } = await getSupabaseAdmin()
      .from('credit_packs')
      .select('id, name, credits, price_cents, currency, discount_percentage')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Errore recupero credit packs:', error)
      return NextResponse.json(
        { error: 'Errore nel recupero dei pacchetti' },
        { status: 500 }
      )
    }

    // Formatta i prezzi per il frontend
    const formattedPacks = packs.map(pack => ({
      ...pack,
      price: (pack.price_cents / 100).toFixed(2),
      pricePerCredit: ((pack.price_cents / 100) / pack.credits).toFixed(2),
    }))

    return NextResponse.json({
      success: true,
      packs: formattedPacks
    })
  } catch (error) {
    console.error('Errore recupero credit packs:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
