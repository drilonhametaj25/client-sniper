/**
 * Newsletter Personalization Engine per TrovaMi
 * Genera contenuti personalizzati per ogni segmento utenti
 *
 * Usato da: /api/cron/newsletter
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// =====================================================
// TYPES
// =====================================================

export interface UserPreferences {
  categories: string[]
  cities: string[]
}

export interface PersonalizedLead {
  business_name: string
  city: string
  category: string
  score: number
}

export interface PersonalizedLeadsResult {
  leads: PersonalizedLead[]
  newLeadsCount: number
}

export interface CompetitionMetrics {
  unlockedByOthers: number
  usersActiveThisWeek: number
}

export interface WeeklyStats {
  leadsUnlocked: number
  leadsContacted: number
  dealsWon: number
  currentStreak: number
}

export interface GamificationData {
  level: number
  xpPoints: number
  nextAchievement?: {
    name: string
    progress: number
    target: number
  }
}

// =====================================================
// FUNCTIONS
// =====================================================

/**
 * Recupera le preferenze dell'utente basate sui lead sbloccati
 * e sulle ricerche salvate
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  // 1. Recupera categorie/città dai lead sbloccati
  const { data: unlockedLeads } = await supabase
    .from('user_unlocked_leads')
    .select(`
      lead_id,
      leads!inner(category, city)
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .limit(50)

  // 2. Recupera preferenze dalle ricerche salvate (peso maggiore)
  const { data: savedSearches } = await supabase
    .from('saved_searches')
    .select('categories, cities')
    .eq('user_id', userId)
    .eq('is_active', true)

  // 3. Aggrega categorie e città con conteggio frequenza
  const categoryCount: Record<string, number> = {}
  const cityCount: Record<string, number> = {}

  // Dai lead sbloccati (peso 1)
  unlockedLeads?.forEach(ul => {
    const lead = ul.leads as { category?: string; city?: string }
    if (lead?.category) {
      categoryCount[lead.category] = (categoryCount[lead.category] || 0) + 1
    }
    if (lead?.city) {
      cityCount[lead.city] = (cityCount[lead.city] || 0) + 1
    }
  })

  // Dalle ricerche salvate (peso 2 - preferenze esplicite)
  savedSearches?.forEach(ss => {
    ss.categories?.forEach((cat: string) => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 2
    })
    ss.cities?.forEach((city: string) => {
      cityCount[city] = (cityCount[city] || 0) + 2
    })
  })

  // 4. Ordina per frequenza e prendi top 5
  const categories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat)

  const cities = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city]) => city)

  return { categories, cities }
}

/**
 * Recupera lead personalizzati matching le preferenze utente
 * Esclude lead già sbloccati
 */
export async function getPersonalizedLeads(
  userId: string,
  preferences: UserPreferences,
  limit: number = 5
): Promise<PersonalizedLeadsResult> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // 1. Recupera ID lead già sbloccati dall'utente
  const { data: unlockedIds } = await supabase
    .from('user_unlocked_leads')
    .select('lead_id')
    .eq('user_id', userId)

  const excludeIds = unlockedIds?.map(u => u.lead_id) || []

  // 2. Query leads matching preferenze
  let query = supabase
    .from('leads')
    .select('id, business_name, city, category, score')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('score', { ascending: true }) // Score basso = più problemi = migliore opportunità

  // Filtra per preferenze se disponibili
  if (preferences.categories.length > 0) {
    query = query.in('category', preferences.categories)
  }
  if (preferences.cities.length > 0) {
    query = query.in('city', preferences.cities)
  }

  // Escludi lead già sbloccati
  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data: leads } = await query.limit(limit)

  // 3. Conta totale nuovi lead matching
  let countQuery = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString())

  if (preferences.categories.length > 0) {
    countQuery = countQuery.in('category', preferences.categories)
  }
  if (preferences.cities.length > 0) {
    countQuery = countQuery.in('city', preferences.cities)
  }

  const { count: newLeadsCount } = await countQuery

  return {
    leads: leads || [],
    newLeadsCount: newLeadsCount || 0
  }
}

/**
 * Metriche competizione per contenuto FOMO
 */
export async function getCompetitionMetrics(): Promise<CompetitionMetrics> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Lead sbloccati questa settimana (da tutti gli utenti)
  const { count: unlockedByOthers } = await supabase
    .from('user_unlocked_leads')
    .select('*', { count: 'exact', head: true })
    .gte('unlocked_at', sevenDaysAgo.toISOString())

  // Utenti unici attivi questa settimana
  const { data: activeUsers } = await supabase
    .from('user_unlocked_leads')
    .select('user_id')
    .gte('unlocked_at', sevenDaysAgo.toISOString())

  const uniqueUsers = new Set(activeUsers?.map(u => u.user_id) || [])

  return {
    unlockedByOthers: unlockedByOthers || 0,
    usersActiveThisWeek: uniqueUsers.size
  }
}

/**
 * Lead esempio per nuovi utenti (senza preferenze)
 */
export async function getSampleLeads(limit: number = 3): Promise<PersonalizedLead[]> {
  const { data: leads } = await supabase
    .from('leads')
    .select('business_name, city, category, score')
    .lte('score', 50) // Mostra lead con problemi evidenti
    .order('created_at', { ascending: false })
    .limit(limit)

  return leads || []
}

/**
 * Statistiche settimanali per utenti attivi
 */
export async function getUserWeeklyStats(userId: string): Promise<WeeklyStats> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Lead sbloccati questa settimana
  const { count: leadsUnlocked } = await supabase
    .from('user_unlocked_leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('unlocked_at', sevenDaysAgo.toISOString())

  // Lead contattati (CRM entries con status != to_contact)
  const { count: leadsContacted } = await supabase
    .from('crm_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'to_contact')
    .gte('updated_at', sevenDaysAgo.toISOString())

  // Deal chiusi questa settimana
  const { count: dealsWon } = await supabase
    .from('crm_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'closed_positive')
    .gte('updated_at', sevenDaysAgo.toISOString())

  // Streak dalla gamification
  const { data: gamification } = await supabase
    .from('user_gamification')
    .select('current_streak')
    .eq('user_id', userId)
    .single()

  return {
    leadsUnlocked: leadsUnlocked || 0,
    leadsContacted: leadsContacted || 0,
    dealsWon: dealsWon || 0,
    currentStreak: gamification?.current_streak || 0
  }
}

/**
 * Dati gamification per utenti attivi
 */
export async function getUserGamification(userId: string): Promise<GamificationData> {
  // Recupera dati gamification
  const { data: gamification } = await supabase
    .from('user_gamification')
    .select('level, xp_points, total_leads_unlocked')
    .eq('user_id', userId)
    .single()

  // Recupera achievement già ottenuti
  const { data: earnedAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)

  const earnedIds = earnedAchievements?.map(a => a.achievement_id) || []

  // Trova prossimo achievement non ottenuto
  let nextAchievement: GamificationData['nextAchievement'] = undefined

  // Achievement comuni e i loro target
  const achievementTargets: Record<string, { name: string; field: string; target: number }> = {
    'unlock_10': { name: 'Sblocca 10 lead', field: 'total_leads_unlocked', target: 10 },
    'unlock_50': { name: 'Sblocca 50 lead', field: 'total_leads_unlocked', target: 50 },
    'unlock_100': { name: 'Sblocca 100 lead', field: 'total_leads_unlocked', target: 100 },
    'streak_7': { name: 'Streak di 7 giorni', field: 'current_streak', target: 7 },
    'streak_30': { name: 'Streak di 30 giorni', field: 'current_streak', target: 30 }
  }

  // Trova il primo achievement non ancora ottenuto
  for (const [id, info] of Object.entries(achievementTargets)) {
    if (!earnedIds.includes(id)) {
      const currentProgress = gamification?.[info.field as keyof typeof gamification] as number || 0
      if (currentProgress < info.target) {
        nextAchievement = {
          name: info.name,
          progress: currentProgress,
          target: info.target
        }
        break
      }
    }
  }

  return {
    level: gamification?.level || 1,
    xpPoints: gamification?.xp_points || 0,
    nextAchievement
  }
}

/**
 * Verifica se un utente è nel segmento NUOVI
 * (credits = 5 AND mai sbloccato lead)
 */
export async function isNewUser(userId: string, creditsRemaining: number): Promise<boolean> {
  if (creditsRemaining !== 5) return false

  const { count } = await supabase
    .from('user_unlocked_leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return count === 0
}

/**
 * Verifica se un utente è nel segmento DORMIENTI
 * (ha sbloccato lead MA last_unlock > 7 giorni)
 */
export async function isDormantUser(userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: lastUnlock } = await supabase
    .from('user_unlocked_leads')
    .select('unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastUnlock) return false // Mai sbloccato = NUOVO, non dormiente

  return new Date(lastUnlock.unlocked_at) < sevenDaysAgo
}

/**
 * Verifica se un utente è nel segmento ATTIVI
 * (ha sbloccato lead negli ultimi 7 giorni)
 */
export async function isActiveUser(userId: string): Promise<boolean> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: lastUnlock } = await supabase
    .from('user_unlocked_leads')
    .select('unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastUnlock) return false

  return new Date(lastUnlock.unlocked_at) >= sevenDaysAgo
}
