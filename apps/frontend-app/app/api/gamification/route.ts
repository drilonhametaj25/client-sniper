/**
 * API per il sistema di Gamification
 * GET: Recupera dati gamification utente (streak, achievements, XP)
 * POST: Registra attività e aggiorna streak
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    // Recupera o crea gamification data
    let { data: gamification, error } = await supabaseAdmin
      .from('user_gamification')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // Non esiste, crea
      const { data: newData, error: insertError } = await supabaseAdmin
        .from('user_gamification')
        .insert({ user_id: user.id })
        .select()
        .single()

      if (insertError) {
        console.error('Errore creazione gamification:', insertError)
        return NextResponse.json({ error: 'Errore inizializzazione gamification' }, { status: 500 })
      }
      gamification = newData
    } else if (error) {
      console.error('Errore recupero gamification:', error)
      return NextResponse.json({ error: 'Errore recupero dati' }, { status: 500 })
    }

    // Recupera achievements sbloccati
    const { data: userAchievements } = await supabaseAdmin
      .from('user_achievements')
      .select(`
        id,
        achievement_id,
        unlocked_at,
        achievements (
          id,
          name,
          description,
          icon,
          category,
          xp_reward
        )
      `)
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })

    // Recupera tutti gli achievements disponibili
    const { data: allAchievements } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    // Calcola livello da XP
    const level = calculateLevel(gamification.xp_points)
    const xpForCurrentLevel = getXpForLevel(level)
    const xpForNextLevel = getXpForLevel(level + 1)
    const xpProgress = gamification.xp_points - xpForCurrentLevel
    const xpNeeded = xpForNextLevel - xpForCurrentLevel

    const response = {
      streak: {
        current: gamification.current_streak,
        longest: gamification.longest_streak,
        lastActivityDate: gamification.last_activity_date
      },
      stats: {
        totalLeadsUnlocked: gamification.total_leads_unlocked,
        totalLeadsContacted: gamification.total_leads_contacted,
        totalDealsWon: gamification.total_deals_won,
        totalDealsValue: gamification.total_deals_value
      },
      xp: {
        total: gamification.xp_points,
        level: level,
        currentLevelXp: xpProgress,
        neededForNextLevel: xpNeeded,
        progressPercent: Math.round((xpProgress / xpNeeded) * 100)
      },
      achievements: {
        unlocked: userAchievements?.map(ua => ({
          id: ua.achievement_id,
          unlockedAt: ua.unlocked_at,
          ...ua.achievements
        })) || [],
        available: allAchievements || [],
        unlockedCount: userAchievements?.length || 0,
        totalCount: allAchievements?.length || 0
      }
    }

    return NextResponse.json({ success: true, data: response })

  } catch (error) {
    console.error('Errore API gamification GET:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Azioni supportate: 'activity', 'unlock', 'contact', 'deal'
    const validActions = ['activity', 'unlock', 'contact', 'deal']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
    }

    // Aggiorna streak
    const today = new Date().toISOString().split('T')[0]

    const { data: gamification } = await supabaseAdmin
      .from('user_gamification')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!gamification) {
      // Crea se non esiste
      await supabaseAdmin
        .from('user_gamification')
        .insert({ user_id: user.id, last_activity_date: today, current_streak: 1, longest_streak: 1 })

      return NextResponse.json({ success: true, streakUpdated: true, newStreak: 1 })
    }

    const lastDate = gamification.last_activity_date
    let newStreak = gamification.current_streak
    let streakUpdated = false
    const newAchievements: string[] = []

    if (!lastDate) {
      // Prima attività
      newStreak = 1
      streakUpdated = true
    } else if (lastDate === today) {
      // Già attivo oggi
      streakUpdated = false
    } else {
      const lastDateObj = new Date(lastDate)
      const todayObj = new Date(today)
      const diffDays = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        // Giorno consecutivo
        newStreak = gamification.current_streak + 1
        streakUpdated = true
      } else {
        // Streak interrotto
        newStreak = 1
        streakUpdated = true
      }
    }

    // Prepara update
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (streakUpdated) {
      updateData.current_streak = newStreak
      updateData.longest_streak = Math.max(gamification.longest_streak, newStreak)
      updateData.last_activity_date = today

      // Check streak achievements
      if (newStreak >= 3) await awardAchievement(user.id, 'streak_3', newAchievements)
      if (newStreak >= 7) await awardAchievement(user.id, 'streak_7', newAchievements)
      if (newStreak >= 30) await awardAchievement(user.id, 'streak_30', newAchievements)
    }

    // Aggiorna contatori in base all'azione
    if (action === 'unlock') {
      updateData.total_leads_unlocked = gamification.total_leads_unlocked + 1
      const newTotal = gamification.total_leads_unlocked + 1

      if (newTotal === 1) await awardAchievement(user.id, 'first_unlock', newAchievements)
      if (newTotal >= 10) await awardAchievement(user.id, 'unlock_10', newAchievements)
      if (newTotal >= 50) await awardAchievement(user.id, 'unlock_50', newAchievements)
      if (newTotal >= 100) await awardAchievement(user.id, 'unlock_100', newAchievements)
    }

    if (action === 'contact') {
      updateData.total_leads_contacted = gamification.total_leads_contacted + 1
      const newTotal = gamification.total_leads_contacted + 1

      if (newTotal === 1) await awardAchievement(user.id, 'first_contact', newAchievements)
      if (newTotal >= 10) await awardAchievement(user.id, 'contact_10', newAchievements)
    }

    if (action === 'deal') {
      updateData.total_deals_won = gamification.total_deals_won + 1
      const dealValue = body.dealValue || 0
      updateData.total_deals_value = gamification.total_deals_value + dealValue
      const newTotal = gamification.total_deals_won + 1

      if (newTotal === 1) await awardAchievement(user.id, 'first_deal', newAchievements)
      if (newTotal >= 5) await awardAchievement(user.id, 'deal_5', newAchievements)
    }

    await supabaseAdmin
      .from('user_gamification')
      .update(updateData)
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      streakUpdated,
      newStreak,
      newAchievements
    })

  } catch (error) {
    console.error('Errore API gamification POST:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

async function awardAchievement(userId: string, achievementId: string, newAchievements: string[]) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single()

    if (existing) return

    await supabaseAdmin
      .from('user_achievements')
      .insert({ user_id: userId, achievement_id: achievementId })

    // Aggiungi XP
    const { data: achievement } = await supabaseAdmin
      .from('achievements')
      .select('xp_reward')
      .eq('id', achievementId)
      .single()

    if (achievement?.xp_reward) {
      await supabaseAdmin
        .from('user_gamification')
        .update({
          xp_points: supabaseAdmin.rpc('add_xp', { amount: achievement.xp_reward })
        })
        .eq('user_id', userId)
    }

    newAchievements.push(achievementId)
  } catch (err) {
    console.error('Errore award achievement:', err)
  }
}

function calculateLevel(xp: number): number {
  // Formula: ogni livello richiede più XP del precedente
  // Livello 1: 0 XP, Livello 2: 100 XP, Livello 3: 250 XP, etc.
  if (xp < 100) return 1
  if (xp < 250) return 2
  if (xp < 500) return 3
  if (xp < 1000) return 4
  if (xp < 2000) return 5
  if (xp < 4000) return 6
  if (xp < 7500) return 7
  if (xp < 12000) return 8
  if (xp < 20000) return 9
  return 10
}

function getXpForLevel(level: number): number {
  const levels = [0, 0, 100, 250, 500, 1000, 2000, 4000, 7500, 12000, 20000]
  return levels[Math.min(level, 10)] || 20000
}
