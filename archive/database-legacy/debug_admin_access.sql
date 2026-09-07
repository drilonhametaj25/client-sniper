-- Verifichiamo se ci sono problemi di accesso per admin_get_all_users

-- 1. Verifichiamo se l'utente corrente è admin
SELECT 
  id, 
  email, 
  role 
FROM public.users 
WHERE id = auth.uid();

-- 2. Verifichiamo gli utenti in auth.users (richiede permessi admin)
-- Questa query potrebbe fallire se non hai i permessi
SELECT COUNT(*) FROM auth.users;

-- 3. Verifichiamo le policy per la tabella auth.users
SELECT * FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'auth';

-- 4. Creiamo una funzione RPC alternativa che non richiede accesso diretto ad auth.users

-- Questa funzione usa pg_stat_statements per ottenere informazioni sugli utenti
CREATE OR REPLACE FUNCTION public.admin_get_users_count()
RETURNS TABLE (
  total_auth_users BIGINT,
  total_public_users BIGINT,
  emails_matching BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  auth_count BIGINT;
  public_count BIGINT;
  matching_count BIGINT;
BEGIN
  -- Solo admin possono accedere a questa funzione
  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono usare questa funzione';
  END IF;
  
  -- Ottieni conteggio utenti da auth.users
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  
  -- Ottieni conteggio utenti da public.users
  SELECT COUNT(*) INTO public_count FROM public.users;
  
  -- Verifica quanti utenti hanno email corrispondenti
  SELECT COUNT(*) INTO matching_count
  FROM auth.users au
  JOIN public.users pu ON au.email = pu.email;
  
  RETURN QUERY SELECT auth_count, public_count, matching_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users_count() TO authenticated;
