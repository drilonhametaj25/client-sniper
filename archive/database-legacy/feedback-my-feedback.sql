-- =====================================================
-- MIGRATION: Feedback User Dashboard
-- =====================================================
-- Aggiunge funzione RPC per recuperare i feedback dell'utente corrente
-- Usato dalla dashboard "I miei Feedback"
-- =====================================================

-- Funzione per ottenere feedback dell'utente corrente
CREATE OR REPLACE FUNCTION public.get_user_feedback(
  filter_type TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  message TEXT,
  is_public BOOLEAN,
  status TEXT,
  response TEXT,
  created_at TIMESTAMPTZ,
  upvotes INTEGER,
  downvotes INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  user_uuid := auth.uid();

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;

  RETURN QUERY
  SELECT
    fr.id,
    fr.title,
    fr.type,
    fr.message,
    fr.is_public,
    fr.status,
    fr.response,
    fr.created_at,
    fr.upvotes,
    fr.downvotes
  FROM public.feedback_reports fr
  WHERE fr.user_id = user_uuid
    AND (filter_type IS NULL OR fr.type = filter_type)
    AND (filter_status IS NULL OR fr.status = filter_status)
  ORDER BY fr.created_at DESC;
END;
$$;

-- Permessi
GRANT EXECUTE ON FUNCTION public.get_user_feedback TO authenticated;

-- Commento
COMMENT ON FUNCTION public.get_user_feedback IS 'Recupera tutti i feedback inviati dall''utente corrente, con filtri opzionali per tipo e stato';
