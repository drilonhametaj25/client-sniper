/**
 * Middleware di autenticazione per API routes - TrovaMi
 * Gestisce autenticazione unificata con fallback cookie -> token
 * Usato da: Tutte le API routes che richiedono autenticazione
 * Chiamato da: API routes /api/stripe/*, /api/plan/*, etc.
 */

import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export interface AuthResult {
  user: any
  dbClient: any
  error?: string
}

/**
 * Autentica un utente utilizzando prima i cookie di sessione,
 * poi come fallback l'Authorization header con token Bearer
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    let user = null
    
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
        
        // Verifica il token
        const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser(token)
        
        if (tokenError || !tokenUser) {
          console.error('❌ Token di autorizzazione non valido:', tokenError?.message)
          return {
            user: null,
            dbClient: null,
            error: 'Token di autorizzazione non valido'
          }
        }
        
        user = tokenUser
        
        // Ritorna il client admin per le operazioni DB quando si usa il token
        const dbClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        return { user, dbClient }
        
      } else {
        console.error('❌ Nessuna sessione valida e nessun token di autorizzazione fornito')
        return {
          user: null,
          dbClient: null,
          error: 'Sessione non valida e nessun token di autorizzazione fornito'
        }
      }
    } else {
      user = sessionResult.data.session.user
      
      // Usa il client con cookie se la sessione è valida
      return { user, dbClient: supabase }
    }
    
  } catch (error) {
    console.error('❌ Errore durante l\'autenticazione:', error)
    return {
      user: null,
      dbClient: null,
      error: 'Errore interno durante l\'autenticazione'
    }
  }
}
