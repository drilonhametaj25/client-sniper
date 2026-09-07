-- =====================================================
-- FASE 7 (performance): indici per i filtri reali di /api/leads
-- =====================================================
-- Prima: nessun indice sul JSONB legacy `analysis` (tutti i filtri avanzati
-- facevano seq scan), ILIKE '%x%' su business_name/city senza pg_trgm,
-- nessun composito per la lista di default (status + ordinamento).
-- Con ~10-20k righe gli indici si creano in secondi: niente CONCURRENTLY.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ricerca testuale (search: business_name.ilike + city.ilike)
CREATE INDEX IF NOT EXISTS idx_leads_bname_trgm
  ON public.leads USING gin (business_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_city_trgm
  ON public.leads USING gin (city gin_trgm_ops);

-- Lista di default: status='published' + ordinamenti principali
CREATE INDEX IF NOT EXISTS idx_leads_status_created
  ON public.leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_score
  ON public.leads (status, score);

-- Filtri tecnici sul JSONB legacy (expression index sugli esatti path filtrati)
CREATE INDEX IF NOT EXISTS idx_leads_analysis_gads
  ON public.leads (((analysis -> 'tracking' ->> 'hasGoogleAds')));
CREATE INDEX IF NOT EXISTS idx_leads_analysis_fbpixel
  ON public.leads (((analysis -> 'tracking' ->> 'hasFacebookPixel')));
CREATE INDEX IF NOT EXISTS idx_leads_analysis_ssl
  ON public.leads (((analysis -> 'security' ->> 'hasSSL')));

-- Sblocchi: conteggi globali per pagina (global_unlock_count) e set utente
CREATE INDEX IF NOT EXISTS idx_uul_lead_user
  ON public.user_unlocked_leads (lead_id, user_id);

COMMIT;
