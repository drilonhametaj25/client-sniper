-- Script per debug e risoluzione problemi autenticazione
-- Controlla trigger, funzioni e tabella users

-- 1. Verifica se esiste la funzione per creare utenti automaticamente
SELECT EXISTS(
  SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
);

-- 2. Verifica se esiste il trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 3. Crea la funzione se non esiste
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, plan, credits_remaining)
  VALUES (
    NEW.id,
    NEW.email,
    'client',
    'free',
    2
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crea il trigger se non esiste
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verifica che non ci siano utenti orfani in auth.users senza record in public.users
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN pu.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- 6. Query per creare profili mancanti
INSERT INTO public.users (id, email, role, plan, credits_remaining, created_at)
SELECT 
  au.id,
  au.email,
  'client',
  'free',
  2,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 7. Verifica finale
SELECT COUNT(*) as total_auth_users FROM auth.users;
SELECT COUNT(*) as total_profile_users FROM public.users;
