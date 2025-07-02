-- Soluzione completa per il pannello admin - Creata da GitHub Copilot
-- Questo script:
-- 1. Sincronizza gli utenti da auth.users a public.users
-- 2. Corregge la funzione admin_get_all_users per evitare ambiguità nelle colonne
-- 3. Crea una funzione admin_get_complete_users che unisce i dati da entrambe le tabelle

-- Parte 1: Assicuriamoci che la tabella users abbia tutti i campi necessari
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client'));

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Parte 2: Sincronizziamo gli utenti mancanti da auth.users a public.users
INSERT INTO public.users (id, email, role, plan, credits_remaining, created_at)
SELECT 
  au.id, 
  au.email, 
  'client' as role, 
  'free' as plan,
  2 as credits_remaining,
  NOW() as created_at
FROM 
  auth.users au
LEFT JOIN
  public.users pu ON au.id = pu.id
WHERE 
  pu.id IS NULL;

-- Parte 3: Correggiamo la funzione admin_get_all_users (versione basic)
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
  
  -- Ritorna tutti gli utenti da auth.users con alias per evitare ambiguità
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

-- Parte 4: Creiamo una funzione completa che unisce auth.users e public.users
CREATE OR REPLACE FUNCTION public.admin_get_complete_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  plan TEXT,
  credits_remaining INT,
  status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  has_password BOOLEAN
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
  
  -- Left join per assicurarci di includere tutti gli utenti da auth.users
  -- anche se non hanno un profilo in public.users
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    COALESCE(pu.role, 'client') AS role,
    COALESCE(pu.plan, 'free') AS plan,
    COALESCE(pu.credits_remaining, 0) AS credits_remaining,
    COALESCE(pu.status, 'active') AS status,
    pu.stripe_customer_id,
    pu.stripe_subscription_id,
    au.email_confirmed_at,
    au.created_at,
    au.last_sign_in_at,
    (au.encrypted_password IS NOT NULL) AS has_password
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id;
END;
$$;

-- Concedi l'esecuzione delle funzioni agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_complete_users() TO authenticated;

-- Aggiungi commenti alle funzioni
COMMENT ON FUNCTION public.admin_get_all_users() IS 'Ritorna utenti base da auth.users, accessibile solo agli admin';
COMMENT ON FUNCTION public.admin_get_complete_users() IS 'Ritorna utenti con dettagli completi, unendo auth.users e public.users';

-- Verifichiamo l'utente admin
DO $$
DECLARE
    admin_email TEXT := 'drilonhametaj25@gmail.com'; -- Sostituisci con l'email dell'admin
    admin_count INT;
BEGIN
    SELECT COUNT(*)
    INTO admin_count
    FROM public.users
    WHERE email = admin_email AND role = 'admin';
    
    IF admin_count = 0 THEN
        UPDATE public.users
        SET role = 'admin'
        WHERE email = admin_email;
        
        RAISE NOTICE 'Utente % impostato come admin', admin_email;
    ELSE
        RAISE NOTICE 'Utente % è già admin', admin_email;
    END IF;
END $$;

-- Contiamo e mostriamo statistiche finali
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.users) AS public_users_count,
  (
    SELECT COUNT(*)
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  ) AS missing_in_public,
  (
    SELECT COUNT(*)
    FROM auth.users au
    JOIN public.users pu ON au.id = pu.id
  ) AS matched_users;
