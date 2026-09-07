/**
 * Helper di autenticazione unificato per API routes - TrovaMi
 * UNICO idioma di auth per le route: Bearer token verificato server-side,
 * con fallback su sessione cookie verificata via getUser() (mai getSession()).
 * Espone anche la factory memoizzata del client admin (service role).
 *
 * Usato da: app/api/admin/*, app/api/crm/*, app/api/leads/*, app/api/plan/*,
 *           app/api/credits/*, app/api/user/*, app/api/settings/*, app/api/onboarding/*
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { hasMinimumPlan, PlanType } from '@/lib/utils/plan-helpers'

let adminClient: SupabaseClient | null = null

/**
 * Client Supabase con service role, memoizzato a livello di modulo
 * (creato una sola volta per processo). LA factory da usare ovunque.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return adminClient
}

export interface AuthSuccess {
  user: User
  admin: SupabaseClient
  errorResponse?: undefined
}

export interface AuthFailure {
  user?: undefined
  admin?: undefined
  profile?: undefined
  errorResponse: NextResponse
}

export type AuthResult = AuthSuccess | AuthFailure

/** Profilo minimo dell'utente (tabella users) restituito da requirePlan */
export interface UserPlanProfile {
  plan: string
  status: string | null
  role: string | null
}

export type PlanAuthResult = (AuthSuccess & { profile: UserPlanProfile }) | AuthFailure

/**
 * Autentica l'utente. Ordine di risoluzione:
 *  a) header `Authorization: Bearer <token>` verificato via admin.auth.getUser(token)
 *  b) sessione cookie via createRouteHandlerClient, verificata con getUser()
 *     (MAI getSession(): il cookie va sempre verificato contro l'auth server)
 * Ritorna { user, admin } oppure { errorResponse } (401 pronto all'uso).
 */
export async function requireUser(request: NextRequest): Promise<AuthResult> {
  const admin = getSupabaseAdmin()

  // (a) Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (!error && user) {
      return { user, admin }
    }
  }

  // (b) Sessione cookie, verificata server-side con getUser()
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!error && user) {
      return { user, admin }
    }
  } catch {
    // Nessun contesto cookie disponibile: si ricade nel 401
  }

  return {
    errorResponse: NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
}

/**
 * requireUser + verifica users.role === 'admin' (via client admin).
 * Ritorna 403 'Accesso riservato agli admin' se il ruolo non è admin.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const result = await requireUser(request)
  if (result.errorResponse) {
    return result
  }

  const { data: profile, error } = await result.admin
    .from('users')
    .select('role')
    .eq('id', result.user.id)
    .single()

  if (error || profile?.role !== 'admin') {
    return {
      errorResponse: NextResponse.json(
        { error: 'Accesso riservato agli admin' },
        { status: 403 }
      )
    }
  }

  return result
}

const PLAN_LABELS: Record<PlanType, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency'
}

/**
 * requireUser + verifica che users.plan soddisfi il piano minimo richiesto
 * (via hasMinimumPlan). Ritorna anche il profilo { plan, status, role } per
 * eventuali controlli aggiuntivi per-route (es. status inactive/cancelled).
 */
export async function requirePlan(
  request: NextRequest,
  minPlan: 'starter' | 'pro' | 'agency'
): Promise<PlanAuthResult> {
  const result = await requireUser(request)
  if (result.errorResponse) {
    return result
  }

  const { data: profile, error } = await result.admin
    .from('users')
    .select('plan, status, role')
    .eq('id', result.user.id)
    .single()

  if (error || !profile) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Errore nel recupero dati utente' },
        { status: 500 }
      )
    }
  }

  if (!hasMinimumPlan(profile.plan || '', minPlan)) {
    const label = PLAN_LABELS[minPlan]
    return {
      errorResponse: NextResponse.json(
        {
          error: `Piano ${label} richiesto`,
          current_plan: profile.plan || 'unknown',
          message: `Questa funzionalità richiede un piano ${label} o superiore`
        },
        { status: 403 }
      )
    }
  }

  return { user: result.user, admin: result.admin, profile }
}
