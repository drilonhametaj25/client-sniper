-- Creazione tabella settings per configurazioni admin
-- Permette di gestire limiti dei piani, impostazioni e configurazioni varie

-- Tabella settings
CREATE TABLE IF NOT EXISTS public.settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserimento valori default
INSERT INTO public.settings (key, value, description) VALUES
  ('free_limit', '2', 'Numero massimo di lead per piano Free'),
  ('starter_limit', '50', 'Numero massimo di lead per piano Starter'),
  ('pro_limit', '200', 'Numero massimo di lead per piano Pro'),
  ('max_scraping_zones', '100', 'Numero massimo zone di scraping attive contemporaneamente'),
  ('min_scraping_interval_hours', '24', 'Ore minime tra scraping della stessa zona'),
  ('email_notifications', 'true', 'Abilitare notifiche email'),
  ('webhook_url', '', 'URL webhook per notificazioni esterne'),
  ('stripe_webhook_secret', '', 'Secret per webhook Stripe (gestito via env)'),
  ('maintenance_mode', 'false', 'Modalità manutenzione attiva'),
  ('default_plan', 'free', 'Piano default per nuovi utenti')
ON CONFLICT (key) DO NOTHING;

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at_trigger
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- RLS Policy per settings (solo admin)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Solo admin possono leggere/modificare settings
CREATE POLICY "Admin can read settings" ON public.settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can insert settings" ON public.settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update settings" ON public.settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Funzione per ottenere un setting
CREATE OR REPLACE FUNCTION get_setting(setting_key TEXT)
RETURNS TEXT AS $$
DECLARE
  setting_value TEXT;
BEGIN
  SELECT value INTO setting_value
  FROM public.settings
  WHERE key = setting_key;
  
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per aggiornare un setting (solo admin)
CREATE OR REPLACE FUNCTION update_setting(setting_key TEXT, setting_value TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Verifica che l'utente sia admin
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo gli admin possono modificare le impostazioni';
  END IF;
  
  -- Aggiorna o inserisce il setting
  INSERT INTO public.settings (key, value, updated_at)
  VALUES (setting_key, setting_value, NOW())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.settings TO authenticated;
GRANT INSERT, UPDATE ON public.settings TO authenticated;
GRANT USAGE ON SEQUENCE settings_id_seq TO authenticated;

-- Commento finale
COMMENT ON TABLE public.settings IS 'Configurazioni e impostazioni del sistema gestibili dagli admin';
COMMENT ON FUNCTION get_setting(TEXT) IS 'Ottiene il valore di una configurazione';
COMMENT ON FUNCTION update_setting(TEXT, TEXT) IS 'Aggiorna una configurazione (solo admin)';
