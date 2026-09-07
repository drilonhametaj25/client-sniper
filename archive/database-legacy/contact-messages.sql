-- Script SQL per tabella messaggi di contatto
-- Eseguire in Supabase SQL Editor per abilitare il sistema di supporto

-- Tabella per messaggi di contatto
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'generale',
    status TEXT DEFAULT 'nuovo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to UUID, -- eventuale staff member
    response TEXT, -- risposta del supporto
    response_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 1 -- 1=bassa, 2=media, 3=alta
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_type ON contact_messages(type);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

-- RLS (Row Level Security) - solo admin possono vedere tutti i messaggi
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Policy per inserimento (tutti possono inviare messaggi)
CREATE POLICY "Anyone can insert contact messages" ON contact_messages
    FOR INSERT
    WITH CHECK (true);

-- Policy per lettura (solo admin - implementare logica admin appropriata)
CREATE POLICY "Only admins can read contact messages" ON contact_messages
    FOR SELECT
    USING (false); -- Disabilitato per ora, implementare logica admin

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contact_messages_updated_at 
    BEFORE UPDATE ON contact_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE contact_messages IS 'Messaggi ricevuti dal form di contatto del sito';
COMMENT ON COLUMN contact_messages.name IS 'Nome completo del mittente';
COMMENT ON COLUMN contact_messages.email IS 'Email del mittente';
COMMENT ON COLUMN contact_messages.subject IS 'Oggetto del messaggio';
COMMENT ON COLUMN contact_messages.message IS 'Contenuto del messaggio';
COMMENT ON COLUMN contact_messages.type IS 'Tipo di richiesta (generale, supporto, vendite, ecc.)';
COMMENT ON COLUMN contact_messages.status IS 'Stato: nuovo, in_lavorazione, risposto, chiuso';
COMMENT ON COLUMN contact_messages.priority IS 'Priorità: 1=bassa, 2=media, 3=alta';

-- Vista per statistiche supporto
CREATE OR REPLACE VIEW contact_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN status = 'nuovo' THEN 1 END) as new_messages,
    COUNT(CASE WHEN status = 'risposto' THEN 1 END) as responded_messages,
    COUNT(CASE WHEN status = 'chiuso' THEN 1 END) as closed_messages,
    type,
    AVG(CASE WHEN response_at IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (response_at - created_at))/3600 
    END) as avg_response_time_hours
FROM contact_messages 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), type
ORDER BY date DESC;

-- Grant appropriati (aggiustare secondo la configurazione Supabase)
-- GRANT SELECT ON contact_stats TO authenticated;
-- GRANT INSERT ON contact_messages TO anon, authenticated;
