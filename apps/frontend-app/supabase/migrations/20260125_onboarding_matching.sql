-- =====================================================
-- MIGRATION: Onboarding + Matching Algorithm + "Per Te"
-- Data: 2026-01-25
-- Funzionalità: User Profiles, Behavior Tracking,
--               Lead Relevance, Personalizzazione Dashboard
-- =====================================================

-- =====================================================
-- 1. USER PROFILES (Preferenze Onboarding)
-- =====================================================

-- Preferenze estese dall'onboarding (complementa users table esistente)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Step 1: Tipo utente
  user_type TEXT NOT NULL DEFAULT 'freelancer'
    CHECK (user_type IN ('freelancer', 'agency', 'consultant')),

  -- Step 2: Livelli skill per servizio (estende users.services_offered)
  -- Formato: { "seo": 3, "gdpr": 2 } dove 1=base, 2=intermedio, 3=expert
  service_skill_levels JSONB DEFAULT '{}'::jsonb,

  -- Step 4: Preferenze location
  preferred_cities TEXT[] DEFAULT '{}',
  preferred_regions TEXT[] DEFAULT '{}',
  location_radius_km INTEGER DEFAULT 50,
  is_remote_only BOOLEAN DEFAULT FALSE,

  -- Step 5: Preferenze industrie (mappa a lead.category)
  preferred_industries TEXT[] DEFAULT '{}',
  excluded_industries TEXT[] DEFAULT '{}',

  -- Step 6: Capacità
  weekly_capacity INTEGER DEFAULT 5,
  projects_in_progress INTEGER DEFAULT 0,

  -- Metadata onboarding
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_skipped_at TIMESTAMPTZ,
  onboarding_current_step INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commento tabella
COMMENT ON TABLE user_profiles IS 'Preferenze utente dall''onboarding per personalizzazione lead matching';
COMMENT ON COLUMN user_profiles.service_skill_levels IS 'JSONB: { "seo": 3, "gdpr": 2 } dove 1=base, 2=intermedio, 3=expert';
COMMENT ON COLUMN user_profiles.user_type IS 'Tipo utente: freelancer, agency, consultant';

-- =====================================================
-- 2. USER BEHAVIOR (Tracking Interazioni)
-- =====================================================

-- Tracking interazioni utente-lead per migliorare matching
CREATE TABLE IF NOT EXISTS user_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Tipo azione
  action TEXT NOT NULL
    CHECK (action IN ('viewed', 'unlocked', 'contacted', 'converted', 'skipped', 'saved')),

  -- Metadata azione (context-dependent)
  -- viewed: { "source": "dashboard" | "for_you" | "search" }
  -- converted: { "deal_value": 1500, "services": ["seo", "analytics"] }
  -- skipped: { "reason": "budget_mismatch" | "location_far" | "not_interested" }
  -- contacted: { "method": "email" | "phone" | "whatsapp" }
  action_metadata JSONB DEFAULT '{}'::jsonb,

  -- Snapshot del lead al momento dell'azione (per analisi storica)
  lead_score_snapshot INTEGER,
  lead_category_snapshot TEXT,
  relevance_score_snapshot INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commento tabella
COMMENT ON TABLE user_behavior IS 'Traccia interazioni utente-lead per migliorare algoritmo matching';

-- =====================================================
-- 3. LEAD RELEVANCE CACHE (Opzionale - per future ottimizzazioni)
-- =====================================================

-- Cache pre-calcolata per performance (per ora calcolo on-demand)
CREATE TABLE IF NOT EXISTS lead_relevance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Score calcolato 0-100
  relevance_score INTEGER NOT NULL DEFAULT 0
    CHECK (relevance_score >= 0 AND relevance_score <= 100),

  -- Breakdown score per debugging/display
  -- { "service_match": 35, "budget_match": 18, "location_match": 12,
  --   "industry_match": 8, "urgency": 9, "behavioral": 4 }
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Servizi matchati (per UI rapida)
  matched_services TEXT[] DEFAULT '{}',

  -- Reason testuale
  reason TEXT,

  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, lead_id)
);

-- Commento tabella
COMMENT ON TABLE lead_relevance IS 'Cache opzionale per relevance scores - attualmente calcolo on-demand';

-- =====================================================
-- 4. INDEXES PER PERFORMANCE
-- =====================================================

-- user_profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed_at)
  WHERE onboarding_completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_cities ON user_profiles USING GIN (preferred_cities);
CREATE INDEX IF NOT EXISTS idx_user_profiles_industries ON user_profiles USING GIN (preferred_industries);
CREATE INDEX IF NOT EXISTS idx_user_profiles_regions ON user_profiles USING GIN (preferred_regions);

-- user_behavior indexes
CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id ON user_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_lead_id ON user_behavior(lead_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_action ON user_behavior(action);
CREATE INDEX IF NOT EXISTS idx_user_behavior_created_at ON user_behavior(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_behavior_user_action ON user_behavior(user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_behavior_user_lead ON user_behavior(user_id, lead_id);

-- lead_relevance indexes
CREATE INDEX IF NOT EXISTS idx_lead_relevance_user_id ON lead_relevance(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_relevance_score ON lead_relevance(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_relevance_user_score ON lead_relevance(user_id, relevance_score DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_relevance ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- user_behavior policies
CREATE POLICY "Users can view own behavior" ON user_behavior
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own behavior" ON user_behavior
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all behavior" ON user_behavior
  FOR ALL USING (auth.role() = 'service_role');

-- lead_relevance policies
CREATE POLICY "Users can view own relevance" ON lead_relevance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all relevance" ON lead_relevance
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Trigger per auto-update updated_at su user_profiles
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Funzione per ottenere behavior summary di un utente
CREATE OR REPLACE FUNCTION get_user_behavior_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_viewed', COUNT(*) FILTER (WHERE action = 'viewed'),
    'total_unlocked', COUNT(*) FILTER (WHERE action = 'unlocked'),
    'total_contacted', COUNT(*) FILTER (WHERE action = 'contacted'),
    'total_converted', COUNT(*) FILTER (WHERE action = 'converted'),
    'total_skipped', COUNT(*) FILTER (WHERE action = 'skipped'),
    'total_saved', COUNT(*) FILTER (WHERE action = 'saved'),
    'converted_categories', COALESCE(
      (SELECT jsonb_agg(DISTINCT lead_category_snapshot)
       FROM user_behavior
       WHERE user_id = p_user_id AND action = 'converted' AND lead_category_snapshot IS NOT NULL),
      '[]'::jsonb
    ),
    'last_activity', MAX(created_at)
  ) INTO result
  FROM user_behavior
  WHERE user_id = p_user_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per verificare se onboarding è completo
CREATE OR REPLACE FUNCTION is_onboarding_complete(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  completed_at TIMESTAMPTZ;
BEGIN
  SELECT onboarding_completed_at INTO completed_at
  FROM user_profiles
  WHERE user_id = p_user_id;

  RETURN completed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CONSTANTS: Regioni italiane e categorie comuni
-- =====================================================

-- Crea tabella di lookup per regioni italiane (utile per autocomplete)
CREATE TABLE IF NOT EXISTS italian_regions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provinces TEXT[] DEFAULT '{}'
);

-- Inserisci regioni italiane
INSERT INTO italian_regions (code, name, provinces) VALUES
  ('ABR', 'Abruzzo', ARRAY['AQ', 'CH', 'PE', 'TE']),
  ('BAS', 'Basilicata', ARRAY['MT', 'PZ']),
  ('CAL', 'Calabria', ARRAY['CS', 'CZ', 'KR', 'RC', 'VV']),
  ('CAM', 'Campania', ARRAY['AV', 'BN', 'CE', 'NA', 'SA']),
  ('EMR', 'Emilia-Romagna', ARRAY['BO', 'FC', 'FE', 'MO', 'PC', 'PR', 'RA', 'RE', 'RN']),
  ('FVG', 'Friuli-Venezia Giulia', ARRAY['GO', 'PN', 'TS', 'UD']),
  ('LAZ', 'Lazio', ARRAY['FR', 'LT', 'RI', 'RM', 'VT']),
  ('LIG', 'Liguria', ARRAY['GE', 'IM', 'SP', 'SV']),
  ('LOM', 'Lombardia', ARRAY['BG', 'BS', 'CO', 'CR', 'LC', 'LO', 'MB', 'MI', 'MN', 'PV', 'SO', 'VA']),
  ('MAR', 'Marche', ARRAY['AN', 'AP', 'FM', 'MC', 'PU']),
  ('MOL', 'Molise', ARRAY['CB', 'IS']),
  ('PIE', 'Piemonte', ARRAY['AL', 'AT', 'BI', 'CN', 'NO', 'TO', 'VB', 'VC']),
  ('PUG', 'Puglia', ARRAY['BA', 'BT', 'BR', 'FG', 'LE', 'TA']),
  ('SAR', 'Sardegna', ARRAY['CA', 'NU', 'OR', 'SS', 'SU']),
  ('SIC', 'Sicilia', ARRAY['AG', 'CL', 'CT', 'EN', 'ME', 'PA', 'RG', 'SR', 'TP']),
  ('TOS', 'Toscana', ARRAY['AR', 'FI', 'GR', 'LI', 'LU', 'MS', 'PI', 'PO', 'PT', 'SI']),
  ('TAA', 'Trentino-Alto Adige', ARRAY['BZ', 'TN']),
  ('UMB', 'Umbria', ARRAY['PG', 'TR']),
  ('VDA', 'Valle d''Aosta', ARRAY['AO']),
  ('VEN', 'Veneto', ARRAY['BL', 'PD', 'RO', 'TV', 'VE', 'VI', 'VR'])
ON CONFLICT (code) DO NOTHING;

-- Crea tabella di lookup per categorie business comuni
CREATE TABLE IF NOT EXISTS business_categories (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_plural TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Inserisci categorie comuni
INSERT INTO business_categories (code, name, name_plural, icon, sort_order) VALUES
  ('restaurant', 'Ristorante', 'Ristoranti', '🍽️', 1),
  ('bar', 'Bar', 'Bar', '☕', 2),
  ('hotel', 'Hotel', 'Hotel', '🏨', 3),
  ('beauty', 'Centro Estetico', 'Centri Estetici', '💅', 4),
  ('hairdresser', 'Parrucchiere', 'Parrucchieri', '💇', 5),
  ('dentist', 'Dentista', 'Dentisti', '🦷', 6),
  ('doctor', 'Medico', 'Medici', '🩺', 7),
  ('lawyer', 'Avvocato', 'Avvocati', '⚖️', 8),
  ('accountant', 'Commercialista', 'Commercialisti', '📊', 9),
  ('real_estate', 'Agenzia Immobiliare', 'Agenzie Immobiliari', '🏠', 10),
  ('gym', 'Palestra', 'Palestre', '🏋️', 11),
  ('mechanic', 'Officina', 'Officine', '🔧', 12),
  ('plumber', 'Idraulico', 'Idraulici', '🔩', 13),
  ('electrician', 'Elettricista', 'Elettricisti', '⚡', 14),
  ('photographer', 'Fotografo', 'Fotografi', '📷', 15),
  ('florist', 'Fiorista', 'Fioristi', '💐', 16),
  ('bakery', 'Panificio', 'Panifici', '🥖', 17),
  ('pharmacy', 'Farmacia', 'Farmacie', '💊', 18),
  ('veterinary', 'Veterinario', 'Veterinari', '🐾', 19),
  ('school', 'Scuola', 'Scuole', '📚', 20),
  ('shop', 'Negozio', 'Negozi', '🛍️', 21),
  ('other', 'Altro', 'Altro', '📌', 99)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 9. INIT DATA PER UTENTI ESISTENTI
-- =====================================================

-- Crea record user_profiles per utenti esistenti (con valori default)
INSERT INTO user_profiles (user_id, created_at)
SELECT id, NOW() FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
