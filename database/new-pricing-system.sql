-- Script per implementare il nuovo sistema di pricing TrovaMi.pro
-- Implementa piani configurabili, sostituzioni gratuite, piani annuali
-- Usato per: Gestione completa del sistema di pricing e crediti
-- Chiamato da: Migration script, setup database

-- 1. Aggiornamento tabella plans per renderla completamente configurabile
ALTER TABLE plans 
DROP CONSTRAINT IF EXISTS plans_name_check,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_annual BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_price_monthly INT, -- prezzo pieno senza sconto
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_annual TEXT,
ADD COLUMN IF NOT EXISTS max_replacements_monthly INT DEFAULT 0, -- sostituzioni gratuite incluse
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]', -- features come array JSON
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge_text TEXT, -- es: "Early Adopter", "Most Popular"
ADD COLUMN IF NOT EXISTS max_niches INT DEFAULT 1, -- numero massimo di nicchie accessibili
ADD COLUMN IF NOT EXISTS has_daily_alerts BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_lead_history BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_csv_export BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_statistics BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_plans_is_visible ON plans(is_visible);
CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON plans(sort_order);
CREATE INDEX IF NOT EXISTS idx_plans_is_annual ON plans(is_annual);

-- 2. Tabella per tracciare sostituzioni utilizzate per utente
CREATE TABLE IF NOT EXISTS user_monthly_replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month_year DATE NOT NULL, -- primo giorno del mese (es: 2025-01-01)
  replacements_used INT DEFAULT 0,
  replacements_limit INT DEFAULT 0, -- limite del piano in quel momento
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_user_replacements_user_month ON user_monthly_replacements(user_id, month_year);

-- 3. Tabella per richieste di sostituzione
CREATE TABLE IF NOT EXISTS lead_replacement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL, -- riferimento al lead (può non esistere più)
  lead_details JSONB NOT NULL, -- backup dei dettagli del lead
  reason TEXT NOT NULL, -- motivo della richiesta
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_response TEXT,
  processed_by UUID REFERENCES users(id), -- admin che ha processato
  processed_at TIMESTAMP,
  replacement_credit_given BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replacement_requests_user ON lead_replacement_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_replacement_requests_status ON lead_replacement_requests(status);
CREATE INDEX IF NOT EXISTS idx_replacement_requests_created ON lead_replacement_requests(created_at DESC);

-- 4. Aggiornamento tabella users per tracciare sostituzioni
ALTER TABLE users
ADD COLUMN IF NOT EXISTS replacement_credits INT DEFAULT 0, -- crediti sostituzione disponibili
ADD COLUMN IF NOT EXISTS current_plan_monthly_replacements INT DEFAULT 0; -- limite mensile del piano attuale

-- 4.1. PRIMA rimuovi il constraint esistente
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;

-- 4.2. POI migra gli utenti esistenti ai nuovi nomi piani
UPDATE users SET plan = 'starter_monthly' WHERE plan = 'starter';
UPDATE users SET plan = 'pro_monthly' WHERE plan = 'pro';

-- 4.3. INFINE aggiungi il nuovo constraint
ALTER TABLE users ADD CONSTRAINT users_plan_check 
  CHECK (plan IN ('free', 'starter_monthly', 'starter_annual', 'pro_monthly', 'pro_annual', 'agency_monthly', 'agency_annual'));

-- 5. Rimuovere piani esistenti e inserire nuovi piani configurabili
DELETE FROM plans WHERE name IN ('free', 'starter', 'pro');

-- Inserimento nuovi piani mensili
INSERT INTO plans (
  name, 
  price_monthly, 
  original_price_monthly,
  max_credits, 
  description,
  stripe_price_id_monthly,
  max_replacements_monthly,
  features,
  is_visible,
  sort_order,
  badge_text,
  max_niches,
  has_daily_alerts,
  has_lead_history,
  has_csv_export,
  has_statistics,
  is_annual,
  visible_fields
) VALUES
-- Piano Free
('free', 0, 0, 5, 
 'Inizia gratis con 5 lead immediati + 1 lead a settimana via email.',
 NULL, 0,
 '["5 lead immediati", "1 lead extra a settimana via email", "Accesso a 1 nicchia", "Supporto community"]',
 TRUE, 1, NULL, 1, FALSE, FALSE, FALSE, FALSE, FALSE,
 ARRAY['business_name','website_url']),

-- Piano Starter Mensile
('starter_monthly', 1900, 2900, 25,
 'Perfetto per freelance: 25 lead al mese + sostituzione garantita.',
 NULL, -- Da configurare con env var
 1,
 '["25 lead al mese", "1 sostituzione gratuita al mese", "Alert giornalieri nella nicchia", "Storico lead consultabile", "Analisi tecnica completa"]',
 TRUE, 2, 'Early Adopter', 1, TRUE, TRUE, FALSE, FALSE, FALSE,
 ARRAY['business_name','website_url','phone','city']),

-- Piano Starter Annuale  
('starter_annual', 19000, 29000, 25,
 'Perfetto per freelance: 25 lead al mese + sostituzione garantita. Risparmi 2 mesi!',
 NULL, -- Da configurare con env var
 1,
 '["25 lead al mese", "1 sostituzione gratuita al mese", "Alert giornalieri nella nicchia", "Storico lead consultabile", "Analisi tecnica completa", "Risparmi 2 mesi"]',
 TRUE, 3, 'Early Adopter', 1, TRUE, TRUE, FALSE, FALSE, TRUE,
 ARRAY['business_name','website_url','phone','city']),

-- Piano Pro Mensile
('pro_monthly', 4900, 6900, 100,
 'Per chi vuole un flusso costante di clienti con funzioni avanzate.',
 NULL, -- Da configurare con env var
 3,
 '["100 lead al mese", "3 sostituzioni gratuite al mese", "Esportazione CSV/Excel", "Accesso a 3 nicchie diverse", "Cruscotto con statistiche base", "CRM integrato", "Supporto prioritario"]',
 TRUE, 4, 'Most Popular', 3, TRUE, TRUE, TRUE, TRUE,
 ARRAY['business_name','website_url','phone','city','email']),

-- Piano Pro Annuale
('pro_annual', 49000, 69000, 100,
 'Per chi vuole un flusso costante di clienti con funzioni avanzate. Risparmi 2 mesi!',
 NULL, -- Da configurare con env var
 3,
 '["100 lead al mese", "3 sostituzioni gratuite al mese", "Esportazione CSV/Excel", "Accesso a 3 nicchie diverse", "Cruscotto con statistiche base", "CRM integrato", "Supporto prioritario", "Risparmi 2 mesi"]',
 TRUE, 5, 'Most Popular', 3, TRUE, TRUE, TRUE, TRUE,
 ARRAY['business_name','website_url','phone','city','email']),

-- Piano Agency Mensile
('agency_monthly', 9900, 14900, 300,
 'Per chi scala forte: 300 lead al mese + sostituzioni garantite.',
 NULL, -- Da configurare con env var
 10,
 '["300 lead al mese", "10 sostituzioni gratuite al mese", "Accesso a tutte le nicchie", "Esportazione CSV/Excel", "Cruscotto avanzato", "Supporto dedicato", "Onboarding personalizzato"]',
 TRUE, 6, 'Early Adopter', 999, TRUE, TRUE, TRUE, TRUE,
 ARRAY['business_name','website_url','phone','city','email','category','rating']),

-- Piano Agency Annuale
('agency_annual', 99000, 149000, 300,
 'Per chi scala forte: 300 lead al mese + sostituzioni garantite. Risparmi 2 mesi!',
 NULL, -- Da configurare con env var
 10,
 '["300 lead al mese", "10 sostituzioni gratuite al mese", "Accesso a tutte le nicchie", "Esportazione CSV/Excel", "Cruscotto avanzato", "Supporto dedicato", "Onboarding personalizzato", "Risparmi 2 mesi"]',
 TRUE, 7, 'Early Adopter', 999, TRUE, TRUE, TRUE, TRUE,
 ARRAY['business_name','website_url','phone','city','email','category','rating']);

-- 6. Funzione per reset individuale sostituzioni utente (basato su rinnovo)
CREATE OR REPLACE FUNCTION reset_user_replacements(p_user_id UUID)
RETURNS void AS $$
DECLARE
    user_plan_replacements INT;
    current_period DATE := CURRENT_DATE;
BEGIN
    -- Ottieni limite sostituzioni del piano utente
    SELECT p.max_replacements_monthly INTO user_plan_replacements
    FROM users u
    JOIN plans p ON p.name = u.plan
    WHERE u.id = p_user_id;
    
    -- Reset sostituzioni per l'utente nel periodo corrente
    INSERT INTO user_monthly_replacements (user_id, month_year, replacements_used, replacements_limit)
    VALUES (p_user_id, current_period, 0, user_plan_replacements)
    ON CONFLICT (user_id, month_year) 
    DO UPDATE SET 
        replacements_used = 0,
        replacements_limit = EXCLUDED.replacements_limit,
        updated_at = NOW();
        
    RAISE NOTICE 'Reset sostituzioni completato per utente % - Limite: %', p_user_id, user_plan_replacements;
END;
$$ LANGUAGE plpgsql;

-- 7. Funzione per verificare e usare una sostituzione
CREATE OR REPLACE FUNCTION use_replacement_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_month DATE := date_trunc('month', CURRENT_DATE)::date;
    user_plan_replacements INT;
    current_used INT;
BEGIN
    -- Ottieni limite sostituzioni del piano utente
    SELECT p.max_replacements_monthly INTO user_plan_replacements
    FROM users u
    JOIN plans p ON p.name = u.plan
    WHERE u.id = p_user_id;
    
    -- Crea record mensile se non esiste
    INSERT INTO user_monthly_replacements (user_id, month_year, replacements_used, replacements_limit)
    VALUES (p_user_id, current_month, 0, user_plan_replacements)
    ON CONFLICT (user_id, month_year) 
    DO UPDATE SET replacements_limit = EXCLUDED.replacements_limit;
    
    -- Verifica se può usare una sostituzione
    SELECT replacements_used INTO current_used
    FROM user_monthly_replacements
    WHERE user_id = p_user_id AND month_year = current_month;
    
    IF current_used < user_plan_replacements THEN
        -- Incrementa contatore sostituzioni usate
        UPDATE user_monthly_replacements
        SET replacements_used = replacements_used + 1,
            updated_at = now()
        WHERE user_id = p_user_id AND month_year = current_month;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Funzione per ottenere informazioni sostituzioni utente
CREATE OR REPLACE FUNCTION get_user_replacement_info(p_user_id UUID)
RETURNS TABLE (
    replacements_used INT,
    replacements_limit INT,
    replacements_remaining INT
) AS $$
DECLARE
    current_month DATE := date_trunc('month', CURRENT_DATE)::date;
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(umr.replacements_used, 0) as replacements_used,
        COALESCE(p.max_replacements_monthly, 0) as replacements_limit,
        GREATEST(0, COALESCE(p.max_replacements_monthly, 0) - COALESCE(umr.replacements_used, 0)) as replacements_remaining
    FROM users u
    LEFT JOIN plans p ON p.name = u.plan
    LEFT JOIN user_monthly_replacements umr ON (umr.user_id = u.id AND umr.month_year = current_month)
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS per nuove tabelle
ALTER TABLE user_monthly_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_replacement_requests ENABLE ROW LEVEL SECURITY;

-- Policies per sostituzioni mensili (solo proprie)
CREATE POLICY "Users can view own monthly replacements" ON user_monthly_replacements
  FOR SELECT USING (auth.uid() = user_id);

-- Policies per richieste sostituzione (solo proprie)
CREATE POLICY "Users can view own replacement requests" ON lead_replacement_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create replacement requests" ON lead_replacement_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies per admin (ruolo admin può vedere tutto)
CREATE POLICY "Admins can view all replacement requests" ON lead_replacement_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 10. Commenti per documentazione
COMMENT ON TABLE plans IS 'Configurazione completa dei piani TrovaMi - tutto configurabile da admin';
COMMENT ON COLUMN plans.description IS 'Descrizione mostrata nella pricing table';
COMMENT ON COLUMN plans.is_annual IS 'TRUE se è un piano annuale';
COMMENT ON COLUMN plans.original_price_monthly IS 'Prezzo pieno senza sconto early adopter';
COMMENT ON COLUMN plans.max_replacements_monthly IS 'Numero sostituzioni gratuite incluse nel piano';
COMMENT ON COLUMN plans.features IS 'Array JSON delle features da mostrare nella pricing table';
COMMENT ON COLUMN plans.badge_text IS 'Testo badge (Early Adopter, Most Popular, etc.)';
COMMENT ON COLUMN plans.max_niches IS 'Numero massimo nicchie accessibili (999 = illimitate)';

COMMENT ON TABLE user_monthly_replacements IS 'Traccia sostituzioni utilizzate per utente ogni mese';
COMMENT ON TABLE lead_replacement_requests IS 'Richieste di sostituzione lead da processare';

-- 11. Trigger per aggiornare updated_at
CREATE OR REPLACE TRIGGER update_plans_updated_at 
  BEFORE UPDATE ON plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_replacements_updated_at 
  BEFORE UPDATE ON user_monthly_replacements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_replacement_requests_updated_at 
  BEFORE UPDATE ON lead_replacement_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Funzione per reset globale sostituzioni (DEPRECATA - solo per compatibilità)
CREATE OR REPLACE FUNCTION monthly_reset_replacements_job()
RETURNS TEXT AS $$
BEGIN
    RAISE NOTICE 'DEPRECATO: Usa reset_user_replacements(user_id) per reset individuali';
    RETURN 'Funzione deprecata - usa reset individuali basati su rinnovo utente';
END;
$$ LANGUAGE plpgsql;

-- Aggiorna utenti esistenti per compatibilità (già migrati sopra)
UPDATE users 
SET 
  replacement_credits = 0,
  current_plan_monthly_replacements = CASE 
    WHEN plan = 'free' THEN 0
    WHEN plan = 'starter_monthly' THEN 1  -- Usa il nuovo nome
    WHEN plan = 'pro_monthly' THEN 3      -- Usa il nuovo nome
    ELSE 0
  END
WHERE replacement_credits IS NULL;
