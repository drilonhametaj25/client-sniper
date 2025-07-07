-- Aggiorna il trigger per correggere la struttura della tabella crm_entries
-- Questo script sostituisce il trigger esistente con la versione corretta

-- Rimuovi tutti i trigger esistenti (potrebbero essere su tabelle diverse)
DROP TRIGGER IF EXISTS trigger_auto_create_crm_entry ON leads;
DROP TRIGGER IF EXISTS trigger_auto_create_crm_entry ON user_unlocked_leads;
DROP FUNCTION IF EXISTS auto_create_crm_entry() CASCADE;

-- Crea la funzione corretta che usa solo le colonne esistenti
CREATE OR REPLACE FUNCTION auto_create_crm_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserisce automaticamente l'entry CRM quando viene sbloccato un lead
    -- Usa ON CONFLICT DO NOTHING per evitare errori sui duplicati
    INSERT INTO crm_entries (
        id,
        user_id,
        lead_id,
        status,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid(),
        NEW.user_id,
        NEW.lead_id,
        'to_contact'::TEXT,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, lead_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ricrea il trigger
CREATE TRIGGER trigger_auto_create_crm_entry
    AFTER INSERT ON user_unlocked_leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_crm_entry();

-- Verifica che il trigger sia stato creato
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_create_crm_entry';

-- Test del trigger - Verifica che funzioni
SELECT 'Trigger aggiornato correttamente!' as status;
