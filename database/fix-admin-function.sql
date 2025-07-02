-- Fix del problema "column reference 'id' is ambiguous" nella funzione admin_get_complete_users
-- 
-- Questo script corregge la funzione RPC admin_get_complete_users assicurandosi che:
-- 1. Tutte le colonne siano qualificate con i loro nomi di tabella
-- 2. I tipi di dati siano esplicitamente convertiti per evitare errori
-- 3. I nomi delle colonne siano unici nel risultato

-- Elimina la vecchia funzione se esiste
DROP FUNCTION IF EXISTS public.admin_get_complete_users();

-- Crea la funzione corretta con tutte le colonne qualificate
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
  -- e con cast espliciti per garantire i tipi corretti
  RETURN QUERY
  SELECT 
    au.id::UUID,                                    -- ID utente (da auth.users)
    au.email::TEXT,                                 -- Email utente (da auth.users)
    COALESCE(pu.role, 'client')::TEXT,              -- Ruolo (da public.users o default)
    COALESCE(pu.plan, 'free')::TEXT,                -- Piano (da public.users o default)
    COALESCE(pu.credits_remaining, 0)::INTEGER,     -- Crediti rimanenti (da public.users o default)
    COALESCE(pu.status, 'active')::TEXT,            -- Stato (da public.users o default)
    pu.stripe_customer_id::TEXT,                    -- ID cliente Stripe (da public.users)
    pu.stripe_subscription_id::TEXT,                -- ID sottoscrizione Stripe (da public.users)
    au.email_confirmed_at::TIMESTAMPTZ,             -- Data conferma email (da auth.users)
    au.created_at::TIMESTAMPTZ,                     -- Data creazione (da auth.users)
    au.last_sign_in_at::TIMESTAMPTZ                 -- Data ultimo accesso (da auth.users)
  FROM 
    auth.users AS au
  LEFT JOIN 
    public.users AS pu ON au.id = pu.id;
END;
$$;

-- Concedi l'esecuzione agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.admin_get_complete_users() TO authenticated;

-- Aggiungi un commento per documentare la funzione
COMMENT ON FUNCTION public.admin_get_complete_users() IS 'Funzione ottimizzata che restituisce tutti gli utenti con dettagli completi, unendo auth.users e public.users con colonne qualificate per evitare ambiguità';
