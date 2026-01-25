/**
 * Utility centralizzata per rate limiting dei tool pubblici - TrovaMi
 * Gestisce limiti differenziati per piano e autenticazione opzionale
 *
 * Limiti per piano (per tool, per giorno):
 *   - Non registrato/Free: 2
 *   - Starter: 10
 *   - Pro: 25
 *   - Agency: illimitato
 *
 * Usato da: API routes dei tool pubblici (public-scan, seo-checker, etc.)
 * Dipende da: Supabase, plan-helpers.ts
 */

import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getBasePlanType, PlanType } from './plan-helpers'

// ============================================================================
// Tipi e Costanti
// ============================================================================

/** Nomi dei tool supportati */
export type ToolName =
  | 'public-scan'
  | 'seo-checker'
  | 'tech-detector'
  | 'security-check'
  | 'accessibility-check'

/** Limiti giornalieri per piano (-1 = illimitato) */
export const PLAN_LIMITS: Record<PlanType, number> = {
  free: 2,
  starter: 10,
  pro: 25,
  agency: -1
}

/** Limite per utenti non registrati */
export const ANONYMOUS_LIMIT = 2

/** Risultato della verifica rate limit */
export interface RateLimitCheckResult {
  /** Se l'utente puo' usare il tool */
  allowed: boolean
  /** Utilizzi effettuati oggi */
  currentUsage: number
  /** Limite giornaliero (-1 se illimitato) */
  dailyLimit: number
  /** Utilizzi rimanenti (-1 se illimitato) */
  remaining: number
  /** Se il piano e' illimitato (Agency) */
  isUnlimited: boolean
  /** Se l'utente e' autenticato */
  isAuthenticated: boolean
  /** Piano dell'utente (null se anonimo) */
  userPlan: PlanType | null
  /** ID utente (null se anonimo) */
  userId: string | null
}

/** Dati per il logging utilizzo */
export interface UsageLogData {
  toolName: ToolName
  websiteUrl?: string
  userAgent?: string
}

// ============================================================================
// Funzioni Helper
// ============================================================================

/**
 * Estrae l'IP del client dalla request
 * Supporta proxy, Cloudflare, Vercel, etc.
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cfConnecting = request.headers.get('cf-connecting-ip')

  if (forwarded) return forwarded.split(',')[0].trim()
  if (real) return real
  if (cfConnecting) return cfConnecting

  return '127.0.0.1'
}

/**
 * Crea un client Supabase admin per operazioni DB
 */
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Tenta di ottenere l'utente autenticato (opzionale)
 * Non fallisce se non autenticato, ritorna null
 */
async function tryGetAuthenticatedUser(): Promise<{
  user: any | null
  userPlan: PlanType | null
  userStatus: string | null
}> {
  try {
    // Prova con il cookie di sessione
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return { user: null, userPlan: null, userStatus: null }
    }

    // Ottieni dati utente dal database
    const admin = getSupabaseAdmin()
    const { data: userData, error } = await admin
      .from('users')
      .select('plan, status')
      .eq('id', session.user.id)
      .single()

    if (error || !userData) {
      // Utente autenticato ma non in tabella users (nuovo utente?)
      return { user: session.user, userPlan: 'free', userStatus: null }
    }

    // Se utente inattivo, tratta come anonimo per i limiti
    if (userData.status !== 'active') {
      return { user: null, userPlan: null, userStatus: userData.status }
    }

    const basePlan = getBasePlanType(userData.plan || 'free')
    return {
      user: session.user,
      userPlan: basePlan,
      userStatus: userData.status
    }
  } catch (error) {
    // Qualsiasi errore = tratta come anonimo
    console.error('Errore autenticazione opzionale:', error)
    return { user: null, userPlan: null, userStatus: null }
  }
}

// ============================================================================
// Funzioni Principali
// ============================================================================

/**
 * Verifica se l'utente/IP puo' usare il tool
 * Supporta autenticazione opzionale: se loggato usa piano, altrimenti IP
 */
export async function checkToolRateLimit(
  request: NextRequest,
  toolName: ToolName
): Promise<RateLimitCheckResult> {
  const clientIP = getClientIP(request)
  const { user, userPlan } = await tryGetAuthenticatedUser()

  // Se Agency, ritorna subito (illimitato)
  if (user && userPlan === 'agency') {
    return {
      allowed: true,
      currentUsage: 0,
      dailyLimit: -1,
      remaining: -1,
      isUnlimited: true,
      isAuthenticated: true,
      userPlan: 'agency',
      userId: user.id
    }
  }

  // Chiama RPC per check limite
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('check_tool_daily_limit', {
    p_tool_name: toolName,
    p_user_id: user?.id || null,
    p_ip_address: clientIP
  })

  if (error) {
    console.error('Errore check_tool_daily_limit:', error)
    // Fallback conservativo: permetti con limite anonimo
    return {
      allowed: true,
      currentUsage: 0,
      dailyLimit: ANONYMOUS_LIMIT,
      remaining: ANONYMOUS_LIMIT,
      isUnlimited: false,
      isAuthenticated: !!user,
      userPlan,
      userId: user?.id || null
    }
  }

  // data puo' essere array o oggetto singolo
  const result = Array.isArray(data) ? data[0] : data

  return {
    allowed: result.can_use,
    currentUsage: result.current_usage,
    dailyLimit: result.daily_limit,
    remaining: result.remaining,
    isUnlimited: result.is_unlimited,
    isAuthenticated: !!user,
    userPlan,
    userId: user?.id || null
  }
}

/**
 * Registra l'utilizzo di un tool
 * Da chiamare DOPO che l'analisi e' stata completata con successo
 */
export async function logToolUsage(
  request: NextRequest,
  data: UsageLogData
): Promise<boolean> {
  const clientIP = getClientIP(request)
  const { user } = await tryGetAuthenticatedUser()

  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc('log_tool_usage', {
    p_tool_name: data.toolName,
    p_ip_address: clientIP,
    p_website_url: data.websiteUrl || null,
    p_user_id: user?.id || null,
    p_user_agent: data.userAgent || request.headers.get('user-agent') || null
  })

  if (error) {
    console.error('Errore log_tool_usage:', error)
    return false
  }

  return true
}

// ============================================================================
// Helper per Risposte
// ============================================================================

/**
 * Genera risposta JSON per limite raggiunto (429)
 */
export function rateLimitExceededResponse(
  result: RateLimitCheckResult,
  toolName: ToolName
) {
  const message = result.isAuthenticated
    ? `Hai raggiunto il limite di ${result.dailyLimit} analisi per oggi con il piano ${result.userPlan}. Passa a un piano superiore per piu' analisi!`
    : `Hai raggiunto il limite di ${result.dailyLimit} analisi gratuite per oggi. Registrati per ottenere piu' analisi!`

  return {
    success: false,
    message,
    remaining: 0,
    upgradeRequired: !result.isAuthenticated,
    upgradeToPro: result.isAuthenticated && result.userPlan !== 'agency'
  }
}

/**
 * Ottiene info rimanenti per la risposta di successo
 * Aggiorna i contatori dopo un utilizzo
 */
export function getRemainingInfo(result: RateLimitCheckResult, afterUsage: boolean = false) {
  if (result.isUnlimited) {
    return {
      remaining: 'illimitato' as const,
      limit: 'illimitato' as const,
      used: 0
    }
  }

  const used = afterUsage ? result.currentUsage + 1 : result.currentUsage
  const remaining = afterUsage
    ? Math.max(0, result.dailyLimit - used)
    : result.remaining

  return {
    remaining,
    limit: result.dailyLimit,
    used
  }
}

/**
 * Genera messaggio di successo con info rimanenti
 */
export function getSuccessMessage(
  result: RateLimitCheckResult,
  afterUsage: boolean = true
): string {
  if (result.isUnlimited) {
    return 'Analisi completata! Il tuo piano Agency ha analisi illimitate.'
  }

  const info = getRemainingInfo(result, afterUsage)
  const remaining = typeof info.remaining === 'number' ? info.remaining : 0

  if (remaining === 0) {
    return 'Analisi completata! Hai esaurito le analisi gratuite per oggi.'
  }

  if (result.isAuthenticated) {
    return `Analisi completata! Ti rimangono ${remaining} analisi oggi con il piano ${result.userPlan}.`
  }

  return `Analisi completata! Puoi farne ancora ${remaining} oggi. Registrati per ottenere piu' analisi!`
}
