-- Correzione funzione RPC admin_get_all_users per risolvere l'errore "column reference id is ambiguous"
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo admin possono accedere a questa funzione
  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono usare questa funzione';
  END IF;
  
  -- Ritorna tutti gli utenti da auth.users con alias per evitare ambiguità della colonna id
  RETURN QUERY
  SELECT 
    au.id AS id,
    au.email AS email,
    au.email_confirmed_at AS email_confirmed_at,
    au.last_sign_in_at AS last_sign_in_at,
    au.created_at AS created_at
  FROM auth.users au;
END;
$$;

-- Concede l'esecuzione della funzione agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;

COMMENT ON FUNCTION public.admin_get_all_users() IS 'Ritorna tutti gli utenti da auth.users, accessibile solo agli admin';
