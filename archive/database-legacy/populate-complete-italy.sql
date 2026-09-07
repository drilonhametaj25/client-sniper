-- =====================================================
-- SCRIPT SQL COMPLETO PER POPOLARE TUTTA L'ITALIA
-- =====================================================
-- Popola zones_to_scrape con:
-- ✅ 200+ città italiane (da grandi metropolitane a piccole città)
-- ✅ 80+ categorie business complete
-- ✅ 3 fonti di scraping (google_maps, yelp, pagine_gialle)
-- ✅ Totale: circa 48.000+ combinazioni per scraping completo Italia
-- =====================================================

-- Prima cancelliamo eventuali dati di test esistenti (opzionale)
-- TRUNCATE TABLE zones_to_scrape;

-- =====================================================
-- INSERIMENTO MASSIVO CITTÀ ITALIANE
-- =====================================================
-- Combinazione di tutte le città dai file italian-cities.ts e italian-zones.ts

WITH italian_cities AS (
  SELECT * FROM (VALUES
    -- CITTÀ METROPOLITANE E GRANDI CENTRI
    ('Milano Centro', 'Lombardia', 1396059, 45.4642, 9.1900, 1),
    ('Roma Centro Storico', 'Lazio', 2872800, 41.9028, 12.4964, 1),
    ('Napoli Centro', 'Campania', 967069, 40.8518, 14.2681, 1),
    ('Torino Centro', 'Piemonte', 870952, 45.0703, 7.6869, 1),
    ('Palermo Centro', 'Sicilia', 673735, 38.1157, 13.3615, 1),
    ('Genova Centro', 'Liguria', 583601, 44.4056, 8.9463, 1),
    ('Bologna Centro', 'Emilia-Romagna', 390636, 44.4949, 11.3426, 1),
    ('Firenze Centro', 'Toscana', 382258, 43.7696, 11.2558, 1),
    ('Bari Centro', 'Puglia', 320475, 41.1171, 16.8719, 1),
    ('Catania Centro', 'Sicilia', 311584, 37.5079, 15.0830, 1),
    ('Venezia Centro', 'Veneto', 258685, 45.4408, 12.3155, 1),
    ('Verona Centro', 'Veneto', 259608, 45.4384, 10.9916, 1),
    ('Messina Centro', 'Sicilia', 238439, 38.1938, 15.5540, 1),
    ('Padova Centro', 'Veneto', 214198, 45.4064, 11.8768, 1),
    ('Trieste Centro', 'Friuli-Venezia Giulia', 204338, 45.6495, 13.7768, 1),
    ('Brescia Centro', 'Lombardia', 196745, 45.5416, 10.2118, 1),
    ('Prato Centro', 'Toscana', 195213, 43.8777, 11.0955, 1),
    ('Modena Centro', 'Emilia-Romagna', 185273, 44.6473, 10.9252, 1),
    ('Reggio Calabria', 'Calabria', 180817, 38.1102, 15.6410, 1),
    ('Reggio Emilia', 'Emilia-Romagna', 171944, 44.6989, 10.6307, 1),
    ('Perugia Centro', 'Umbria', 166134, 43.1107, 12.3908, 1),
    ('Ravenna Centro', 'Emilia-Romagna', 159115, 44.4173, 12.1988, 1),
    ('Livorno Centro', 'Toscana', 158493, 43.5428, 10.3167, 1),
    ('Cagliari Centro', 'Sardegna', 154460, 39.2238, 9.1217, 1),
    ('Foggia Centro', 'Puglia', 153143, 41.4621, 15.5444, 1),
    ('Rimini Centro', 'Emilia-Romagna', 150951, 44.0678, 12.5695, 1),
    ('Salerno Centro', 'Campania', 133970, 40.6824, 14.7681, 1),
    ('Ferrara Centro', 'Emilia-Romagna', 132009, 44.8381, 11.6198, 1),
    ('Sassari Centro', 'Sardegna', 127525, 40.7259, 8.5594, 1),
    ('Monza Centro', 'Lombardia', 123598, 45.5845, 9.2744, 1),
    ('Latina Centro', 'Lazio', 127350, 41.4677, 12.9041, 1),
    ('Bergamo Centro', 'Lombardia', 120287, 45.6947, 9.6772, 1),
    ('Siracusa Centro', 'Sicilia', 121605, 37.0755, 15.2866, 1),
    ('Pescara Centro', 'Abruzzo', 119483, 42.4584, 14.2081, 1),
    ('Forlì Centro', 'Emilia-Romagna', 118359, 44.2226, 12.0401, 1),
    ('Trento Centro', 'Trentino-Alto Adige', 118142, 46.0748, 11.1217, 1),
    ('Vicenza Centro', 'Veneto', 111500, 45.5455, 11.5353, 1),
    ('Terni Centro', 'Umbria', 111189, 42.5633, 12.6433, 1),
    ('Bolzano Centro', 'Trentino-Alto Adige', 107436, 46.4983, 11.3548, 1),
    ('Piacenza Centro', 'Emilia-Romagna', 103887, 45.0526, 9.6929, 1),
    ('Ancona Centro', 'Marche', 100861, 43.6158, 13.5189, 1),
    ('Andria Centro', 'Puglia', 100052, 41.2273, 16.2967, 1),
    ('Udine Centro', 'Friuli-Venezia Giulia', 99627, 46.0569, 13.2371, 1),
    ('Arezzo Centro', 'Toscana', 99543, 43.4633, 11.8796, 1),
    ('Cesena Centro', 'Emilia-Romagna', 97324, 44.1391, 12.2431, 1),
    ('Lecce Centro', 'Puglia', 95766, 40.3515, 18.1750, 1),
    ('Pesaro Centro', 'Marche', 95011, 43.9102, 12.9113, 1),
    ('La Spezia Centro', 'Liguria', 94979, 44.1023, 9.8251, 1),
    ('Alessandria Centro', 'Piemonte', 93980, 44.9133, 8.6146, 1),
    ('Pistoia Centro', 'Toscana', 90363, 43.9334, 10.9177, 1),
    ('Pisa Centro', 'Toscana', 90488, 43.7228, 10.4017, 1),
    ('Lucca Centro', 'Toscana', 89046, 43.8430, 10.5015, 1),
    ('Guidonia Montecelio', 'Lazio', 88181, 42.0186, 12.7242, 2),
    ('Brindisi Centro', 'Puglia', 87870, 40.6320, 17.9464, 2),
    ('Catanzaro Centro', 'Calabria', 91000, 38.9072, 16.5958, 2),
    ('Treviso Centro', 'Veneto', 85188, 45.6669, 12.2433, 2),
    ('Varese Centro', 'Lombardia', 80544, 45.8205, 8.8250, 2),
    ('Como Centro', 'Lombardia', 84834, 45.8080, 9.0852, 2),
    ('Grosseto Centro', 'Toscana', 81191, 42.7596, 11.1077, 2),
    ('Sesto San Giovanni', 'Lombardia', 81588, 45.5369, 9.2307, 2),
    ('Fiumicino', 'Lazio', 79818, 41.7594, 12.2258, 2),
    ('Torre del Greco', 'Campania', 85664, 40.7815, 14.3691, 2),
    ('Caserta Centro', 'Campania', 76654, 41.0740, 14.3330, 2),
    ('Asti Centro', 'Piemonte', 76164, 44.9009, 8.2065, 2),
    ('Aprilia', 'Lazio', 74506, 41.5921, 12.6427, 2),
    ('Gela', 'Sicilia', 74858, 37.0732, 14.2407, 2),
    ('Ragusa Centro', 'Sicilia', 73288, 36.9264, 14.7270, 2),
    ('Cremona Centro', 'Lombardia', 72680, 45.1327, 10.0222, 2),
    ('Altamura Centro', 'Puglia', 70595, 40.8267, 16.5533, 2),
    ('Carpi Centro', 'Emilia-Romagna', 71158, 44.7842, 10.8832, 2),
    ('L''Aquila Centro', 'Abruzzo', 69558, 42.3498, 13.3995, 2),
    ('Trapani Centro', 'Sicilia', 68346, 38.0176, 12.5365, 2),
    ('Potenza Centro', 'Basilicata', 67122, 40.6420, 15.8059, 2),
    ('Cosenza Centro', 'Calabria', 67239, 39.2906, 16.2542, 2),
    ('Vigevano', 'Lombardia', 63534, 45.3141, 8.8544, 2),
    ('Crotone Centro', 'Calabria', 65078, 39.0808, 17.1127, 2),
    ('Pomezia', 'Lazio', 63508, 41.6691, 12.5073, 2),
    ('Carrara Centro', 'Toscana', 62592, 44.0806, 10.1039, 2),
    ('Caltanissetta Centro', 'Sicilia', 62317, 37.4861, 14.0625, 2),
    ('Fano Centro', 'Marche', 60715, 43.8436, 13.0172, 2),
    ('Matera Centro', 'Basilicata', 60351, 40.6664, 16.6043, 2),
    ('Savona Centro', 'Liguria', 60632, 44.3097, 8.4814, 2),
    ('Agrigento Centro', 'Sicilia', 59286, 37.3257, 13.5765, 2),
    ('Faenza Centro', 'Emilia-Romagna', 58595, 44.2855, 11.8847, 2),
    ('Tivoli', 'Lazio', 56648, 41.9630, 12.7973, 2),
    ('Cuneo Centro', 'Piemonte', 56281, 44.3841, 7.5426, 2),
    ('Teramo Centro', 'Abruzzo', 54444, 42.6589, 13.7003, 2),
    ('Sanremo Centro', 'Liguria', 54236, 43.8158, 7.7764, 2),
    ('Siena Centro', 'Toscana', 53901, 43.3188, 11.3307, 2),
    ('Aversa Centro', 'Campania', 52974, 40.9664, 14.2064, 2),
    ('Rovigo Centro', 'Veneto', 51378, 45.0704, 11.7903, 2),
    ('Chieti Centro', 'Abruzzo', 50770, 42.3478, 14.1694, 2),
    ('Campobasso Centro', 'Molise', 49341, 41.5630, 14.6564, 2),
    ('Ascoli Piceno Centro', 'Marche', 47815, 42.8542, 13.5763, 2),
    ('Frosinone Centro', 'Lazio', 46286, 41.6401, 13.3401, 2),
    ('Vercelli Centro', 'Piemonte', 46552, 45.3204, 8.4185, 2),
    ('Biella Centro', 'Piemonte', 44616, 45.5659, 8.0553, 2),
    ('Macerata Centro', 'Marche', 41564, 43.2999, 13.4534, 2),
    ('Imperia Centro', 'Liguria', 42421, 43.8849, 8.0276, 2),
    ('Viterbo Centro', 'Lazio', 42175, 42.4175, 12.1067, 2),
    ('Massa Centro', 'Toscana', 68713, 44.0355, 10.1411, 2),
    ('Olbia Centro', 'Sardegna', 60346, 40.9267, 9.4983, 2),
    ('Belluno Centro', 'Veneto', 35870, 46.1391, 12.2153, 3),
    ('Verbania Centro', 'Piemonte', 30827, 45.9214, 8.5541, 3),
    ('Aosta Centro', 'Valle d''Aosta', 34062, 45.7369, 7.3153, 3),
    ('Pordenone Centro', 'Friuli-Venezia Giulia', 51723, 45.9560, 12.6604, 3),
    ('Gorizia Centro', 'Friuli-Venezia Giulia', 34157, 45.9411, 13.6222, 3),
    ('Nuoro Centro', 'Sardegna', 36347, 40.3209, 9.3305, 3),
    ('Oristano Centro', 'Sardegna', 31671, 39.9037, 8.5916, 3),
    ('Iglesias Centro', 'Sardegna', 27230, 39.3085, 8.5378, 3),
    ('Isernia Centro', 'Molise', 21678, 41.5956, 14.2305, 3),
    ('Enna Centro', 'Sicilia', 27855, 37.5641, 14.2806, 3),
    ('Vibo Valentia Centro', 'Calabria', 33857, 38.6757, 16.1032, 3),
    
    -- CITTÀ SECONDARIE E CENTRI MINORI
    ('Milano Navigli', 'Lombardia', 100000, 45.4500, 9.1700, 2),
    ('Roma Eur', 'Lazio', 150000, 41.8400, 12.4700, 2),
    ('Roma Trastevere', 'Lazio', 80000, 41.8890, 12.4692, 2),
    ('Napoli Vomero', 'Campania', 120000, 40.8300, 14.2300, 2),
    ('Torino Lingotto', 'Piemonte', 90000, 45.0400, 7.6700, 2),
    ('Palermo Mondello', 'Sicilia', 70000, 38.2100, 13.3200, 2),
    ('Genova Sestri Ponente', 'Liguria', 60000, 44.4200, 8.9000, 2),
    ('Bologna San Donato', 'Emilia-Romagna', 50000, 44.4800, 11.3600, 2),
    ('Firenze Oltrarno', 'Toscana', 45000, 43.7600, 11.2400, 2),
    ('Bari Japigia', 'Puglia', 40000, 41.1000, 16.8900, 2),
    ('Catania Borgo', 'Sicilia', 35000, 37.5100, 15.0700, 2),
    ('Venezia Mestre', 'Veneto', 180000, 45.4900, 12.2400, 2),
    ('Verona Borgo Trento', 'Veneto', 30000, 45.4500, 10.9700, 2),
    ('Padova Arcella', 'Veneto', 25000, 45.4200, 11.8600, 2),
    ('Trieste Borgo Teresiano', 'Friuli-Venezia Giulia', 20000, 45.6600, 13.7600, 2),
    ('Brescia Lamarmora', 'Lombardia', 18000, 45.5300, 10.2200, 2),
    ('Modena Cittanova', 'Emilia-Romagna', 15000, 44.6400, 10.9300, 2),
    ('Reggio Emilia Pieve Modolena', 'Emilia-Romagna', 12000, 44.7100, 10.6200, 2),
    ('Perugia Ponte San Giovanni', 'Umbria', 20000, 43.0700, 12.4200, 2),
    ('Ravenna Lido Adriano', 'Emilia-Romagna', 8000, 44.4700, 12.2800, 2),
    ('Livorno Ardenza', 'Toscana', 10000, 43.5200, 10.3300, 2),
    ('Cagliari Pirri', 'Sardegna', 25000, 39.2300, 9.1400, 2),
    ('Foggia Incoronata', 'Puglia', 12000, 41.4800, 15.5200, 2),
    ('Rimini Bellariva', 'Emilia-Romagna', 15000, 44.0500, 12.6000, 2),
    ('Salerno Torrione', 'Campania', 8000, 40.6700, 14.7800, 2),
    ('Ferrara Pontelagoscuro', 'Emilia-Romagna', 6000, 44.8800, 11.6100, 2),
    ('Sassari Li Punti', 'Sardegna', 10000, 40.7500, 8.5400, 2),
    ('Monza San Fruttuoso', 'Lombardia', 12000, 45.5900, 9.2600, 2),
    ('Bergamo Città Alta', 'Lombardia', 8000, 45.7000, 9.6600, 2),
    ('Siracusa Ortigia', 'Sicilia', 5000, 37.0600, 15.2900, 2),
    ('Pescara Porta Nuova', 'Abruzzo', 7000, 42.4700, 14.2000, 2),
    ('Forlì Vecchiazzano', 'Emilia-Romagna', 4000, 44.2100, 12.0600, 2),
    ('Trento Oltrefersina', 'Trentino-Alto Adige', 6000, 46.0600, 11.1400, 2),
    ('Vicenza Borgo Berga', 'Veneto', 5000, 45.5600, 11.5200, 2),
    ('Terni Borgo Rivo', 'Umbria', 4000, 42.5500, 12.6600, 2),
    ('Bolzano Oltrisarco', 'Trentino-Alto Adige', 8000, 46.5100, 11.3400, 2),
    ('Piacenza Borgotrebbia', 'Emilia-Romagna', 3000, 45.0300, 9.7100, 2),
    ('Ancona Torrette', 'Marche', 4000, 43.6300, 13.4900, 2),
    ('Udine Cussignacco', 'Friuli-Venezia Giulia', 3000, 46.0400, 13.2600, 2),
    ('Arezzo Saione', 'Toscana', 2000, 43.4500, 11.9000, 2),
    ('Cesena San Mauro', 'Emilia-Romagna', 1500, 44.1500, 12.2200, 2),
    ('Lecce Surbo', 'Puglia', 15000, 40.3900, 18.1500, 2),
    ('Pesaro Muraglia', 'Marche', 8000, 43.9300, 12.8900, 2),
    ('La Spezia Migliarina', 'Liguria', 6000, 44.1200, 9.8000, 2),
    ('Alessandria Pista', 'Piemonte', 5000, 44.9000, 8.6300, 2),
    ('Pistoia Sant''Agostino', 'Toscana', 4000, 43.9200, 10.9300, 2),
    ('Pisa San Cataldo', 'Toscana', 3000, 43.6800, 10.4200, 2),
    ('Lucca San Concordio', 'Toscana', 2000, 43.8300, 10.4800, 2),
    ('Brindisi Casale', 'Puglia', 6000, 40.6200, 17.9600, 2),
    ('Catanzaro Lido', 'Calabria', 10000, 38.9200, 16.6200, 2),
    ('Treviso Santa Bona', 'Veneto', 4000, 45.6800, 12.2600, 2),
    ('Varese Casbeno', 'Lombardia', 3000, 45.8000, 8.8400, 2),
    ('Como Rebbio', 'Lombardia', 2000, 45.8200, 9.0700, 2),
    ('Grosseto Roselle', 'Toscana', 1500, 42.7800, 11.0800, 2),
    ('Caserta Casagiove', 'Campania', 18000, 41.0900, 14.3100, 2),
    ('Asti Corso Alfieri', 'Piemonte', 8000, 44.8900, 8.2200, 2),
    ('Ragusa Ibla', 'Sicilia', 3000, 36.9200, 14.7300, 2),
    ('Cremona Po', 'Lombardia', 2000, 45.1400, 10.0400, 2),
    ('Altamura Santeramo', 'Puglia', 12000, 40.8400, 16.5400, 2),
    ('Carpi Quartirolo', 'Emilia-Romagna', 8000, 44.7900, 10.8700, 2),
    ('L''Aquila Coppito', 'Abruzzo', 5000, 42.3700, 13.3800, 2),
    ('Trapani Erice', 'Sicilia', 28000, 38.0400, 12.5200, 2),
    ('Potenza Macchia Romana', 'Basilicata', 8000, 40.6300, 15.8200, 2),
    ('Cosenza Rende', 'Calabria', 35000, 39.3200, 16.2300, 2),
    ('Crotone Papanice', 'Calabria', 4000, 39.0900, 17.1400, 2),
    ('Carrara Avenza', 'Toscana', 12000, 44.0400, 10.1200, 2),
    ('Caltanissetta Santa Barbara', 'Sicilia', 8000, 37.4700, 14.0800, 2),
    ('Fano Centinarola', 'Marche', 3000, 43.8600, 13.0000, 2),
    ('Matera Piccianello', 'Basilicata', 4000, 40.6800, 16.5900, 2),
    ('Savona Villapiana', 'Liguria', 5000, 44.3200, 8.4600, 2),
    ('Agrigento Porto Empedocle', 'Sicilia', 17000, 37.2900, 13.5300, 2),
    ('Faenza Borgo Durbecco', 'Emilia-Romagna', 2000, 44.2900, 11.8600, 2),
    ('Cuneo Borgo San Giuseppe', 'Piemonte', 3000, 44.3900, 7.5300, 2),
    ('Teramo Piano D''Accio', 'Abruzzo', 2000, 42.6700, 13.6900, 2),
    ('Sanremo Arma di Taggia', 'Liguria', 13000, 43.8400, 7.8500, 2),
    ('Siena Scacciapensieri', 'Toscana', 1500, 43.3300, 11.3100, 2),
    ('Aversa Teverola', 'Campania', 12000, 40.9800, 14.1900, 2),
    ('Rovigo Boara Pisani', 'Veneto', 2000, 45.0500, 11.8200, 2),
    ('Chieti Scalo', 'Abruzzo', 8000, 42.3600, 14.1500, 2),
    ('Campobasso Vazzieri', 'Molise', 1500, 41.5500, 14.6700, 2),
    ('Ascoli Piceno Porta Maggiore', 'Marche', 2000, 42.8600, 13.5600, 2),
    ('Frosinone Scalo', 'Lazio', 8000, 41.6300, 13.3600, 2),
    ('Vercelli Isola Bella', 'Piemonte', 1200, 45.3300, 8.4000, 2),
    ('Biella Chiavazza', 'Piemonte', 2000, 45.5500, 8.0700, 2),
    ('Macerata Villa Potenza', 'Marche', 3000, 43.2800, 13.4700, 2),
    ('Imperia Oneglia', 'Liguria', 20000, 43.8700, 8.0400, 2),
    ('Viterbo Bagnaia', 'Lazio', 6000, 42.4300, 12.0900, 2),
    ('Massa Ronchi', 'Toscana', 5000, 44.0200, 10.1600, 2),
    ('Olbia Pittulongu', 'Sardegna', 8000, 40.9500, 9.5200, 2),
    ('Belluno Castione', 'Veneto', 1500, 46.1200, 12.2300, 3),
    ('Verbania Pallanza', 'Piemonte', 12000, 45.9400, 8.5300, 3),
    ('Aosta Sarre', 'Valle d''Aosta', 4600, 45.7100, 7.2500, 3),
    ('Pordenone Cordenons', 'Friuli-Venezia Giulia', 18000, 45.9700, 12.6800, 3),
    ('Gorizia Nova Gorica', 'Friuli-Venezia Giulia', 31000, 45.9600, 13.6500, 3),
    ('Nuoro Pratosardo', 'Sardegna', 2000, 40.3400, 9.3100, 3),
    ('Oristano Torregrande', 'Sardegna', 3000, 39.8900, 8.5100, 3),
    ('Iglesias Carbonia', 'Sardegna', 28000, 39.1700, 8.5200, 3),
    ('Isernia Pesche', 'Molise', 1500, 41.6100, 14.2500, 3),
    ('Enna Pergusa', 'Sicilia', 2000, 37.5300, 14.3100, 3),
    ('Vibo Valentia Pizzo', 'Calabria', 9000, 38.7300, 16.1600, 3)
  ) AS cities(location_name, region, population, lat, lng, tier)
),

-- =====================================================
-- CATEGORIE BUSINESS COMPLETE
-- =====================================================
business_categories AS (
  SELECT * FROM (VALUES
    -- SETTORE DIGITALE E TECH
    ('web agency', 100, 'Agenzia per sviluppo siti web e marketing digitale'),
    ('sviluppatori web', 95, 'Sviluppatori freelance e team di programmazione'),
    ('software house', 100, 'Aziende di sviluppo software su misura'),
    ('graphic designer', 90, 'Designer grafici freelance e studi creativi'),
    ('social media manager', 95, 'Esperti gestione social media aziendali'),
    ('agenzie di comunicazione', 100, 'Agenzie pubblicitarie e comunicazione'),
    ('videomaker', 90, 'Produzione video aziendali e commerciali'),
    ('fotografi', 85, 'Fotografi professionali per eventi e aziende'),
    ('consulenti seo', 90, 'Specialisti ottimizzazione motori di ricerca'),
    ('copywriter', 85, 'Redattori e creatori di contenuti'),
    ('traduttori', 80, 'Servizi di traduzione professionale'),
    ('coach digitali', 85, 'Consulenti per trasformazione digitale'),
    ('ecommerce', 90, 'Specialisti negozi online e marketplace'),
    ('centri assistenza pc', 75, 'Riparazione e assistenza computer'),
    ('riparazione cellulari', 80, 'Assistenza e riparazione smartphone'),
    
    -- ARTIGIANI E SERVIZI TECNICI
    ('idraulici', 85, 'Impianti idraulici e riparazioni'),
    ('elettricisti', 85, 'Impianti elettrici e manutenzione'),
    ('fabbri', 80, 'Lavorazione ferro e serrature'),
    ('muratori', 80, 'Costruzioni e ristrutturazioni edili'),
    ('imbianchini', 80, 'Tinteggiature e decorazioni'),
    ('piastrellisti', 75, 'Pavimenti e rivestimenti'),
    ('serramentisti', 80, 'Infissi e serramenti su misura'),
    ('imprese edili', 85, 'Costruzioni e ristrutturazioni complete'),
    ('antennisti', 70, 'Installazione e riparazione antenne'),
    ('installatori climatizzatori', 80, 'Impianti di climatizzazione'),
    ('giardinieri', 75, 'Manutenzione giardini e aree verdi'),
    ('stufe e pellet', 70, 'Vendita e installazione stufe'),
    ('autofficine', 80, 'Riparazione e manutenzione auto'),
    ('imprese di pulizie', 85, 'Servizi di pulizia per aziende'),
    ('lavanderie', 75, 'Lavanderie a secco e self-service'),
    ('ferramenta', 75, 'Negozi di ferramenta e utensili'),
    
    -- FOOD & BEVERAGE
    ('ristoranti', 95, 'Ristoranti e trattorie'),
    ('pizzerie', 95, 'Pizzerie e rosticcerie'),
    ('bar', 95, 'Bar e caffetterie'),
    ('gelaterie', 85, 'Gelaterie artigianali'),
    ('street food', 85, 'Cibo da strada e take away'),
    ('panifici', 80, 'Panetterie e pasticcerie'),
    ('enoteche', 85, 'Enoteche e wine bar'),
    ('gastronomie', 80, 'Gastronomie e salumerie'),
    ('negozi bio', 75, 'Prodotti biologici e naturali'),
    ('macellerie', 75, 'Macellerie tradizionali'),
    
    -- SALUTE E BENESSERE
    ('barberie', 90, 'Barbieri e parrucchieri uomo'),
    ('parrucchieri', 90, 'Parrucchieri e saloni di bellezza'),
    ('estetiste', 85, 'Centri estetici e trattamenti'),
    ('centri benessere', 80, 'Spa e centri benessere'),
    ('studi dentistici', 85, 'Studi odontoiatrici'),
    ('nutrizionisti', 80, 'Consulenza nutrizionale'),
    ('personal trainer', 80, 'Allenatori personali'),
    ('osteopati', 75, 'Terapie osteopatiche'),
    ('psicologi', 80, 'Consulenza psicologica'),
    ('fisioterapisti', 80, 'Fisioterapia e riabilitazione'),
    ('palestre', 85, 'Centri fitness e palestre'),
    ('centri yoga', 80, 'Studi di yoga e meditazione'),
    
    -- BUSINESS E PROFESSIONI
    ('agenzie immobiliari', 95, 'Compravendita e affitti immobili'),
    ('commercialisti', 85, 'Consulenza fiscale e contabile'),
    ('avvocati', 90, 'Studi legali e consulenza'),
    ('notai', 75, 'Servizi notarili'),
    ('consulenti aziendali', 85, 'Consulenza per imprese'),
    ('noleggio auto', 80, 'Autonoleggio e rent a car'),
    ('assicurazioni', 85, 'Agenzie assicurative'),
    ('banche', 80, 'Istituti di credito e sportelli'),
    ('agenzie viaggi', 75, 'Turismo e viaggi organizzati'),
    ('immobiliari', 90, 'Agenzie immobiliari specializzate'),
    
    -- SERVIZI STAMPA E COMUNICAZIONE
    ('tipografie', 75, 'Stampa e servizi grafici'),
    ('servizi di stampa', 75, 'Stampa digitale e offset'),
    ('copisterie', 70, 'Servizi di copiatura e rilegatura'),
    ('cartolerie', 65, 'Cartolerie e articoli per ufficio'),
    
    -- ISTRUZIONE E FORMAZIONE
    ('scuole di lingue', 80, 'Corsi di lingua straniera'),
    ('scuole guida', 80, 'Autoscuole e corsi di guida'),
    ('centri danza', 75, 'Scuole di danza e ballo'),
    ('scuole di musica', 75, 'Lezioni di musica e strumenti'),
    ('centri di formazione', 75, 'Corsi professionali e certificazioni'),
    ('ripetizioni', 70, 'Lezioni private e doposcuola'),
    
    -- ANIMALI E PET
    ('veterinari', 80, 'Cliniche veterinarie'),
    ('negozi animali', 75, 'Negozi per animali domestici'),
    ('toelettatori', 70, 'Toelettatura animali'),
    ('pensioni per animali', 65, 'Pensioni e dog sitter'),
    
    -- TRASPORTI E LOGISTICA
    ('autotrasporti', 75, 'Trasporti e logistica'),
    ('corrieri', 75, 'Servizi di corriere e spedizioni'),
    ('taxi', 70, 'Servizi taxi e NCC'),
    ('autorimesse', 65, 'Parcheggi e autorimesse'),
    
    -- TEMPO LIBERO E SPORT
    ('librerie', 70, 'Librerie e cartolerie'),
    ('fioristi', 75, 'Fiorai e addobbi floreali'),
    ('negozi sport', 75, 'Articoli sportivi e attrezzature'),
    ('giocattoli', 70, 'Negozi di giocattoli'),
    ('hobby', 65, 'Articoli per hobby e collezionismo'),
    
    -- MODA E ABBIGLIAMENTO
    ('boutique', 75, 'Negozi di abbigliamento'),
    ('calzature', 70, 'Calzolerie e negozi scarpe'),
    ('sartorie', 70, 'Sartorie e riparazioni'),
    ('pelletterie', 65, 'Borse e articoli in pelle'),
    
    -- CASA E ARREDAMENTO
    ('mobilifici', 80, 'Arredamento e mobili'),
    ('elettrodomestici', 75, 'Vendita elettrodomestici'),
    ('casalinghi', 70, 'Articoli per la casa'),
    ('decorazioni', 65, 'Oggettistica e decorazioni'),
    
    -- SETTORI SPECIALIZZATI
    ('wedding planner', 75, 'Organizzazione matrimoni'),
    ('catering', 80, 'Servizi di catering'),
    ('security', 75, 'Servizi di sicurezza'),
    ('pulizie industriali', 80, 'Pulizie specializzate'),
    ('gommisti', 75, 'Pneumatici e cerchi'),
    ('carrozzerie', 75, 'Riparazione carrozzerie auto')
  ) AS categories(category, base_score, description)
),

-- =====================================================
-- FONTI DI SCRAPING
-- =====================================================
scraping_sources AS (
  SELECT * FROM (VALUES
    ('google_maps', 0, 'Google Maps - Fonte principale'),
    ('yelp', 10, 'Yelp - Fonte secondaria'),
    ('pagine_gialle', 20, 'Pagine Gialle - Fonte terziaria')
  ) AS sources(source, score_penalty, description)
)

-- =====================================================
-- INSERIMENTO COMBINATO
-- =====================================================
INSERT INTO zones_to_scrape (source, category, location_name, score, geohash, bounding_box)
SELECT 
  s.source,
  c.category,
  ct.location_name,
  GREATEST(
    -- Score base dalla categoria
    c.base_score
    -- Penalità per fonte
    - s.score_penalty
    -- Adeguamento per dimensione città
    - CASE 
        WHEN ct.tier = 1 THEN 0  -- Città grandi: nessuna penalità
        WHEN ct.tier = 2 THEN 15 -- Città medie: -15 punti
        WHEN ct.tier = 3 THEN 30 -- Città piccole: -30 punti
        ELSE 35 -- Fallback: -35 punti
      END
    -- Bonus per categorie ad alto potenziale in città grandi
    + CASE 
        WHEN ct.tier = 1 AND c.category IN ('web agency', 'software house', 'agenzie di comunicazione', 'ristoranti', 'agenzie immobiliari') THEN 10
        WHEN ct.tier = 1 AND c.category IN ('social media manager', 'graphic designer', 'avvocati', 'commercialisti') THEN 5
        ELSE 0
      END
    -- Penalità per categorie saturate in città piccole
    - CASE 
        WHEN ct.tier = 3 AND c.category IN ('software house', 'agenzie di comunicazione', 'consulenti seo') THEN 15
        WHEN ct.tier = 3 AND c.category IN ('web agency', 'social media manager') THEN 10
        ELSE 0
      END,
    25 -- Score minimo garantito
  ) as final_score,
  NULL as geohash, -- Sarà calcolato automaticamente dal sistema
  json_build_object(
    'north', ct.lat + 0.05,
    'south', ct.lat - 0.05,
    'east', ct.lng + 0.05,
    'west', ct.lng - 0.05
  ) as bounding_box
FROM scraping_sources s
CROSS JOIN business_categories c
CROSS JOIN italian_cities ct
-- Filtri per ottimizzare inserimenti
WHERE 
  -- Escludi combinazioni non sensate per città molto piccole
  NOT (ct.tier = 3 AND c.category IN ('software house', 'agenzie di comunicazione', 'consulenti seo', 'ecommerce'))
  -- Escludi categorie urbane per città piccolissime
  AND NOT (ct.population < 20000 AND c.category IN ('centri benessere', 'centri yoga', 'wedding planner', 'catering'))
ON CONFLICT (source, category, location_name) DO NOTHING;

-- =====================================================
-- CREAZIONE INDICI PER PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_zones_to_scrape_priority ON zones_to_scrape(score DESC, last_scraped_at ASC NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_zones_to_scrape_source_category ON zones_to_scrape(source, category);
CREATE INDEX IF NOT EXISTS idx_zones_to_scrape_location ON zones_to_scrape(location_name);
CREATE INDEX IF NOT EXISTS idx_zones_to_scrape_scraping_status ON zones_to_scrape(is_scraping_now, last_scraped_at);

-- =====================================================
-- AGGIORNAMENTO TIMESTAMP
-- =====================================================
UPDATE zones_to_scrape SET updated_at = NOW() WHERE updated_at IS NULL;

-- =====================================================
-- STATISTICHE FINALI
-- =====================================================
SELECT 
  '🚀 POPOLAMENTO COMPLETATO!' as status,
  COUNT(*) as total_zones,
  COUNT(DISTINCT source) as total_sources,
  COUNT(DISTINCT category) as total_categories,
  COUNT(DISTINCT location_name) as total_cities,
  ROUND(AVG(score), 2) as avg_score,
  MIN(score) as min_score,
  MAX(score) as max_score
FROM zones_to_scrape;

-- Dettaglio per fonte
SELECT 
  '📊 STATISTICHE PER FONTE' as info,
  source,
  COUNT(*) as zones_count,
  COUNT(DISTINCT category) as categories_count,
  COUNT(DISTINCT location_name) as cities_count,
  ROUND(AVG(score), 2) as avg_score,
  MIN(score) as min_score,
  MAX(score) as max_score
FROM zones_to_scrape 
GROUP BY source 
ORDER BY source;

-- Top 20 combinazioni per score
SELECT 
  '🏆 TOP 20 ZONE PER PRIORITÀ' as info,
  source,
  category,
  location_name,
  score
FROM zones_to_scrape 
ORDER BY score DESC, location_name 
LIMIT 20;

-- Conteggio per regione
SELECT 
  '🗺️ ZONE PER REGIONE' as info,
  CASE 
    WHEN location_name LIKE '%Milano%' OR location_name LIKE '%Bergamo%' OR location_name LIKE '%Brescia%' OR location_name LIKE '%Como%' OR location_name LIKE '%Cremona%' OR location_name LIKE '%Monza%' OR location_name LIKE '%Varese%' THEN 'Lombardia'
    WHEN location_name LIKE '%Roma%' OR location_name LIKE '%Latina%' OR location_name LIKE '%Frosinone%' OR location_name LIKE '%Viterbo%' OR location_name LIKE '%Guidonia%' OR location_name LIKE '%Fiumicino%' OR location_name LIKE '%Aprilia%' OR location_name LIKE '%Pomezia%' OR location_name LIKE '%Tivoli%' THEN 'Lazio'
    WHEN location_name LIKE '%Napoli%' OR location_name LIKE '%Salerno%' OR location_name LIKE '%Torre del Greco%' OR location_name LIKE '%Caserta%' OR location_name LIKE '%Aversa%' THEN 'Campania'
    WHEN location_name LIKE '%Torino%' OR location_name LIKE '%Alessandria%' OR location_name LIKE '%Asti%' OR location_name LIKE '%Cuneo%' OR location_name LIKE '%Vercelli%' OR location_name LIKE '%Biella%' OR location_name LIKE '%Verbania%' THEN 'Piemonte'
    WHEN location_name LIKE '%Palermo%' OR location_name LIKE '%Catania%' OR location_name LIKE '%Messina%' OR location_name LIKE '%Siracusa%' OR location_name LIKE '%Ragusa%' OR location_name LIKE '%Trapani%' OR location_name LIKE '%Gela%' OR location_name LIKE '%Caltanissetta%' OR location_name LIKE '%Agrigento%' OR location_name LIKE '%Enna%' THEN 'Sicilia'
    WHEN location_name LIKE '%Genova%' OR location_name LIKE '%La Spezia%' OR location_name LIKE '%Savona%' OR location_name LIKE '%Imperia%' OR location_name LIKE '%Sanremo%' THEN 'Liguria'
    WHEN location_name LIKE '%Bologna%' OR location_name LIKE '%Modena%' OR location_name LIKE '%Parma%' OR location_name LIKE '%Reggio Emilia%' OR location_name LIKE '%Ravenna%' OR location_name LIKE '%Ferrara%' OR location_name LIKE '%Forlì%' OR location_name LIKE '%Rimini%' OR location_name LIKE '%Piacenza%' OR location_name LIKE '%Cesena%' OR location_name LIKE '%Faenza%' OR location_name LIKE '%Carpi%' OR location_name LIKE '%Imola%' THEN 'Emilia-Romagna'
    WHEN location_name LIKE '%Firenze%' OR location_name LIKE '%Prato%' OR location_name LIKE '%Livorno%' OR location_name LIKE '%Arezzo%' OR location_name LIKE '%Pistoia%' OR location_name LIKE '%Pisa%' OR location_name LIKE '%Lucca%' OR location_name LIKE '%Grosseto%' OR location_name LIKE '%Siena%' OR location_name LIKE '%Massa%' OR location_name LIKE '%Carrara%' THEN 'Toscana'
    WHEN location_name LIKE '%Bari%' OR location_name LIKE '%Foggia%' OR location_name LIKE '%Lecce%' OR location_name LIKE '%Brindisi%' OR location_name LIKE '%Andria%' OR location_name LIKE '%Altamura%' THEN 'Puglia'
    WHEN location_name LIKE '%Venezia%' OR location_name LIKE '%Verona%' OR location_name LIKE '%Padova%' OR location_name LIKE '%Vicenza%' OR location_name LIKE '%Treviso%' OR location_name LIKE '%Rovigo%' OR location_name LIKE '%Belluno%' THEN 'Veneto'
    WHEN location_name LIKE '%Cagliari%' OR location_name LIKE '%Sassari%' OR location_name LIKE '%Olbia%' OR location_name LIKE '%Nuoro%' OR location_name LIKE '%Oristano%' OR location_name LIKE '%Iglesias%' THEN 'Sardegna'
    WHEN location_name LIKE '%Reggio Calabria%' OR location_name LIKE '%Catanzaro%' OR location_name LIKE '%Cosenza%' OR location_name LIKE '%Crotone%' OR location_name LIKE '%Vibo Valentia%' THEN 'Calabria'
    WHEN location_name LIKE '%Ancona%' OR location_name LIKE '%Pesaro%' OR location_name LIKE '%Fano%' OR location_name LIKE '%Ascoli Piceno%' OR location_name LIKE '%Macerata%' THEN 'Marche'
    WHEN location_name LIKE '%Perugia%' OR location_name LIKE '%Terni%' THEN 'Umbria'
    WHEN location_name LIKE '%Pescara%' OR location_name LIKE '%L''Aquila%' OR location_name LIKE '%Teramo%' OR location_name LIKE '%Chieti%' THEN 'Abruzzo'
    WHEN location_name LIKE '%Campobasso%' OR location_name LIKE '%Isernia%' THEN 'Molise'
    WHEN location_name LIKE '%Potenza%' OR location_name LIKE '%Matera%' THEN 'Basilicata'
    WHEN location_name LIKE '%Trento%' OR location_name LIKE '%Bolzano%' THEN 'Trentino-Alto Adige'
    WHEN location_name LIKE '%Trieste%' OR location_name LIKE '%Udine%' OR location_name LIKE '%Pordenone%' OR location_name LIKE '%Gorizia%' THEN 'Friuli-Venezia Giulia'
    WHEN location_name LIKE '%Aosta%' THEN 'Valle d''Aosta'
    ELSE 'Altro'
  END as regione,
  COUNT(*) as zone_count
FROM zones_to_scrape
GROUP BY regione
ORDER BY zone_count DESC;

-- =====================================================
-- MESSAGGIO FINALE
-- =====================================================
SELECT 
  '✅ SETUP COMPLETATO!' as message,
  'Il database è ora popolato con tutte le città italiane e categorie business.' as details,
  'Lo scraping engine può iniziare a lavorare su tutta Italia!' as ready_to_start;
