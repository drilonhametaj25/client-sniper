-- Rimuovi il trigger problematico
-- Ora gestiamo l'inserimento CRM direttamente nell'API

-- Rimuovi tutti i trigger esistenti
DROP TRIGGER IF EXISTS trigger_auto_create_crm_entry ON leads;
DROP TRIGGER IF EXISTS trigger_auto_create_crm_entry ON user_unlocked_leads;
DROP FUNCTION IF EXISTS auto_create_crm_entry() CASCADE;

-- Verifica che i trigger siano stati rimossi
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_create_crm_entry';

SELECT 'Trigger rimosso correttamente!' as status;
