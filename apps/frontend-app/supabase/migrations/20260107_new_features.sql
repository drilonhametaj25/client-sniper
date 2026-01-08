-- =====================================================
-- MIGRATION: Nuove Funzionalità TrovaMi.pro
-- Data: 2026-01-07
-- Funzionalità: Notifiche, Lead Alerts, Gamification,
--               Onboarding, Competitor Intelligence
-- =====================================================

-- =====================================================
-- 1. SISTEMA NOTIFICHE
-- =====================================================

-- Preferenze notifiche utente
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email digest
  email_digest_enabled BOOLEAN DEFAULT true,
  email_digest_frequency VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekly', 'realtime'

  -- Tipi di notifiche
  notify_new_leads BOOLEAN DEFAULT true,
  notify_high_score_leads BOOLEAN DEFAULT true, -- Lead con score < 30
  notify_credits_low BOOLEAN DEFAULT true,
  notify_credits_reset BOOLEAN DEFAULT true,
  notify_follow_up_reminder BOOLEAN DEFAULT true,
  notify_saved_search_match BOOLEAN DEFAULT true,

  -- Soglie
  high_score_threshold INTEGER DEFAULT 30, -- Notifica se score <= questo valore
  credits_low_threshold INTEGER DEFAULT 3, -- Notifica se crediti <= questo valore

  -- Orari preferiti (per digest)
  preferred_send_hour INTEGER DEFAULT 9, -- 0-23
  timezone VARCHAR(50) DEFAULT 'Europe/Rome',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Log notifiche inviate
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'new_leads', 'high_score', 'credits_low', etc.
  channel VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email', 'push', 'in_app'
  subject TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'sent' -- 'sent', 'delivered', 'opened', 'clicked', 'failed'
);

-- =====================================================
-- 2. SAVED SEARCHES (Lead Alerts)
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,

  -- Criteri di ricerca
  categories TEXT[] DEFAULT '{}', -- Array di categorie
  cities TEXT[] DEFAULT '{}', -- Array di città
  score_min INTEGER DEFAULT 0,
  score_max INTEGER DEFAULT 100,
  has_email BOOLEAN,
  has_phone BOOLEAN,

  -- Problemi tecnici
  filter_no_ssl BOOLEAN DEFAULT false,
  filter_slow_loading BOOLEAN DEFAULT false,
  filter_no_analytics BOOLEAN DEFAULT false,
  filter_no_facebook_pixel BOOLEAN DEFAULT false,

  -- Alert settings
  alert_enabled BOOLEAN DEFAULT true,
  alert_frequency VARCHAR(20) DEFAULT 'daily', -- 'realtime', 'daily', 'weekly'
  last_alert_sent_at TIMESTAMPTZ,
  matches_since_last_alert INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Matches di saved searches (per evitare duplicati)
CREATE TABLE IF NOT EXISTS saved_search_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,

  UNIQUE(saved_search_id, lead_id)
);

-- =====================================================
-- 3. GAMIFICATION & STREAK
-- =====================================================

CREATE TABLE IF NOT EXISTS user_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Streak
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,

  -- Counters
  total_leads_unlocked INTEGER DEFAULT 0,
  total_leads_contacted INTEGER DEFAULT 0,
  total_deals_won INTEGER DEFAULT 0,
  total_deals_value DECIMAL(10,2) DEFAULT 0,

  -- XP & Level (per futuro)
  xp_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Achievements/Badges
CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(50) PRIMARY KEY, -- 'first_unlock', 'streak_7', 'deal_closed', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji o nome icona
  category VARCHAR(50), -- 'engagement', 'sales', 'exploration'
  xp_reward INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Achievement utente
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, achievement_id)
);

-- Insert default achievements
INSERT INTO achievements (id, name, description, icon, category, xp_reward, sort_order) VALUES
  ('first_unlock', 'Primo Passo', 'Hai sbloccato il tuo primo lead', '🎯', 'engagement', 10, 1),
  ('unlock_10', 'Explorer', 'Hai sbloccato 10 lead', '🔍', 'engagement', 50, 2),
  ('unlock_50', 'Hunter', 'Hai sbloccato 50 lead', '🏹', 'engagement', 100, 3),
  ('unlock_100', 'Master Hunter', 'Hai sbloccato 100 lead', '👑', 'engagement', 200, 4),
  ('first_contact', 'Primo Contatto', 'Hai contattato il tuo primo lead', '📞', 'sales', 20, 5),
  ('contact_10', 'Networker', 'Hai contattato 10 lead', '🤝', 'sales', 75, 6),
  ('first_deal', 'Closer', 'Hai chiuso il tuo primo deal', '💰', 'sales', 100, 7),
  ('deal_5', 'Sales Pro', 'Hai chiuso 5 deal', '🏆', 'sales', 250, 8),
  ('streak_3', 'Costante', '3 giorni consecutivi di accesso', '🔥', 'engagement', 15, 9),
  ('streak_7', 'Settimana Perfetta', '7 giorni consecutivi di accesso', '⚡', 'engagement', 50, 10),
  ('streak_30', 'Instancabile', '30 giorni consecutivi di accesso', '💎', 'engagement', 200, 11),
  ('saved_search', 'Alert Master', 'Hai creato il tuo primo alert', '🔔', 'exploration', 25, 12),
  ('crm_pro', 'CRM Expert', 'Hai usato tutte le funzioni CRM', '📊', 'exploration', 50, 13)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. ONBOARDING PROGRESSIVO
-- =====================================================

CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Steps completati
  completed_profile BOOLEAN DEFAULT false,
  completed_first_unlock BOOLEAN DEFAULT false,
  completed_first_contact BOOLEAN DEFAULT false,
  completed_crm_setup BOOLEAN DEFAULT false,
  completed_saved_search BOOLEAN DEFAULT false,
  completed_first_deal BOOLEAN DEFAULT false,

  -- Progress percentage (calcolato)
  progress_percentage INTEGER DEFAULT 0,

  -- Timestamps per ogni step
  profile_completed_at TIMESTAMPTZ,
  first_unlock_at TIMESTAMPTZ,
  first_contact_at TIMESTAMPTZ,
  crm_setup_at TIMESTAMPTZ,
  saved_search_at TIMESTAMPTZ,
  first_deal_at TIMESTAMPTZ,

  -- Onboarding status
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_skipped BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- =====================================================
-- 5. COMPETITOR INTELLIGENCE
-- =====================================================

-- Traccia quanti utenti hanno visto/sbloccato ogni lead
CREATE TABLE IF NOT EXISTS lead_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_type VARCHAR(20) NOT NULL DEFAULT 'view', -- 'view', 'unlock'
  viewed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lead_id, user_id, view_type)
);

-- Statistiche aggregate per lead (per performance)
-- Aggiornato via trigger o cron
ALTER TABLE leads ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS unlock_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_unlocked_at TIMESTAMPTZ;

-- =====================================================
-- 6. INDEXES PER PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(is_active, alert_enabled);
CREATE INDEX IF NOT EXISTS idx_saved_search_matches_search ON saved_search_matches(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_user ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_views_lead ON lead_views(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_views_user ON lead_views(user_id);

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Funzione per aggiornare streak utente
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  last_date DATE;
  current_date_val DATE := CURRENT_DATE;
BEGIN
  -- Ottieni l'ultima data di attività
  SELECT last_activity_date INTO last_date
  FROM user_gamification
  WHERE user_id = NEW.user_id;

  IF last_date IS NULL THEN
    -- Prima attività
    INSERT INTO user_gamification (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (NEW.user_id, 1, 1, current_date_val)
    ON CONFLICT (user_id) DO UPDATE SET
      current_streak = 1,
      longest_streak = GREATEST(user_gamification.longest_streak, 1),
      last_activity_date = current_date_val,
      updated_at = NOW();
  ELSIF last_date = current_date_val - INTERVAL '1 day' THEN
    -- Giorno consecutivo
    UPDATE user_gamification SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_activity_date = current_date_val,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF last_date < current_date_val - INTERVAL '1 day' THEN
    -- Streak interrotto
    UPDATE user_gamification SET
      current_streak = 1,
      last_activity_date = current_date_val,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  -- Se last_date = current_date_val, non fare nulla (già aggiornato oggi)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare contatori lead
CREATE OR REPLACE FUNCTION update_lead_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.view_type = 'view' THEN
    UPDATE leads SET
      view_count = view_count + 1,
      first_seen_at = COALESCE(first_seen_at, NOW())
    WHERE id = NEW.lead_id;
  ELSIF NEW.view_type = 'unlock' THEN
    UPDATE leads SET
      unlock_count = unlock_count + 1,
      last_unlocked_at = NOW()
    WHERE id = NEW.lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per contatori lead
DROP TRIGGER IF EXISTS trigger_update_lead_counters ON lead_views;
CREATE TRIGGER trigger_update_lead_counters
  AFTER INSERT ON lead_views
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_counters();

-- Funzione per calcolare progress onboarding
CREATE OR REPLACE FUNCTION calculate_onboarding_progress(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_steps INTEGER := 6;
  completed_steps INTEGER := 0;
  onb RECORD;
BEGIN
  SELECT * INTO onb FROM user_onboarding WHERE user_id = p_user_id;

  IF onb IS NULL THEN
    RETURN 0;
  END IF;

  IF onb.completed_profile THEN completed_steps := completed_steps + 1; END IF;
  IF onb.completed_first_unlock THEN completed_steps := completed_steps + 1; END IF;
  IF onb.completed_first_contact THEN completed_steps := completed_steps + 1; END IF;
  IF onb.completed_crm_setup THEN completed_steps := completed_steps + 1; END IF;
  IF onb.completed_saved_search THEN completed_steps := completed_steps + 1; END IF;
  IF onb.completed_first_deal THEN completed_steps := completed_steps + 1; END IF;

  RETURN (completed_steps * 100) / total_steps;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_search_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_views ENABLE ROW LEVEL SECURITY;

-- Policies per notification_preferences
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies per saved_searches
CREATE POLICY "Users can view own saved searches" ON saved_searches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Policies per saved_search_matches
CREATE POLICY "Users can view own saved search matches" ON saved_search_matches
  FOR SELECT USING (
    saved_search_id IN (SELECT id FROM saved_searches WHERE user_id = auth.uid())
  );

-- Policies per gamification
CREATE POLICY "Users can view own gamification" ON user_gamification
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Policies per onboarding
CREATE POLICY "Users can view own onboarding" ON user_onboarding
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies per lead_views
CREATE POLICY "Users can view lead stats" ON lead_views
  FOR SELECT USING (true); -- Tutti possono vedere le statistiche aggregate
CREATE POLICY "Users can insert own lead views" ON lead_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 9. INIT DATA PER UTENTI ESISTENTI
-- =====================================================

-- Crea record gamification per utenti esistenti
INSERT INTO user_gamification (user_id, created_at)
SELECT id, NOW() FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_gamification)
ON CONFLICT DO NOTHING;

-- Crea record onboarding per utenti esistenti
INSERT INTO user_onboarding (user_id, created_at)
SELECT id, NOW() FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_onboarding)
ON CONFLICT DO NOTHING;

-- Crea preferenze notifiche per utenti esistenti
INSERT INTO notification_preferences (user_id, created_at)
SELECT id, NOW() FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT DO NOTHING;
