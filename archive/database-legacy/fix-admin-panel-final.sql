-- Fix definitivo per la funzione admin_get_complete_users
-- Questo script risolve il problema "column reference 'id' is ambiguous"
-- e assicura che tutte le colonne siano correttamente qualificate

DROP FUNCTION IF EXISTS public.admin_get_complete_users();

CREATE OR REPLACE FUNCTION public.admin_get_complete_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  plan TEXT,
  credits_remaining INTEGER,
  status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo admin possono accedere a questa funzione
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono usare questa funzione';
  END IF;
  
  -- Ritorna tutti gli utenti con colonne qualificate per evitare ambiguità
  RETURN QUERY
  SELECT 
    au.id::UUID,
    au.email::TEXT,
    COALESCE(pu.role, 'client')::TEXT,
    COALESCE(pu.plan, 'free')::TEXT,
    COALESCE(pu.credits_remaining, 0)::INTEGER,
    COALESCE(pu.status, 'active')::TEXT,
    pu.stripe_customer_id::TEXT,
    pu.stripe_subscription_id::TEXT,
    au.email_confirmed_at::TIMESTAMPTZ,
    au.created_at::TIMESTAMPTZ,
    au.last_sign_in_at::TIMESTAMPTZ
  FROM 
    auth.users AS au
  LEFT JOIN 
    public.users AS pu ON au.id = pu.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_complete_users() TO authenticated;

COMMENT ON FUNCTION public.admin_get_complete_users() IS 'Funzione ottimizzata che restituisce tutti gli utenti con dettagli completi, unendo auth.users e public.users con colonne qualificate per evitare ambiguità';
