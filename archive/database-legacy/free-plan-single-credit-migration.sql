-- =====================================================
-- MIGRAZIONE: Free Plan da 5 crediti a 1 credito di prova
-- Data: 2026-03-05
-- Obiettivo: Il piano Free passa da "5 crediti/mese con reset settimanale"
--            a "1 solo credito di prova alla registrazione, senza rinnovo"
-- =====================================================

-- 1. Aggiornare il CHECK constraint di reset_type su plans per includere 'none'
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_reset_type_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_reset_type_check
  CHECK (reset_type IN ('weekly', 'monthly', 'never', 'none'));

-- 2. Aggiornare il CHECK constraint di proposals_reset_type su users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_proposals_reset_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_proposals_reset_type_check
  CHECK (proposals_reset_type IN ('weekly', 'monthly', 'never', 'none'));

-- 3. Aggiornare piano free nella tabella plans
UPDATE public.plans
SET
  max_credits = 1,
  max_proposals = 1,
  reset_type = 'none',
  description = '1 credito di prova alla registrazione. Prova la piattaforma gratuitamente.'
WHERE name = 'free';

-- 4. Migrare utenti free esistenti (approccio gentile):
--    Mantengono i crediti rimanenti ma non ricevono piu reset
UPDATE public.users
SET
  proposals_reset_type = 'none',
  proposals_reset_date = NULL
WHERE plan = 'free';

-- 5. Aggiornare la funzione reset_proposals_job per rimuovere reset weekly
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
  -- Reset SETTIMANALE: disabilitato (nessun piano usa piu 'weekly')
  -- v_weekly_count resta 0

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

  -- 'none' e 'never' non vengono mai processati

  RETURN QUERY SELECT v_weekly_count, v_monthly_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.reset_proposals_job IS 'Job per reset proposte. Weekly disabilitato dopo migrazione free plan a credito singolo.';
