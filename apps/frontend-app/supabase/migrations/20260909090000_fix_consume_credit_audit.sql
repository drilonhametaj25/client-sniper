-- =====================================================
-- FIX: consume_credit scriveva l'audit su una tabella inesistente
-- =====================================================
-- Sintomo: sbloccare un lead GIA' sbloccato funzionava, sbloccarne uno NUOVO
-- restituiva sempre 500 "Errore nello sblocco del lead".
--
-- Causa: il ramo "gia' sbloccato" esce prima di scrivere l'audit log; tutti
-- gli altri rami ci passano. E l'INSERT di audit sbagliava tre cose:
--
--   1. tabella   credit_usage_logs   -> in produzione e' credit_usage_log
--                                       (SINGOLARE; il plurale non esiste)
--   2. colonna   credits_used        -> si chiama credits_consumed
--   3. colonna   details (jsonb)     -> non esiste; il lead va nella colonna
--                                       dedicata lead_id
--
-- Il nome plurale veniva da un audit sbagliato: era stato dedotto dal codice
-- applicativo (lib/services/credits.ts) invece che dallo schema reale. Le
-- colonne di credit_usage_log sono state verificate sul database di
-- produzione, e il valore 'lead_unlock' e' quello gia' usato dalle 64 righe
-- di storico (la funzione scriveva 'unlock_lead', invertito).
--
-- Il resto della funzione e' invariato: FOR UPDATE sulla riga utente, audit
-- nella stessa transazione, gestione di illimitato / primo sblocco gratuito.


-- NB: nessun BEGIN;/COMMIT; esplicito in questo file. L'SQL Editor di Supabase
-- avvolge gia' lo script in una transazione propria e le transazioni annidate
-- esplicite ne rompono l'esecuzione. L'atomicita' e' garantita dal workflow,
-- che invoca psql con --single-transaction.

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

    INSERT INTO public.credit_usage_log (user_id, action, lead_id, credits_consumed, credits_remaining)
    VALUES (p_user_id, 'lead_unlock', p_lead_id, 0, -1);

    RETURN QUERY SELECT TRUE, FALSE, FALSE, TRUE, -1, NULL::TEXT;
    RETURN;
  END IF;

  -- Primo sblocco gratuito per i piani a pagamento
  IF NOT COALESCE(v_user.first_proposal_used, FALSE) AND v_user.plan <> 'free' THEN
    UPDATE public.users SET first_proposal_used = TRUE WHERE id = p_user_id;

    INSERT INTO public.user_unlocked_leads (user_id, lead_id, unlocked_at)
    VALUES (p_user_id, p_lead_id, NOW())
    ON CONFLICT (user_id, lead_id) DO NOTHING;

    INSERT INTO public.credit_usage_log (user_id, action, lead_id, credits_consumed, credits_remaining)
    VALUES (p_user_id, 'lead_unlock', p_lead_id, 0, COALESCE(v_user.credits_remaining, 0));

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

  INSERT INTO public.credit_usage_log (user_id, action, lead_id, credits_consumed, credits_remaining)
  VALUES (p_user_id, 'lead_unlock', p_lead_id, 1, v_new_credits);

  RETURN QUERY SELECT TRUE, FALSE, FALSE, FALSE, v_new_credits, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION public.consume_credit IS
  'Consumo atomico di un credito per sbloccare un lead (FOR UPDATE, audit interno su credit_usage_log). Chiamata SOLO dal server con service role.';

REVOKE ALL ON FUNCTION public.consume_credit(UUID, UUID) FROM PUBLIC, anon, authenticated;
