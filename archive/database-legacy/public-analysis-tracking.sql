-- Tabella per tracciare le analisi pubbliche per IP
-- Permette di limitare le analisi giornaliere per utenti non registrati
-- Utilizzata dal sistema di analisi pubblica freemium

-- Tabella per tracciare analisi pubbliche per IP
CREATE TABLE IF NOT EXISTS public_analysis_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  website_url TEXT NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  analysis_timestamp TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  country_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_public_analysis_ip_date ON public_analysis_usage(ip_address, analysis_date);
CREATE INDEX IF NOT EXISTS idx_public_analysis_date ON public_analysis_usage(analysis_date);

-- Funzione per verificare il limite giornaliero per IP
CREATE OR REPLACE FUNCTION check_daily_ip_limit(p_ip_address INET, p_daily_limit INTEGER DEFAULT 2)
RETURNS INTEGER AS $$
DECLARE
  daily_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO daily_count
  FROM public_analysis_usage
  WHERE ip_address = p_ip_address 
    AND analysis_date = CURRENT_DATE;
  
  RETURN daily_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per registrare una nuova analisi pubblica
CREATE OR REPLACE FUNCTION log_public_analysis(
  p_ip_address INET,
  p_website_url TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public_analysis_usage (ip_address, website_url, user_agent, country_code)
  VALUES (p_ip_address, p_website_url, p_user_agent, p_country_code)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Pulizia automatica dei record più vecchi di 30 giorni
CREATE OR REPLACE FUNCTION cleanup_old_public_analysis()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public_analysis_usage
  WHERE analysis_date < CURRENT_DATE - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Commenti per documentazione
COMMENT ON TABLE public_analysis_usage IS 'Traccia le analisi pubbliche per limitare l''uso per IP';
COMMENT ON FUNCTION check_daily_ip_limit(INET, INTEGER) IS 'Verifica quante analisi ha fatto un IP oggi';
COMMENT ON FUNCTION log_public_analysis(INET, TEXT, TEXT, TEXT) IS 'Registra una nuova analisi pubblica';
COMMENT ON FUNCTION cleanup_old_public_analysis() IS 'Pulisce i record vecchi (>30 giorni)';
