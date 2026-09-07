-- Configurazione database ClientSniper
-- Eseguire queste query nella dashboard di Supabase (SQL Editor)

-- Tabella users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
  credits_remaining INT DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella plans
CREATE TABLE IF NOT EXISTS public.plans (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (name IN ('free', 'starter', 'pro')),
  price_monthly INT NOT NULL DEFAULT 0,
  max_credits INT NOT NULL DEFAULT 0,
  visible_fields TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci piani predefiniti
INSERT INTO public.plans (name, price_monthly, max_credits, visible_fields) VALUES
('free', 0, 2, ARRAY['business_name','website_url']),
('starter', 1900, 50, ARRAY['business_name','website_url','phone','city']),
('pro', 4900, 200, ARRAY['business_name','website_url','phone','city','email','category','rating'])
ON CONFLICT (name) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  max_credits = EXCLUDED.max_credits,
  visible_fields = EXCLUDED.visible_fields;

-- Tabella leads (PUBBLICI - non assegnati a utenti specifici)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  analysis JSONB DEFAULT '{}',
  source TEXT DEFAULT 'google_maps',
  unique_key TEXT UNIQUE NOT NULL, -- source+place_id o website_url+location_name
  content_hash TEXT NOT NULL, -- Hash del contenuto per evitare duplicati
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella zones_to_scrape (per gestire lo scraping distribuito)
CREATE TABLE IF NOT EXISTS public.zones_to_scrape (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL, -- "google_maps", "yelp", "pagine_gialle"
  category TEXT NOT NULL, -- "ristoranti", "idraulici", "barberie"
  location_name TEXT NOT NULL, -- "Milano", "Napoli Centro"
  geohash TEXT, -- Geohash per geolocalizzazione precisa
  bounding_box JSONB, -- Alternative a geohash: {"north": 45.1, "south": 45.0, "east": 9.1, "west": 9.0}
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  score INT DEFAULT 100 CHECK (score >= 0 AND score <= 1000), -- Priorità (più alto = più prioritario)
  is_scraping_now BOOLEAN DEFAULT FALSE,
  times_scraped INT DEFAULT 0,
  total_leads_found INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, category, location_name) -- Evita duplicazioni della stessa combinazione
);

-- Tabella scrape_logs (log delle operazioni di scraping)
CREATE TABLE IF NOT EXISTS public.scrape_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES public.zones_to_scrape(id),
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'fail', 'partial')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  lead_count INT DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella lead_analysis (dettagli analisi tecnica)
CREATE TABLE IF NOT EXISTS public.lead_analysis (
  id UUID PRIMARY KEY REFERENCES public.leads(id),
  has_website BOOLEAN DEFAULT FALSE,
  website_load_time FLOAT DEFAULT 0,
  missing_meta_tags TEXT[] DEFAULT '{}',
  has_tracking_pixel BOOLEAN DEFAULT FALSE,
  broken_images BOOLEAN DEFAULT FALSE,
  gtm_installed BOOLEAN DEFAULT FALSE,
  has_ssl BOOLEAN DEFAULT FALSE,
  mobile_friendly BOOLEAN DEFAULT FALSE,
  overall_score INT DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  analysis_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella settings
CREATE TABLE IF NOT EXISTS public.settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci impostazioni predefinite
INSERT INTO public.settings (key, value, description) VALUES
('scraping_enabled', 'true', 'Abilita/disabilita il sistema di scraping'),
('max_leads_per_run', '50', 'Massimo numero di lead per esecuzione'),
('scraping_frequency_hours', '24', 'Frequenza di scraping in ore'),
('min_lead_score', '30', 'Punteggio minimo per considerare un lead valido')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_leads_category ON public.leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_unique_key ON public.leads(unique_key);
CREATE INDEX IF NOT EXISTS idx_leads_content_hash ON public.leads(content_hash);
CREATE INDEX IF NOT EXISTS idx_leads_last_seen_at ON public.leads(last_seen_at DESC);

-- Indici per zones_to_scrape
CREATE INDEX IF NOT EXISTS idx_zones_source_category ON public.zones_to_scrape(source, category);
CREATE INDEX IF NOT EXISTS idx_zones_score ON public.zones_to_scrape(score DESC);
CREATE INDEX IF NOT EXISTS idx_zones_last_scraped ON public.zones_to_scrape(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_zones_is_scraping ON public.zones_to_scrape(is_scraping_now);

-- Indici per scrape_logs
CREATE INDEX IF NOT EXISTS idx_scrape_logs_zone_id ON public.scrape_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_status ON public.scrape_logs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_start_time ON public.scrape_logs(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users(plan);

-- RLS (Row Level Security) - Opzionale, per sicurezza
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones_to_scrape ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;

-- Policy per permettere accesso ai propri dati
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy per i lead (pubblici per utenti autenticati)
CREATE POLICY "Authenticated users can view leads" ON public.leads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view lead analysis" ON public.lead_analysis
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy per zone e logs (solo admin/service)
CREATE POLICY "Service role can manage zones" ON public.zones_to_scrape
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage scrape logs" ON public.scrape_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_leads_updated_at 
  BEFORE UPDATE ON public.leads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_zones_updated_at 
  BEFORE UPDATE ON public.zones_to_scrape 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_settings_updated_at 
  BEFORE UPDATE ON public.settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserisci zone predefinite per iniziare
INSERT INTO public.zones_to_scrape (source, category, location_name, score) VALUES
('google_maps', 'ristorante', 'Milano, Italia', 100),
('google_maps', 'parrucchiere', 'Roma, Italia', 95),
('google_maps', 'pizzeria', 'Napoli, Italia', 90),
('google_maps', 'bar', 'Torino, Italia', 85),
('google_maps', 'officina', 'Bologna, Italia', 80),
('google_maps', 'ristorante', 'Firenze, Italia', 75),
('google_maps', 'palestra', 'Genova, Italia', 70),
('google_maps', 'dentista', 'Palermo, Italia', 65),
('google_maps', 'farmacia', 'Bari, Italia', 60),
('google_maps', 'avvocato', 'Catania, Italia', 55)
ON CONFLICT (source, category, location_name) DO UPDATE SET
  score = EXCLUDED.score;
