-- Tabella per tracciare i lead sbloccati per ogni utente
-- Risolve il problema dei lead che si ri-nascondono al refresh

CREATE TABLE IF NOT EXISTS user_unlocked_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  billing_cycle_start DATE, -- per invalidare lead sbloccati nel ciclo precedente
  UNIQUE(user_id, lead_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_user_unlocked_leads_user_id ON user_unlocked_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_leads_lead_id ON user_unlocked_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_leads_cycle ON user_unlocked_leads(user_id, billing_cycle_start);

-- RLS Policy
ALTER TABLE user_unlocked_leads ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono vedere solo i propri lead sbloccati
CREATE POLICY "Users can view own unlocked leads" ON user_unlocked_leads
  FOR SELECT USING (auth.uid() = user_id);

-- Gli utenti possono inserire solo i propri lead sbloccati
CREATE POLICY "Users can insert own unlocked leads" ON user_unlocked_leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Funzione per ottenere i lead sbloccati di un utente nel ciclo corrente
CREATE OR REPLACE FUNCTION get_user_unlocked_leads(p_user_id UUID)
RETURNS TABLE(lead_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT ul.lead_id
    FROM user_unlocked_leads ul
    JOIN users u ON ul.user_id = u.id
    WHERE ul.user_id = p_user_id
    AND (ul.billing_cycle_start IS NULL OR ul.billing_cycle_start >= u.billing_cycle_start);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per sbloccare un lead per un utente
CREATE OR REPLACE FUNCTION unlock_lead_for_user(p_user_id UUID, p_lead_id UUID)
RETURNS VOID AS $$
DECLARE
    user_cycle_start DATE;
BEGIN
    -- Ottieni il ciclo di fatturazione dell'utente
    SELECT billing_cycle_start INTO user_cycle_start FROM users WHERE id = p_user_id;
    
    -- Inserisci il lead sbloccato (UPSERT)
    INSERT INTO user_unlocked_leads (user_id, lead_id, billing_cycle_start)
    VALUES (p_user_id, p_lead_id, user_cycle_start)
    ON CONFLICT (user_id, lead_id) 
    DO UPDATE SET 
        unlocked_at = now(),
        billing_cycle_start = user_cycle_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commenti per documentazione
COMMENT ON TABLE user_unlocked_leads IS 'Traccia quali lead sono stati sbloccati da ogni utente';
COMMENT ON COLUMN user_unlocked_leads.billing_cycle_start IS 'Ciclo di fatturazione quando il lead è stato sbloccato';
COMMENT ON FUNCTION get_user_unlocked_leads(UUID) IS 'Restituisce i lead sbloccati da un utente nel ciclo corrente';
COMMENT ON FUNCTION unlock_lead_for_user(UUID, UUID) IS 'Sblocca un lead per un utente specifico';
