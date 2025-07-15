-- Sistema servizi digitali con prezzi per lead - ClientSniper
-- Usato per: Mostrare all'utente PRO i servizi che può offrire al lead con prezzi medi
-- Chiamato da: API /api/digital-services, componente dettaglio lead

-- Tabella servizi digitali con prezzi medi
CREATE TABLE IF NOT EXISTS digital_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_freelance_eur INTEGER NOT NULL, -- Prezzo medio per freelance in euro
  price_agency_eur INTEGER NOT NULL, -- Prezzo medio per agenzia in euro
  tags TEXT[] DEFAULT '{}', -- es: ["molto richiesto", "profitto alto", "servizio ricorrente"]
  category TEXT NOT NULL, -- es: "web", "seo", "social", "marketing", "branding"
  complexity_level TEXT DEFAULT 'medium' CHECK (complexity_level IN ('low', 'medium', 'high')),
  estimated_hours INTEGER, -- Ore di lavoro stimate
  is_recurring BOOLEAN DEFAULT false, -- Se è un servizio ricorrente
  is_popular BOOLEAN DEFAULT false, -- Se è molto richiesto
  is_high_profit BOOLEAN DEFAULT false, -- Se ha profitto alto
  sort_order INTEGER DEFAULT 0, -- Ordine di visualizzazione
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tabella servizi proposti per lead specifici (CRM)
CREATE TABLE IF NOT EXISTS lead_proposed_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  service_id UUID REFERENCES digital_services(id) ON DELETE CASCADE,
  custom_price_eur INTEGER, -- Prezzo personalizzato se diverso da quello standard
  notes TEXT,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'in_negotiation')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, lead_id, service_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_digital_services_category ON digital_services(category);
CREATE INDEX IF NOT EXISTS idx_digital_services_active ON digital_services(is_active);
CREATE INDEX IF NOT EXISTS idx_digital_services_popular ON digital_services(is_popular);
CREATE INDEX IF NOT EXISTS idx_digital_services_sort_order ON digital_services(sort_order);
CREATE INDEX IF NOT EXISTS idx_lead_proposed_services_user_lead ON lead_proposed_services(user_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_proposed_services_status ON lead_proposed_services(status);

-- RLS Policies
ALTER TABLE digital_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_proposed_services ENABLE ROW LEVEL SECURITY;

-- I servizi sono pubblici per tutti gli utenti autenticati
CREATE POLICY "Digital services are public" ON digital_services
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admin possono modificare i servizi
CREATE POLICY "Only admin can modify digital services" ON digital_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Gli utenti possono vedere e gestire solo i propri servizi proposti
CREATE POLICY "Users can view own proposed services" ON lead_proposed_services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own proposed services" ON lead_proposed_services
  FOR ALL USING (auth.uid() = user_id);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_digital_services_updated_at
  BEFORE UPDATE ON digital_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_proposed_services_updated_at
  BEFORE UPDATE ON lead_proposed_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserimento servizi iniziali dalla tabella fornita
INSERT INTO digital_services (name, description, price_freelance_eur, price_agency_eur, tags, category, complexity_level, estimated_hours, is_recurring, is_popular, is_high_profit, sort_order) VALUES
-- Servizi Web
('Sito vetrina (WordPress)', 'Sito web professionale con WordPress, responsive e SEO-friendly', 600, 1200, ARRAY['molto richiesto'], 'web', 'medium', 40, false, true, false, 1),
('Sito e-commerce base', 'Negozio online completo con sistema di pagamento e gestione prodotti', 1300, 2500, ARRAY['profitto alto'], 'web', 'high', 80, false, false, true, 2),
('Landing page (con copywriting)', 'Pagina di atterraggio ottimizzata per conversioni con testi persuasivi', 350, 800, ARRAY['conversione alta'], 'web', 'medium', 20, false, false, false, 3),
('Sviluppo app vetrina (Flutter / React)', 'Applicazione mobile per iOS e Android', 1500, 3000, ARRAY['profitto alto'], 'web', 'high', 120, false, false, true, 4),
('Creazione modulo contatti custom', 'Form di contatto personalizzato con validazione avanzata', 100, 200, ARRAY[]::text[], 'web', 'low', 8, false, false, false, 5),
('Setup hosting e dominio', 'Configurazione hosting, dominio e certificati SSL', 70, 150, ARRAY[]::text[], 'web', 'low', 4, false, false, false, 6),
('Traduzione sito multilingua', 'Implementazione multilingua per mercati internazionali', 150, 300, ARRAY[]::text[], 'web', 'low', 10, false, false, false, 7),
('Setup e-commerce con POS / Stripe', 'Integrazione sistemi di pagamento per negozi online', 200, 450, ARRAY[]::text[], 'web', 'medium', 15, false, false, false, 8),
('Revisione UX design', 'Analisi e miglioramento dell\'esperienza utente', 250, 600, ARRAY['molto richiesto'], 'web', 'medium', 20, false, true, false, 9),
('Audit tecnico sicurezza sito', 'Controllo vulnerabilità e hardening del sito web', 300, 700, ARRAY[]::text[], 'web', 'medium', 25, false, false, false, 10),

-- Servizi SEO
('SEO Audit tecnico', 'Analisi completa SEO on-page e off-page con piano di azione', 400, 1000, ARRAY['valore strategico'], 'seo', 'medium', 30, false, false, false, 11),
('Ottimizzazione SEO on-site', 'Ottimizzazione tecnica e contenuti per motori di ricerca', 300, 800, ARRAY[]::text[], 'seo', 'medium', 25, false, false, false, 12),
('Setup Google Analytics + GA4', 'Configurazione e personalizzazione analytics avanzata', 150, 400, ARRAY[]::text[], 'seo', 'low', 8, false, false, false, 13),
('Creazione contenuti blog (x5 articoli)', 'Articoli SEO-optimized per blog aziendale', 250, 600, ARRAY[]::text[], 'seo', 'medium', 20, false, false, false, 14),

-- Servizi Social Media
('Gestione Instagram mensile', 'Creazione contenuti e gestione account Instagram', 250, 600, ARRAY['servizio ricorrente'], 'social', 'medium', 20, true, false, false, 15),
('Gestione Facebook + ADV', 'Gestione pagina Facebook con campagne pubblicitarie', 400, 1000, ARRAY['servizio ricorrente'], 'social', 'medium', 30, true, false, false, 16),

-- Servizi Marketing
('Campagna Google Ads iniziale', 'Setup e gestione campagne Google Ads per 3 mesi', 300, 900, ARRAY[]::text[], 'marketing', 'medium', 25, false, false, false, 17),
('Email marketing setup (es. Mailchimp)', 'Configurazione sistema email marketing con automazioni', 200, 500, ARRAY['utile per e-commerce'], 'marketing', 'low', 15, false, false, false, 18),
('Funnel di vendita completo', 'Strategia e implementazione funnel per massimizzare conversioni', 800, 1800, ARRAY[]::text[], 'marketing', 'high', 50, false, false, false, 19),

-- Servizi Branding
('Branding (logo, palette, tipografia)', 'Identità visiva completa per startup e aziende', 350, 900, ARRAY['importante per startup'], 'branding', 'medium', 30, false, false, false, 20),
('Copywriting per home + about', 'Testi persuasivi per pagine principali del sito', 180, 500, ARRAY[]::text[], 'branding', 'low', 12, false, false, false, 21),
('Video animato promozionale', 'Video marketing per social media e sito web', 500, 1200, ARRAY[]::text[], 'branding', 'high', 40, false, false, false, 22),

-- Servizi Ricorrenti
('Manutenzione sito mensile', 'Aggiornamenti, backup e monitoraggio continuo', 80, 200, ARRAY['servizio ricorrente'], 'web', 'low', 6, true, false, false, 23),
('Consulenza strategica digitale (1h)', 'Sessione di consulenza personalizzata per strategie digital', 100, 250, ARRAY[]::text[], 'marketing', 'medium', 1, false, false, false, 24),

-- Servizi Compliance
('Setup GDPR & cookie policy', 'Implementazione conformità privacy e cookie policy', 100, 250, ARRAY['utile per tutti i siti'], 'web', 'low', 8, false, false, false, 25);

-- Commenti per documentazione
COMMENT ON TABLE digital_services IS 'Servizi digitali con prezzi medi per freelance e agenzie';
COMMENT ON TABLE lead_proposed_services IS 'Servizi proposti dagli utenti ai loro lead specifici';
COMMENT ON COLUMN digital_services.price_freelance_eur IS 'Prezzo medio per freelance in euro';
COMMENT ON COLUMN digital_services.price_agency_eur IS 'Prezzo medio per agenzia in euro';
COMMENT ON COLUMN digital_services.tags IS 'Tag descrittivi come "molto richiesto", "profitto alto", ecc.';
COMMENT ON COLUMN digital_services.complexity_level IS 'Livello di complessità: low, medium, high';
COMMENT ON COLUMN digital_services.estimated_hours IS 'Ore di lavoro stimate per completare il servizio';
COMMENT ON COLUMN lead_proposed_services.custom_price_eur IS 'Prezzo personalizzato se diverso da quello standard';
COMMENT ON COLUMN lead_proposed_services.status IS 'Stato della proposta: proposed, accepted, rejected, in_negotiation';
