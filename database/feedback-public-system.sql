-- Estensione del sistema feedback per supportare vista pubblica e voti
-- Questo script aggiunge funzionalità collaborative mantenendo la privacy dei dati sensibili
-- Include sistema di upvote/downvote e thread consultabili pubblicamente

-- Aggiungi nuove colonne alla tabella feedback_reports esistente
ALTER TABLE public.feedback_reports 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- Crea tabella per i voti degli utenti
CREATE TABLE IF NOT EXISTS public.feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(feedback_id, user_id) -- Un solo voto per utente per feedback
);

-- Crea tabella per segnalazioni di abuso
CREATE TABLE IF NOT EXISTS public.feedback_abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_feedback_votes_feedback_id ON public.feedback_votes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_user_id ON public.feedback_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_public ON public.feedback_reports(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_feedback_abuse_reports_feedback_id ON public.feedback_abuse_reports(feedback_id);

-- RLS per feedback_votes
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere tutti i voti ma modificare solo i propri
CREATE POLICY "Users can view all votes" ON public.feedback_votes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own votes" ON public.feedback_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON public.feedback_votes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.feedback_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS per feedback_abuse_reports
ALTER TABLE public.feedback_abuse_reports ENABLE ROW LEVEL SECURITY;

-- Policy: solo gli admin possono vedere le segnalazioni di abuso
CREATE POLICY "Only admins can view abuse reports" ON public.feedback_abuse_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Policy: utenti autenticati possono segnalare abusi
CREATE POLICY "Authenticated users can report abuse" ON public.feedback_abuse_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

-- Funzione per ottenere feedback pubblici con conteggio voti
CREATE OR REPLACE FUNCTION public.get_public_feedback(
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0,
  filter_type TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  upvotes INTEGER,
  downvotes INTEGER,
  has_admin_response BOOLEAN,
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
    (fr.response IS NOT NULL AND fr.response != '') AS has_admin_response,
    fv.vote_type AS user_vote
  FROM 
    public.feedback_reports fr
  LEFT JOIN 
    public.feedback_votes fv ON fr.id = fv.feedback_id AND fv.user_id = auth.uid()
  WHERE 
    fr.is_public = true
    AND (filter_type IS NULL OR fr.type = filter_type)
  ORDER BY 
    CASE 
      WHEN sort_by = 'upvotes' THEN fr.upvotes
      WHEN sort_by = 'controversial' THEN (fr.upvotes + fr.downvotes)
      ELSE 0
    END DESC,
    CASE 
      WHEN sort_by = 'created_at' THEN fr.created_at
      ELSE NULL
    END DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- Funzione per ottenere un singolo feedback pubblico con dettagli
CREATE OR REPLACE FUNCTION public.get_feedback_details(feedback_id UUID)
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
    fr.id = feedback_id
    AND fr.is_public = true;
END;
$$;

-- Funzione per gestire i voti con aggiornamento contatori
CREATE OR REPLACE FUNCTION public.vote_feedback(
  feedback_id UUID,
  vote_type TEXT
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
    WHERE id = feedback_id AND is_public = true
  ) THEN
    RETURN QUERY SELECT false, 'Feedback non trovato o non pubblico', 0, 0;
    RETURN;
  END IF;

  -- Verifica voto valido
  IF vote_type NOT IN ('up', 'down') THEN
    RETURN QUERY SELECT false, 'Tipo di voto non valido', 0, 0;
    RETURN;
  END IF;

  -- Verifica voto esistente
  SELECT fv.vote_type INTO existing_vote
  FROM public.feedback_votes fv
  WHERE fv.feedback_id = vote_feedback.feedback_id 
    AND fv.user_id = user_uuid;

  -- Gestisci il voto
  IF existing_vote IS NULL THEN
    -- Nuovo voto
    INSERT INTO public.feedback_votes (feedback_id, user_id, vote_type)
    VALUES (vote_feedback.feedback_id, user_uuid, vote_type);
  ELSIF existing_vote = vote_type THEN
    -- Rimuovi voto (toggle)
    DELETE FROM public.feedback_votes 
    WHERE feedback_id = vote_feedback.feedback_id 
      AND user_id = user_uuid;
  ELSE
    -- Cambia voto
    UPDATE public.feedback_votes 
    SET vote_type = vote_feedback.vote_type
    WHERE feedback_id = vote_feedback.feedback_id 
      AND user_id = user_uuid;
  END IF;

  -- Aggiorna contatori
  SELECT 
    COUNT(*) FILTER (WHERE fv.vote_type = 'up'),
    COUNT(*) FILTER (WHERE fv.vote_type = 'down')
  INTO new_upvotes, new_downvotes
  FROM public.feedback_votes fv
  WHERE fv.feedback_id = vote_feedback.feedback_id;

  UPDATE public.feedback_reports
  SET upvotes = new_upvotes, downvotes = new_downvotes
  WHERE id = vote_feedback.feedback_id;

  RETURN QUERY SELECT true, 'Voto registrato con successo', new_upvotes, new_downvotes;
END;
$$;

-- Funzione per segnalare abuso
CREATE OR REPLACE FUNCTION public.report_feedback_abuse(
  feedback_id UUID,
  abuse_reason TEXT
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
    WHERE id = feedback_id AND is_public = true
  ) THEN
    RETURN QUERY SELECT false, 'Feedback non trovato';
    RETURN;
  END IF;

  -- Verifica che non abbia già segnalato
  IF EXISTS (
    SELECT 1 FROM public.feedback_abuse_reports
    WHERE feedback_id = report_feedback_abuse.feedback_id 
      AND reporter_user_id = user_uuid
  ) THEN
    RETURN QUERY SELECT false, 'Hai già segnalato questo contenuto';
    RETURN;
  END IF;

  -- Inserisci segnalazione
  INSERT INTO public.feedback_abuse_reports (feedback_id, reporter_user_id, reason)
  VALUES (report_feedback_abuse.feedback_id, user_uuid, abuse_reason);

  RETURN QUERY SELECT true, 'Segnalazione inviata con successo';
END;
$$;

-- Aggiorna la funzione submit_feedback_report per supportare i nuovi campi
CREATE OR REPLACE FUNCTION public.submit_feedback_report(
  feedback_type TEXT,
  feedback_message TEXT,
  feedback_email TEXT DEFAULT NULL,
  feedback_title TEXT DEFAULT NULL,
  is_public_feedback BOOLEAN DEFAULT false,
  user_agent_info TEXT DEFAULT NULL,
  current_page_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  feedback_id UUID,
  error TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_feedback_id UUID;
  current_user_id UUID;
BEGIN
  -- Ottieni ID utente se autenticato
  current_user_id := auth.uid();
  
  -- Validazioni base
  IF feedback_type NOT IN ('bug', 'suggestion', 'contact', 'other') THEN
    RETURN QUERY SELECT false, '', NULL::UUID, 'Tipo di feedback non valido';
    RETURN;
  END IF;
  
  IF LENGTH(TRIM(feedback_message)) < 10 THEN
    RETURN QUERY SELECT false, '', NULL::UUID, 'Il messaggio deve contenere almeno 10 caratteri';
    RETURN;
  END IF;
  
  IF LENGTH(TRIM(feedback_message)) > 5000 THEN
    RETURN QUERY SELECT false, '', NULL::UUID, 'Il messaggio è troppo lungo (massimo 5000 caratteri)';
    RETURN;
  END IF;

  -- Se pubblico, il titolo è obbligatorio
  IF is_public_feedback AND (feedback_title IS NULL OR LENGTH(TRIM(feedback_title)) < 5) THEN
    RETURN QUERY SELECT false, '', NULL::UUID, 'Il titolo è obbligatorio per i feedback pubblici (minimo 5 caratteri)';
    RETURN;
  END IF;
  
  -- Genera nuovo UUID
  new_feedback_id := gen_random_uuid();
  
  -- Inserisci il feedback
  INSERT INTO public.feedback_reports (
    id,
    user_id,
    email,
    type,
    message,
    title,
    is_public,
    page_url,
    user_agent,
    status,
    created_at
  ) VALUES (
    new_feedback_id,
    current_user_id,
    CASE 
      WHEN current_user_id IS NOT NULL THEN NULL  -- Non salvare email se loggato
      ELSE feedback_email 
    END,
    feedback_type,
    TRIM(feedback_message),
    CASE WHEN is_public_feedback THEN TRIM(feedback_title) ELSE NULL END,
    is_public_feedback,
    current_page_url,
    user_agent_info,
    'open',
    now()
  );
  
  RETURN QUERY SELECT 
    true, 
    CASE 
      WHEN is_public_feedback THEN 'Feedback pubblico inviato con successo! Sarà visibile a tutti gli utenti.'
      ELSE 'Feedback inviato con successo! Ti risponderemo al più presto.'
    END,
    new_feedback_id,
    NULL::TEXT;
END;
$$;

-- Concedi permessi
GRANT EXECUTE ON FUNCTION public.get_public_feedback TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_details TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.vote_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_feedback_abuse TO authenticated;

-- Commenti per documentazione
COMMENT ON TABLE public.feedback_votes IS 'Tabella per i voti up/down sui feedback pubblici';
COMMENT ON TABLE public.feedback_abuse_reports IS 'Tabella per segnalazioni di contenuti inappropriati nei feedback';
COMMENT ON FUNCTION public.get_public_feedback IS 'Recupera feedback pubblici con filtri e ordinamento';
COMMENT ON FUNCTION public.vote_feedback IS 'Gestisce voti up/down sui feedback con aggiornamento contatori';
COMMENT ON FUNCTION public.report_feedback_abuse IS 'Permette di segnalare contenuti inappropriati';
