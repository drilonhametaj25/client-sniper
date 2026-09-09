-- =====================================================
-- FASE 7 (performance): indici per i filtri reali di /api/leads
-- =====================================================
-- Prima: nessun indice sul JSONB legacy `analysis` (tutti i filtri avanzati
-- facevano seq scan), ILIKE '%x%' su business_name/city senza pg_trgm,
-- nessun composito per la lista di default (status + ordinamento).
-- Con ~10-20k righe gli indici si creano in secondi: niente CONCURRENTLY.


-- NB: nessun BEGIN;/COMMIT; esplicito in questo file. L'SQL Editor di Supabase
-- avvolge gia' lo script in una transazione propria e le transazioni annidate
-- esplicite ne rompono l'esecuzione (era la causa per cui le migrazioni
-- sembravano applicate ma non lo erano). L'atomicita' e' garantita dal
-- workflow, che invoca psql con --single-transaction.

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

-- Filtri tecnici: expression index sugli ESATTI percorsi interrogati da
-- /api/leads. I percorsi sono quelli di website_analysis (formato moderno):
-- il legacy `analysis` ha 7 campi piatti e non contiene security/tracking/
-- performance, per questo i filtri "Senza SSL" e "Caricamento lento" davano
-- risultati privi di senso.
-- loadComplete e' indicizzato con la freccia SINGOLA perche' il filtro
-- confronta jsonb (numerico): con ->> sarebbe testo e l'indice non servirebbe.
CREATE INDEX IF NOT EXISTS idx_leads_wa_gads
  ON public.leads (((website_analysis -> 'tracking' ->> 'googleAdsConversion')));
CREATE INDEX IF NOT EXISTS idx_leads_wa_fbpixel
  ON public.leads (((website_analysis -> 'tracking' ->> 'facebookPixel')));
CREATE INDEX IF NOT EXISTS idx_leads_wa_ssl
  ON public.leads (((website_analysis ->> 'hasSSL')));
CREATE INDEX IF NOT EXISTS idx_leads_wa_load
  ON public.leads (((website_analysis -> 'performance' -> 'loadComplete')));

-- Sblocchi: conteggi globali per pagina (global_unlock_count) e set utente
CREATE INDEX IF NOT EXISTS idx_uul_lead_user
  ON public.user_unlocked_leads (lead_id, user_id);

