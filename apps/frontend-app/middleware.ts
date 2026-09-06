/**
 * Middleware globale di protezione route - TrovaMi
 * Fase attuale: protegge /admin/* (pagine) e /api/admin/* (API).
 * - Pagine admin: richiede sessione cookie con role='admin', altrimenti redirect a /login
 * - API admin: se c'è un Authorization Bearer lascia passare (la route verifica token+ruolo);
 *   altrimenti richiede sessione cookie con role='admin'
 * Usa getUser() (verifica col server auth), non getSession() (solo decodifica cookie).
 *
 * Nota: il gating delle pagine app (/dashboard, /crm, ...) verrà attivato dopo il
 * consolidamento della migrazione della sessione da localStorage a cookie.
 */

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse, type NextRequest } from 'next/server'

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/')

  // Le chiamate API con Bearer token vengono verificate dalla route stessa
  // (token + ruolo admin). Il middleware blocca solo gli accessi senza credenziali.
  if (isApiRoute && req.headers.get('authorization')?.startsWith('Bearer ')) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return deny(req)

  // La policy RLS su users permette di leggere la propria riga (incluso role)
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (data?.role !== 'admin') return deny(req)

  return res
}

function deny(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}
