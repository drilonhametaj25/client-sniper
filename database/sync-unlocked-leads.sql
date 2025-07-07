-- Script per sincronizzare i lead sbloccati tra sistema legacy e nuovo sistema
-- Questo script migra i lead dal campo assigned_to alla tabella user_unlocked_leads

-- 1. Controlla la situazione attuale
SELECT 
    'BEFORE SYNC' as status,
    (SELECT COUNT(*) FROM leads WHERE assigned_to IS NOT NULL) as leads_with_assigned_to,
    (SELECT COUNT(*) FROM user_unlocked_leads) as entries_in_unlocked_table,
    (SELECT COUNT(*) FROM crm_entries) as entries_in_crm_table;

-- 2. Migra i lead con assigned_to alla tabella user_unlocked_leads
INSERT INTO user_unlocked_leads (user_id, lead_id, unlocked_at, created_at)
SELECT 
    l.assigned_to as user_id,
    l.id as lead_id,
    l.updated_at as unlocked_at,
    l.updated_at as created_at
FROM leads l
WHERE l.assigned_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_unlocked_leads ul 
    WHERE ul.user_id = l.assigned_to AND ul.lead_id = l.id
  );

-- 3. Crea le entry CRM per i lead sbloccati che non le hanno ancora
INSERT INTO crm_entries (user_id, lead_id, status, note, follow_up_date, attachments, created_at, updated_at)
SELECT 
    ul.user_id,
    ul.lead_id,
    'to_contact' as status,
    NULL as note,
    NULL as follow_up_date,
    '[]'::jsonb as attachments,
    ul.created_at,
    ul.created_at as updated_at
FROM user_unlocked_leads ul
WHERE NOT EXISTS (
    SELECT 1 FROM crm_entries ce 
    WHERE ce.user_id = ul.user_id AND ce.lead_id = ul.lead_id
);

-- 4. Controlla la situazione dopo la sincronizzazione
SELECT 
    'AFTER SYNC' as status,
    (SELECT COUNT(*) FROM leads WHERE assigned_to IS NOT NULL) as leads_with_assigned_to,
    (SELECT COUNT(*) FROM user_unlocked_leads) as entries_in_unlocked_table,
    (SELECT COUNT(*) FROM crm_entries) as entries_in_crm_table;

-- 5. Mostra i dettagli dei lead sbloccati per utente
SELECT 
    u.email,
    u.plan,
    COUNT(ul.id) as lead_sbloccati,
    COUNT(ce.id) as entry_crm
FROM users u
LEFT JOIN user_unlocked_leads ul ON u.id = ul.user_id
LEFT JOIN crm_entries ce ON u.id = ce.user_id
WHERE u.plan = 'pro'
GROUP BY u.id, u.email, u.plan
ORDER BY lead_sbloccati DESC;

-- 6. OPZIONALE: Pulisce il campo assigned_to se tutto è sincronizzato
-- ATTENZIONE: Esegui solo se sei sicuro che tutto funziona correttamente
-- UPDATE leads SET assigned_to = NULL WHERE assigned_to IS NOT NULL;

-- 7. Verifica che non ci siano inconsistenze
SELECT 
    'INCONSISTENCIES CHECK' as status,
    COUNT(*) as lead_with_assigned_to_but_not_in_unlocked_table
FROM leads l
WHERE l.assigned_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_unlocked_leads ul 
    WHERE ul.user_id = l.assigned_to AND ul.lead_id = l.id
  );

-- 8. Mostra i lead sbloccati più recenti
SELECT 
    l.business_name,
    l.city,
    l.category,
    u.email as utente,
    ul.unlocked_at,
    CASE WHEN ce.id IS NOT NULL THEN 'SI' ELSE 'NO' END as ha_entry_crm
FROM user_unlocked_leads ul
JOIN leads l ON ul.lead_id = l.id
JOIN users u ON ul.user_id = u.id
LEFT JOIN crm_entries ce ON ul.user_id = ce.user_id AND ul.lead_id = ce.lead_id
ORDER BY ul.unlocked_at DESC
LIMIT 15;

COMMIT;
