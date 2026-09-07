-- Fix per la funzione get_feedback_details che ha un conflitto di nomi
-- Questo script risolve l'ambiguità del parametro feedback_id

-- Eliminiamo prima la funzione esistente
DROP FUNCTION IF EXISTS public.get_feedback_details(UUID);

-- Aggiorna la funzione per ottenere un singolo feedback pubblico con dettagli
CREATE OR REPLACE FUNCTION public.get_feedback_details(p_feedback_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  upvotes INTEGER,
  downvotes INTEGER,
  admin_response TEXT,
  user_vote TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fr.id,
    fr.title,
    fr.type,
    fr.message,
    fr.created_at,
    fr.upvotes,
    fr.downvotes,
    fr.response AS admin_response,
    fv.vote_type AS user_vote
  FROM 
    public.feedback_reports fr
  LEFT JOIN 
    public.feedback_votes fv ON fr.id = fv.feedback_id AND fv.user_id = auth.uid()
  WHERE 
    fr.id = p_feedback_id
    AND fr.is_public = true;
END;
$$;

-- Eliminiamo anche la funzione di voto per ricrearla con parametri rinominati
DROP FUNCTION IF EXISTS public.vote_feedback(UUID, TEXT);

-- Anche la funzione di voto potrebbe avere lo stesso problema
CREATE OR REPLACE FUNCTION public.vote_feedback(
  p_feedback_id UUID,
  p_vote_type TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_upvotes INTEGER,
  new_downvotes INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_uuid UUID;
  existing_vote TEXT;
  new_upvotes INTEGER;
  new_downvotes INTEGER;
BEGIN
  -- Verifica autenticazione
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RETURN QUERY SELECT false, 'Devi essere loggato per votare', 0, 0;
    RETURN;
  END IF;

  -- Verifica che il feedback esista ed è pubblico
  IF NOT EXISTS (
    SELECT 1 FROM public.feedback_reports 
    WHERE id = p_feedback_id AND is_public = true
  ) THEN
    RETURN QUERY SELECT false, 'Feedback non trovato o non pubblico', 0, 0;
    RETURN;
  END IF;

  -- Verifica voto valido
  IF p_vote_type NOT IN ('up', 'down') THEN
    RETURN QUERY SELECT false, 'Tipo di voto non valido', 0, 0;
    RETURN;
  END IF;

  -- Verifica voto esistente
  SELECT fv.vote_type INTO existing_vote
  FROM public.feedback_votes fv
  WHERE fv.feedback_id = p_feedback_id 
    AND fv.user_id = user_uuid;

  -- Gestisci il voto
  IF existing_vote IS NULL THEN
    -- Nuovo voto
    INSERT INTO public.feedback_votes (feedback_id, user_id, vote_type)
    VALUES (p_feedback_id, user_uuid, p_vote_type);
  ELSIF existing_vote = p_vote_type THEN
    -- Rimuovi voto (toggle)
    DELETE FROM public.feedback_votes 
    WHERE feedback_id = p_feedback_id 
      AND user_id = user_uuid;
  ELSE
    -- Cambia voto
    UPDATE public.feedback_votes 
    SET vote_type = p_vote_type
    WHERE feedback_id = p_feedback_id 
      AND user_id = user_uuid;
  END IF;

  -- Aggiorna contatori
  SELECT 
    COUNT(*) FILTER (WHERE fv.vote_type = 'up'),
    COUNT(*) FILTER (WHERE fv.vote_type = 'down')
  INTO new_upvotes, new_downvotes
  FROM public.feedback_votes fv
  WHERE fv.feedback_id = p_feedback_id;

  UPDATE public.feedback_reports
  SET upvotes = new_upvotes, downvotes = new_downvotes
  WHERE id = p_feedback_id;

  RETURN QUERY SELECT true, 'Voto registrato con successo', new_upvotes, new_downvotes;
END;
$$;

-- Anche la funzione per segnalare abuso
CREATE OR REPLACE FUNCTION public.report_feedback_abuse(
  p_feedback_id UUID,
  p_abuse_reason TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Verifica autenticazione
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RETURN QUERY SELECT false, 'Devi essere loggato per segnalare abusi';
    RETURN;
  END IF;

  -- Verifica che il feedback esista
  IF NOT EXISTS (
    SELECT 1 FROM public.feedback_reports 
    WHERE id = p_feedback_id AND is_public = true
  ) THEN
    RETURN QUERY SELECT false, 'Feedback non trovato';
    RETURN;
  END IF;

  -- Verifica che non abbia già segnalato
  IF EXISTS (
    SELECT 1 FROM public.feedback_abuse_reports
    WHERE feedback_id = p_feedback_id 
      AND reporter_user_id = user_uuid
  ) THEN
    RETURN QUERY SELECT false, 'Hai già segnalato questo contenuto';
    RETURN;
  END IF;

  -- Inserisci segnalazione
  INSERT INTO public.feedback_abuse_reports (feedback_id, reporter_user_id, reason)
  VALUES (p_feedback_id, user_uuid, p_abuse_reason);

  RETURN QUERY SELECT true, 'Segnalazione inviata con successo';
END;
$$;
