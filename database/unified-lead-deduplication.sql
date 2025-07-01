-- Aggiornamento schema database per sistema unificato di deduplicazione lead
-- Supporta multiple fonti e arricchimento cross-source  
-- VERSIONE SICURA: gestisce duplicati esistenti prima della migrazione

-- 0. Installa estensioni necessarie per funzioni di similarità
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Crea tabella per log delle operazioni di merge (prima di usarla)
CREATE TABLE IF NOT EXISTS merge_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_lead_id UUID NOT NULL,
  secondary_lead_id UUID NULL,
  merged_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- 2. Aggiungi colonna sources per tracciare fonti multiple
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS sources TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Popola sources per lead esistenti (prima di fare deduplicazione)
UPDATE leads 
SET sources = CASE 
  WHEN source = 'google_maps' THEN ARRAY['google_maps']
  WHEN source = 'manual_scan' THEN ARRAY['manual_scan']  
  WHEN source LIKE '%pagine%' THEN ARRAY['pagine_gialle']
  ELSE ARRAY[COALESCE(source, 'unknown')]
END
WHERE sources = ARRAY[]::TEXT[] OR sources IS NULL;

-- 4. Crea colonna temporanea per nuovo unique_key
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS new_unique_key TEXT;

-- 5. Popola la nuova colonna con unique_key universali
UPDATE leads 
SET new_unique_key = 'universal_' || 
  LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(business_name || '_' || COALESCE(city, 'unknown'), '[^a-zA-Z0-9]', '_', 'g'),
    '_+', '_', 'g'
  ))
WHERE new_unique_key IS NULL;

-- 6. Identifica e risolve duplicati PRIMA di applicare il constraint
DO $$ 
DECLARE
    duplicate_record RECORD;
    keep_id UUID;
    duplicate_ids UUID[];
    merged_sources TEXT[];
BEGIN
    RAISE NOTICE 'Inizio processo di merge duplicati...';
    
    -- Per ogni gruppo di duplicati
    FOR duplicate_record IN 
        SELECT new_unique_key, array_agg(id ORDER BY created_at) as ids
        FROM leads 
        WHERE new_unique_key IS NOT NULL
        GROUP BY new_unique_key 
        HAVING COUNT(*) > 1
    LOOP
        -- Tieni il primo (più vecchio) e raccogli gli altri
        keep_id := duplicate_record.ids[1];
        duplicate_ids := duplicate_record.ids[2:];
        
        -- Raccogli tutte le fonti uniche
        SELECT array_agg(DISTINCT unnest_sources)
        INTO merged_sources
        FROM (
            SELECT unnest(sources) as unnest_sources
            FROM leads 
            WHERE id = ANY(duplicate_record.ids)
            AND sources IS NOT NULL
        ) t
        WHERE unnest_sources IS NOT NULL;
        
        -- Merge dei dati nel lead principale
        UPDATE leads 
        SET 
            -- Unisci le fonti
            sources = COALESCE(merged_sources, sources, ARRAY['unknown']),
            
            -- Aggiorna campi vuoti con dati dai duplicati  
            website_url = COALESCE(
                NULLIF(website_url, ''),
                (SELECT website_url FROM leads WHERE id = ANY(duplicate_ids) AND website_url IS NOT NULL AND website_url != '' LIMIT 1)
            ),
            phone = COALESCE(
                NULLIF(phone, ''),
                (SELECT phone FROM leads WHERE id = ANY(duplicate_ids) AND phone IS NOT NULL AND phone != '' LIMIT 1)
            ),
            email = COALESCE(
                NULLIF(email, ''),
                (SELECT email FROM leads WHERE id = ANY(duplicate_ids) AND email IS NOT NULL AND email != '' LIMIT 1)
            ),
            address = COALESCE(
                NULLIF(address, ''),
                (SELECT address FROM leads WHERE id = ANY(duplicate_ids) AND address IS NOT NULL AND address != '' LIMIT 1)
            ),
            
            -- Prendi il punteggio migliore
            score = GREATEST(
                COALESCE(score, 0),
                COALESCE((SELECT MAX(score) FROM leads WHERE id = ANY(duplicate_ids)), 0)
            ),
            
            updated_at = NOW()
        WHERE id = keep_id;
        
        -- Log dell'operazione
        INSERT INTO merge_logs (primary_lead_id, notes, merged_at)
        VALUES (keep_id, 'Auto-merge during schema migration: ' || duplicate_record.new_unique_key || ' (merged ' || array_length(duplicate_ids, 1) || ' duplicates)', NOW());
        
        -- Elimina i duplicati
        DELETE FROM leads WHERE id = ANY(duplicate_ids);
        
        RAISE NOTICE 'Merged % duplicates for key: %', array_length(duplicate_ids, 1), duplicate_record.new_unique_key;
    END LOOP;
    
    RAISE NOTICE 'Processo di merge completato.';
END $$;

-- 7. Ora applica il nuovo unique_key senza conflitti
UPDATE leads 
SET unique_key = new_unique_key
WHERE new_unique_key IS NOT NULL;

-- 8. Rimuovi la colonna temporanea
ALTER TABLE leads DROP COLUMN IF EXISTS new_unique_key;

-- 9. Crea indici per performance delle query di deduplicazione
CREATE INDEX IF NOT EXISTS idx_leads_business_name_city 
ON leads USING gin(to_tsvector('simple', business_name || ' ' || COALESCE(city, '')));

CREATE INDEX IF NOT EXISTS idx_leads_website_domain 
ON leads (SUBSTRING(website_url FROM 'https?://(?:www\.)?([^/]+)')) 
WHERE website_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized 
ON leads (REGEXP_REPLACE(phone, '[^\d]', '', 'g'))
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_sources 
ON leads USING gin(sources);

CREATE INDEX IF NOT EXISTS idx_leads_unique_key
ON leads (unique_key);

-- 10. Crea vista per analisi duplicate
CREATE OR REPLACE VIEW potential_duplicates AS
SELECT 
  l1.id as lead1_id,
  l1.business_name as name1,
  l1.sources as sources1,
  l2.id as lead2_id,
  l2.business_name as name2,
  l2.sources as sources2,
  l1.city,
  CASE 
    WHEN l1.website_url IS NOT NULL AND l2.website_url IS NOT NULL 
         AND SUBSTRING(l1.website_url FROM 'https?://(?:www\.)?([^/]+)') = 
             SUBSTRING(l2.website_url FROM 'https?://(?:www\.)?([^/]+)')
    THEN 'website_match'
    
    WHEN l1.phone IS NOT NULL AND l2.phone IS NOT NULL 
         AND REGEXP_REPLACE(l1.phone, '[^\d]', '', 'g') = 
             REGEXP_REPLACE(l2.phone, '[^\d]', '', 'g')
    THEN 'phone_match'
    
    WHEN SIMILARITY(l1.business_name, l2.business_name) > 0.8
    THEN 'name_similarity'
    
    ELSE 'city_match'
  END as match_type,
  
  SIMILARITY(l1.business_name, l2.business_name) as name_similarity

FROM leads l1
JOIN leads l2 ON l1.id < l2.id -- Evita duplicati nella vista
WHERE l1.city = l2.city
  AND (
    -- Match per dominio website
    (l1.website_url IS NOT NULL AND l2.website_url IS NOT NULL 
     AND SUBSTRING(l1.website_url FROM 'https?://(?:www\.)?([^/]+)') = 
         SUBSTRING(l2.website_url FROM 'https?://(?:www\.)?([^/]+)'))
    
    OR -- Match per telefono normalizzato
    (l1.phone IS NOT NULL AND l2.phone IS NOT NULL 
     AND REGEXP_REPLACE(l1.phone, '[^\d]', '', 'g') = 
         REGEXP_REPLACE(l2.phone, '[^\d]', '', 'g'))
         
    OR -- Match per nome simile
    SIMILARITY(l1.business_name, l2.business_name) > 0.8
  );

-- 11. Funzione per merge automatico di lead duplicati
CREATE OR REPLACE FUNCTION merge_duplicate_leads(
  lead1_id UUID,
  lead2_id UUID,
  keep_lead_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  primary_lead_id UUID;
  secondary_lead_id UUID;
  merged_data RECORD;
BEGIN
  -- Determina quale lead tenere
  IF keep_lead_id IS NOT NULL THEN
    primary_lead_id := keep_lead_id;
    secondary_lead_id := CASE WHEN lead1_id = keep_lead_id THEN lead2_id ELSE lead1_id END;
  ELSE
    -- Tieni quello creato per primo
    SELECT CASE WHEN l1.created_at < l2.created_at THEN l1.id ELSE l2.id END,
           CASE WHEN l1.created_at < l2.created_at THEN l2.id ELSE l1.id END
    INTO primary_lead_id, secondary_lead_id
    FROM leads l1, leads l2 
    WHERE l1.id = lead1_id AND l2.id = lead2_id;
  END IF;

  -- Merge dei dati
  WITH merged AS (
    SELECT 
      p.id,
      COALESCE(NULLIF(s.business_name, ''), p.business_name) as business_name,
      COALESCE(NULLIF(s.website_url, ''), p.website_url) as website_url,
      COALESCE(NULLIF(s.phone, ''), p.phone) as phone,
      COALESCE(NULLIF(s.email, ''), p.email) as email,
      COALESCE(NULLIF(s.address, ''), p.address) as address,
      p.city,
      p.category,
      GREATEST(COALESCE(p.score, 0), COALESCE(s.score, 0)) as score,
      array_remove(array_cat(p.sources, s.sources), NULL) as sources,
      p.created_at,
      GREATEST(p.updated_at, s.updated_at) as updated_at,
      GREATEST(p.last_seen_at, s.last_seen_at) as last_seen_at
    FROM leads p, leads s 
    WHERE p.id = primary_lead_id AND s.id = secondary_lead_id
  )
  UPDATE leads 
  SET 
    business_name = merged.business_name,
    website_url = merged.website_url,
    phone = merged.phone,
    email = merged.email,
    address = merged.address,
    score = merged.score,
    sources = merged.sources,
    updated_at = merged.updated_at,
    last_seen_at = merged.last_seen_at
  FROM merged 
  WHERE leads.id = primary_lead_id;

  -- Elimina il lead secondario
  DELETE FROM leads WHERE id = secondary_lead_id;

  -- Log dell'operazione
  INSERT INTO merge_logs (primary_lead_id, secondary_lead_id, merged_at)
  VALUES (primary_lead_id, secondary_lead_id, NOW());

  RETURN primary_lead_id;
END;
$$ LANGUAGE plpgsql;

-- 12. Aggiorna statistiche
ANALYZE leads;

-- 13. Query per trovare potenziali duplicati attuali
SELECT 
  match_type,
  COUNT(*) as count,
  AVG(name_similarity) as avg_similarity
FROM potential_duplicates 
GROUP BY match_type
ORDER BY count DESC;

-- 14. Output informativo finale
WITH source_stats AS (
  SELECT DISTINCT unnest(sources) as source_name
  FROM leads 
  WHERE sources IS NOT NULL
)
SELECT 
  'Schema aggiornato per sistema unificato di deduplicazione lead' as status,
  (SELECT COUNT(*) FROM leads) as total_leads,
  (SELECT COUNT(*) FROM source_stats) as unique_sources,
  (SELECT COUNT(*) FROM leads WHERE array_length(sources, 1) > 1) as multi_source_leads;

-- 15. Verifica che non ci siano più duplicati unique_key
SELECT 
  'Verifica duplicati unique_key' as check_type,
  unique_key,
  COUNT(*) as duplicate_count
FROM leads 
WHERE unique_key IS NOT NULL
GROUP BY unique_key
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 16. Statistiche post-migrazione
SELECT 
  'Statistiche post-migrazione' as info,
  COUNT(*) as total_leads,
  COUNT(DISTINCT unique_key) as unique_keys,
  COUNT(*) FILTER (WHERE sources && ARRAY['google_maps']) as google_maps_leads,
  COUNT(*) FILTER (WHERE sources && ARRAY['manual_scan']) as manual_scan_leads,
  COUNT(*) FILTER (WHERE sources && ARRAY['pagine_gialle']) as pagine_gialle_leads,
  COUNT(*) FILTER (WHERE array_length(sources, 1) > 1) as multi_source_leads,
  (SELECT COUNT(*) FROM merge_logs WHERE merged_at > NOW() - INTERVAL '1 hour') as recent_merges
FROM leads;
