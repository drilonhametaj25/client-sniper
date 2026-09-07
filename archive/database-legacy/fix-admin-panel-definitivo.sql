-- Soluzione definitiva per il pannello admin - Versione ultra-robusta
-- Questo script:
-- 1. Elimina le funzioni esistenti per evitare conflitti
-- 2. Crea nuove funzioni con nomi di colonne completamente qualificati
-- 3. Sincronizza gli utenti da auth.users a public.users

-- Parte 1: Eliminiamo le funzioni esistenti
DROP FUNCTION IF EXISTS public.admin_get_all_users() CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_complete_users() CASCADE;

-- Parte 2: Assicuriamoci che la tabella users abbia tutti i campi necessari
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client'));

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Parte 3: Sincronizziamo gli utenti mancanti da auth.users a public.users
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

-- Parte 4: Creiamo una funzione admin_get_basic_users che restituisce solo dati base da auth.users
CREATE OR REPLACE FUNCTION public.admin_get_basic_users()
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
    FROM public.users
    WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono usare questa funzione';
  END IF;
  
  -- Ritorna tutti gli utenti da auth.users con colonne completamente qualificate
  RETURN QUERY
  SELECT 
    auth.users.id AS id,
    auth.users.email AS email,
    auth.users.email_confirmed_at AS email_confirmed_at,
    auth.users.last_sign_in_at AS last_sign_in_at,
    auth.users.created_at AS created_at
  FROM auth.users;
END;
$$;

-- Parte 5: Creiamo una funzione che unisce auth.users e public.users per dati completi
CREATE OR REPLACE FUNCTION public.admin_get_full_users()
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
  
  -- Left join per assicurarci di includere tutti gli utenti da auth.users
  -- anche se non hanno un profilo in public.users
  -- Tutte le colonne sono completamente qualificate per evitare ambiguità
  RETURN QUERY
  SELECT 
    auth.users.id AS id,
    auth.users.email AS email,
    COALESCE(public.users.role, 'client'::text) AS role,
    COALESCE(public.users.plan, 'free'::text) AS plan,
    COALESCE(public.users.credits_remaining, 0) AS credits_remaining,
    COALESCE(public.users.status, 'active'::text) AS status,
    public.users.stripe_customer_id AS stripe_customer_id,
    public.users.stripe_subscription_id AS stripe_subscription_id,
    auth.users.email_confirmed_at AS email_confirmed_at,
    auth.users.created_at AS created_at,
    auth.users.last_sign_in_at AS last_sign_in_at
  FROM auth.users
  LEFT JOIN public.users ON auth.users.id = public.users.id;
END;
$$;

-- Per compatibilità con il codice esistente, creiamo anche le funzioni con i vecchi nomi
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
    FROM public.users
    WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono usare questa funzione';
  END IF;
  
  -- Ritorna tutti gli utenti da auth.users con colonne completamente qualificate
  RETURN QUERY
  SELECT 
    auth.users.id AS id,
    auth.users.email AS email,
    auth.users.email_confirmed_at AS email_confirmed_at,
    auth.users.last_sign_in_at AS last_sign_in_at,
    auth.users.created_at AS created_at
  FROM auth.users;
END;
$$;

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
  
  -- Ritorna tutti gli utenti unendo auth e public
  RETURN QUERY
  SELECT 
    auth.users.id AS id,
    auth.users.email AS email,
    COALESCE(public.users.role, 'client'::text) AS role,
    COALESCE(public.users.plan, 'free'::text) AS plan,
    COALESCE(public.users.credits_remaining, 0) AS credits_remaining,
    COALESCE(public.users.status, 'active'::text) AS status,
    public.users.stripe_customer_id AS stripe_customer_id,
    public.users.stripe_subscription_id AS stripe_subscription_id,
    auth.users.email_confirmed_at AS email_confirmed_at,
    auth.users.created_at AS created_at,
    auth.users.last_sign_in_at AS last_sign_in_at
  FROM auth.users
  LEFT JOIN public.users ON auth.users.id = public.users.id;
END;
$$;

-- Concedi l'esecuzione delle funzioni agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_complete_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_basic_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_full_users() TO authenticated;

-- Aggiungi commenti alle funzioni
COMMENT ON FUNCTION public.admin_get_all_users() IS 'Ritorna utenti base da auth.users, accessibile solo agli admin (versione compatibile)';
COMMENT ON FUNCTION public.admin_get_complete_users() IS 'Ritorna utenti con dettagli completi, unendo auth.users e public.users (versione compatibile)';
COMMENT ON FUNCTION public.admin_get_basic_users() IS 'Ritorna utenti base da auth.users, accessibile solo agli admin (versione robusta)';
COMMENT ON FUNCTION public.admin_get_full_users() IS 'Ritorna utenti con dettagli completi, unendo auth.users e public.users (versione robusta)';

-- Verifichiamo l'utente admin
DO $$
DECLARE
    admin_email TEXT := 'drilonhametaj@outlook.it'; -- Email dell'admin principale
    admin_count INT;
BEGIN
    SELECT COUNT(*)
    INTO admin_count
    FROM public.users
    WHERE email = admin_email AND role = 'admin';
    
    IF admin_count = 0 THEN
        -- Prova a trovare l'utente con quella email
        DECLARE
            user_id UUID;
        BEGIN
            SELECT id INTO user_id FROM public.users WHERE email = admin_email;
            
            IF user_id IS NOT NULL THEN
                UPDATE public.users
                SET role = 'admin'
                WHERE id = user_id;
                
                RAISE NOTICE 'Utente % impostato come admin', admin_email;
            ELSE
                RAISE NOTICE 'Utente con email % non trovato', admin_email;
            END IF;
        END;
    ELSE
        RAISE NOTICE 'Utente % è già admin', admin_email;
    END IF;
END $$;

-- Anche questa email
DO $$
DECLARE
    admin_email TEXT := 'drilonhametaj25@gmail.com'; -- Email dell'admin secondaria
    admin_count INT;
BEGIN
    SELECT COUNT(*)
    INTO admin_count
    FROM public.users
    WHERE email = admin_email AND role = 'admin';
    
    IF admin_count = 0 THEN
        -- Prova a trovare l'utente con quella email
        DECLARE
            user_id UUID;
        BEGIN
            SELECT id INTO user_id FROM public.users WHERE email = admin_email;
            
            IF user_id IS NOT NULL THEN
                UPDATE public.users
                SET role = 'admin'
                WHERE id = user_id;
                
                RAISE NOTICE 'Utente % impostato come admin', admin_email;
            ELSE
                RAISE NOTICE 'Utente con email % non trovato', admin_email;
            END IF;
        END;
    ELSE
        RAISE NOTICE 'Utente % è già admin', admin_email;
    END IF;
END $$;

-- Assicuriamoci che almeno un utente sia admin
DO $$
DECLARE
    admin_count INT;
BEGIN
    SELECT COUNT(*)
    INTO admin_count
    FROM public.users
    WHERE role = 'admin';
    
    IF admin_count = 0 THEN
        -- Se non ci sono admin, imposta il primo utente come admin
        DECLARE
            first_user_id UUID;
        BEGIN
            SELECT id INTO first_user_id FROM public.users LIMIT 1;
            
            IF first_user_id IS NOT NULL THEN
                UPDATE public.users
                SET role = 'admin'
                WHERE id = first_user_id;
                
                RAISE NOTICE 'Primo utente impostato come admin (nessun admin trovato)';
            END IF;
        END;
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
