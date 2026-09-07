-- ============================================================================
-- Tool Usage Rate Limiting System
-- Tabella e funzioni per rate limiting dei tool pubblici basato su piano utente
--
-- Limiti per piano (per tool, per giorno):
--   - Non registrato/Free: 2
--   - Starter: 10
--   - Pro: 25
--   - Agency: illimitato
-- ============================================================================

-- Tabella per tracking utilizzo tool pubblici
CREATE TABLE IF NOT EXISTS public.tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificazione: user_id se loggato, altrimenti solo IP
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,

  -- Tool utilizzato
  tool_name TEXT NOT NULL CHECK (tool_name IN (
    'public-scan',
    'seo-checker',
    'tech-detector',
    'security-check',
    'accessibility-check'
  )),

  -- Dati utilizzo
  website_url TEXT,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_timestamp TIMESTAMP DEFAULT NOW(),

  -- Metadata
  user_agent TEXT,

  -- Piano al momento dell'utilizzo (per analytics)
  plan_at_usage TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indice per ricerca utente autenticato + tool + data
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_date
  ON tool_usage(user_id, tool_name, usage_date)
  WHERE user_id IS NOT NULL;

-- Indice per ricerca IP anonimo + tool + data
CREATE INDEX IF NOT EXISTS idx_tool_usage_ip_date
  ON tool_usage(ip_address, tool_name, usage_date);

-- Indice per pulizia e analytics per data
CREATE INDEX IF NOT EXISTS idx_tool_usage_date
  ON tool_usage(usage_date);

-- Indice per analytics per tool
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool
  ON tool_usage(tool_name);

COMMENT ON TABLE tool_usage IS 'Tracking utilizzo tool pubblici per rate limiting unificato';
COMMENT ON COLUMN tool_usage.user_id IS 'User ID se autenticato, NULL se anonimo';
COMMENT ON COLUMN tool_usage.plan_at_usage IS 'Piano utente al momento utilizzo per analytics storiche';

-- ============================================================================
-- RPC: Verifica limite giornaliero per tool
-- Supporta sia utenti autenticati che anonimi
-- ============================================================================
CREATE OR REPLACE FUNCTION check_tool_daily_limit(
  p_tool_name TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(
  current_usage INTEGER,
  daily_limit INTEGER,
  remaining INTEGER,
  is_unlimited BOOLEAN,
  can_use BOOLEAN
) AS $$
DECLARE
  v_usage_count INTEGER;
  v_user_plan TEXT;
  v_user_status TEXT;
  v_daily_limit INTEGER;
  v_is_unlimited BOOLEAN := FALSE;
  v_base_plan TEXT;
BEGIN
  -- Se user_id fornito, verifica il piano dell'utente
  IF p_user_id IS NOT NULL THEN
    SELECT plan, status INTO v_user_plan, v_user_status
    FROM users
    WHERE id = p_user_id;

    -- Se utente inattivo o non trovato, tratta come anonimo
    IF v_user_status IS DISTINCT FROM 'active' OR v_user_plan IS NULL THEN
      v_user_plan := NULL;
      p_user_id := NULL;
    END IF;
  END IF;

  -- Determina limite in base al piano
  IF v_user_plan IS NOT NULL THEN
    -- Estrai piano base (rimuovi _monthly/_annual)
    v_base_plan := REPLACE(REPLACE(v_user_plan, '_monthly', ''), '_annual', '');

    CASE v_base_plan
      WHEN 'agency' THEN
        v_is_unlimited := TRUE;
        v_daily_limit := -1; -- -1 indica illimitato
      WHEN 'pro' THEN
        v_daily_limit := 25;
      WHEN 'starter' THEN
        v_daily_limit := 10;
      ELSE -- 'free' o altri
        v_daily_limit := 2;
    END CASE;
  ELSE
    -- Utente anonimo
    v_daily_limit := 2;
  END IF;

  -- Se illimitato, ritorna subito
  IF v_is_unlimited THEN
    RETURN QUERY SELECT 0::INTEGER, -1::INTEGER, -1::INTEGER, TRUE, TRUE;
    RETURN;
  END IF;

  -- Conta utilizzi di oggi
  IF p_user_id IS NOT NULL THEN
    -- Utente autenticato: conta per user_id
    SELECT COUNT(*)::INTEGER INTO v_usage_count
    FROM tool_usage
    WHERE user_id = p_user_id
      AND tool_name = p_tool_name
      AND usage_date = CURRENT_DATE;
  ELSE
    -- Utente anonimo: conta per IP (solo record senza user_id)
    SELECT COUNT(*)::INTEGER INTO v_usage_count
    FROM tool_usage
    WHERE ip_address = p_ip_address
      AND user_id IS NULL
      AND tool_name = p_tool_name
      AND usage_date = CURRENT_DATE;
  END IF;

  RETURN QUERY SELECT
    v_usage_count,
    v_daily_limit,
    GREATEST(0, v_daily_limit - v_usage_count),
    FALSE,
    v_usage_count < v_daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_tool_daily_limit IS 'Verifica limite giornaliero tool per utente/IP con supporto piani';

-- ============================================================================
-- RPC: Registra utilizzo tool
-- ============================================================================
CREATE OR REPLACE FUNCTION log_tool_usage(
  p_tool_name TEXT,
  p_ip_address INET,
  p_website_url TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_plan_at_usage TEXT;
BEGIN
  -- Ottieni piano corrente se user_id fornito
  IF p_user_id IS NOT NULL THEN
    SELECT plan INTO v_plan_at_usage
    FROM users
    WHERE id = p_user_id;
  END IF;

  INSERT INTO tool_usage (
    user_id,
    ip_address,
    tool_name,
    website_url,
    user_agent,
    plan_at_usage
  ) VALUES (
    p_user_id,
    p_ip_address,
    p_tool_name,
    p_website_url,
    p_user_agent,
    v_plan_at_usage
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_tool_usage IS 'Registra utilizzo tool con tracking piano';

-- ============================================================================
-- Funzione di pulizia per record vecchi (>30 giorni)
-- Da eseguire periodicamente via cron o scheduled function
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_tool_usage()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM tool_usage
  WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_tool_usage IS 'Rimuove record tool_usage piu vecchi di 30 giorni';

-- ============================================================================
-- Query utili per analytics/debug
-- ============================================================================

-- Utilizzi di oggi raggruppati per tool
-- SELECT tool_name, COUNT(*) as usage_count
-- FROM tool_usage
-- WHERE usage_date = CURRENT_DATE
-- GROUP BY tool_name;

-- Utilizzi per utente specifico oggi
-- SELECT tool_name, COUNT(*)
-- FROM tool_usage
-- WHERE user_id = 'UUID_UTENTE' AND usage_date = CURRENT_DATE
-- GROUP BY tool_name;

-- Utilizzi per IP anonimo oggi
-- SELECT tool_name, COUNT(*)
-- FROM tool_usage
-- WHERE ip_address = '192.168.1.1'::INET AND user_id IS NULL AND usage_date = CURRENT_DATE
-- GROUP BY tool_name;

-- Top 10 utenti per utilizzo
-- SELECT user_id, COUNT(*) as total_usage
-- FROM tool_usage
-- WHERE user_id IS NOT NULL AND usage_date >= CURRENT_DATE - INTERVAL '7 days'
-- GROUP BY user_id
-- ORDER BY total_usage DESC
-- LIMIT 10;
