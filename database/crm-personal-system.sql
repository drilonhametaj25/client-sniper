-- CRM Personal System per ClientSniper
-- Permette agli utenti PRO di gestire i lead sbloccati con note, stati, follow-up e allegati
-- Ogni utente può vedere solo i propri dati CRM grazie al Row Level Security

-- Tabella principale per entries CRM personali
CREATE TABLE IF NOT EXISTS crm_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'to_contact' CHECK (status IN ('to_contact', 'in_negotiation', 'closed_positive', 'closed_negative', 'on_hold', 'follow_up')),
    note TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    attachments JSONB DEFAULT '[]'::jsonb, -- Array di {name: string, url: string, type: string}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lead_id) -- Un utente può avere solo una entry per lead
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_crm_entries_user_id ON crm_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_entries_lead_id ON crm_entries(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_entries_status ON crm_entries(status);
CREATE INDEX IF NOT EXISTS idx_crm_entries_follow_up_date ON crm_entries(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_crm_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crm_entries_updated_at
    BEFORE UPDATE ON crm_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_entries_updated_at();

-- Row Level Security (RLS) - Ogni utente vede solo i propri dati
ALTER TABLE crm_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono vedere solo le loro entry CRM
CREATE POLICY "Users can view their own CRM entries" ON crm_entries
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Gli utenti possono inserire solo le loro entry CRM
CREATE POLICY "Users can insert their own CRM entries" ON crm_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Gli utenti possono aggiornare solo le loro entry CRM
CREATE POLICY "Users can update their own CRM entries" ON crm_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Gli utenti possono eliminare solo le loro entry CRM
CREATE POLICY "Users can delete their own CRM entries" ON crm_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Policy per admin: possono vedere tutto (opzionale)
CREATE POLICY "Admins can view all CRM entries" ON crm_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Funzione RPC per ottenere le entry CRM di un utente con dettagli lead
CREATE OR REPLACE FUNCTION get_user_crm_entries()
RETURNS TABLE (
    id UUID,
    lead_id UUID,
    status TEXT,
    note TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    lead_business_name TEXT,
    lead_website_url TEXT,
    lead_city TEXT,
    lead_category TEXT,
    lead_score INTEGER,
    lead_analysis JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verifica che l'utente sia autenticato
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        ce.id,
        ce.lead_id,
        ce.status,
        ce.note,
        ce.follow_up_date,
        ce.attachments,
        ce.created_at,
        ce.updated_at,
        l.business_name,
        l.website_url,
        l.city,
        l.category,
        l.score,
        l.analysis
    FROM crm_entries ce
    JOIN leads l ON ce.lead_id = l.id
    WHERE ce.user_id = auth.uid()
    ORDER BY ce.updated_at DESC;
END;
$$;

-- Funzione RPC per creare o aggiornare una entry CRM
CREATE OR REPLACE FUNCTION upsert_crm_entry(
    p_lead_id UUID,
    p_status TEXT DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_follow_up_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_attachments JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry_id UUID;
    v_user_id UUID;
BEGIN
    -- Verifica che l'utente sia autenticato
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Verifica che il lead esista e sia assegnato all'utente
    IF NOT EXISTS (
        SELECT 1 FROM leads 
        WHERE id = p_lead_id 
        AND assigned_to = v_user_id
    ) THEN
        RAISE EXCEPTION 'Lead not found or not assigned to user';
    END IF;

    -- Inserisci o aggiorna la entry CRM
    INSERT INTO crm_entries (user_id, lead_id, status, note, follow_up_date, attachments)
    VALUES (v_user_id, p_lead_id, 
            COALESCE(p_status, 'to_contact'), 
            p_note, 
            p_follow_up_date, 
            COALESCE(p_attachments, '[]'::jsonb))
    ON CONFLICT (user_id, lead_id) 
    DO UPDATE SET
        status = COALESCE(p_status, crm_entries.status),
        note = COALESCE(p_note, crm_entries.note),
        follow_up_date = COALESCE(p_follow_up_date, crm_entries.follow_up_date),
        attachments = COALESCE(p_attachments, crm_entries.attachments),
        updated_at = NOW()
    RETURNING id INTO v_entry_id;

    RETURN v_entry_id;
END;
$$;

-- Funzione per eliminare una entry CRM
CREATE OR REPLACE FUNCTION delete_crm_entry(p_entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verifica che l'utente sia autenticato
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Elimina la entry se appartiene all'utente
    DELETE FROM crm_entries 
    WHERE id = p_entry_id AND user_id = v_user_id;

    RETURN FOUND;
END;
$$;

-- Funzione per ottenere statistiche CRM dell'utente
CREATE OR REPLACE FUNCTION get_user_crm_stats(user_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_entries INTEGER,
    to_contact INTEGER,
    in_negotiation INTEGER,
    closed_positive INTEGER,
    closed_negative INTEGER,
    on_hold INTEGER,
    follow_up INTEGER,
    overdue_follow_ups INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Se user_id è fornito, usalo, altrimenti usa auth.uid()
    v_user_id := COALESCE(user_id, auth.uid());
    
    -- Verifica che abbiamo un utente valido
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID not provided and user not authenticated';
    END IF;

    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_entries,
        COUNT(CASE WHEN status = 'to_contact' THEN 1 END)::INTEGER as to_contact,
        COUNT(CASE WHEN status = 'in_negotiation' THEN 1 END)::INTEGER as in_negotiation,
        COUNT(CASE WHEN status = 'closed_positive' THEN 1 END)::INTEGER as closed_positive,
        COUNT(CASE WHEN status = 'closed_negative' THEN 1 END)::INTEGER as closed_negative,
        COUNT(CASE WHEN status = 'on_hold' THEN 1 END)::INTEGER as on_hold,
        COUNT(CASE WHEN status = 'follow_up' THEN 1 END)::INTEGER as follow_up,
        COUNT(CASE WHEN follow_up_date IS NOT NULL AND follow_up_date < NOW() THEN 1 END)::INTEGER as overdue_follow_ups
    FROM crm_entries
    WHERE crm_entries.user_id = v_user_id;
END;
$$;

-- Trigger per creare automaticamente una entry CRM quando un lead viene sbloccato
-- Questo trigger si attiva quando assigned_to viene settato su un lead
CREATE OR REPLACE FUNCTION auto_create_crm_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Se assigned_to è stato settato (lead sbloccato) e non esisteva prima
    IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
        -- Verifica che l'utente sia PRO prima di creare la entry
        IF EXISTS (
            SELECT 1 FROM users 
            WHERE id = NEW.assigned_to 
            AND plan = 'pro'
        ) THEN
            -- Crea la entry CRM vuota se non esiste già
            INSERT INTO crm_entries (user_id, lead_id, status)
            VALUES (NEW.assigned_to, NEW.id, 'to_contact')
            ON CONFLICT (user_id, lead_id) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_crm_entry
    AFTER UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_crm_entry();

-- Commenti per documentazione
COMMENT ON TABLE crm_entries IS 'Gestione CRM personale per utenti PRO - ogni utente può gestire i propri lead sbloccati';
COMMENT ON COLUMN crm_entries.status IS 'Stato del lead: to_contact, in_negotiation, closed_positive, closed_negative, on_hold, follow_up';
COMMENT ON COLUMN crm_entries.attachments IS 'Array JSON di allegati: [{name: string, url: string, type: string}]';
COMMENT ON FUNCTION get_user_crm_entries() IS 'Restituisce tutte le entry CRM dell\'utente autenticato con dettagli lead';
COMMENT ON FUNCTION upsert_crm_entry(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, JSONB) IS 'Crea o aggiorna una entry CRM per un lead';
COMMENT ON FUNCTION get_user_crm_stats() IS 'Restituisce statistiche CRM dell\'utente autenticato';
