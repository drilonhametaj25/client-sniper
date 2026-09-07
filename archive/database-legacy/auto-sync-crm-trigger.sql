-- Auto-sync CRM trigger
-- Questo file crea un trigger che automaticamente sincronizza i lead sbloccati
-- con le entry CRM quando viene inserito un record in user_unlocked_leads
-- Usato da: Trigger automatico del database
-- Dove: Supabase PostgreSQL

-- Funzione che crea automaticamente l'entry CRM quando un lead viene sbloccato
CREATE OR REPLACE FUNCTION auto_create_crm_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserisce automaticamente l'entry CRM quando viene sbloccato un lead
    INSERT INTO crm_entries (
        id,
        user_id,
        lead_id,
        status,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        NEW.user_id,
        NEW.lead_id,
        'to_contact'::TEXT,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        -- Evita duplicati
        SELECT 1 FROM crm_entries 
        WHERE user_id = NEW.user_id AND lead_id = NEW.lead_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crea il trigger che si attiva quando viene inserito un record in user_unlocked_leads
DROP TRIGGER IF EXISTS trigger_auto_create_crm_entry ON user_unlocked_leads;
CREATE TRIGGER trigger_auto_create_crm_entry
    AFTER INSERT ON user_unlocked_leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_crm_entry();

-- Verifica che il trigger sia stato creato
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_create_crm_entry';
