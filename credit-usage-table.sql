-- Tabella per tracciare l'uso dei crediti
-- Usata per audit e analytics

CREATE TABLE IF NOT EXISTS credit_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'lead_unlock', 'site_visit', 'csv_export', etc.
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- collegamento al lead specifico
  credits_consumed INTEGER NOT NULL DEFAULT 1,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON credit_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_usage_action ON credit_usage_log(action);
CREATE INDEX IF NOT EXISTS idx_credit_usage_lead_id ON credit_usage_log(lead_id);

-- RLS Policy per credit_usage_log
ALTER TABLE credit_usage_log ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono vedere solo i propri log
CREATE POLICY "Users can view own credit usage" ON credit_usage_log
  FOR SELECT USING (auth.uid() = user_id);

-- Solo il sistema può inserire i log (tramite service role)
CREATE POLICY "System can insert credit usage" ON credit_usage_log
  FOR INSERT WITH CHECK (true);

-- Commenti per documentazione
COMMENT ON TABLE credit_usage_log IS 'Log dell\'utilizzo dei crediti per audit e analytics';
COMMENT ON COLUMN credit_usage_log.action IS 'Tipo di azione: lead_unlock, site_visit, monthly_recharge, plan_upgrade, etc.';
COMMENT ON COLUMN credit_usage_log.lead_id IS 'ID del lead associato all\'azione (se applicabile)';
COMMENT ON COLUMN credit_usage_log.credits_consumed IS 'Numero di crediti consumati (positivo) o aggiunti (negativo per ricariche)';
COMMENT ON COLUMN credit_usage_log.credits_remaining IS 'Crediti rimanenti dopo questa azione';
