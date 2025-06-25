-- Aggiornamenti per la gestione dei limiti configurabili e pannello admin
-- Da eseguire nel SQL Editor di Supabase dopo il database-updates.sql

-- 1. Popola la tabella settings con valori di default
INSERT INTO public.settings (key, value) VALUES 
('free_credits_limit', '2'),
('starter_credits_limit', '50'),
('pro_credits_limit', '200'),
('max_leads_per_query', '100'),
('scraping_enabled', 'true'),
('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- 2. Crea funzione per aggiornare impostazioni (solo admin)
CREATE OR REPLACE FUNCTION public.update_setting(setting_key TEXT, setting_value TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Verifica che l'utente sia admin
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Accesso negato: solo gli admin possono modificare le impostazioni';
  END IF;
  
  -- Aggiorna o inserisci l'impostazione
  INSERT INTO public.settings (key, value) 
  VALUES (setting_key, setting_value)
  ON CONFLICT (key) DO UPDATE SET value = setting_value;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Funzione per ottenere impostazioni
CREATE OR REPLACE FUNCTION public.get_setting(setting_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT value FROM public.settings WHERE key = setting_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. View per statistiche admin
CREATE OR REPLACE VIEW public.admin_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.users) as total_users,
  (SELECT COUNT(*) FROM public.users WHERE role = 'admin') as admin_users,
  (SELECT COUNT(*) FROM public.users WHERE role = 'client') as client_users,
  (SELECT COUNT(*) FROM public.users WHERE plan = 'free') as free_users,
  (SELECT COUNT(*) FROM public.users WHERE plan = 'starter') as starter_users,
  (SELECT COUNT(*) FROM public.users WHERE plan = 'pro') as pro_users,
  (SELECT COUNT(*) FROM public.leads) as total_leads,
  (SELECT COUNT(*) FROM public.leads WHERE created_at > NOW() - INTERVAL '7 days') as leads_last_week,
  (SELECT COUNT(*) FROM public.leads WHERE score <= 30) as critical_leads,
  (SELECT AVG(score) FROM public.leads) as avg_lead_score;

-- 5. RLS policies per settings (solo admin)
CREATE POLICY "Only admins can view settings" ON public.settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify settings" ON public.settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. RLS policy per admin stats
CREATE POLICY "Only admins can view stats" ON public.admin_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Aggiungi campo per tracciare l'ultimo uso dei crediti
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_credit_used_at TIMESTAMP DEFAULT NULL;

-- 8. Funzione per consumare crediti
CREATE OR REPLACE FUNCTION public.consume_credit(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INT;
BEGIN
  -- Ottieni crediti attuali
  SELECT credits_remaining INTO current_credits
  FROM public.users
  WHERE id = user_id;
  
  -- Verifica se ha crediti disponibili
  IF current_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Consuma un credito
  UPDATE public.users 
  SET 
    credits_remaining = credits_remaining - 1,
    last_credit_used_at = NOW()
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_setting IS 'Aggiorna impostazioni sistema (solo admin)';
COMMENT ON FUNCTION public.get_setting IS 'Ottiene valore impostazione';
COMMENT ON FUNCTION public.consume_credit IS 'Consuma un credito utente';
COMMENT ON VIEW public.admin_stats IS 'Statistiche per dashboard admin';
