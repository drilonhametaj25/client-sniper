/**
 * Callback handler per autenticazione Supabase
 * Usato per: Gestire il redirect dopo conferma email/login
 * Chiamato da: Supabase Auth dopo azioni di autenticazione
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔄 Auth callback ricevuto:', { 
    code: !!code, 
    error, 
    error_description,
    url: requestUrl.toString()
  })

  if (error) {
    console.error('❌ Errore auth callback:', error, error_description)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error_description || error)}`)
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      console.log('🔄 Scambiando code per session...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('❌ Errore exchange code:', exchangeError)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
      }

      if (data.user) {
        console.log('✅ Utente autenticato con successo:', data.user.email)
        
        // Verifica se è la prima volta (nuovo utente) o conferma email
        const isNewUser = !data.user.email_confirmed_at
        
        // Assicurati che l'utente esista nella tabella custom users
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single()

          if (!existingUser) {
            console.log('🆕 Creando nuovo utente nella tabella custom')
            
            // Nuovo utente - crea record e invia email di conferma
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email,
                plan: 'free',
                credits_remaining: 1,
                created_at: new Date().toISOString()
              })

            if (insertError) {
              console.error('❌ Errore creazione utente:', insertError)
            } else {
              console.log('✅ Nuovo utente creato')

              // Invia email di conferma se l'email non è ancora confermata
              if (!data.user.email_confirmed_at && data.user.email) {
                console.log('📧 Inviando email di conferma...')
                
                // Importa dinamicamente il servizio email
                const { emailService } = await import('@/lib/email-service')
                
                const confirmationUrl = `${requestUrl.origin}/auth/confirm?token=manual-confirm&email=${encodeURIComponent(data.user.email)}`
                
                try {
                  const emailSent = await emailService.sendConfirmationEmail(
                    data.user.email,
                    confirmationUrl
                  )

                  if (emailSent) {
                    console.log('✅ Email di conferma inviata')
                  }
                } catch (emailError) {
                  console.error('❌ Errore invio email:', emailError)
                }
              }
            }
          } else {
            console.log('✅ Utente esistente trovato')
          }

          // Se l'email è appena stata confermata, invia email di benvenuto
          if (data.user.email_confirmed_at && isNewUser && data.user.email) {
            console.log('🎉 Inviando email di benvenuto...')
            
            const { emailService } = await import('@/lib/email-service')
            
            try {
              await emailService.sendWelcomeEmail(
                data.user.email,
                `${requestUrl.origin}/dashboard`
              )
            } catch (emailError) {
              console.error('❌ Errore invio email di benvenuto:', emailError)
            }
          }
        } catch (userError) {
          console.error('❌ Errore gestione utente:', userError)
        }

        // Sincronizza sempre l'utente nella tabella custom (upsert)
        try {
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              email: data.user.email,
              plan: 'free',
              credits_remaining: 1,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            })

          if (upsertError) {
            console.error('⚠️ Errore upsert utente:', upsertError)
          } else {
            console.log('✅ Record utente sincronizzato')
          }
        } catch (dbError) {
          console.error('❌ Errore database:', dbError)
          // Non bloccare il login per errori DB
        }

        // Redirect alla dashboard
        console.log('🔄 Redirect a dashboard...')
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      }
    } catch (error) {
      console.error('❌ Errore generale callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Errore durante l'autenticazione`)
    }
  }

  // Fallback redirect
  console.log('🔄 Fallback redirect a login')
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
