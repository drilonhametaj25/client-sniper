-- Aggiunge colonna opportunities alla tabella leads
-- Necessaria per la nuova struttura di lead generation

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS opportunities TEXT[] DEFAULT '{}';

-- Aggiorna anche eventuali altri campi mancanti per la struttura moderna
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP DEFAULT now();

-- Commento per verificare la struttura
COMMENT ON COLUMN leads.opportunities IS 'Array di opportunità di business identificate dall''analisi tecnica';
COMMENT ON COLUMN leads.priority IS 'Priorità del lead: high, medium, low';
COMMENT ON COLUMN leads.scraped_at IS 'Timestamp di quando il lead è stato estratto';
