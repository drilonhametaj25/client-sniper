/**
 * Script per sincronizzare i lead sbloccati con le entry CRM
 * Crea automaticamente entry CRM per tutti i lead sbloccati che non hanno ancora una entry
 * Utilizzato da: trigger automatici e script di manutenzione
 */

-- Funzione per sincronizzare i lead sbloccati con le entry CRM
CREATE OR REPLACE FUNCTION sync_unlocked_leads_to_crm()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    entries_created INTEGER := 0;
    missing_lead RECORD;
BEGIN
    -- Trova tutti i lead sbloccati che non hanno una entry CRM
    FOR missing_lead IN
        SELECT 
            uu.user_id,
            uu.lead_id,
            uu.unlocked_at
        FROM user_unlocked_leads uu
        LEFT JOIN crm_entries ce ON ce.lead_id = uu.lead_id AND ce.user_id = uu.user_id
        WHERE ce.id IS NULL
    LOOP
        -- Crea entry CRM per il lead mancante
        INSERT INTO crm_entries (
            user_id,
            lead_id,
            status,
            note,
            follow_up_date,
            attachments,
            created_at,
            updated_at
        ) VALUES (
            missing_lead.user_id,
            missing_lead.lead_id,
            'to_contact',
            'Lead sbloccato automaticamente',
            NULL,
            '[]'::jsonb,
            missing_lead.unlocked_at,
            NOW()
        );
        
        entries_created := entries_created + 1;
    END LOOP;
    
    RETURN entries_created;
END;
$$;

-- Funzione trigger per creare automaticamente entry CRM quando un lead viene sbloccato
CREATE OR REPLACE FUNCTION create_crm_entry_on_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Crea entry CRM automaticamente quando un lead viene sbloccato
    INSERT INTO crm_entries (
        user_id,
        lead_id,
        status,
        note,
        follow_up_date,
        attachments,
        created_at,
        updated_at
    ) VALUES (
        NEW.user_id,
        NEW.lead_id,
        'to_contact',
        'Lead sbloccato automaticamente',
        NULL,
        '[]'::jsonb,
        NEW.unlocked_at,
        NOW()
    );
    
    RETURN NEW;
END;
$$;

-- Crea trigger per sincronizzazione automatica
DROP TRIGGER IF EXISTS trigger_create_crm_entry_on_unlock ON user_unlocked_leads;
CREATE TRIGGER trigger_create_crm_entry_on_unlock
    AFTER INSERT ON user_unlocked_leads
    FOR EACH ROW
    EXECUTE FUNCTION create_crm_entry_on_unlock();

-- RPC per sincronizzare manualmente (accessibile da API)
CREATE OR REPLACE FUNCTION sync_user_crm_entries()
RETURNS TABLE (
    success BOOLEAN,
    entries_created INTEGER,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    created_count INTEGER;
BEGIN
    -- Verifica che l'utente sia autenticato
    IF auth.uid() IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'User not authenticated';
        RETURN;
    END IF;

    -- Sincronizza solo per l'utente corrente
    created_count := 0;
    
    INSERT INTO crm_entries (
        user_id,
        lead_id,
        status,
        note,
        follow_up_date,
        attachments,
        created_at,
        updated_at
    )
    SELECT 
        uu.user_id,
        uu.lead_id,
        'to_contact',
        'Lead sbloccato - sincronizzato',
        NULL,
        '[]'::jsonb,
        uu.unlocked_at,
        NOW()
    FROM user_unlocked_leads uu
    LEFT JOIN crm_entries ce ON ce.lead_id = uu.lead_id AND ce.user_id = uu.user_id
    WHERE uu.user_id = auth.uid()
    AND ce.id IS NULL;
    
    GET DIAGNOSTICS created_count = ROW_COUNT;
    
    RETURN QUERY SELECT TRUE, created_count, 
        CASE 
            WHEN created_count = 0 THEN 'Nessuna entry CRM da sincronizzare'
            ELSE 'Sincronizzate ' || created_count || ' entry CRM'
        END;
END;
$$;

-- Esegui sincronizzazione iniziale per tutti gli utenti
SELECT sync_unlocked_leads_to_crm() as entries_created;

-- Verifica risultati
SELECT 
    u.email,
    COUNT(uu.lead_id) as leads_sbloccati,
    COUNT(ce.id) as entries_crm
FROM users u
LEFT JOIN user_unlocked_leads uu ON u.id = uu.user_id
LEFT JOIN crm_entries ce ON u.id = ce.user_id
GROUP BY u.id, u.email
HAVING COUNT(uu.lead_id) > 0
ORDER BY leads_sbloccati DESC;
