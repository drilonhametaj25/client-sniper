-- Sistema di Feedback per TrovaMi
-- Questo script crea la tabella per raccogliere feedback dagli utenti
-- Include segnalazioni di bug, suggerimenti, richieste di contatto e altro
-- Supporta sia utenti registrati che anonimi

-- Tabella per i feedback degli utenti
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  type TEXT CHECK (type IN ('bug', 'suggestion', 'contact', 'other')) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('open', 'in_review', 'closed')) DEFAULT 'open',
  response TEXT,
  admin_note TEXT,
  user_agent TEXT,
  ip_address INET,
  page_url TEXT
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_feedback_reports_user_id ON public.feedback_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_type ON public.feedback_reports(type);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_status ON public.feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at ON public.feedback_reports(created_at DESC);

-- RLS (Row Level Security) per privacy
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

-- Policy: gli utenti possono vedere solo i propri feedback
CREATE POLICY "Users can view their own feedback" ON public.feedback_reports
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- Policy: tutti possono inserire feedback
CREATE POLICY "Anyone can submit feedback" ON public.feedback_reports
  FOR INSERT
  WITH CHECK (true);

-- Policy: solo admin possono aggiornare feedback
CREATE POLICY "Only admins can update feedback" ON public.feedback_reports
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- Funzione RPC per inviare feedback
CREATE OR REPLACE FUNCTION public.submit_feedback_report(
  feedback_type TEXT,
  feedback_message TEXT,
  feedback_email TEXT DEFAULT NULL,
  user_agent_info TEXT DEFAULT NULL,
  current_page_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_feedback_id UUID;
  current_user_id UUID;
  user_email TEXT;
BEGIN
  -- Validazione input
  IF feedback_type NOT IN ('bug', 'suggestion', 'contact', 'other') THEN
    RAISE EXCEPTION 'Tipo di feedback non valido';
  END IF;
  
  IF LENGTH(TRIM(feedback_message)) < 10 THEN
    RAISE EXCEPTION 'Il messaggio deve contenere almeno 10 caratteri';
  END IF;
  
  -- Ottieni l'utente corrente se loggato
  current_user_id := auth.uid();
  
  -- Se l'utente è loggato, usa la sua email
  IF current_user_id IS NOT NULL THEN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = current_user_id;
  ELSE
    user_email := feedback_email;
  END IF;
  
  -- Inserisci il feedback
  INSERT INTO public.feedback_reports (
    user_id,
    email,
    type,
    message,
    user_agent,
    page_url
  )
  VALUES (
    current_user_id,
    user_email,
    feedback_type,
    feedback_message,
    user_agent_info,
    current_page_url
  )
  RETURNING id INTO new_feedback_id;
  
  -- Restituisci il risultato
  RETURN json_build_object(
    'success', true,
    'feedback_id', new_feedback_id,
    'message', 'Feedback inviato con successo'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Funzione RPC per ottenere tutti i feedback (solo admin)
CREATE OR REPLACE FUNCTION public.admin_get_all_feedback()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  type TEXT,
  message TEXT,
  created_at TIMESTAMPTZ,
  status TEXT,
  response TEXT,
  admin_note TEXT,
  user_agent TEXT,
  page_url TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Controllo se l'utente è admin
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono accedere ai feedback';
  END IF;
  
  -- Restituisci tutti i feedback
  RETURN QUERY
  SELECT 
    fr.id,
    fr.user_id,
    fr.email,
    fr.type,
    fr.message,
    fr.created_at,
    fr.status,
    fr.response,
    fr.admin_note,
    fr.user_agent,
    fr.page_url
  FROM public.feedback_reports fr
  ORDER BY fr.created_at DESC;
END;
$$;

-- Funzione RPC per aggiornare lo stato di un feedback (solo admin)
CREATE OR REPLACE FUNCTION public.admin_update_feedback_status(
  feedback_id UUID,
  new_status TEXT,
  admin_response TEXT DEFAULT NULL,
  internal_note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Controllo se l'utente è admin
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono aggiornare i feedback';
  END IF;
  
  -- Validazione status
  IF new_status NOT IN ('open', 'in_review', 'closed') THEN
    RAISE EXCEPTION 'Status non valido';
  END IF;
  
  -- Aggiorna il feedback
  UPDATE public.feedback_reports
  SET 
    status = new_status,
    response = COALESCE(admin_response, response),
    admin_note = COALESCE(internal_note, admin_note)
  WHERE id = feedback_id;
  
  -- Verifica se è stato aggiornato
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback non trovato';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Feedback aggiornato con successo'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Concedi permessi
GRANT EXECUTE ON FUNCTION public.submit_feedback_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_feedback_report TO anon;
GRANT EXECUTE ON FUNCTION public.admin_get_all_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_feedback_status TO authenticated;

-- Commenti per documentazione
COMMENT ON TABLE public.feedback_reports IS 'Tabella per raccogliere feedback dagli utenti (bug, suggerimenti, contatti)';
COMMENT ON FUNCTION public.submit_feedback_report IS 'Funzione per inviare feedback - accessibile a tutti';
COMMENT ON FUNCTION public.admin_get_all_feedback IS 'Funzione per ottenere tutti i feedback - solo admin';
COMMENT ON FUNCTION public.admin_update_feedback_status IS 'Funzione per aggiornare lo stato dei feedback - solo admin';
