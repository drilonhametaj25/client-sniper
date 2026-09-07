-- Soluzione DEFINITIVA per il pannello admin
-- Questo script:
-- 1. Sincronizza gli utenti da auth.users a public.users
-- 2. Corregge le funzioni RPC per il pannello admin

-- Assicuriamoci che la tabella users abbia i campi necessari
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client'));

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Sincronizziamo gli utenti mancanti da auth.users a public.users
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

-- Drop vecchie funzioni se esistono
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_complete_users();

-- Creiamo una nuova funzione che funziona sicuramente
-- Questa funzione restituisce solo i campi base da auth.users
CREATE OR REPLACE FUNCTION public.admin_get_basic_users()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  user_created_at TIMESTAMPTZ
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
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono usare questa funzione';
  END IF;
  
  -- Ritorna tutti gli utenti da auth.users con nomi di colonne diversi per evitare ambiguità
  RETURN QUERY
  SELECT 
    au.id AS user_id,
    au.email::text AS user_email,
    au.email_confirmed_at AS email_confirmed_at,
    au.last_sign_in_at AS last_sign_in_at,
    au.created_at AS user_created_at
  FROM auth.users au;
END;
$$;

-- Creiamo una funzione completa che unisce auth.users e public.users
-- con nomi di colonne unici per evitare ambiguità
CREATE OR REPLACE FUNCTION public.admin_get_full_users()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  user_plan TEXT,
  credits_remaining INTEGER,
  user_status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  email_confirmed_at TIMESTAMPTZ,
  user_created_at TIMESTAMPTZ,
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
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accesso negato: solo gli amministratori possono usare questa funzione';
  END IF;
  
  -- LEFT JOIN per assicurarci di includere tutti gli utenti da auth.users
  -- anche se non hanno un profilo in public.users
  RETURN QUERY
  SELECT 
    au.id AS user_id,
    au.email::text AS user_email,
    COALESCE(pu.role, 'client')::text AS user_role,
    COALESCE(pu.plan, 'free')::text AS user_plan,
    COALESCE(pu.credits_remaining, 0) AS credits_remaining,
    COALESCE(pu.status, 'active')::text AS user_status,
    pu.stripe_customer_id::text AS stripe_customer_id,
    pu.stripe_subscription_id::text AS stripe_subscription_id,
    au.email_confirmed_at,
    au.created_at AS user_created_at,
    au.last_sign_in_at
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id;
END;
$$;

-- Concedi l'esecuzione delle funzioni agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.admin_get_basic_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_full_users() TO authenticated;

-- Assicuriamoci che l'utente admin esista
DO $$
DECLARE
    admin_email TEXT := 'drilonhametaj25@gmail.com'; -- Modifica con la tua email admin
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
