/**
 * Email Sequences Orchestrator - Macchina da Guerra TrovaMi
 *
 * Gestisce tutte le sequenze drip email:
 * - Welcome sequence (Day 0, 1, 3, 5, 7, 14)
 * - Re-engagement sequence (Day 3, 7, 14, 30)
 *
 * Usato da:
 * - /api/cron/drip-campaigns (ogni ora)
 * - /api/email-automation/start (avvio sequenze)
 */

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// =====================================================
// DEFINIZIONE SEQUENZE
// =====================================================

export interface SequenceStep {
  day: number           // Giorni dall'inizio della sequenza
  template: string      // Nome template email
  subject: string       // Subject email
}

export interface SequenceDefinition {
  steps: SequenceStep[]
  stopCondition: 'first_unlock' | 'user_active' | 'none'
}

export const SEQUENCES: Record<string, SequenceDefinition> = {
  welcome: {
    steps: [
      { day: 0, template: 'welcome_day0', subject: 'Benvenuto! Ecco i tuoi 5 crediti gratuiti' },
      { day: 1, template: 'welcome_day1', subject: 'Come trovare il lead perfetto in 30 secondi' },
      { day: 3, template: 'welcome_day3', subject: 'Altri {X} freelancer hanno già sbloccato lead' },
      { day: 5, template: 'welcome_day5', subject: 'Ecco cosa puoi fare con 1 solo lead' },
      { day: 7, template: 'welcome_day7', subject: 'I tuoi crediti ti aspettano!' },
      { day: 14, template: 'welcome_day14', subject: 'Ultima occasione: i migliori lead nella tua zona' }
    ],
    stopCondition: 'first_unlock'
  },
  reengagement: {
    steps: [
      { day: 3, template: 'reengagement_soft', subject: 'Ci manchi! Ecco cosa ti sei perso' },
      { day: 7, template: 'reengagement_fomo', subject: '{X} lead sbloccati da altri nella tua zona' },
      { day: 14, template: 'reengagement_value', subject: 'Il tuo competitor ha appena chiuso un deal' },
      { day: 30, template: 'reengagement_winback', subject: 'I migliori lead ti aspettano ancora' }
    ],
    stopCondition: 'user_active'
  }
}

// =====================================================
// TYPES
// =====================================================

export interface EmailSequence {
  id: string
  user_id: string
  sequence_type: string
  current_step: number
  started_at: string
  completed_at: string | null
  last_email_sent_at: string | null
  next_email_scheduled_at: string | null
  stopped_reason: string | null
  metadata: Record<string, any>
}

export interface SequenceResult {
  success: boolean
  sequenceId?: string
  error?: string
}

// =====================================================
// START SEQUENCE
// =====================================================

/**
 * Inizia una nuova sequenza per un utente
 */
export async function startSequence(
  userId: string,
  sequenceType: keyof typeof SEQUENCES,
  metadata: Record<string, any> = {}
): Promise<SequenceResult> {
  try {
    // Verifica che la sequenza esista
    const sequence = SEQUENCES[sequenceType]
    if (!sequence) {
      return { success: false, error: `Sequence type ${sequenceType} not found` }
    }

    // Verifica utente esiste e ha newsletter abilitata
    const { data: user, error: userError } = await getSupabase()
      .from('users')
      .select('id, email, newsletter_subscribed, status')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    if (!user.newsletter_subscribed) {
      return { success: false, error: 'User unsubscribed from newsletter' }
    }

    if (user.status !== 'active') {
      return { success: false, error: 'User not active' }
    }

    // Verifica se esiste già una sequenza attiva dello stesso tipo
    const { data: existingSequence } = await getSupabase()
      .from('email_sequences')
      .select('id')
      .eq('user_id', userId)
      .eq('sequence_type', sequenceType)
      .is('completed_at', null)
      .single()

    if (existingSequence) {
      return { success: false, error: 'Active sequence already exists' }
    }

    // Calcola quando inviare la prima email (subito per day 0)
    const firstStep = sequence.steps[0]
    const nextEmailDate = new Date()
    nextEmailDate.setDate(nextEmailDate.getDate() + firstStep.day)

    // Crea la sequenza
    const { data: newSequence, error: insertError } = await getSupabase()
      .from('email_sequences')
      .insert({
        user_id: userId,
        sequence_type: sequenceType,
        current_step: 0,
        next_email_scheduled_at: nextEmailDate.toISOString(),
        metadata: {
          ...metadata,
          started_reason: metadata.reason || 'manual'
        }
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating sequence:', insertError)
      return { success: false, error: insertError.message }
    }

    console.log(`✅ Started ${sequenceType} sequence for user ${userId}`)
    return { success: true, sequenceId: newSequence.id }

  } catch (err) {
    console.error('Error starting sequence:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// =====================================================
// STOP SEQUENCE
// =====================================================

/**
 * Ferma una sequenza (es. quando l'utente compie un'azione)
 */
export async function stopSequence(
  userId: string,
  sequenceType: string,
  reason: string
): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from('email_sequences')
      .update({
        completed_at: new Date().toISOString(),
        stopped_reason: reason
      })
      .eq('user_id', userId)
      .eq('sequence_type', sequenceType)
      .is('completed_at', null)

    if (error) {
      console.error('Error stopping sequence:', error)
      return false
    }

    console.log(`⏹️ Stopped ${sequenceType} sequence for user ${userId}: ${reason}`)
    return true
  } catch (err) {
    console.error('Error stopping sequence:', err)
    return false
  }
}

/**
 * Ferma sequenze basato su azione utente
 */
export async function stopSequenceOnAction(
  userId: string,
  action: 'first_unlock' | 'user_active' | 'unsubscribed'
): Promise<void> {
  // Trova sequenze che devono essere fermate per questa azione
  for (const [type, definition] of Object.entries(SEQUENCES)) {
    if (definition.stopCondition === action) {
      await stopSequence(userId, type, `user_action:${action}`)
    }
  }

  // Se unsubscribed, ferma TUTTE le sequenze
  if (action === 'unsubscribed') {
    const { error } = await getSupabase()
      .from('email_sequences')
      .update({
        completed_at: new Date().toISOString(),
        stopped_reason: 'unsubscribed'
      })
      .eq('user_id', userId)
      .is('completed_at', null)

    if (error) {
      console.error('Error stopping all sequences on unsubscribe:', error)
    }
  }
}

// =====================================================
// GET PENDING SEQUENCES
// =====================================================

/**
 * Ottieni le sequenze che hanno email da inviare ora
 */
export async function getPendingSequences(): Promise<EmailSequence[]> {
  const { data, error } = await getSupabase()
    .from('email_sequences')
    .select('*')
    .is('completed_at', null)
    .lte('next_email_scheduled_at', new Date().toISOString())
    .order('next_email_scheduled_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending sequences:', error)
    return []
  }

  return data || []
}

// =====================================================
// PROCESS SEQUENCE STEP
// =====================================================

/**
 * Processa uno step di una sequenza (invia email e avanza)
 */
export async function processSequenceStep(
  sequence: EmailSequence
): Promise<{ success: boolean; action: string }> {
  try {
    const definition = SEQUENCES[sequence.sequence_type]
    if (!definition) {
      return { success: false, action: 'invalid_sequence_type' }
    }

    // Verifica stop condition prima di inviare
    const shouldStop = await checkStopCondition(sequence.user_id, definition.stopCondition)
    if (shouldStop) {
      await stopSequence(sequence.user_id, sequence.sequence_type, `stop_condition:${definition.stopCondition}`)
      return { success: true, action: 'stopped_by_condition' }
    }

    // Verifica utente ancora subscribed
    const { data: user } = await getSupabase()
      .from('users')
      .select('email, newsletter_subscribed, unsubscribe_token')
      .eq('id', sequence.user_id)
      .single()

    if (!user || !user.newsletter_subscribed) {
      await stopSequence(sequence.user_id, sequence.sequence_type, 'unsubscribed')
      return { success: true, action: 'stopped_unsubscribed' }
    }

    // Trova lo step corrente
    const currentStep = definition.steps[sequence.current_step]
    if (!currentStep) {
      // Sequenza completata
      await getSupabase()
        .from('email_sequences')
        .update({
          completed_at: new Date().toISOString(),
          stopped_reason: 'completed'
        })
        .eq('id', sequence.id)
      return { success: true, action: 'completed' }
    }

    // Invia email tramite template
    const emailResult = await sendSequenceEmail(
      user.email,
      user.unsubscribe_token,
      sequence.user_id,
      currentStep.template,
      currentStep.subject
    )

    if (!emailResult) {
      console.error(`Failed to send ${currentStep.template} to ${user.email}`)
      return { success: false, action: 'email_failed' }
    }

    // Calcola prossimo step
    const nextStepIndex = sequence.current_step + 1
    const nextStep = definition.steps[nextStepIndex]

    if (nextStep) {
      // Calcola quando inviare la prossima email
      const nextEmailDate = new Date(sequence.started_at)
      nextEmailDate.setDate(nextEmailDate.getDate() + nextStep.day)

      await getSupabase()
        .from('email_sequences')
        .update({
          current_step: nextStepIndex,
          last_email_sent_at: new Date().toISOString(),
          next_email_scheduled_at: nextEmailDate.toISOString(),
          metadata: {
            ...sequence.metadata,
            last_sent_template: currentStep.template
          }
        })
        .eq('id', sequence.id)
    } else {
      // Era l'ultimo step
      await getSupabase()
        .from('email_sequences')
        .update({
          current_step: nextStepIndex,
          last_email_sent_at: new Date().toISOString(),
          next_email_scheduled_at: null,
          completed_at: new Date().toISOString(),
          stopped_reason: 'completed',
          metadata: {
            ...sequence.metadata,
            last_sent_template: currentStep.template
          }
        })
        .eq('id', sequence.id)
    }

    return { success: true, action: `sent_${currentStep.template}` }

  } catch (err) {
    console.error('Error processing sequence step:', err)
    return { success: false, action: 'error' }
  }
}

// =====================================================
// CHECK STOP CONDITION
// =====================================================

/**
 * Verifica se la condizione di stop è soddisfatta
 */
async function checkStopCondition(
  userId: string,
  condition: SequenceDefinition['stopCondition']
): Promise<boolean> {
  switch (condition) {
    case 'first_unlock': {
      // Controlla se l'utente ha sbloccato almeno un lead
      const { count } = await getSupabase()
        .from('user_unlocked_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      return (count || 0) > 0
    }

    case 'user_active': {
      // Controlla se l'utente è stato attivo negli ultimi 3 giorni
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const { data: lastUnlock } = await getSupabase()
        .from('user_unlocked_leads')
        .select('unlocked_at')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(1)
        .single()

      if (lastUnlock && new Date(lastUnlock.unlocked_at) > threeDaysAgo) {
        return true
      }

      // Controlla anche last_login_at
      const { data: user } = await getSupabase()
        .from('users')
        .select('last_login_at')
        .eq('id', userId)
        .single()

      if (user?.last_login_at && new Date(user.last_login_at) > threeDaysAgo) {
        return true
      }

      return false
    }

    case 'none':
    default:
      return false
  }
}

// =====================================================
// SEND SEQUENCE EMAIL
// =====================================================

/**
 * Invia email basata su template
 */
async function sendSequenceEmail(
  email: string,
  unsubscribeToken: string,
  userId: string,
  template: string,
  subject: string
): Promise<boolean> {
  // Import dinamico per evitare circular dependencies
  const { smtpEmail } = await import('./smtp-email')

  try {
    let success = false

    // Map template to appropriate send function
    switch (template) {
      // Welcome sequence
      case 'welcome_day0':
        success = await smtpEmail.sendWelcomeDay0(email, unsubscribeToken, userId)
        break
      case 'welcome_day1':
        success = await smtpEmail.sendWelcomeDay1(email, unsubscribeToken, userId)
        break
      case 'welcome_day3':
        success = await smtpEmail.sendWelcomeDay3(email, unsubscribeToken, userId)
        break
      case 'welcome_day5':
        success = await smtpEmail.sendWelcomeDay5(email, unsubscribeToken, userId)
        break
      case 'welcome_day7':
        success = await smtpEmail.sendWelcomeDay7(email, unsubscribeToken, userId)
        break
      case 'welcome_day14':
        success = await smtpEmail.sendWelcomeDay14(email, unsubscribeToken, userId)
        break

      // Re-engagement sequence
      case 'reengagement_soft':
        success = await smtpEmail.sendReengagementSoft(email, unsubscribeToken, userId)
        break
      case 'reengagement_fomo':
        success = await smtpEmail.sendReengagementFomo(email, unsubscribeToken, userId)
        break
      case 'reengagement_value':
        success = await smtpEmail.sendReengagementValue(email, unsubscribeToken, userId)
        break
      case 'reengagement_winback':
        success = await smtpEmail.sendReengagementWinback(email, unsubscribeToken, userId)
        break

      default:
        console.warn(`Unknown template: ${template}`)
        return false
    }

    // Log invio in notification_logs
    if (success) {
      await getSupabase().from('notification_logs').insert({
        user_id: userId,
        notification_type: `sequence_${template}`,
        channel: 'email',
        subject: subject,
        status: 'sent'
      })
    }

    return success

  } catch (err) {
    console.error(`Error sending sequence email ${template}:`, err)
    return false
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Inizia sequenza re-engagement quando utente diventa inattivo
 */
export async function checkAndStartReengagement(userId: string): Promise<void> {
  // Verifica se l'utente è inattivo da almeno 3 giorni
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const { data: lastUnlock } = await getSupabase()
    .from('user_unlocked_leads')
    .select('unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .limit(1)
    .single()

  // Solo se ha unlock ma è inattivo
  if (lastUnlock && new Date(lastUnlock.unlocked_at) < threeDaysAgo) {
    await startSequence(userId, 'reengagement', { reason: 'inactivity_detected' })
  }
}

/**
 * Inizia sequenze welcome per nuovi utenti
 */
export async function startWelcomeForNewUsers(): Promise<number> {
  // Trova utenti creati oggi senza sequenza welcome
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: newUsers, error } = await getSupabase()
    .from('users')
    .select('id')
    .gte('created_at', today.toISOString())
    .eq('status', 'active')
    .eq('newsletter_subscribed', true)

  if (error || !newUsers) return 0

  let started = 0
  for (const user of newUsers) {
    // Verifica che non abbia già una sequenza
    const { data: existingSeq } = await getSupabase()
      .from('email_sequences')
      .select('id')
      .eq('user_id', user.id)
      .eq('sequence_type', 'welcome')
      .single()

    if (!existingSeq) {
      const result = await startSequence(user.id, 'welcome', { reason: 'new_signup' })
      if (result.success) started++
    }
  }

  return started
}

/**
 * Get stats sulle sequenze attive
 */
export async function getSequenceStats(): Promise<{
  active: { welcome: number; reengagement: number }
  completed: { welcome: number; reengagement: number }
  stopped: { welcome: number; reengagement: number }
}> {
  const { data } = await getSupabase()
    .from('email_sequences')
    .select('sequence_type, completed_at, stopped_reason')

  const stats = {
    active: { welcome: 0, reengagement: 0 },
    completed: { welcome: 0, reengagement: 0 },
    stopped: { welcome: 0, reengagement: 0 }
  }

  for (const seq of data || []) {
    const type = seq.sequence_type as 'welcome' | 'reengagement'
    if (!stats.active[type]) continue

    if (!seq.completed_at) {
      stats.active[type]++
    } else if (seq.stopped_reason === 'completed') {
      stats.completed[type]++
    } else {
      stats.stopped[type]++
    }
  }

  return stats
}
