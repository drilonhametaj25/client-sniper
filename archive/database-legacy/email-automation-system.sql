/**
 * Migration: Email Automation System - Macchina da Guerra
 *
 * Crea la tabella email_sequences per il tracking delle sequenze drip
 * e aggiunge campi necessari alla tabella users.
 *
 * Eseguire su Supabase SQL Editor
 */

-- =====================================================
-- FASE 1: Campi utente per email automation
-- =====================================================

-- Aggiungi campi newsletter se non esistono
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT TRUE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid();

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS newsletter_last_sent_at TIMESTAMPTZ;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- =====================================================
-- FASE 2: Tabella Email Sequences
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Riferimento utente
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Tipo sequenza: 'welcome', 'reengagement'
  sequence_type TEXT NOT NULL,

  -- Step corrente nella sequenza (0, 1, 2, ...)
  current_step INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ,
  next_email_scheduled_at TIMESTAMPTZ,

  -- Stato
  stopped_reason TEXT, -- 'completed', 'user_action', 'unsubscribed', 'superseded'

  -- Metadati (es. email inviata, metriche)
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: solo una sequenza attiva per tipo per utente
  CONSTRAINT unique_active_sequence UNIQUE (user_id, sequence_type, completed_at)
);

-- =====================================================
-- FASE 3: Tabella Event Triggers Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.email_event_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Riferimento utente
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Tipo evento: 'first_unlock', 'first_contact', 'first_deal', 'streak_7', 'level_up', etc.
  event_type TEXT NOT NULL,

  -- ID dell'entità che ha triggerato (lead_id, crm_entry_id, etc.)
  entity_id UUID,

  -- Email già inviata per questo evento?
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  -- Metadati evento
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: un evento per tipo per utente
  CONSTRAINT unique_event_per_user UNIQUE (user_id, event_type)
);

-- =====================================================
-- FASE 4: Indici per performance
-- =====================================================

-- Indici email_sequences
CREATE INDEX IF NOT EXISTS idx_email_sequences_user
  ON public.email_sequences(user_id);

CREATE INDEX IF NOT EXISTS idx_email_sequences_next_scheduled
  ON public.email_sequences(next_email_scheduled_at)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_sequences_type_step
  ON public.email_sequences(sequence_type, current_step);

CREATE INDEX IF NOT EXISTS idx_email_sequences_active
  ON public.email_sequences(user_id, sequence_type)
  WHERE completed_at IS NULL;

-- Indici email_event_triggers
CREATE INDEX IF NOT EXISTS idx_event_triggers_user
  ON public.email_event_triggers(user_id);

CREATE INDEX IF NOT EXISTS idx_event_triggers_pending
  ON public.email_event_triggers(event_type, email_sent)
  WHERE email_sent = FALSE;

-- Indici users
CREATE INDEX IF NOT EXISTS idx_users_newsletter
  ON public.users(newsletter_subscribed)
  WHERE newsletter_subscribed = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_unsubscribe_token
  ON public.users(unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_users_last_login
  ON public.users(last_login_at);

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON public.users(created_at);

-- =====================================================
-- FASE 5: Trigger per updated_at
-- =====================================================

-- Funzione per auto-update updated_at
CREATE OR REPLACE FUNCTION update_email_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_email_sequences_updated_at ON public.email_sequences;
CREATE TRIGGER trigger_email_sequences_updated_at
  BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sequences_updated_at();

-- =====================================================
-- FASE 6: RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_event_triggers ENABLE ROW LEVEL SECURITY;

-- Policy: Service role può tutto
CREATE POLICY "Service role full access on email_sequences"
  ON public.email_sequences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on email_event_triggers"
  ON public.email_event_triggers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Utenti possono vedere solo le proprie sequenze
CREATE POLICY "Users can view own sequences"
  ON public.email_sequences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own event triggers"
  ON public.email_event_triggers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- FASE 7: Aggiorna utenti esistenti
-- =====================================================

-- Setta newsletter_subscribed a TRUE per tutti
UPDATE public.users
SET newsletter_subscribed = TRUE
WHERE newsletter_subscribed IS NULL;

-- Genera unsubscribe_token per chi non ce l'ha
UPDATE public.users
SET unsubscribe_token = gen_random_uuid()
WHERE unsubscribe_token IS NULL;

-- =====================================================
-- FASE 8: Inizializza sequenze welcome per utenti esistenti
-- (Solo utenti che non hanno mai sbloccato lead)
-- =====================================================

-- Questa query crea sequenze welcome per utenti che:
-- 1. Hanno credits_remaining = 5 (mai usato)
-- 2. Non hanno lead sbloccati
-- 3. Non hanno già una sequenza welcome

INSERT INTO public.email_sequences (user_id, sequence_type, current_step, next_email_scheduled_at, metadata)
SELECT
  u.id,
  'welcome',
  0,
  NOW(), -- Invia subito la prima email
  jsonb_build_object(
    'reason', 'backfill_existing_users',
    'created_at_original', u.created_at
  )
FROM public.users u
LEFT JOIN public.user_unlocked_leads ul ON u.id = ul.user_id
WHERE u.credits_remaining = 5
  AND u.status = 'active'
  AND u.newsletter_subscribed = TRUE
  AND ul.id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.email_sequences es
    WHERE es.user_id = u.id
    AND es.sequence_type = 'welcome'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICA
-- =====================================================

-- Verifica creazione tabelle
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sequences') THEN
    RAISE NOTICE 'email_sequences table created successfully';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_event_triggers') THEN
    RAISE NOTICE 'email_event_triggers table created successfully';
  END IF;
END $$;

-- Count sequenze create
SELECT
  'email_sequences' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE completed_at IS NULL) as active_sequences
FROM public.email_sequences;
