-- Script SQL per popolare zones_to_scrape con 100 zone italiane, 3 fonti e 50+ categorie
-- Genera circa 15.000 combinazioni per il sistema di scraping distribuito
-- È idempotente: può essere eseguito più volte senza creare duplicati

-- Prima cancelliamo eventuali dati esistenti (opzionale)
-- TRUNCATE TABLE zones_to_scrape;

-- Inserimento massivo per GOOGLE MAPS
-- Note: Le categorie ristoranti, barberie, web agency, fabbri, fotografi sono già state inserite nel seed precedente
INSERT INTO zones_to_scrape (source, category, location_name, score) 
VALUES
('google_maps', 'social media manager', 'Milano Centro', 95),
('google_maps', 'social media manager', 'Roma Centro Storico', 95),
('google_maps', 'social media manager', 'Napoli Centro', 85),
('google_maps', 'social media manager', 'Firenze Centro', 80),
('google_maps', 'social media manager', 'Torino Centro', 85),
('google_maps', 'social media manager', 'Bologna Centro', 85),
('google_maps', 'agenzie di comunicazione', 'Milano Centro', 100),
('google_maps', 'agenzie di comunicazione', 'Roma Centro Storico', 100),
('google_maps', 'agenzie di comunicazione', 'Napoli Centro', 85),
('google_maps', 'agenzie di comunicazione', 'Firenze Centro', 90),
('google_maps', 'agenzie di comunicazione', 'Torino Centro', 90),
('google_maps', 'agenzie di comunicazione', 'Bologna Centro', 85),
('google_maps', 'graphic designer', 'Milano Centro', 90),
('google_maps', 'graphic designer', 'Roma Centro Storico', 90),
('google_maps', 'graphic designer', 'Napoli Centro', 80),
('google_maps', 'graphic designer', 'Firenze Centro', 85),
('google_maps', 'graphic designer', 'Torino Centro', 80),
('google_maps', 'graphic designer', 'Bologna Centro', 80),
('google_maps', 'videomaker', 'Milano Centro', 90),
('google_maps', 'videomaker', 'Roma Centro Storico', 95),
('google_maps', 'videomaker', 'Napoli Centro', 75),
('google_maps', 'videomaker', 'Firenze Centro', 80),
('google_maps', 'videomaker', 'Torino Centro', 80),
('google_maps', 'videomaker', 'Bologna Centro', 80),

-- GOOGLE MAPS - ARTIGIANI LOCALI (esclusi fabbri già inseriti)
('google_maps', 'idraulici', 'Milano Centro', 85),
('google_maps', 'idraulici', 'Roma Centro Storico', 85),
('google_maps', 'idraulici', 'Napoli Centro', 80),
('google_maps', 'idraulici', 'Firenze Centro', 80),
('google_maps', 'idraulici', 'Torino Centro', 75),
('google_maps', 'idraulici', 'Bologna Centro', 75),
('google_maps', 'elettricisti', 'Milano Centro', 85),
('google_maps', 'elettricisti', 'Roma Centro Storico', 85),
('google_maps', 'elettricisti', 'Napoli Centro', 80),
('google_maps', 'elettricisti', 'Firenze Centro', 80),
('google_maps', 'elettricisti', 'Torino Centro', 75),
('google_maps', 'elettricisti', 'Bologna Centro', 75),
('google_maps', 'muratori', 'Milano Centro', 80),
('google_maps', 'muratori', 'Roma Centro Storico', 80),
('google_maps', 'muratori', 'Napoli Centro', 75),
('google_maps', 'muratori', 'Firenze Centro', 75),
('google_maps', 'muratori', 'Torino Centro', 70),
('google_maps', 'muratori', 'Bologna Centro', 70),
('google_maps', 'giardinieri', 'Milano Centro', 75),
('google_maps', 'giardinieri', 'Roma Centro Storico', 75),
('google_maps', 'giardinieri', 'Napoli Centro', 70),
('google_maps', 'giardinieri', 'Firenze Centro', 75),
('google_maps', 'giardinieri', 'Torino Centro', 70),
('google_maps', 'giardinieri', 'Bologna Centro', 70),
('google_maps', 'imprese di pulizie', 'Milano Centro', 85),
('google_maps', 'imprese di pulizie', 'Roma Centro Storico', 85),
('google_maps', 'imprese di pulizie', 'Napoli Centro', 80),
('google_maps', 'imprese di pulizie', 'Firenze Centro', 80),
('google_maps', 'imprese di pulizie', 'Torino Centro', 75),
('google_maps', 'imprese di pulizie', 'Bologna Centro', 75),

-- GOOGLE MAPS - FOOD & RETAIL (esclusi ristoranti già inseriti)
('google_maps', 'pizzerie', 'Milano Centro', 95),
('google_maps', 'pizzerie', 'Roma Centro Storico', 95),
('google_maps', 'pizzerie', 'Napoli Centro', 100),
('google_maps', 'pizzerie', 'Firenze Centro', 90),
('google_maps', 'pizzerie', 'Torino Centro', 85),
('google_maps', 'pizzerie', 'Bologna Centro', 85),
('google_maps', 'bar', 'Milano Centro', 95),
('google_maps', 'bar', 'Roma Centro Storico', 95),
('google_maps', 'bar', 'Napoli Centro', 95),
('google_maps', 'bar', 'Firenze Centro', 90),
('google_maps', 'bar', 'Torino Centro', 85),
('google_maps', 'bar', 'Bologna Centro', 85),
('google_maps', 'gelaterie', 'Milano Centro', 85),
('google_maps', 'gelaterie', 'Roma Centro Storico', 90),
('google_maps', 'gelaterie', 'Napoli Centro', 85),
('google_maps', 'gelaterie', 'Firenze Centro', 85),
('google_maps', 'gelaterie', 'Torino Centro', 80),
('google_maps', 'gelaterie', 'Bologna Centro', 80),

-- GOOGLE MAPS - SALUTE & BENESSERE (escluse barberie già inserite)
('google_maps', 'parrucchieri', 'Milano Centro', 90),
('google_maps', 'parrucchieri', 'Roma Centro Storico', 90),
('google_maps', 'parrucchieri', 'Napoli Centro', 85),
('google_maps', 'parrucchieri', 'Firenze Centro', 85),
('google_maps', 'parrucchieri', 'Torino Centro', 80),
('google_maps', 'parrucchieri', 'Bologna Centro', 80),
('google_maps', 'estetiste', 'Milano Centro', 85),
('google_maps', 'estetiste', 'Roma Centro Storico', 85),
('google_maps', 'estetiste', 'Napoli Centro', 80),
('google_maps', 'estetiste', 'Firenze Centro', 80),
('google_maps', 'estetiste', 'Torino Centro', 75),
('google_maps', 'estetiste', 'Bologna Centro', 75),
('google_maps', 'centri benessere', 'Milano Centro', 80),
('google_maps', 'centri benessere', 'Roma Centro Storico', 80),
('google_maps', 'centri benessere', 'Napoli Centro', 75),
('google_maps', 'centri benessere', 'Firenze Centro', 75),
('google_maps', 'centri benessere', 'Torino Centro', 70),
('google_maps', 'centri benessere', 'Bologna Centro', 70),

-- GOOGLE MAPS - BUSINESS & SERVIZI
('google_maps', 'agenzie immobiliari', 'Milano Centro', 95),
('google_maps', 'agenzie immobiliari', 'Roma Centro Storico', 95),
('google_maps', 'agenzie immobiliari', 'Napoli Centro', 85),
('google_maps', 'agenzie immobiliari', 'Firenze Centro', 90),
('google_maps', 'agenzie immobiliari', 'Torino Centro', 85),
('google_maps', 'agenzie immobiliari', 'Bologna Centro', 85),
('google_maps', 'commercialisti', 'Milano Centro', 85),
('google_maps', 'commercialisti', 'Roma Centro Storico', 85),
('google_maps', 'commercialisti', 'Napoli Centro', 80),
('google_maps', 'commercialisti', 'Firenze Centro', 80),
('google_maps', 'commercialisti', 'Torino Centro', 75),
('google_maps', 'commercialisti', 'Bologna Centro', 75),
('google_maps', 'avvocati', 'Milano Centro', 90),
('google_maps', 'avvocati', 'Roma Centro Storico', 95),
('google_maps', 'avvocati', 'Napoli Centro', 80),
('google_maps', 'avvocati', 'Firenze Centro', 80),
('google_maps', 'avvocati', 'Torino Centro', 80),
('google_maps', 'avvocati', 'Bologna Centro', 80)

ON CONFLICT (source, category, location_name) DO NOTHING;

-- Ora aggiungiamo tutte le altre città per le categorie già inserite
-- Utilizziamo una query dinamica per replicare le categorie esistenti a tutte le 100 città
INSERT INTO zones_to_scrape (source, category, location_name, score)
SELECT 
  'google_maps' as source,
  category,
  città.location_name,
  CASE 
    WHEN città.location_name IN ('Milano Centro', 'Roma Centro Storico', 'Napoli Centro') THEN score
    WHEN città.location_name LIKE '%Milano%' OR città.location_name LIKE '%Roma%' OR città.location_name LIKE '%Napoli%' THEN GREATEST(score - 5, 30)
    WHEN città.tier = 1 THEN GREATEST(score - 10, 40) -- Grandi città
    WHEN città.tier = 2 THEN GREATEST(score - 20, 35) -- Città medie  
    ELSE GREATEST(score - 30, 25) -- Città piccole
  END as adjusted_score
FROM (
  SELECT DISTINCT category, score 
  FROM zones_to_scrape 
  WHERE source = 'google_maps'
) categories
CROSS JOIN (
  VALUES
    ('Milano Navigli', 1),
    ('Roma Eur', 1),
    ('Roma Trastevere', 1),
    ('Napoli Vomero', 1),
    ('Palermo Centro', 1),
    ('Genova Centro', 1),
    ('Bari Centro', 1),
    ('Catania Centro', 1),
    ('Verona Centro', 1),
    ('Venezia Mestre', 1),
    ('Padova Centro', 1),
    ('Trieste Centro', 1),
    ('Brescia Centro', 1),
    ('Bergamo Bassa', 1),
    ('Lecce Centro', 2),
    ('Taranto Centro', 2),
    ('Reggio Calabria', 2),
    ('Perugia Centro', 2),
    ('Cagliari Centro', 2),
    ('Trento Centro', 2),
    ('Bolzano Centro', 2),
    ('Salerno Centro', 2),
    ('Rimini Centro', 2),
    ('Parma Centro', 2),
    ('Modena Centro', 2),
    ('Pescara Centro', 2),
    ('Livorno Centro', 2),
    ('Sassari Centro', 2),
    ('Ferrara Centro', 2),
    ('Latina Centro', 2),
    ('Arezzo Centro', 3),
    ('Pisa Centro', 2),
    ('Lucca Centro', 3),
    ('Foggia Centro', 3),
    ('L''Aquila Centro', 3),
    ('Grosseto Centro', 3),
    ('Treviso Centro', 2),
    ('Varese Centro', 2),
    ('Novara Centro', 3),
    ('Monza Centro', 2),
    ('Como Centro', 2),
    ('Vercelli', 3),
    ('Asti', 3),
    ('Alessandria', 3),
    ('Viterbo', 3),
    ('Terni', 3),
    ('Ragusa', 3),
    ('Siracusa', 3),
    ('Agrigento', 3),
    ('Trapani', 3),
    ('Cosenza', 3),
    ('Crotone', 3),
    ('Catanzaro', 3),
    ('Matera', 3),
    ('Potenza', 3),
    ('Campobasso', 3),
    ('Benevento', 3),
    ('Avellino', 3),
    ('Caserta', 3),
    ('Brindisi', 3),
    ('Andria', 3),
    ('Barletta', 3),
    ('Trani', 3),
    ('Molfetta', 3),
    ('Altamura', 3),
    ('Torre del Greco', 3),
    ('Giugliano in Campania', 3),
    ('Scafati', 3),
    ('Castellammare di Stabia', 3),
    ('Afragola', 3),
    ('Aversa', 3),
    ('Nocera Inferiore', 3),
    ('Cava de'' Tirreni', 3),
    ('Eboli', 3),
    ('Battipaglia', 3),
    ('Tivoli', 3),
    ('Guidonia Montecelio', 3),
    ('Pomezia', 3),
    ('Aprilia', 3),
    ('Frosinone', 3),
    ('Velletri', 3),
    ('Anzio', 3),
    ('Nettuno', 3),
    ('Ladispoli', 3),
    ('Civitavecchia', 3),
    ('Alghero', 3),
    ('Olbia', 2),
    ('Nuoro', 3),
    ('Iglesias', 3),
    ('Oristano', 3),
    ('Sanremo', 2),
    ('Imperia', 3),
    ('Ventimiglia', 3),
    ('Sesto San Giovanni', 2)
) AS città(location_name, tier)
ON CONFLICT (source, category, location_name) DO NOTHING;

-- Ora creiamo tutte le combinazioni per YELP (con score ridotto di 10)
INSERT INTO zones_to_scrape (source, category, location_name, score) 
SELECT 
  'yelp' as source, 
  category, 
  location_name, 
  GREATEST(score - 10, 30) as score 
FROM zones_to_scrape 
WHERE source = 'google_maps'
ON CONFLICT (source, category, location_name) DO NOTHING;

-- E per PAGINE GIALLE (con score ridotto di 20)
INSERT INTO zones_to_scrape (source, category, location_name, score) 
SELECT 
  'pagine_gialle' as source, 
  category, 
  location_name, 
  GREATEST(score - 20, 25) as score 
FROM zones_to_scrape 
WHERE source = 'google_maps'
ON CONFLICT (source, category, location_name) DO NOTHING;

-- Aggiungiamo le categorie rimanenti per le città principali
INSERT INTO zones_to_scrape (source, category, location_name, score) 
VALUES
-- CATEGORIE DIGITALI AGGIUNTIVE (escluse web agency e fotografi già inserite)
('google_maps', 'sviluppatori web', 'Milano Centro', 95),
('google_maps', 'sviluppatori web', 'Roma Centro Storico', 95),
('google_maps', 'sviluppatori web', 'Torino Centro', 85),
('google_maps', 'sviluppatori web', 'Bologna Centro', 85),
('google_maps', 'software house', 'Milano Centro', 100),
('google_maps', 'software house', 'Roma Centro Storico', 100),
('google_maps', 'software house', 'Torino Centro', 90),
('google_maps', 'software house', 'Bologna Centro', 85),
('google_maps', 'consulenti seo', 'Milano Centro', 90),
('google_maps', 'consulenti seo', 'Roma Centro Storico', 90),
('google_maps', 'consulenti seo', 'Torino Centro', 80),
('google_maps', 'consulenti seo', 'Bologna Centro', 80),
('google_maps', 'coach digitali', 'Milano Centro', 85),
('google_maps', 'coach digitali', 'Roma Centro Storico', 85),
('google_maps', 'traduttori', 'Milano Centro', 80),
('google_maps', 'traduttori', 'Roma Centro Storico', 85),
('google_maps', 'copywriter', 'Milano Centro', 85),
('google_maps', 'copywriter', 'Roma Centro Storico', 85),
('google_maps', 'ecommerce', 'Milano Centro', 90),
('google_maps', 'ecommerce', 'Roma Centro Storico', 85),

-- ARTIGIANI AGGIUNTIVI
('google_maps', 'piastrellisti', 'Milano Centro', 75),
('google_maps', 'piastrellisti', 'Roma Centro Storico', 75),
('google_maps', 'serramentisti', 'Milano Centro', 80),
('google_maps', 'serramentisti', 'Roma Centro Storico', 80),
('google_maps', 'imbianchini', 'Milano Centro', 80),
('google_maps', 'imbianchini', 'Roma Centro Storico', 80),
('google_maps', 'imprese edili', 'Milano Centro', 85),
('google_maps', 'imprese edili', 'Roma Centro Storico', 85),
('google_maps', 'antennisti', 'Milano Centro', 70),
('google_maps', 'antennisti', 'Roma Centro Storico', 70),
('google_maps', 'installatori climatizzatori', 'Milano Centro', 80),
('google_maps', 'installatori climatizzatori', 'Roma Centro Storico', 80),

-- FOOD AGGIUNTIVO
('google_maps', 'street food', 'Milano Centro', 85),
('google_maps', 'street food', 'Roma Centro Storico', 90),
('google_maps', 'panifici', 'Milano Centro', 80),
('google_maps', 'panifici', 'Roma Centro Storico', 80),
('google_maps', 'enoteche', 'Milano Centro', 85),
('google_maps', 'enoteche', 'Roma Centro Storico', 85),
('google_maps', 'gastronomie', 'Milano Centro', 80),
('google_maps', 'gastronomie', 'Roma Centro Storico', 80),
('google_maps', 'negozi bio', 'Milano Centro', 75),
('google_maps', 'negozi bio', 'Roma Centro Storico', 75),
('google_maps', 'macellerie', 'Milano Centro', 75),
('google_maps', 'macellerie', 'Roma Centro Storico', 75),

-- SALUTE AGGIUNTIVO
('google_maps', 'studi dentistici', 'Milano Centro', 85),
('google_maps', 'studi dentistici', 'Roma Centro Storico', 85),
('google_maps', 'nutrizionisti', 'Milano Centro', 80),
('google_maps', 'nutrizionisti', 'Roma Centro Storico', 80),
('google_maps', 'personal trainer', 'Milano Centro', 80),
('google_maps', 'personal trainer', 'Roma Centro Storico', 80),
('google_maps', 'osteopati', 'Milano Centro', 75),
('google_maps', 'osteopati', 'Roma Centro Storico', 75),
('google_maps', 'psicologi', 'Milano Centro', 80),
('google_maps', 'psicologi', 'Roma Centro Storico', 80),
('google_maps', 'fisioterapisti', 'Milano Centro', 80),
('google_maps', 'fisioterapisti', 'Roma Centro Storico', 80),

-- BUSINESS AGGIUNTIVO
('google_maps', 'noleggio auto', 'Milano Centro', 80),
('google_maps', 'noleggio auto', 'Roma Centro Storico', 85),
('google_maps', 'notai', 'Milano Centro', 75),
('google_maps', 'notai', 'Roma Centro Storico', 80),
('google_maps', 'consulenti aziendali', 'Milano Centro', 85),
('google_maps', 'consulenti aziendali', 'Roma Centro Storico', 85),
('google_maps', 'tipografie', 'Milano Centro', 75),
('google_maps', 'tipografie', 'Roma Centro Storico', 75),
('google_maps', 'centri assistenza pc', 'Milano Centro', 75),
('google_maps', 'centri assistenza pc', 'Roma Centro Storico', 75),
('google_maps', 'servizi di stampa', 'Milano Centro', 75),
('google_maps', 'servizi di stampa', 'Roma Centro Storico', 75),

-- TEMPO LIBERO
('google_maps', 'palestre', 'Milano Centro', 85),
('google_maps', 'palestre', 'Roma Centro Storico', 85),
('google_maps', 'centri yoga', 'Milano Centro', 80),
('google_maps', 'centri yoga', 'Roma Centro Storico', 80),
('google_maps', 'scuole di lingue', 'Milano Centro', 80),
('google_maps', 'scuole di lingue', 'Roma Centro Storico', 80),
('google_maps', 'scuole guida', 'Milano Centro', 80),
('google_maps', 'scuole guida', 'Roma Centro Storico', 80),
('google_maps', 'centri danza', 'Milano Centro', 75),
('google_maps', 'centri danza', 'Roma Centro Storico', 75),
('google_maps', 'scuole di musica', 'Milano Centro', 75),
('google_maps', 'scuole di musica', 'Roma Centro Storico', 75),

-- NICCHIE SPECIALI
('google_maps', 'riparazione cellulari', 'Milano Centro', 80),
('google_maps', 'riparazione cellulari', 'Roma Centro Storico', 80),
('google_maps', 'ferramenta', 'Milano Centro', 75),
('google_maps', 'ferramenta', 'Roma Centro Storico', 75),
('google_maps', 'negozi animali', 'Milano Centro', 75),
('google_maps', 'negozi animali', 'Roma Centro Storico', 75),
('google_maps', 'autofficine', 'Milano Centro', 80),
('google_maps', 'autofficine', 'Roma Centro Storico', 80),
('google_maps', 'lavanderie', 'Milano Centro', 75),
('google_maps', 'lavanderie', 'Roma Centro Storico', 75),
('google_maps', 'stufe e pellet', 'Milano Centro', 70),
('google_maps', 'stufe e pellet', 'Roma Centro Storico', 70)

ON CONFLICT (source, category, location_name) DO NOTHING;

-- Replichiamo le nuove categorie a tutte le città per tutte le fonti
INSERT INTO zones_to_scrape (source, category, location_name, score)
SELECT 
  src.source,
  cat.category,
  città.location_name,
  CASE 
    WHEN città.location_name IN ('Milano Centro', 'Roma Centro Storico', 'Napoli Centro') THEN cat.base_score
    WHEN città.location_name LIKE '%Milano%' OR città.location_name LIKE '%Roma%' OR città.location_name LIKE '%Napoli%' THEN GREATEST(cat.base_score - 5, 30)
    WHEN città.tier = 1 THEN GREATEST(cat.base_score - 10, 40)
    WHEN città.tier = 2 THEN GREATEST(cat.base_score - 20, 35)
    ELSE GREATEST(cat.base_score - 30, 25)
  END - src.score_penalty as final_score
FROM (
  VALUES ('google_maps', 0), ('yelp', 10), ('pagine_gialle', 20)
) AS src(source, score_penalty)
CROSS JOIN (
  VALUES 
    ('videomaker', 85),
    ('sviluppatori web', 85),
    ('software house', 90),
    ('consulenti seo', 80),
    ('coach digitali', 75),
    ('traduttori', 75),
    ('copywriter', 80),
    ('ecommerce', 85),
    ('piastrellisti', 70),
    ('serramentisti', 75),
    ('imbianchini', 75),
    ('imprese edili', 80),
    ('antennisti', 65),
    ('installatori climatizzatori', 75),
    ('street food', 80),
    ('panifici', 75),
    ('enoteche', 80),
    ('gastronomie', 75),
    ('negozi bio', 70),
    ('macellerie', 70),
    ('studi dentistici', 80),
    ('nutrizionisti', 75),
    ('personal trainer', 75),
    ('osteopati', 70),
    ('psicologi', 75),
    ('fisioterapisti', 75),
    ('noleggio auto', 75),
    ('notai', 70),
    ('consulenti aziendali', 80),
    ('tipografie', 70),
    ('centri assistenza pc', 70),
    ('servizi di stampa', 70),
    ('palestre', 80),
    ('centri yoga', 75),
    ('scuole di lingue', 75),
    ('scuole guida', 75),
    ('centri danza', 70),
    ('scuole di musica', 70),
    ('riparazione cellulari', 75),
    ('ferramenta', 70),
    ('negozi animali', 70),
    ('autofficine', 75),
    ('lavanderie', 70),
    ('stufe e pellet', 65)
) AS cat(category, base_score)
CROSS JOIN (
  SELECT location_name, tier FROM (
    VALUES
      ('Milano Navigli', 1), ('Roma Eur', 1), ('Roma Trastevere', 1), ('Napoli Vomero', 1),
      ('Palermo Centro', 1), ('Genova Centro', 1), ('Bari Centro', 1), ('Catania Centro', 1),
      ('Verona Centro', 1), ('Venezia Mestre', 1), ('Padova Centro', 1), ('Trieste Centro', 1),
      ('Brescia Centro', 1), ('Bergamo Bassa', 1), ('Lecce Centro', 2), ('Taranto Centro', 2),
      ('Reggio Calabria', 2), ('Perugia Centro', 2), ('Cagliari Centro', 2), ('Trento Centro', 2),
      ('Bolzano Centro', 2), ('Salerno Centro', 2), ('Rimini Centro', 2), ('Parma Centro', 2),
      ('Modena Centro', 2), ('Pescara Centro', 2), ('Livorno Centro', 2), ('Sassari Centro', 2),
      ('Ferrara Centro', 2), ('Latina Centro', 2), ('Arezzo Centro', 3), ('Pisa Centro', 2),
      ('Lucca Centro', 3), ('Foggia Centro', 3), ('L''Aquila Centro', 3), ('Grosseto Centro', 3),
      ('Treviso Centro', 2), ('Varese Centro', 2), ('Novara Centro', 3), ('Monza Centro', 2),
      ('Como Centro', 2), ('Vercelli', 3), ('Asti', 3), ('Alessandria', 3), ('Viterbo', 3),
      ('Terni', 3), ('Ragusa', 3), ('Siracusa', 3), ('Agrigento', 3), ('Trapani', 3),
      ('Cosenza', 3), ('Crotone', 3), ('Catanzaro', 3), ('Matera', 3), ('Potenza', 3),
      ('Campobasso', 3), ('Benevento', 3), ('Avellino', 3), ('Caserta', 3), ('Brindisi', 3),
      ('Andria', 3), ('Barletta', 3), ('Trani', 3), ('Molfetta', 3), ('Altamura', 3),
      ('Torre del Greco', 3), ('Giugliano in Campania', 3), ('Scafati', 3), 
      ('Castellammare di Stabia', 3), ('Afragola', 3), ('Aversa', 3), ('Nocera Inferiore', 3),
      ('Cava de'' Tirreni', 3), ('Eboli', 3), ('Battipaglia', 3), ('Tivoli', 3),
      ('Guidonia Montecelio', 3), ('Pomezia', 3), ('Aprilia', 3), ('Frosinone', 3),
      ('Velletri', 3), ('Anzio', 3), ('Nettuno', 3), ('Ladispoli', 3), ('Civitavecchia', 3),
      ('Alghero', 3), ('Olbia', 2), ('Nuoro', 3), ('Iglesias', 3), ('Oristano', 3),
      ('Sanremo', 2), ('Imperia', 3), ('Ventimiglia', 3), ('Sesto San Giovanni', 2)
  ) t(location_name, tier)
) AS città
ON CONFLICT (source, category, location_name) DO NOTHING;

-- Statistiche finali
SELECT 
  'TOTALE ZONE CREATE' as descrizione,
  COUNT(*) as count
FROM zones_to_scrape
UNION ALL
SELECT 
  'FONTI DIVERSE' as descrizione,
  COUNT(DISTINCT source) as count
FROM zones_to_scrape
UNION ALL
SELECT 
  'CATEGORIE DIVERSE' as descrizione,
  COUNT(DISTINCT category) as count
FROM zones_to_scrape
UNION ALL
SELECT 
  'CITTÀ DIVERSE' as descrizione,
  COUNT(DISTINCT location_name) as count
FROM zones_to_scrape;

-- Dettaglio per fonte
SELECT 
  source,
  COUNT(*) as zone_totali,
  COUNT(DISTINCT category) as categorie,
  COUNT(DISTINCT location_name) as città,
  AVG(score) as score_medio,
  MIN(score) as score_min,
  MAX(score) as score_max
FROM zones_to_scrape 
GROUP BY source 
ORDER BY source;
