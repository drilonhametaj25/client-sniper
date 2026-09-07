-- =====================================================================
-- Migration: Feedback collegato ai Lead + Quarantena automatica (Fase 4)
-- =====================================================================
-- Obiettivo: chiudere il loop di apprendimento. Gli utenti possono segnalare un
-- lead con dati errati; quando un lead raccoglie abbastanza segnalazioni distinte,
-- viene messo automaticamente in QUARANTENA (nascosto) e marcato per ri-verifica.
--
-- Dipende da: confidence-system-migration.sql (colonne status/needs_recheck/...).
-- Sicurezza: additiva. Eseguire nel SQL Editor di Supabase.
-- =====================================================================

-- 1) Collega i feedback ai lead -------------------------------------------
ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Tipo specifico del problema segnalato su un lead.
ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS issue_type TEXT;

CREATE INDEX IF NOT EXISTS idx_feedback_reports_lead_id ON public.feedback_reports(lead_id);

-- 2) Soglia di quarantena automatica --------------------------------------
-- Numero di segnalazioni distinte (per utente) oltre il quale un lead va in quarantena.
-- Volutamente basso (coerente con "fiducia prima del volume").
-- Definita come funzione costante per poterla cambiare in un punto solo.
CREATE OR REPLACE FUNCTION public.lead_quarantine_threshold()
RETURNS INT LANGUAGE sql IMMUTABLE AS $$ SELECT 2 $$;

-- 3) RPC: segnala un problema su un lead -----------------------------------
-- Inserisce un feedback collegato al lead e, se si supera la soglia, mette il
-- lead in quarantena. Accessibile agli utenti autenticati.
CREATE OR REPLACE FUNCTION public.report_lead_issue(
  target_lead_id UUID,
  problem_issue_type TEXT,
  problem_message TEXT DEFAULT NULL,
  current_page_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  distinct_reporters INT;
  new_feedback_id UUID;
  msg TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticazione richiesta per segnalare un lead';
  END IF;

  -- Verifica che il lead esista
  IF NOT EXISTS (SELECT 1 FROM public.leads WHERE id = target_lead_id) THEN
    RAISE EXCEPTION 'Lead non trovato';
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;

  -- Messaggio: minimo informativo se l'utente non scrive nulla.
  msg := COALESCE(NULLIF(TRIM(problem_message), ''),
                  'Segnalazione dato errato: ' || COALESCE(problem_issue_type, 'non specificato'));

  INSERT INTO public.feedback_reports (
    user_id, email, type, message, lead_id, issue_type, page_url
  ) VALUES (
    current_user_id, user_email, 'bug', msg, target_lead_id, problem_issue_type, current_page_url
  )
  RETURNING id INTO new_feedback_id;

  -- Conta gli utenti DISTINTI che hanno segnalato questo lead.
  SELECT COUNT(DISTINCT user_id) INTO distinct_reporters
  FROM public.feedback_reports
  WHERE lead_id = target_lead_id AND type = 'bug' AND user_id IS NOT NULL;

  -- Oltre la soglia -> quarantena automatica + ri-verifica.
  IF distinct_reporters >= public.lead_quarantine_threshold() THEN
    UPDATE public.leads
    SET status = 'quarantine',
        needs_recheck = true,
        confidence_score = LEAST(confidence_score, 40),
        quarantine_reasons = COALESCE(quarantine_reasons, '[]'::jsonb)
          || jsonb_build_array('Segnalato da più utenti come dato errato')
    WHERE id = target_lead_id AND status <> 'quarantine';
  END IF;

  RETURN json_build_object(
    'success', true,
    'feedback_id', new_feedback_id,
    'reporters', distinct_reporters,
    'quarantined', distinct_reporters >= public.lead_quarantine_threshold()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_lead_issue TO authenticated;

COMMENT ON FUNCTION public.report_lead_issue IS
  'Segnala un lead con dati errati; oltre la soglia mette il lead in quarantena.';
