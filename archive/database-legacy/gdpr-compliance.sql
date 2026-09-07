-- Sistema completo GDPR e tracciamento dati per ClientSniper
-- Questo script estende il database con tabelle per conformità GDPR

-- ===== TABELLA CONSENSI GDPR =====
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL, -- per utenti non ancora registrati
    consent_type TEXT NOT NULL, -- 'marketing', 'analytics', 'functional', 'essential'
    purpose TEXT NOT NULL, -- descrizione dello scopo
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address INET, -- IP da cui è stato dato il consenso
    user_agent TEXT, -- browser/device info
    source_page TEXT, -- pagina da cui è stato dato il consenso
    legal_basis TEXT DEFAULT 'consent', -- 'consent', 'legitimate_interest', 'contract', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TABELLA LOG ATTIVITÀ GDPR =====
CREATE TABLE IF NOT EXISTS gdpr_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    activity_type TEXT NOT NULL, -- 'data_request', 'data_export', 'data_deletion', 'consent_change'
    description TEXT NOT NULL,
    request_details JSONB, -- dettagli della richiesta
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID, -- staff member che ha processato
    ip_address INET,
    user_agent TEXT
);

-- ===== TABELLA RICHIESTE CANCELLAZIONE DATI =====
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    request_type TEXT DEFAULT 'full_deletion', -- 'full_deletion', 'anonymization', 'specific_data'
    reason TEXT, -- motivo della cancellazione
    data_categories TEXT[], -- categorie di dati da cancellare
    retention_override TEXT, -- eventuali dati da mantenere per obblighi legali
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_deletion_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    verification_token TEXT, -- token per verificare identità
    verified_at TIMESTAMP WITH TIME ZONE
);

-- ===== TABELLA TRACKING COOKIES =====
CREATE TABLE IF NOT EXISTS cookie_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT, -- per utenti non registrati
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cookie_category TEXT NOT NULL, -- 'essential', 'functional', 'analytics', 'marketing'
    cookie_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    consented BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

-- ===== INDICI PER PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_email ON user_consents(email);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_activity_user_id ON gdpr_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_activity_email ON gdpr_activity_log(email);
CREATE INDEX IF NOT EXISTS idx_gdpr_activity_type ON gdpr_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_email ON data_deletion_requests(email);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_session ON cookie_consents(session_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_user ON cookie_consents(user_id);

-- ===== TRIGGER PER UPDATED_AT =====
CREATE TRIGGER update_user_consents_updated_at 
    BEFORE UPDATE ON user_consents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== RLS POLICIES =====
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view own consents" ON user_consents
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own consents
CREATE POLICY "Users can insert own consents" ON user_consents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own consents
CREATE POLICY "Users can update own consents" ON user_consents
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own GDPR activity
CREATE POLICY "Users can view own gdpr activity" ON gdpr_activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create deletion requests
CREATE POLICY "Users can create deletion requests" ON data_deletion_requests
    FOR INSERT WITH CHECK (true);

-- Users can view their deletion requests
CREATE POLICY "Users can view own deletion requests" ON data_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can manage cookie consents
CREATE POLICY "Users can manage cookie consents" ON cookie_consents
    FOR ALL USING (auth.uid() = user_id);

-- ===== FUNZIONI GDPR =====

-- Funzione per registrare consenso
CREATE OR REPLACE FUNCTION record_user_consent(
    p_user_id UUID,
    p_email TEXT,
    p_consent_type TEXT,
    p_purpose TEXT,
    p_granted BOOLEAN,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_source_page TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    consent_id UUID;
BEGIN
    INSERT INTO user_consents (
        user_id, email, consent_type, purpose, granted, 
        granted_at, ip_address, user_agent, source_page
    ) VALUES (
        p_user_id, p_email, p_consent_type, p_purpose, p_granted,
        CASE WHEN p_granted THEN NOW() ELSE NULL END,
        p_ip_address, p_user_agent, p_source_page
    ) RETURNING id INTO consent_id;
    
    -- Log attività
    INSERT INTO gdpr_activity_log (
        user_id, email, activity_type, description, ip_address, user_agent
    ) VALUES (
        p_user_id, p_email, 'consent_change',
        format('Consenso %s per %s: %s', 
               CASE WHEN p_granted THEN 'concesso' ELSE 'revocato' END,
               p_consent_type, p_purpose),
        p_ip_address, p_user_agent
    );
    
    RETURN consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per richiedere export dati
CREATE OR REPLACE FUNCTION request_data_export(
    p_user_id UUID,
    p_email TEXT,
    p_data_categories TEXT[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    request_id UUID;
BEGIN
    INSERT INTO gdpr_activity_log (
        user_id, email, activity_type, description, request_details, status
    ) VALUES (
        p_user_id, p_email, 'data_export',
        'Richiesta export dati personali',
        jsonb_build_object('categories', p_data_categories),
        'pending'
    ) RETURNING id INTO request_id;
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per richiedere cancellazione dati
CREATE OR REPLACE FUNCTION request_data_deletion(
    p_user_id UUID,
    p_email TEXT,
    p_reason TEXT DEFAULT NULL,
    p_data_categories TEXT[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    request_id UUID;
    verification_token TEXT;
BEGIN
    -- Genera token di verifica
    verification_token := encode(gen_random_bytes(32), 'hex');
    
    INSERT INTO data_deletion_requests (
        user_id, email, reason, data_categories, verification_token
    ) VALUES (
        p_user_id, p_email, p_reason, p_data_categories, verification_token
    ) RETURNING id INTO request_id;
    
    -- Log attività
    INSERT INTO gdpr_activity_log (
        user_id, email, activity_type, description, request_details
    ) VALUES (
        p_user_id, p_email, 'data_deletion',
        'Richiesta cancellazione dati',
        jsonb_build_object('reason', p_reason, 'categories', p_data_categories)
    );
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== VISTA CONSENSI ATTIVI =====
CREATE OR REPLACE VIEW active_user_consents AS
SELECT DISTINCT ON (user_id, email, consent_type)
    user_id,
    email,
    consent_type,
    purpose,
    granted,
    granted_at,
    revoked_at,
    legal_basis,
    created_at
FROM user_consents
WHERE granted = true 
  AND (revoked_at IS NULL OR revoked_at > NOW())
ORDER BY user_id, email, consent_type, created_at DESC;

-- ===== VISTA STATISTICHE GDPR =====
CREATE OR REPLACE VIEW gdpr_compliance_stats AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    consent_type,
    COUNT(*) as total_consents,
    COUNT(CASE WHEN granted THEN 1 END) as granted_consents,
    COUNT(CASE WHEN NOT granted OR revoked_at IS NOT NULL THEN 1 END) as revoked_consents,
    ROUND(
        COUNT(CASE WHEN granted THEN 1 END) * 100.0 / COUNT(*), 2
    ) as consent_rate_percentage
FROM user_consents
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at), consent_type
ORDER BY month DESC, consent_type;

-- ===== COMMENTI DOCUMENTAZIONE =====
COMMENT ON TABLE user_consents IS 'Registro consensi GDPR degli utenti per diverse finalità';
COMMENT ON TABLE gdpr_activity_log IS 'Log di tutte le attività GDPR (richieste, export, cancellazioni)';
COMMENT ON TABLE data_deletion_requests IS 'Richieste di cancellazione dati degli utenti';
COMMENT ON TABLE cookie_consents IS 'Consensi specifici per cookie e tracking';

COMMENT ON FUNCTION record_user_consent IS 'Registra un consenso utente con tracciabilità completa';
COMMENT ON FUNCTION request_data_export IS 'Gestisce richieste di export dati personali';
COMMENT ON FUNCTION request_data_deletion IS 'Gestisce richieste di cancellazione dati con verifica';

-- ===== DATI DI DEFAULT =====
-- Consensi essenziali (sempre richiesti)
INSERT INTO user_consents (user_id, email, consent_type, purpose, granted, legal_basis) 
SELECT 
    id, email, 'essential', 
    'Funzionalità essenziali del servizio (login, sicurezza, preferenze)',
    true, 'contract'
FROM auth.users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_consents 
    WHERE user_consents.user_id = auth.users.id 
    AND consent_type = 'essential'
);
