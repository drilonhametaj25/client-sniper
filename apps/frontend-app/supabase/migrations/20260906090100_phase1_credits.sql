-- =====================================================
-- FASE 1 (economia crediti): risanamento + RPC atomica consume_credit
-- =====================================================
-- Problemi risolti:
-- 1. Gli abbonati Starter restavano a 0 proposte per sempre (il cron
--    reset-proposals non era schedulato e il webhook Stripe scriveva solo
--    credits_remaining, ma l'unlock leggeva proposals_remaining)
-- 2. Unlock non transazionale: insert PRIMA del decremento, errori
--    silenziati, race su richieste concorrenti
--
-- Decisione: credits_remaining/max_credits sono LA verità (i percorsi soldi
-- già funzionanti — webhook Stripe e cron schedulato — scrivono già lì).
-- Durante la transizione proposals_remaining viene tenuta in sync a ogni
-- scrittura; le colonne proposals_* verranno droppate a fine rilancio.

BEGIN;

-- 1) Risana i paganti bloccati: prendi il massimo tra i due contatori.
-- Esclude i piani illimitati (credits_remaining = -1 è il marker "illimitato"
-- e non va sovrascritto).
UPDATE public.users u
SET
  credits_remaining   = GREATEST(COALESCE(u.credits_remaining, 0), COALESCE(u.proposals_remaining, 0)),
  proposals_remaining = GREATEST(COALESCE(u.credits_remaining, 0), COALESCE(u.proposals_remaining, 0))
WHERE NOT EXISTS (
  SELECT 1 FROM public.plans p
  WHERE p.name = u.plan AND COALESCE(p.is_unlimited, FALSE)
);

-- 2) Allinea gli allotment dei piani: i valori gen-2 (max_proposals) erano
-- quelli corretti (starter=25, ecc.)
UPDATE public.plans
SET max_credits = max_proposals
WHERE max_proposals IS NOT NULL AND max_proposals <> 0;

-- 3) users.status: le righe create dal fallback non avevano status e non
-- potevano mai sbloccare
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'active';
UPDATE public.users SET status = 'active' WHERE status IS NULL;

-- 4) Idempotenza sblocchi sotto concorrenza (difensivo: la CREATE TABLE
-- originale ha già UNIQUE(user_id, lead_id), ma lo schema di produzione
-- potrebbe non averlo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_unlocked_leads
  ON public.user_unlocked_leads(user_id, lead_id);

-- 5) RPC atomica: TUTTO il consumo crediti passa da qui.
-- Differenze rispetto alla vecchia consume_proposal (mai chiamata):
-- - SELECT ... FOR UPDATE: chiude la race su sblocchi concorrenti
-- - opera su credits_remaining (e tiene proposals_remaining in sync)
-- - verifica users.status = 'active'
-- - scrive l'audit log DENTRO la transazione
-- - inserisce l'unlock DOPO aver decrementato, nella stessa transazione
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id UUID, p_lead_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  already_unlocked BOOLEAN,
  is_free BOOLEAN,
  is_unlimited BOOLEAN,
  credits_remaining INT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_unlimited BOOLEAN := FALSE;
  v_new_credits INT;
BEGIN
  -- Lock della riga utente: serializza gli sblocchi concorrenti dello stesso utente
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, FALSE, FALSE, 0, 'Utente non trovato'::TEXT;
    RETURN;
  END IF;

  IF v_user.status IS DISTINCT FROM 'active' THEN
    RETURN QUERY SELECT FALSE, FALSE, FALSE, FALSE,
      COALESCE(v_user.credits_remaining, 0),
      'Piano non attivo. Riattiva il tuo piano per continuare.'::TEXT;
    RETURN;
  END IF;

  -- Lead già sbloccato: accesso gratuito
  IF EXISTS (
    SELECT 1 FROM public.user_unlocked_leads
    WHERE user_id = p_user_id AND lead_id = p_lead_id
  ) THEN
    RETURN QUERY SELECT TRUE, TRUE, FALSE, FALSE,
      COALESCE(v_user.credits_remaining, 0), NULL::TEXT;
    RETURN;
  END IF;

  SELECT COALESCE(p.is_unlimited, FALSE) INTO v_unlimited
  FROM public.plans p WHERE p.name = v_user.plan;
  v_unlimited := COALESCE(v_unlimited, FALSE);

  -- Piano illimitato (Agency): non consuma
  IF v_unlimited THEN
    INSERT INTO public.user_unlocked_leads (user_id, lead_id, unlocked_at)
    VALUES (p_user_id, p_lead_id, NOW())
    ON CONFLICT (user_id, lead_id) DO NOTHING;

    INSERT INTO public.credit_usage_logs (user_id, action, credits_used, credits_remaining, details)
    VALUES (p_user_id, 'unlock_lead', 0, -1,
            jsonb_build_object('lead_id', p_lead_id, 'is_unlimited', TRUE));

    RETURN QUERY SELECT TRUE, FALSE, FALSE, TRUE, -1, NULL::TEXT;
    RETURN;
  END IF;

  -- Primo sblocco gratuito per i piani a pagamento
  IF NOT COALESCE(v_user.first_proposal_used, FALSE) AND v_user.plan <> 'free' THEN
    UPDATE public.users SET first_proposal_used = TRUE WHERE id = p_user_id;

    INSERT INTO public.user_unlocked_leads (user_id, lead_id, unlocked_at)
    VALUES (p_user_id, p_lead_id, NOW())
    ON CONFLICT (user_id, lead_id) DO NOTHING;

    INSERT INTO public.credit_usage_logs (user_id, action, credits_used, credits_remaining, details)
    VALUES (p_user_id, 'unlock_lead', 0, COALESCE(v_user.credits_remaining, 0),
            jsonb_build_object('lead_id', p_lead_id, 'is_free_proposal', TRUE));

    RETURN QUERY SELECT TRUE, FALSE, TRUE, FALSE,
      COALESCE(v_user.credits_remaining, 0), NULL::TEXT;
    RETURN;
  END IF;

  -- Crediti esauriti
  IF COALESCE(v_user.credits_remaining, 0) <= 0 THEN
    RETURN QUERY SELECT FALSE, FALSE, FALSE, FALSE, 0,
      'Crediti esauriti. Passa a un piano superiore per continuare.'::TEXT;
    RETURN;
  END IF;

  -- Consumo: decrementa (entrambe le colonne, in sync durante la transizione)
  v_new_credits := v_user.credits_remaining - 1;

  UPDATE public.users
  SET credits_remaining = v_new_credits,
      proposals_remaining = v_new_credits
  WHERE id = p_user_id;

  INSERT INTO public.user_unlocked_leads (user_id, lead_id, unlocked_at)
  VALUES (p_user_id, p_lead_id, NOW())
  ON CONFLICT (user_id, lead_id) DO NOTHING;

  INSERT INTO public.credit_usage_logs (user_id, action, credits_used, credits_remaining, details)
  VALUES (p_user_id, 'unlock_lead', 1, v_new_credits,
          jsonb_build_object('lead_id', p_lead_id));

  RETURN QUERY SELECT TRUE, FALSE, FALSE, FALSE, v_new_credits, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.consume_credit IS
  'Consumo atomico di un credito per sbloccare un lead (FOR UPDATE, audit interno). Chiamata SOLO dal server con service role.';

-- Solo il service role (che bypassa i grant) può chiamarla: nessun client diretto
REVOKE ALL ON FUNCTION public.consume_credit(UUID, UUID) FROM PUBLIC, anon, authenticated;

COMMIT;
