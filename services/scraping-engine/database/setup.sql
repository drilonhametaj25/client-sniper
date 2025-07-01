-- Script di setup completo per ClientSniper Database
-- Questo file contiene tutte le tabelle, indici, trigger e policy RLS
-- Usato dal DatabaseMigrator per inizializzare o aggiornare il database

-- =========================================
-- TABELLE PRINCIPALI
-- =========================================

-- Tabella utenti (eredita da auth.users di Supabase)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
  credits_remaining INT DEFAULT 2,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella piani di abbonamento
CREATE TABLE IF NOT EXISTS public.plans (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  price_monthly INT NOT NULL,
  max_credits INT NOT NULL,
  visible_fields TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella leads (PUBBLICI - non assegnati a utenti specifici)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_key TEXT UNIQUE NOT NULL, -- source + place_id o website_url + location
  content_hash TEXT NOT NULL, -- hash del contenuto per rilevare cambiamenti
  source TEXT NOT NULL, -- google_maps, yelp, pagine_gialle
  business_name TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  category TEXT,
  description TEXT,
  raw_data JSONB DEFAULT '{}',
  analysis JSONB DEFAULT '{}',
  score INT DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Nuovi campi per analisi estesa
  needed_roles TEXT[] DEFAULT '{}', -- ruoli professionali necessari
  issues TEXT[] DEFAULT '{}' -- problemi tecnici rilevati
);

-- Tabella analisi dettagliate dei siti web
CREATE TABLE IF NOT EXISTS public.lead_analysis (
  id UUID PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  has_website BOOLEAN DEFAULT false,
  website_load_time FLOAT,
  missing_meta_tags TEXT[] DEFAULT '{}',
  has_tracking_pixel BOOLEAN DEFAULT false,
  broken_images BOOLEAN DEFAULT false,
  gtm_installed BOOLEAN DEFAULT false,
  ssl_certificate BOOLEAN DEFAULT false,
  mobile_friendly BOOLEAN DEFAULT false,
  page_speed_score INT,
  seo_issues TEXT[] DEFAULT '{}',
  overall_score INT DEFAULT 0,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =========================================
-- SISTEMA SCRAPING DISTRIBUITO
-- =========================================

-- Tabella zone da scrappare (sistema distribuito intelligente)
CREATE TABLE IF NOT EXISTS public.zones_to_scrape (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- google_maps, yelp, pagine_gialle
  category TEXT NOT NULL, -- ristoranti, barberie, web agency, fabbri, fotografi
  location_name TEXT NOT NULL,
  geohash TEXT, -- opzionale per geo-targeting preciso
  bounding_box JSONB, -- opzionale: {north, south, east, west}
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  score INT DEFAULT 100 CHECK (score >= 0 AND score <= 1000), -- priorità dinamica
  is_scraping_now BOOLEAN DEFAULT false,
  times_scraped INT DEFAULT 0,
  total_leads_found INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraint per evitare duplicati
  UNIQUE(source, category, location_name)
);

-- Tabella log delle operazioni di scraping
CREATE TABLE IF NOT EXISTS public.scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones_to_scrape(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  location_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  leads_found INT DEFAULT 0,
  leads_new INT DEFAULT 0,
  leads_updated INT DEFAULT 0,
  error_message TEXT,
  error_log JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella settings di configurazione
CREATE TABLE IF NOT EXISTS public.settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =========================================
-- INDICI PER PERFORMANCE
-- =========================================

-- Indici per leads
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_unique_key ON leads(unique_key);
CREATE INDEX IF NOT EXISTS idx_leads_content_hash ON leads(content_hash);
CREATE INDEX IF NOT EXISTS idx_leads_needed_roles ON public.leads USING GIN (needed_roles);
CREATE INDEX IF NOT EXISTS idx_leads_issues ON public.leads USING GIN (issues);

-- Indici per zones_to_scrape
CREATE INDEX IF NOT EXISTS idx_zones_source ON zones_to_scrape(source);
CREATE INDEX IF NOT EXISTS idx_zones_score ON zones_to_scrape(score DESC);
CREATE INDEX IF NOT EXISTS idx_zones_is_scraping ON zones_to_scrape(is_scraping_now);
CREATE INDEX IF NOT EXISTS idx_zones_last_scraped ON zones_to_scrape(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_zones_location ON zones_to_scrape(location_name);

-- Indici per scrape_logs
CREATE INDEX IF NOT EXISTS idx_scrape_logs_zone ON scrape_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_status ON scrape_logs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_start_time ON scrape_logs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_source ON scrape_logs(source);

-- =========================================
-- TRIGGER PER TIMESTAMP AUTOMATICI
-- =========================================

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger per users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger per leads
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger per zones_to_scrape
DROP TRIGGER IF EXISTS update_zones_updated_at ON zones_to_scrape;
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones_to_scrape
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- POLICY RLS (Row Level Security)
-- =========================================

-- Abilita RLS su tutte le tabelle sensibili
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones_to_scrape ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;

-- Policy per tabella users
-- Gli utenti possono vedere e modificare solo il proprio profilo
CREATE POLICY "users_own_profile" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Gli admin possono vedere tutti gli utenti
CREATE POLICY "admin_all_users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per tabella leads
-- I clienti possono vedere solo i lead pubblici (assigned_to IS NULL) o assegnati a loro
CREATE POLICY "clients_public_leads" ON public.leads
  FOR SELECT USING (
    assigned_to IS NULL OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Solo gli admin possono inserire/modificare/eliminare lead
CREATE POLICY "admin_manage_leads" ON public.leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per zones_to_scrape - solo admin
CREATE POLICY "admin_zones" ON public.zones_to_scrape
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per scrape_logs - solo admin
CREATE POLICY "admin_logs" ON public.scrape_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per plans - tutti possono leggere, solo admin può modificare
CREATE POLICY "public_read_plans" ON public.plans
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_plans" ON public.plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =========================================
-- DATI INIZIALI
-- =========================================

-- Piani di abbonamento di default
INSERT INTO plans (name, price_monthly, max_credits, visible_fields, features) 
VALUES 
  ('free', 0, 2, '["business_name", "website_url"]', '["2 lead al mese", "Analisi base"]'),
  ('starter', 29, 50, '["business_name", "website_url", "phone", "city"]', '["50 lead al mese", "Analisi completa", "Supporto email"]'),
  ('pro', 99, 200, '["business_name", "website_url", "phone", "email", "address", "city"]', '["200 lead al mese", "Analisi avanzata", "Supporto prioritario", "API access"]')
ON CONFLICT (name) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  max_credits = EXCLUDED.max_credits,
  visible_fields = EXCLUDED.visible_fields,
  features = EXCLUDED.features;

-- Settings di default
INSERT INTO settings (key, value, description)
VALUES 
  ('scraping_interval_hours', '2', 'Intervallo in ore tra scraping automatici'),
  ('max_concurrent_scrapers', '5', 'Numero massimo di scraper concorrenti'),
  ('min_zone_score', '10', 'Punteggio minimo per considerare una zona'),
  ('max_scraping_retries', '3', 'Numero massimo di retry per scraping falliti')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- =========================================
-- COMMENTI FINALI
-- =========================================

COMMENT ON TABLE leads IS 'Lead pubblici non assegnati, disponibili per tutti gli utenti in base al piano';
COMMENT ON TABLE zones_to_scrape IS 'Zone geografiche e categorie da scrappare con sistema prioritario intelligente';
COMMENT ON TABLE scrape_logs IS 'Log completo di tutte le operazioni di scraping per debugging e statistiche';
COMMENT ON COLUMN leads.unique_key IS 'Chiave unica calcolata da source+place_id o website_url+location per evitare duplicati';
COMMENT ON COLUMN leads.content_hash IS 'Hash del contenuto per rilevare modifiche nei dati del lead';
COMMENT ON COLUMN zones_to_scrape.score IS 'Punteggio dinamico per prioritizzare zone più produttive (0-1000)';
COMMENT ON COLUMN public.leads.needed_roles IS 'Array di ruoli professionali necessari (designer, developer, seo, copywriter, photographer, adv, social, gdpr)';
COMMENT ON COLUMN public.leads.issues IS 'Array di problemi tecnici rilevati sul sito web';
COMMENT ON COLUMN public.leads.analysis IS 'Analisi tecnica completa in formato JSONB, include email_analysis, footer_analysis, gdpr_compliance, branding_consistency, cms_analysis, content_quality';

-- =========================================
-- SISTEMA AUTENTICAZIONE E RUOLI
-- =========================================

-- Trigger per creare utente automaticamente quando si registra in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, plan, credits_remaining)
  VALUES (
    new.id,
    new.email,
    CASE 
      WHEN new.email = 'admin@clientsniper.it' THEN 'admin'::text
      ELSE 'client'::text
    END,
    'free',
    2
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger che si attiva quando viene creato un nuovo utente in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Funzione per creare l'utente admin
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
BEGIN
  -- Inserisci l'admin solo se non esiste già
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@clientsniper.it',
    crypt('AdminPassword2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (email) DO NOTHING;
END;
$$ language plpgsql security definer;

-- Esegui la creazione dell'admin
SELECT create_admin_user();

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users (plan);

-- Commenti per documentazione
COMMENT ON COLUMN public.users.role IS 'Ruolo utente: admin (accesso completo) o client (accesso limitato)';
COMMENT ON COLUMN public.users.plan IS 'Piano di abbonamento: free (2 lead), starter (50 lead), pro (200 lead)';
COMMENT ON COLUMN public.users.credits_remaining IS 'Crediti rimanenti per il mese corrente';
