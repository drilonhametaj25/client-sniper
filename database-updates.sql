-- =============================================
-- AGGIORNAMENTI DATABASE CLIENTSNIPER
-- Da eseguire nell'SQL Editor di Supabase
-- =============================================

-- 1. Aggiorna la tabella users per includere ruoli
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client'));

-- 2. Aggiorna la tabella leads per i nuovi campi
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS needed_roles TEXT[] DEFAULT '{}';

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS issues TEXT[] DEFAULT '{}';

-- 3. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_leads_needed_roles ON public.leads USING GIN (needed_roles);
CREATE INDEX IF NOT EXISTS idx_leads_issues ON public.leads USING GIN (issues);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- 4. Aggiorna i commenti per documentazione
COMMENT ON COLUMN public.leads.needed_roles IS 'Array di ruoli professionali necessari (designer, developer, seo, copywriter, photographer, adv, social, gdpr)';
COMMENT ON COLUMN public.leads.issues IS 'Array di problemi tecnici rilevati sul sito web';
COMMENT ON COLUMN public.leads.analysis IS 'Analisi tecnica completa in formato JSONB, include email_analysis, footer_analysis, gdpr_compliance, branding_consistency, cms_analysis, content_quality';
COMMENT ON COLUMN public.users.role IS 'Ruolo utente: admin (accesso completo) o client (accesso limitato)';

-- 5. Crea account admin (solo se non esiste già)
-- NOTA: Non possiamo inserire direttamente in auth.users
-- L'admin dovrà registrarsi normalmente tramite frontend
-- Qui creiamo solo la logica per promuoverlo ad admin dopo la registrazione

-- 6. Funzione per promuovere un utente ad admin (da eseguire dopo registrazione)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Trova l'ID utente dall'email
  SELECT au.id INTO user_id
  FROM auth.users au 
  WHERE au.email = user_email;
  
  IF user_id IS NULL THEN
    RAISE NOTICE 'Utente con email % non trovato', user_email;
    RETURN FALSE;
  END IF;
  
  -- Aggiorna o inserisci nella tabella public.users
  INSERT INTO public.users (
    id,
    email,
    role,
    plan,
    credits_remaining,
    created_at
  ) VALUES (
    user_id,
    user_email,
    'admin',
    'pro',
    999999,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    plan = 'pro',
    credits_remaining = 999999;
    
  RAISE NOTICE 'Utente % promosso ad admin', user_email;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Aggiorna RLS policies per supportare ruoli admin
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view their own data or admin can view all" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data or admin can update all" ON public.users;
DROP POLICY IF EXISTS "Only admins can modify leads" ON public.leads;

-- Policy semplificata per users table - ogni utente può vedere solo i propri dati
-- Gli admin potranno accedere a tutti i dati tramite service_role o logica applicativa
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policy per leads table - tutti possono vedere i lead per ora
-- In futuro potremmo limitare per piano utente
CREATE POLICY "Anyone can view leads" ON public.leads
  FOR SELECT USING (true);

-- Policy per inserimento/modifica lead - solo utenti autenticati
CREATE POLICY "Authenticated users can modify leads" ON public.leads
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. Crea funzione per ottenere il ruolo utente
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger per creare automaticamente entry in public.users quando si registra un nuovo utente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, plan, credits_remaining)
  VALUES (
    new.id,
    new.email,
    'client', -- Default role
    'free',   -- Default plan
    2         -- Default credits
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Statistiche finali
SELECT 
  'SETUP COMPLETATO' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE role = 'client') as client_users
FROM public.users;

-- 11. Aggiungi campi Stripe alla tabella users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Indici per i campi Stripe
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON public.users (stripe_subscription_id);

-- Commenti per documentazione
COMMENT ON COLUMN public.users.stripe_customer_id IS 'ID del customer Stripe associato all\'utente';
COMMENT ON COLUMN public.users.stripe_subscription_id IS 'ID della subscription Stripe attiva';

-- ISTRUZIONI POST-SETUP:
-- 1. Esegui questo script nell'SQL Editor di Supabase
-- 2. Registrati con l'email drilonhametaj@outlook.it tramite frontend
-- 3. Poi esegui: SELECT public.promote_user_to_admin('drilonhametaj@outlook.it');
-- 4. Verifica con: SELECT * FROM public.users WHERE email = 'drilonhametaj@outlook.it';
