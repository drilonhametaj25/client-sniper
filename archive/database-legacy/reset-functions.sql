-- Funzione RPC per resettare lead e zone in modo sicuro
-- Utilizzata dallo script bash per eseguire il reset via API
-- Fornisce controlli di sicurezza e logging avanzato

CREATE OR REPLACE FUNCTION reset_leads_and_scraping_zones()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    leads_deleted INTEGER := 0;
    zones_reset INTEGER := 0;
    unlocks_deleted INTEGER := 0;
    logs_deleted INTEGER := 0;
    credits_deleted INTEGER := 0;
    result json;
BEGIN
    -- Controllo permessi (solo admin)
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.uid() = id 
        AND raw_user_meta_data->>'role' = 'admin'
    ) THEN
        RAISE EXCEPTION 'Solo gli amministratori possono eseguire il reset';
    END IF;

    -- Log inizio operazione
    INSERT INTO scrape_logs (source, status, start_time, notes)
    VALUES ('system', 'reset_started', NOW(), 'Inizio reset completo lead e zone');

    -- 1. Conta record prima della cancellazione
    SELECT COUNT(*) INTO leads_deleted FROM leads;
    SELECT COUNT(*) INTO unlocks_deleted FROM user_unlocked_leads;
    SELECT COUNT(*) INTO logs_deleted FROM scrape_logs WHERE source != 'system';
    SELECT COUNT(*) INTO credits_deleted FROM credit_usage_log WHERE action = 'lead_unlock';

    -- 2. CANCELLAZIONE SICURA
    
    -- Cancella lead (cascata automatica su lead_analysis)
    DELETE FROM leads;
    
    -- Cancella unlock utenti
    DELETE FROM user_unlocked_leads;
    
    -- Cancella log scraping (mantiene log di sistema)
    DELETE FROM scrape_logs WHERE source != 'system';
    
    -- Cancella crediti usati per unlock
    DELETE FROM credit_usage_log WHERE action = 'lead_unlock';

    -- 3. RESET ZONE DI SCRAPING
    UPDATE zones_to_scrape SET
        last_scraped_at = NULL,
        is_scraping_now = false,
        times_scraped = 0,
        total_leads_found = 0,
        score = CASE 
            WHEN location_name ILIKE '%milano%' OR location_name ILIKE '%roma%' THEN 90
            WHEN location_name ILIKE '%napoli%' OR location_name ILIKE '%torino%' THEN 80
            WHEN location_name ILIKE '%bologna%' OR location_name ILIKE '%firenze%' THEN 75
            WHEN location_name ILIKE '%palermo%' OR location_name ILIKE '%bari%' THEN 70
            ELSE 60
        END;
    
    GET DIAGNOSTICS zones_reset = ROW_COUNT;

    -- 4. INSERIMENTO ZONE BASE (se necessario)
    INSERT INTO zones_to_scrape (source, category, location_name, score, created_at)
    SELECT * FROM (VALUES
        ('google_maps', 'dentisti', 'Milano', 90, NOW()),
        ('google_maps', 'dentisti', 'Roma', 90, NOW()),
        ('google_maps', 'dentisti', 'Napoli', 80, NOW()),
        ('google_maps', 'dentisti', 'Torino', 80, NOW()),
        ('google_maps', 'avvocati', 'Milano', 85, NOW()),
        ('google_maps', 'avvocati', 'Roma', 85, NOW()),
        ('google_maps', 'ristoranti', 'Milano', 80, NOW()),
        ('google_maps', 'ristoranti', 'Roma', 80, NOW())
    ) AS new_zones(source, category, location_name, score, created_at)
    WHERE NOT EXISTS (
        SELECT 1 FROM zones_to_scrape 
        WHERE source = new_zones.source 
        AND category = new_zones.category 
        AND location_name = new_zones.location_name
    );

    -- 5. RESET CONTATORI GLOBALI
    UPDATE settings SET value = '0' 
    WHERE key IN ('total_leads_scraped', 'total_leads_processed');

    -- 6. LOG COMPLETAMENTO
    INSERT INTO scrape_logs (source, status, start_time, end_time, notes)
    VALUES (
        'system', 
        'reset_completed', 
        NOW(), 
        NOW(), 
        format('Reset completato: %s lead, %s unlock, %s zone reset', 
               leads_deleted, unlocks_deleted, zones_reset)
    );

    -- 7. RISULTATO FINALE
    result := json_build_object(
        'success', true,
        'timestamp', NOW(),
        'statistics', json_build_object(
            'leads_deleted', leads_deleted,
            'unlocks_deleted', unlocks_deleted,
            'logs_deleted', logs_deleted,
            'credits_deleted', credits_deleted,
            'zones_reset', zones_reset,
            'zones_available', (SELECT COUNT(*) FROM zones_to_scrape)
        ),
        'message', 'Reset completato con successo'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Log errore
        INSERT INTO scrape_logs (source, status, start_time, end_time, error_log)
        VALUES ('system', 'reset_failed', NOW(), NOW(), SQLERRM);
        
        -- Ritorna errore
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Reset fallito'
        );
END;
$$;

-- Funzione per backup zone importanti
CREATE OR REPLACE FUNCTION backup_important_zones()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    zones json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'source', source,
            'category', category, 
            'location_name', location_name,
            'score', score,
            'times_scraped', times_scraped,
            'total_leads_found', total_leads_found,
            'last_scraped_at', last_scraped_at
        )
    ) INTO zones
    FROM zones_to_scrape
    WHERE score > 70 OR total_leads_found > 10;
    
    RETURN json_build_object(
        'backup_timestamp', NOW(),
        'zones_count', (SELECT COUNT(*) FROM zones_to_scrape WHERE score > 70 OR total_leads_found > 10),
        'zones', zones
    );
END;
$$;

-- Funzione per statistiche pre-reset
CREATE OR REPLACE FUNCTION get_reset_preview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'leads_count', (SELECT COUNT(*) FROM leads),
        'unlocked_leads_count', (SELECT COUNT(*) FROM user_unlocked_leads),
        'zones_count', (SELECT COUNT(*) FROM zones_to_scrape),
        'active_scraping_zones', (SELECT COUNT(*) FROM zones_to_scrape WHERE is_scraping_now = true),
        'logs_count', (SELECT COUNT(*) FROM scrape_logs),
        'users_with_unlocked_leads', (SELECT COUNT(DISTINCT user_id) FROM user_unlocked_leads),
        'top_zones_by_score', (
            SELECT json_agg(
                json_build_object(
                    'location', location_name,
                    'category', category,
                    'score', score,
                    'leads_found', total_leads_found
                )
            )
            FROM (
                SELECT location_name, category, score, total_leads_found
                FROM zones_to_scrape 
                ORDER BY score DESC 
                LIMIT 10
            ) top_zones
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$;
