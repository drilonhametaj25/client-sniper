-- =====================================================
-- MIGRATION: Email Outreach System
-- Data: 2026-01-23
-- Funzionalità: Tracciamento email outreach, template usage,
--               open/click tracking, campagne bulk
-- =====================================================

-- =====================================================
-- 1. TABELLA PRINCIPALE OUTREACH EMAILS
-- =====================================================

CREATE TABLE IF NOT EXISTS outreach_emails (
  id VARCHAR(100) PRIMARY KEY, -- trackingId: leadId-timestamp
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Template e contenuto
  template_id VARCHAR(50) NOT NULL, -- 'cold_seo', 'cold_performance', etc.
  subject TEXT NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'

  -- Resend integration
  resend_id VARCHAR(100),

  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,

  -- Counters
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  -- Bounce info
  bounce_reason TEXT,

  -- Metadata
  campaign_id UUID, -- Per raggruppare email bulk
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CAMPAGNE BULK EMAIL
-- =====================================================

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Info campagna
  name VARCHAR(255) NOT NULL,
  template_id VARCHAR(50) NOT NULL,

  -- Contatori
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sending', 'completed', 'paused', 'cancelled'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Settings
  delay_between_emails INTEGER DEFAULT 5000, -- ms tra email
  send_from_name VARCHAR(100),
  reply_to_email VARCHAR(255)
);

-- =====================================================
-- 3. SETTINGS UTENTE PER OUTREACH
-- =====================================================

CREATE TABLE IF NOT EXISTS outreach_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dati firma
  sender_name VARCHAR(100),
  sender_company VARCHAR(100),
  sender_title VARCHAR(100),
  sender_phone VARCHAR(50),
  sender_email VARCHAR(255),
  calendar_link VARCHAR(500),

  -- Firma HTML custom
  signature_html TEXT,

  -- Limiti
  daily_send_limit INTEGER DEFAULT 50,
  emails_sent_today INTEGER DEFAULT 0,
  last_reset_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- =====================================================
-- 4. INDEXES PER PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_outreach_emails_user ON outreach_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_lead ON outreach_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_status ON outreach_emails(status);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_sent_at ON outreach_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_campaign ON outreach_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_user ON outreach_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_settings_user ON outreach_settings(user_id);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_settings ENABLE ROW LEVEL SECURITY;

-- Policies per outreach_emails
CREATE POLICY "Users can view own outreach emails" ON outreach_emails
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own outreach emails" ON outreach_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outreach emails" ON outreach_emails
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies per outreach_campaigns
CREATE POLICY "Users can view own outreach campaigns" ON outreach_campaigns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own outreach campaigns" ON outreach_campaigns
  FOR ALL USING (auth.uid() = user_id);

-- Policies per outreach_settings
CREATE POLICY "Users can view own outreach settings" ON outreach_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own outreach settings" ON outreach_settings
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 6. FUNCTIONS
-- =====================================================

-- Funzione per aggiornare statistiche campagna
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL THEN
    UPDATE outreach_campaigns SET
      sent_count = (SELECT COUNT(*) FROM outreach_emails WHERE campaign_id = NEW.campaign_id AND status != 'failed'),
      delivered_count = (SELECT COUNT(*) FROM outreach_emails WHERE campaign_id = NEW.campaign_id AND delivered_at IS NOT NULL),
      opened_count = (SELECT COUNT(*) FROM outreach_emails WHERE campaign_id = NEW.campaign_id AND opened_at IS NOT NULL),
      clicked_count = (SELECT COUNT(*) FROM outreach_emails WHERE campaign_id = NEW.campaign_id AND clicked_at IS NOT NULL),
      bounced_count = (SELECT COUNT(*) FROM outreach_emails WHERE campaign_id = NEW.campaign_id AND status = 'bounced')
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare stats campagna
DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON outreach_emails;
CREATE TRIGGER trigger_update_campaign_stats
  AFTER INSERT OR UPDATE ON outreach_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- Funzione per reset contatore giornaliero
CREATE OR REPLACE FUNCTION reset_daily_email_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset_date IS NULL OR NEW.last_reset_date < CURRENT_DATE THEN
    NEW.emails_sent_today := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per reset contatore
DROP TRIGGER IF EXISTS trigger_reset_daily_email_count ON outreach_settings;
CREATE TRIGGER trigger_reset_daily_email_count
  BEFORE UPDATE ON outreach_settings
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_email_count();

-- =====================================================
-- 7. INIT DATA
-- =====================================================

-- Crea settings outreach per utenti con piano a pagamento
INSERT INTO outreach_settings (user_id, daily_send_limit)
SELECT id,
  CASE
    WHEN plan = 'agency' THEN 200
    WHEN plan = 'pro' THEN 100
    WHEN plan = 'starter' THEN 50
    ELSE 20
  END
FROM users
WHERE plan IN ('starter', 'pro', 'agency')
AND id NOT IN (SELECT user_id FROM outreach_settings)
ON CONFLICT DO NOTHING;
