/**
 * Aggiunge le colonne mancanti alla tabella leads per supportare la struttura moderna
 * Necessarie per salvare i dati completi dell'analisi avanzata
 */

-- Aggiungi colonna website_analysis per la struttura moderna completa
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS website_analysis JSONB DEFAULT NULL;

-- Aggiungi colonna social_presence per i dati social
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS social_presence JSONB DEFAULT NULL;

-- Aggiungi colonne per issues e opportunities se non esistono già
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS issues TEXT[] DEFAULT NULL;

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS opportunities TEXT[] DEFAULT NULL;

-- Commenti alle colonne
COMMENT ON COLUMN leads.website_analysis IS 'Analisi completa del sito web (struttura EnhancedWebsiteAnalysis)';
COMMENT ON COLUMN leads.social_presence IS 'Dati di presenza sui social media (risultato della social analysis)';
COMMENT ON COLUMN leads.issues IS 'Array di problemi tecnici rilevati';
COMMENT ON COLUMN leads.opportunities IS 'Array di opportunità di business identificate';

-- Crea indici per query efficienti
CREATE INDEX IF NOT EXISTS idx_leads_website_analysis 
ON leads USING GIN (website_analysis);

CREATE INDEX IF NOT EXISTS idx_leads_social_presence 
ON leads USING GIN (social_presence);

CREATE INDEX IF NOT EXISTS idx_leads_issues 
ON leads USING GIN (issues);

CREATE INDEX IF NOT EXISTS idx_leads_opportunities 
ON leads USING GIN (opportunities);

-- Esempio di struttura dati che verrà salvata:
/*
{
  "profiles": [
    {
      "platform": "facebook",
      "url": "https://facebook.com/business",
      "found": true
    },
    {
      "platform": "instagram", 
      "url": "https://instagram.com/business",
      "found": true
    }
  ],
  "summary": ["Facebook presente", "Instagram presente"]
}
*/
