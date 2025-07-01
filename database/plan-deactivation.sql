-- Script per gestione disattivazione/riattivazione piani - TrovaMi
-- Usato per: Permettere agli utenti di sospendere temporaneamente il loro piano
-- Chiamato da: Migration script, setup database

-- Aggiungere colonne per gestione stato piano
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at);

-- Tabella per log di attivazione/disattivazione
CREATE TABLE IF NOT EXISTS plan_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('activate', 'deactivate', 'auto_reactivate')),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  triggered_by TEXT, -- 'user', 'stripe_webhook', 'admin'
  stripe_event_id TEXT, -- ID evento Stripe se applicabile
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_logs_user_id ON plan_status_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_logs_action ON plan_status_logs(action);
CREATE INDEX IF NOT EXISTS idx_plan_logs_created_at ON plan_status_logs(created_at);

-- Commenti per documentazione
COMMENT ON COLUMN users.status IS 'Stato del piano utente: active, inactive, cancelled';
COMMENT ON COLUMN users.deactivated_at IS 'Timestamp quando il piano è stato disattivato dall utente';
COMMENT ON COLUMN users.deactivation_reason IS 'Motivo della disattivazione fornito dall utente';
COMMENT ON COLUMN users.reactivated_at IS 'Timestamp dell ultima riattivazione automatica';
COMMENT ON COLUMN users.stripe_customer_id IS 'ID cliente Stripe per fatturazione';
COMMENT ON COLUMN users.stripe_subscription_id IS 'ID abbonamento Stripe attivo';

COMMENT ON TABLE plan_status_logs IS 'Log di tutte le operazioni di attivazione/disattivazione piani';

-- Aggiornare utenti esistenti con stato attivo di default
UPDATE users 
SET status = 'active' 
WHERE status IS NULL;

-- Policy RLS per plan_status_logs (se RLS è abilitato)
ALTER TABLE plan_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan logs" ON plan_status_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger per logging automatico delle modifiche stato
CREATE OR REPLACE FUNCTION log_plan_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log solo se lo status è cambiato
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO plan_status_logs (
      user_id,
      action,
      previous_status,
      new_status,
      reason,
      triggered_by
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'active' AND OLD.status != 'active' THEN 'activate'
        WHEN NEW.status = 'inactive' THEN 'deactivate'
        ELSE 'status_change'
      END,
      OLD.status,
      NEW.status,
      NEW.deactivation_reason,
      'system'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applicare trigger
DROP TRIGGER IF EXISTS trigger_log_plan_status_change ON users;
CREATE TRIGGER trigger_log_plan_status_change
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_plan_status_change();
