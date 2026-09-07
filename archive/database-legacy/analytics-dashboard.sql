-- Analytics Dashboard Database Schema
-- Tabelle per tracking eventi, conversioni e metriche di successo

-- Tabella eventi analytics
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL, -- lead_viewed, lead_contacted, lead_converted, plan_upgraded
  lead_id UUID REFERENCES leads(id),
  metadata JSONB DEFAULT '{}',
  value DECIMAL(10,2), -- valore monetario dell'evento se applicabile
  created_at TIMESTAMP DEFAULT now()
);

-- Tabella conversioni per ROI tracking
CREATE TABLE IF NOT EXISTS lead_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) UNIQUE,
  user_id UUID REFERENCES users(id),
  conversion_type TEXT NOT NULL, -- contacted, proposal_sent, deal_closed
  conversion_value DECIMAL(10,2), -- valore del contratto/deal
  conversion_date TIMESTAMP DEFAULT now(),
  time_to_conversion_hours INTEGER, -- ore dalla creazione lead alla conversione
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabella per tracking geografico
CREATE TABLE IF NOT EXISTS lead_geography (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'IT',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  geocoded_at TIMESTAMP DEFAULT now()
);

-- Vista materializzata per performance analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(DISTINCT CASE WHEN origin = 'manual' THEN id END) as manual_leads,
  COUNT(DISTINCT CASE WHEN origin = 'scraping' THEN id END) as scraped_leads,
  AVG(score) as avg_score,
  COUNT(DISTINCT CASE WHEN needed_roles @> ARRAY['developer'] THEN id END) as developer_leads,
  COUNT(DISTINCT CASE WHEN needed_roles @> ARRAY['seo'] THEN id END) as seo_leads,
  COUNT(DISTINCT CASE WHEN needed_roles @> ARRAY['designer'] THEN id END) as designer_leads,
  COUNT(DISTINCT CASE WHEN needed_roles @> ARRAY['social'] THEN id END) as social_leads,
  COUNT(DISTINCT CASE WHEN needed_roles @> ARRAY['gdpr'] THEN id END) as gdpr_leads
FROM leads
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at);

-- Vista per conversioni per ruolo
CREATE MATERIALIZED VIEW IF NOT EXISTS conversion_by_role AS
SELECT 
  role_needed,
  COUNT(*) as total_leads,
  COUNT(DISTINCT lc.lead_id) as converted_leads,
  ROUND(
    (COUNT(DISTINCT lc.lead_id)::DECIMAL / COUNT(*)) * 100, 2
  ) as conversion_rate_percent,
  AVG(lc.conversion_value) as avg_deal_value,
  AVG(lc.time_to_conversion_hours) as avg_hours_to_conversion
FROM (
  SELECT id as lead_id, unnest(needed_roles) as role_needed 
  FROM leads 
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
) l
LEFT JOIN lead_conversions lc ON l.lead_id = lc.lead_id
GROUP BY role_needed;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_date ON analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_conversions_user ON lead_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_geography_city ON lead_geography(city);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_needed_roles_gin ON leads USING GIN(needed_roles);

-- Funzione per refresh automatico viste materializzate
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW analytics_summary;
  REFRESH MATERIALIZED VIEW conversion_by_role;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_geography ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own analytics
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own conversions" ON lead_conversions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own conversions" ON lead_conversions
  FOR ALL USING (user_id = auth.uid());

-- Admin può vedere tutto
CREATE POLICY "Admins can view all analytics" ON analytics_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all conversions" ON lead_conversions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Trigger per aggiornare viste materializzate
CREATE OR REPLACE FUNCTION trigger_refresh_analytics()
RETURNS trigger AS $$
BEGIN
  -- Refresh in background (non blocking)
  PERFORM pg_notify('refresh_analytics', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_analytics_on_lead_change
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_analytics();

CREATE TRIGGER refresh_analytics_on_conversion_change
  AFTER INSERT OR UPDATE OR DELETE ON lead_conversions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_analytics();

CREATE TRIGGER refresh_analytics_on_event_change
  AFTER INSERT OR UPDATE OR DELETE ON analytics_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_analytics();

-- Commenti per documentazione
COMMENT ON TABLE analytics_events IS 'Eventi di tracking per analytics dashboard';
COMMENT ON TABLE lead_conversions IS 'Conversioni lead per calcolo ROI';
COMMENT ON TABLE lead_geography IS 'Dati geografici per heatmap';
COMMENT ON MATERIALIZED VIEW analytics_summary IS 'Vista aggregata per dashboard performance';
COMMENT ON MATERIALIZED VIEW conversion_by_role IS 'Conversioni aggregate per ruolo professionale';
