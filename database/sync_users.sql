-- Script per sincronizzare gli utenti da auth.users a public.users
-- Questo script:
-- 1. Elenca tutti gli utenti che sono in auth.users ma non in public.users
-- 2. Aggiunge tutti gli utenti mancanti nella tabella public.users
-- 3. Assicura che la tabella public.users abbia i campi necessari

-- Assicuriamoci che la tabella users abbia i campi role e status
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client'));

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled'));

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Verifichiamo gli utenti mancanti
DO $$
DECLARE
    missing_count INT;
BEGIN
    SELECT COUNT(*)
    INTO missing_count
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL;
    
    RAISE NOTICE 'Trovati % utenti mancanti nella tabella public.users', missing_count;
END $$;

-- Sincronizziamo gli utenti mancanti
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

-- Verifichiamo che l'utente admin sia impostato correttamente
DO $$
DECLARE
    admin_email TEXT := 'drilonhametaj25@gmail.com'; -- Sostituisci con la tua email
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

-- Contiamo gli utenti nella tabella public.users
SELECT COUNT(*) as total_users FROM public.users;

-- Elenchiamo gli utenti nella tabella public.users
SELECT id, email, role, plan, status FROM public.users;
