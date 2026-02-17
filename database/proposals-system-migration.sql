-- =============================================================================
-- MIGRAZIONE: Sistema Proposte TrovaMi
-- Da "crediti per sbloccare lead" a "proposte per vedere dettagli"
-- =============================================================================
-- Eseguire in Supabase SQL Editor
-- IMPORTANTE: Fare backup del database prima di eseguire
-- =============================================================================

-- =====================================================
-- FASE 1: Aggiungere nuovi campi alla tabella users
-- =====================================================

-- Campi per il nuovo sistema proposte
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS proposals_remaining INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proposals_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_proposal_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS proposals_reset_type TEXT DEFAULT 'monthly'
  CHECK (proposals_reset_type IN ('weekly', 'monthly', 'never'));

-- Campi per onboarding e branding
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS specialization TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
ADD COLUMN IF NOT EXISTS company_phone TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS operating_city TEXT,
ADD COLUMN IF NOT EXISTS is_remote_nationwide BOOLEAN DEFAULT FALSE;

-- Indice per ricerca per specializzazione
CREATE INDEX IF NOT EXISTS idx_users_specialization
ON public.users USING GIN (specialization);

COMMENT ON COLUMN public.users.proposals_remaining IS 'Proposte rimanenti nel periodo corrente';
COMMENT ON COLUMN public.users.proposals_reset_date IS 'Data prossimo reset proposte';
COMMENT ON COLUMN public.users.first_proposal_used IS 'TRUE se ha gia usato la prima proposta gratuita';
COMMENT ON COLUMN public.users.proposals_reset_type IS 'weekly=FREE, monthly=STARTER, never=AGENCY';
COMMENT ON COLUMN public.users.specialization IS 'Array: web_development, seo, marketing, design, other';
COMMENT ON COLUMN public.users.company_logo_url IS 'URL logo caricato su Supabase Storage';

-- =====================================================
-- FASE 2: Aggiungere nuovi campi alla tabella plans
-- =====================================================

ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS max_proposals INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reset_type TEXT DEFAULT 'monthly'
  CHECK (reset_type IN ('weekly', 'monthly', 'never'));

COMMENT ON COLUMN public.plans.max_proposals IS 'Numero proposte per periodo (1=FREE weekly, 25=STARTER monthly, -1=illimitato)';
COMMENT ON COLUMN public.plans.is_unlimited IS 'TRUE per piano Agency (proposte illimitate)';
COMMENT ON COLUMN public.plans.reset_type IS 'Tipo di reset: weekly, monthly, never';

-- =====================================================
-- FASE 3: Aggiornare configurazione piani esistenti
-- =====================================================

-- Piano FREE: 1 proposta a settimana
UPDATE public.plans SET
  max_proposals = 1,
  is_unlimited = FALSE,
  reset_type = 'weekly',
  price_monthly = 0,
  description = '1 proposta completa a settimana per iniziare. Prima proposta sempre gratuita.'
WHERE name = 'free';

-- Piano STARTER Monthly: 25 proposte al mese, €19
UPDATE public.plans SET
  max_proposals = 25,
  is_unlimited = FALSE,
  reset_type = 'monthly',
  price_monthly = 1900,
  description = '25 proposte complete al mese. Perfetto per freelancer.'
WHERE name = 'starter_monthly';

-- Piano STARTER Annual: 25 proposte al mese, €190/anno
UPDATE public.plans SET
  max_proposals = 25,
  is_unlimited = FALSE,
  reset_type = 'monthly',
  price_monthly = 15833, -- €190/12
  description = '25 proposte complete al mese. Risparmi 2 mesi!'
WHERE name = 'starter_annual';

-- Piano AGENCY Monthly: Illimitate, €99
UPDATE public.plans SET
  max_proposals = -1,
  is_unlimited = TRUE,
  reset_type = 'never',
  price_monthly = 9900,
  description = 'Proposte illimitate. Per agenzie e team.'
WHERE name = 'agency_monthly';

-- Piano AGENCY Annual: Illimitate, €990/anno
UPDATE public.plans SET
  max_proposals = -1,
  is_unlimited = TRUE,
  reset_type = 'never',
  price_monthly = 82500, -- €990/12
  description = 'Proposte illimitate. Risparmi 2 mesi!'
WHERE name = 'agency_annual';

-- =====================================================
-- FASE 4: Migrare utenti PRO esistenti a STARTER
-- =====================================================

-- Aggiorna constraint per permettere la migrazione
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;

-- Migra utenti PRO a Starter (mantengono stesso ciclo billing)
UPDATE public.users
SET plan = 'starter_monthly'
WHERE plan = 'pro_monthly';

UPDATE public.users
SET plan = 'starter_annual'
WHERE plan = 'pro_annual';

-- Nascondi piani PRO (non eliminare per storico)
UPDATE public.plans
SET is_visible = FALSE
WHERE name LIKE 'pro%';

-- Ricrea constraint con piani aggiornati
ALTER TABLE public.users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'starter_monthly', 'starter_annual', 'pro_monthly', 'pro_annual', 'agency_monthly', 'agency_annual'));

-- =====================================================
-- FASE 5: Migrare dati utenti esistenti
-- =====================================================

-- Migra credits_remaining -> proposals_remaining
UPDATE public.users SET
  proposals_remaining = COALESCE(credits_remaining,
    CASE
      WHEN plan = 'free' THEN 1
      WHEN plan LIKE 'starter%' THEN 25
      WHEN plan LIKE 'agency%' THEN -1
      ELSE 1
    END
  ),
  proposals_reset_date = COALESCE(credits_reset_date, NOW() + INTERVAL '7 days'),
  proposals_reset_type = CASE
    WHEN plan = 'free' THEN 'weekly'
    WHEN plan LIKE 'agency%' THEN 'never'
    ELSE 'monthly'
  END,
  -- Se l'utente ha già sbloccato almeno un lead, first_proposal_used = true
  first_proposal_used = EXISTS (
    SELECT 1 FROM public.user_unlocked_leads WHERE user_id = users.id
  )
WHERE proposals_remaining IS NULL;

-- =====================================================
-- FASE 6: Funzione per verificare se è la prima proposta
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_first_proposal(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_first_used BOOLEAN;
BEGIN
  SELECT first_proposal_used INTO v_first_used
  FROM public.users
  WHERE id = p_user_id;

  RETURN NOT COALESCE(v_first_used, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_first_proposal IS 'Ritorna TRUE se utente non ha mai usato una proposta (prima gratuita)';

-- =====================================================
-- FASE 7: Funzione per consumare una proposta
-- =====================================================

CREATE OR REPLACE FUNCTION public.consume_proposal(p_user_id UUID, p_lead_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  is_free BOOLEAN,
  proposals_remaining INT,
  error_message TEXT
) AS $$
DECLARE
  v_user RECORD;
  v_plan RECORD;
  v_already_opened BOOLEAN;
  v_is_first BOOLEAN;
BEGIN
  -- Verifica se lead già aperto (non consuma, accesso gratuito)
  SELECT EXISTS (
    SELECT 1 FROM public.user_unlocked_leads
    WHERE user_id = p_user_id AND lead_id = p_lead_id
  ) INTO v_already_opened;

  IF v_already_opened THEN
    -- Lead già aperto, ritorna successo senza consumare
    SELECT u.proposals_remaining INTO v_user.proposals_remaining
    FROM public.users u WHERE u.id = p_user_id;

    RETURN QUERY SELECT TRUE, FALSE, COALESCE(v_user.proposals_remaining, 0), NULL::TEXT;
    RETURN;
  END IF;

  -- Ottieni dati utente e piano
  SELECT u.*, p.is_unlimited, p.max_proposals
  INTO v_user
  FROM public.users u
  LEFT JOIN public.plans p ON p.name = u.plan
  WHERE u.id = p_user_id;

  IF v_user IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 0, 'Utente non trovato'::TEXT;
    RETURN;
  END IF;

  -- Verifica se è la prima proposta (gratuita per tutti)
  v_is_first := NOT COALESCE(v_user.first_proposal_used, FALSE);

  -- Se piano illimitato (Agency), sempre OK
  IF COALESCE(v_user.is_unlimited, FALSE) THEN
    -- Inserisci in user_unlocked_leads
    INSERT INTO public.user_unlocked_leads (user_id, lead_id, unlocked_at)
    VALUES (p_user_id, p_lead_id, NOW())
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT TRUE, v_is_first, -1, NULL::TEXT;
    RETURN;
  END IF;

  -- Se prima proposta, è gratuita (non decrementa)
  IF v_is_first THEN
    -- Marca come usata
    UPDATE public.users
    SET first_proposal_used = TRUE
    WHERE id = p_user_id;

    -- Inserisci in user_unlocked_leads
    INSERT INTO public.user_unlocked_leads (user_id, lead_id, unlocked_at)
    VALUES (p_user_id, p_lead_id, NOW())
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT TRUE, TRUE, COALESCE(v_user.proposals_remaining, 0), NULL::TEXT;
    RETURN;
  END IF;

  -- Verifica proposte disponibili
  IF COALESCE(v_user.proposals_remaining, 0) <= 0 THEN
    RETURN QUERY SELECT FALSE, FALSE, 0,
      'Proposte esaurite. Passa a un piano superiore per continuare.'::TEXT;
    RETURN;
  END IF;

  -- Decrementa proposte e inserisci unlock
  UPDATE public.users
  SET proposals_remaining = proposals_remaining - 1
  WHERE id = p_user_id;

  INSERT INTO public.user_unlocked_leads (user_id, lead_id, unlocked_at)
  VALUES (p_user_id, p_lead_id, NOW())
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT TRUE, FALSE, v_user.proposals_remaining - 1, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.consume_proposal IS 'Consuma una proposta per aprire un lead. Prima proposta sempre gratuita.';

-- =====================================================
-- FASE 8: Funzione per reset proposte (chiamata da cron)
-- =====================================================

CREATE OR REPLACE FUNCTION public.reset_proposals_job()
RETURNS TABLE (
  users_reset_weekly INT,
  users_reset_monthly INT
) AS $$
DECLARE
  v_weekly_count INT := 0;
  v_monthly_count INT := 0;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Reset SETTIMANALE per utenti FREE
  WITH weekly_users AS (
    UPDATE public.users
    SET
      proposals_remaining = 1,
      proposals_reset_date = v_now + INTERVAL '7 days'
    WHERE proposals_reset_type = 'weekly'
      AND proposals_reset_date <= v_now
    RETURNING id
  )
  SELECT COUNT(*) INTO v_weekly_count FROM weekly_users;

  -- Reset MENSILE per utenti STARTER
  WITH monthly_users AS (
    UPDATE public.users u
    SET
      proposals_remaining = COALESCE(p.max_proposals, 25),
      proposals_reset_date = v_now + INTERVAL '30 days'
    FROM public.plans p
    WHERE u.plan = p.name
      AND u.proposals_reset_type = 'monthly'
      AND u.proposals_reset_date <= v_now
    RETURNING u.id
  )
  SELECT COUNT(*) INTO v_monthly_count FROM monthly_users;

  -- Agency (reset_type = 'never') non viene mai processato

  RETURN QUERY SELECT v_weekly_count, v_monthly_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.reset_proposals_job IS 'Job per reset proposte. Chiamare da cron ogni giorno.';

-- =====================================================
-- FASE 9: View per monitoraggio proposte
-- =====================================================

CREATE OR REPLACE VIEW public.v_user_proposals_status AS
SELECT
  u.id,
  u.email,
  u.plan,
  u.proposals_remaining,
  u.proposals_reset_date,
  u.proposals_reset_type,
  u.first_proposal_used,
  p.max_proposals,
  p.is_unlimited,
  CASE
    WHEN p.is_unlimited THEN 'Illimitate'
    WHEN u.proposals_remaining <= 0 THEN 'Esaurite'
    WHEN u.proposals_remaining = 1 THEN '1 proposta'
    ELSE u.proposals_remaining || ' proposte'
  END as status_text,
  CASE
    WHEN u.proposals_reset_type = 'weekly' THEN 'Reset domenica'
    WHEN u.proposals_reset_type = 'monthly' THEN 'Reset il ' || TO_CHAR(u.proposals_reset_date, 'DD/MM')
    ELSE 'Nessun reset'
  END as next_reset_text
FROM public.users u
LEFT JOIN public.plans p ON p.name = u.plan;

COMMENT ON VIEW public.v_user_proposals_status IS 'Vista per monitorare stato proposte utenti';

-- =====================================================
-- FASE 10: Indici per performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_proposals_reset_date
ON public.users(proposals_reset_date);

CREATE INDEX IF NOT EXISTS idx_users_proposals_reset_type
ON public.users(proposals_reset_type);

CREATE INDEX IF NOT EXISTS idx_users_first_proposal_used
ON public.users(first_proposal_used);

-- =====================================================
-- FASE 11: Storage bucket per logo utenti
-- =====================================================

-- Eseguire in Supabase Dashboard > Storage > Create bucket
-- Nome: user-assets
-- Public: true

-- Oppure via SQL (potrebbe richiedere permessi speciali):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('user-assets', 'user-assets', true)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICA MIGRAZIONE
-- =====================================================

-- Verifica che tutti gli utenti abbiano proposte
SELECT
  plan,
  COUNT(*) as utenti,
  COUNT(proposals_remaining) as con_proposte,
  AVG(proposals_remaining) as media_proposte
FROM public.users
GROUP BY plan
ORDER BY plan;

-- Verifica piani aggiornati
SELECT
  name,
  price_monthly / 100.0 as prezzo_euro,
  max_proposals,
  is_unlimited,
  reset_type,
  is_visible
FROM public.plans
ORDER BY sort_order;

-- =====================================================
-- ROLLBACK (in caso di problemi)
-- =====================================================
/*
-- Per tornare indietro (NON eseguire a meno che necessario):

-- Rimuovi nuovi campi users
ALTER TABLE public.users
DROP COLUMN IF EXISTS proposals_remaining,
DROP COLUMN IF EXISTS proposals_reset_date,
DROP COLUMN IF EXISTS first_proposal_used,
DROP COLUMN IF EXISTS proposals_reset_type,
DROP COLUMN IF EXISTS specialization,
DROP COLUMN IF EXISTS company_name,
DROP COLUMN IF EXISTS company_logo_url,
DROP COLUMN IF EXISTS company_phone,
DROP COLUMN IF EXISTS company_website,
DROP COLUMN IF EXISTS operating_city,
DROP COLUMN IF EXISTS is_remote_nationwide;

-- Rimuovi nuovi campi plans
ALTER TABLE public.plans
DROP COLUMN IF EXISTS max_proposals,
DROP COLUMN IF EXISTS is_unlimited,
DROP COLUMN IF EXISTS reset_type;

-- Rimuovi funzioni
DROP FUNCTION IF EXISTS public.is_first_proposal;
DROP FUNCTION IF EXISTS public.consume_proposal;
DROP FUNCTION IF EXISTS public.reset_proposals_job;

-- Rimuovi view
DROP VIEW IF EXISTS public.v_user_proposals_status;

-- Rimetti utenti PRO (se necessario)
UPDATE public.users SET plan = 'pro_monthly' WHERE plan = 'starter_monthly' AND credits_remaining > 25;
*/
