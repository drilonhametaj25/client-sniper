-- Script per resettare i lead e riavviare lo scraping delle zone
-- Utilizzato quando si aggiornano gli engine di scraping per ricominciare con dati freschi
-- Mantiene intatti: utenti, piani, pagamenti, feedback, settings
-- Resetta: lead, zone scraping, log scraping, unlocked leads degli utenti

-- ⚠️ ATTENZIONE: Questo script cancella TUTTI i lead esistenti!
-- Usare solo in sviluppo o quando si vuole ripartire da zero con nuovi algoritmi

BEGIN;

-- 1. BACKUP delle zone importanti (opzionale, per sicurezza)
CREATE TEMP TABLE backup_zones AS 
SELECT * FROM zones_to_scrape WHERE score > 50;

-- 2. RESET COMPLETO LEAD E SCRAPING
-- Cancella tutti i lead (cascata su lead_analysis)
DELETE FROM leads;

-- Cancella tutti i log di scraping
DELETE FROM scrape_logs;

-- Cancella tutti i record di lead sbloccati dagli utenti
DELETE FROM user_unlocked_leads;

-- Cancella tutti i log di uso crediti legati ai lead
DELETE FROM credit_usage_log WHERE action = 'lead_unlock';

-- 3. RESET STATO ZONE DI SCRAPING
-- Resetta tutte le zone per ripartire da zero
UPDATE zones_to_scrape SET
    last_scraped_at = NULL,
    is_scraping_now = false,
    times_scraped = 0,
    total_leads_found = 0,
    score = CASE 
        -- Mantiene score alto per zone che storicamente funzionano bene
        WHEN location_name ILIKE '%milano%' OR location_name ILIKE '%roma%' OR location_name ILIKE '%napoli%' THEN 80
        WHEN location_name ILIKE '%torino%' OR location_name ILIKE '%bologna%' OR location_name ILIKE '%firenze%' THEN 70
        WHEN location_name ILIKE '%palermo%' OR location_name ILIKE '%bari%' OR location_name ILIKE '%catania%' THEN 60
        ELSE 50 -- Score default per altre zone
    END;

-- 4. RIPRISTINA CREDITI UTENTI (opzionale, commentato per sicurezza)
-- Decommentare se si vuole anche ripristinare i crediti consumati per unlock
-- UPDATE users SET credits_remaining = 
--     CASE 
--         WHEN plan = 'free' THEN 2
--         WHEN plan = 'starter' THEN 50  
--         WHEN plan = 'pro' THEN 200
--         ELSE credits_remaining
--     END;

-- 5. RESET COUNTERS E STATISTICHE
-- Resetta statistiche interne (se esistono)
UPDATE settings SET value = '0' WHERE key IN ('total_leads_scraped', 'total_leads_processed');

-- 6. INSERIMENTO ZONE DI SCRAPING SE NON ESISTONO
-- Inserisce zone principali se la tabella è vuota
INSERT INTO zones_to_scrape (source, category, location_name, score, created_at)
SELECT source, category, location_name, score, NOW()
FROM (VALUES
    -- Zone principali Italia - Dentisti
    ('google_maps', 'dentisti', 'Milano', 90),
    ('google_maps', 'dentisti', 'Roma', 90),
    ('google_maps', 'dentisti', 'Napoli', 80),
    ('google_maps', 'dentisti', 'Torino', 80),
    ('google_maps', 'dentisti', 'Bologna', 75),
    ('google_maps', 'dentisti', 'Firenze', 75),
    ('google_maps', 'dentisti', 'Palermo', 70),
    ('google_maps', 'dentisti', 'Bari', 70),
    ('google_maps', 'dentisti', 'Catania', 65),
    ('google_maps', 'dentisti', 'Verona', 65),
    
    -- Zone principali - Avvocati
    ('google_maps', 'avvocati', 'Milano', 85),
    ('google_maps', 'avvocati', 'Roma', 85),
    ('google_maps', 'avvocati', 'Napoli', 75),
    ('google_maps', 'avvocati', 'Torino', 75),
    ('google_maps', 'avvocati', 'Bologna', 70),
    ('google_maps', 'avvocati', 'Firenze', 70),
    
    -- Zone principali - Ristoranti
    ('google_maps', 'ristoranti', 'Milano', 80),
    ('google_maps', 'ristoranti', 'Roma', 80),
    ('google_maps', 'ristoranti', 'Napoli', 75),
    ('google_maps', 'ristoranti', 'Torino', 70),
    ('google_maps', 'ristoranti', 'Bologna', 70),
    ('google_maps', 'ristoranti', 'Firenze', 65),
    
    -- Zone principali - Parrucchieri
    ('google_maps', 'parrucchieri', 'Milano', 70),
    ('google_maps', 'parrucchieri', 'Roma', 70),
    ('google_maps', 'parrucchieri', 'Napoli', 65),
    ('google_maps', 'parrucchieri', 'Torino', 60),
    ('google_maps', 'parrucchieri', 'Bologna', 60),
    
    -- Zone principali - Idraulici
    ('google_maps', 'idraulici', 'Milano', 65),
    ('google_maps', 'idraulici', 'Roma', 65),
    ('google_maps', 'idraulici', 'Napoli', 60),
    ('google_maps', 'idraulici', 'Torino', 55),
    ('google_maps', 'idraulici', 'Bologna', 55),
    
    -- Zone principali - Agenzie Immobiliari
    ('google_maps', 'agenzie immobiliari', 'Milano', 75),
    ('google_maps', 'agenzie immobiliari', 'Roma', 75),
    ('google_maps', 'agenzie immobiliari', 'Napoli', 65),
    ('google_maps', 'agenzie immobiliari', 'Torino', 65),
    ('google_maps', 'agenzie immobiliari', 'Bologna', 60)
) AS new_zones(source, category, location_name, score)
WHERE NOT EXISTS (
    SELECT 1 FROM zones_to_scrape 
    WHERE source = new_zones.source 
    AND category = new_zones.category 
    AND location_name = new_zones.location_name
);

-- 7. LOG DELL'OPERAZIONE
INSERT INTO scrape_logs (zone_id, source, status, start_time, end_time, lead_count, notes)
VALUES (
    NULL, 
    'system', 
    'reset_completed', 
    NOW(), 
    NOW(), 
    0, 
    'Reset completo database lead e zone scraping - Engine aggiornato'
);

-- 8. VERIFICA FINALE
SELECT 
    'RESET COMPLETATO' as status,
    (SELECT COUNT(*) FROM leads) as leads_remaining,
    (SELECT COUNT(*) FROM zones_to_scrape) as zones_available,
    (SELECT COUNT(*) FROM zones_to_scrape WHERE is_scraping_now = true) as zones_currently_scraping,
    (SELECT COUNT(*) FROM user_unlocked_leads) as unlocked_leads_remaining,
    NOW() as reset_timestamp;

COMMIT;

-- 9. MESSAGGI DI CONFERMA
DO $$
BEGIN
    RAISE NOTICE '✅ RESET COMPLETATO CON SUCCESSO!';
    RAISE NOTICE '📊 Lead cancellati: tutti';
    RAISE NOTICE '🗺️ Zone disponibili: %', (SELECT COUNT(*) FROM zones_to_scrape);
    RAISE NOTICE '🔄 Tutte le zone sono pronte per essere scrappate';
    RAISE NOTICE '💳 Crediti utenti: mantenuti (decommentare sezione 4 per resettare)';
    RAISE NOTICE '⚠️ Ricordati di riavviare i servizi di scraping!';
END $$;
