-- =====================================================
-- MIGRATION: Team Management & Public API
-- Data: 2026-01-24
-- Funzionalità: Teams, Lead assignments, API Keys,
--               Webhooks, Activity logs
-- =====================================================

-- =====================================================
-- 1. TABELLA TEAMS
-- =====================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan info (inherited from owner)
  plan VARCHAR(50) DEFAULT 'agency',
  max_members INTEGER DEFAULT 5,

  -- Settings
  logo_url TEXT,
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. TABELLA TEAM MEMBERS
-- =====================================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role & Permissions
  role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
  can_view_all_leads BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  can_invite BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended'

  -- Timestamps
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);

-- =====================================================
-- 3. TABELLA TEAM INVITATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Invitation details
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',

  -- Invited by
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token per accettare l'invito
  token VARCHAR(100) NOT NULL UNIQUE,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,

  UNIQUE(team_id, email)
);

-- =====================================================
-- 4. TABELLA LEAD ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Assignment details
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Note
  note TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'transferred'

  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Solo un assignment attivo per lead
  UNIQUE(lead_id) -- Un lead può essere assegnato a una sola persona alla volta
);

-- =====================================================
-- 5. TABELLA API KEYS
-- =====================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Key details
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(64) NOT NULL, -- SHA256 hash della key
  key_prefix VARCHAR(12) NOT NULL, -- Primi 8 caratteri per identificazione

  -- Permissions
  permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb,

  -- Rate limiting
  rate_limit INTEGER DEFAULT 100, -- requests per minute

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- =====================================================
-- 6. TABELLA WEBHOOKS
-- =====================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Webhook config
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(100), -- Per HMAC signature

  -- Events to trigger
  events TEXT[] DEFAULT ARRAY['lead.unlocked', 'crm.status_changed'],

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. TABELLA WEBHOOK DELIVERIES (Logs)
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,

  -- Response
  status_code INTEGER,
  response_body TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
  attempts INTEGER DEFAULT 0,

  -- Timestamps
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- =====================================================
-- 8. TABELLA API LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Request details
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,

  -- Response
  status_code INTEGER,
  response_time_ms INTEGER,

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. TABELLA TEAM ACTIVITY LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS team_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity details
  action VARCHAR(50) NOT NULL, -- 'lead_assigned', 'lead_contacted', 'deal_won', 'member_invited', etc.
  entity_type VARCHAR(50), -- 'lead', 'member', 'settings'
  entity_id UUID,

  -- Additional data
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. AGGIUNGI COLONNE A LEADS PER ASSIGNMENT
-- =====================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- =====================================================
-- 11. AGGIUNGI COLONNE A USERS PER TEAM
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_team_id UUID REFERENCES teams(id);

-- =====================================================
-- 12. INDEXES PER PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_assigned_to ON lead_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_team ON lead_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_key ON api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_activity_team ON team_activity_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_user ON team_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_team_id ON leads(team_id);

-- =====================================================
-- 13. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies per teams
CREATE POLICY "Team owners can manage their teams" ON teams
  FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Team members can view their teams" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Policies per team_members
CREATE POLICY "Team admins can manage members" ON team_members
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );
CREATE POLICY "Users can view their own membership" ON team_members
  FOR SELECT USING (user_id = auth.uid());

-- Policies per team_invitations
CREATE POLICY "Team admins can manage invitations" ON team_invitations
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );
CREATE POLICY "Invited users can view their invitations" ON team_invitations
  FOR SELECT USING (
    email IN (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policies per lead_assignments
CREATE POLICY "Team members can view assignments" ON lead_assignments
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR assigned_to = auth.uid()
    OR assigned_by = auth.uid()
  );
CREATE POLICY "Team admins can manage assignments" ON lead_assignments
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR assigned_by = auth.uid()
  );

-- Policies per api_keys
CREATE POLICY "Users can manage own API keys" ON api_keys
  FOR ALL USING (user_id = auth.uid());

-- Policies per webhooks
CREATE POLICY "Users can manage own webhooks" ON webhooks
  FOR ALL USING (user_id = auth.uid());

-- Policies per webhook_deliveries
CREATE POLICY "Users can view own webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM webhooks WHERE user_id = auth.uid())
  );

-- Policies per api_logs
CREATE POLICY "Users can view own API logs" ON api_logs
  FOR SELECT USING (user_id = auth.uid());

-- Policies per team_activity_logs
CREATE POLICY "Team members can view activity" ON team_activity_logs
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Team members can insert activity" ON team_activity_logs
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- =====================================================
-- 14. FUNCTIONS
-- =====================================================

-- Funzione per creare un team automaticamente quando un utente diventa agency
CREATE OR REPLACE FUNCTION create_team_for_agency_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan = 'agency' AND OLD.plan != 'agency' THEN
    -- Crea il team
    INSERT INTO teams (name, owner_id, plan, max_members)
    VALUES (
      'My Team',
      NEW.id,
      'agency',
      10
    )
    ON CONFLICT DO NOTHING;

    -- Aggiungi l'owner come membro
    INSERT INTO team_members (
      team_id,
      user_id,
      role,
      can_view_all_leads,
      can_export,
      can_delete,
      can_invite,
      can_manage_settings
    )
    SELECT
      t.id,
      NEW.id,
      'owner',
      true,
      true,
      true,
      true,
      true
    FROM teams t
    WHERE t.owner_id = NEW.id
    ON CONFLICT DO NOTHING;

    -- Aggiorna current_team_id
    UPDATE users SET current_team_id = (
      SELECT id FROM teams WHERE owner_id = NEW.id LIMIT 1
    ) WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per creare team automaticamente
DROP TRIGGER IF EXISTS trigger_create_team_for_agency ON users;
CREATE TRIGGER trigger_create_team_for_agency
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_team_for_agency_user();

-- Funzione per generare API key
CREATE OR REPLACE FUNCTION generate_api_key(
  p_user_id UUID,
  p_name VARCHAR(100),
  p_permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb
)
RETURNS TABLE(key TEXT, key_id UUID) AS $$
DECLARE
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_key_prefix VARCHAR(12);
  v_key_id UUID;
BEGIN
  -- Genera una key random
  v_raw_key := 'cs_' || encode(gen_random_bytes(32), 'hex');
  v_key_hash := encode(sha256(v_raw_key::bytea), 'hex');
  v_key_prefix := substring(v_raw_key, 1, 12);

  -- Inserisci nel database
  INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions)
  VALUES (p_user_id, p_name, v_key_hash, v_key_prefix, p_permissions)
  RETURNING id INTO v_key_id;

  RETURN QUERY SELECT v_raw_key, v_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per validare API key
CREATE OR REPLACE FUNCTION validate_api_key(p_key TEXT)
RETURNS TABLE(
  user_id UUID,
  permissions JSONB,
  rate_limit INTEGER
) AS $$
DECLARE
  v_key_hash TEXT;
BEGIN
  v_key_hash := encode(sha256(p_key::bytea), 'hex');

  RETURN QUERY
  SELECT
    ak.user_id,
    ak.permissions,
    ak.rate_limit
  FROM api_keys ak
  WHERE ak.key_hash = v_key_hash
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
    AND ak.revoked_at IS NULL;

  -- Aggiorna last_used_at e total_requests
  UPDATE api_keys
  SET last_used_at = NOW(), total_requests = total_requests + 1
  WHERE key_hash = v_key_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per log activity team
CREATE OR REPLACE FUNCTION log_team_activity(
  p_team_id UUID,
  p_user_id UUID,
  p_action VARCHAR(50),
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO team_activity_logs (team_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_team_id, p_user_id, p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 15. INIT DATA
-- =====================================================

-- Crea teams per utenti agency esistenti
INSERT INTO teams (name, owner_id, plan, max_members)
SELECT
  COALESCE(u.email, 'Agency') || '''s Team',
  u.id,
  'agency',
  10
FROM users u
WHERE u.plan = 'agency'
AND u.id NOT IN (SELECT owner_id FROM teams)
ON CONFLICT DO NOTHING;

-- Aggiungi owners come membri dei loro team
INSERT INTO team_members (team_id, user_id, role, can_view_all_leads, can_export, can_delete, can_invite, can_manage_settings)
SELECT
  t.id,
  t.owner_id,
  'owner',
  true,
  true,
  true,
  true,
  true
FROM teams t
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = t.owner_id
)
ON CONFLICT DO NOTHING;

-- Aggiorna current_team_id per owners
UPDATE users u
SET current_team_id = t.id
FROM teams t
WHERE t.owner_id = u.id
AND u.current_team_id IS NULL;

