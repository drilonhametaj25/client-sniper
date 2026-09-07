-- Aggiunta campo role alla tabella users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client'));

-- Aggiunta indice per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- Aggiunta campo status alla tabella users (se non esiste)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled'));

-- Aggiungi le colonne stripe se non esistono
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Imposta il ruolo admin al tuo utente (sostituire con l'ID del tuo utente admin)
UPDATE public.users
SET role = 'admin'
WHERE email = 'drilonhametaj25@gmail.com';

-- Crea gli utenti mancanti nella tabella users partendo da auth.users
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

-- Commenta la colonna per documentazione
COMMENT ON COLUMN public.users.role IS 'Ruolo utente: admin (accesso completo) o client (accesso limitato)';
COMMENT ON COLUMN public.users.status IS 'Stato account: active (attivo), inactive (inattivo temporaneamente), cancelled (cancellato)';
