-- Aggiunta colonne per gestione corretta cancellazione abbonamento
-- Usato per: Tracciare cancellazioni programmate e date di fine accesso
-- Schema: users table con nuovi campi per gestione Stripe

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deactivation_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_users_deactivation_scheduled 
ON users(deactivation_scheduled_at) 
WHERE deactivation_scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_subscription_end 
ON users(subscription_end_date) 
WHERE subscription_end_date IS NOT NULL;

-- Commenti per documentazione
COMMENT ON COLUMN users.deactivation_scheduled_at IS 'Timestamp quando l utente ha richiesto la cancellazione del piano';
COMMENT ON COLUMN users.subscription_end_date IS 'Data di fine del periodo già pagato su Stripe';

-- Test: Mostra struttura aggiornata
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('deactivation_scheduled_at', 'subscription_end_date', 'stripe_subscription_id');
