-- Fix per l'associazione corretta dell'utente nel sistema feedback
-- Questo script risolve il problema di associazione utente errata

-- Prima, elimina la vecchia funzione per ricrearla
DROP FUNCTION IF EXISTS public.submit_feedback_report(TEXT, TEXT, TEXT, TEXT, TEXT);

-- Ricrea la funzione con una logica più robusta per l'identificazione utente
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
  debug_info TEXT;
BEGIN
  -- Validazione input
  IF feedback_type NOT IN ('bug', 'suggestion', 'contact', 'other') THEN
    RAISE EXCEPTION 'Tipo di feedback non valido: %', feedback_type;
  END IF;
  
  IF LENGTH(TRIM(feedback_message)) < 10 THEN
    RAISE EXCEPTION 'Il messaggio deve contenere almeno 10 caratteri';
  END IF;
  
  -- Ottieni l'utente corrente con controllo più rigoroso
  current_user_id := auth.uid();
  
  -- Debug: log dell'utente corrente
  IF current_user_id IS NOT NULL THEN
    debug_info := 'Utente autenticato: ' || current_user_id::TEXT;
    
    -- Recupera l'email dell'utente autenticato
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = current_user_id;
    
    -- Se non troviamo l'email in auth.users, controlla public.users
    IF user_email IS NULL THEN
      SELECT email INTO user_email
      FROM public.users
      WHERE id = current_user_id;
    END IF;
    
    debug_info := debug_info || ', Email: ' || COALESCE(user_email, 'non trovata');
  ELSE
    debug_info := 'Utente anonimo';
    user_email := feedback_email;
  END IF;
  
  -- Inserisci il feedback con informazioni di debug
  INSERT INTO public.feedback_reports (
    user_id,
    email,
    type,
    message,
    user_agent,
    page_url,
    admin_note
  )
  VALUES (
    current_user_id,
    user_email,
    feedback_type,
    feedback_message,
    user_agent_info,
    current_page_url,
    debug_info  -- Temporaneo: aggiungi info di debug
  )
  RETURNING id INTO new_feedback_id;
  
  -- Restituisci il risultato con informazioni di debug
  RETURN json_build_object(
    'success', true,
    'feedback_id', new_feedback_id,
    'message', 'Feedback inviato con successo',
    'debug_user_id', current_user_id,
    'debug_email', user_email,
    'debug_info', debug_info
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'debug_user_id', current_user_id,
      'debug_info', debug_info
    );
END;
$$;

-- Ricrea i permessi
GRANT EXECUTE ON FUNCTION public.submit_feedback_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_feedback_report TO anon;

-- Commento aggiornato
COMMENT ON FUNCTION public.submit_feedback_report IS 'Funzione per inviare feedback con identificazione utente migliorata - accessibile a tutti';
