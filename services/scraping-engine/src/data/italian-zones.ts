/**
 * Lista delle 100 zone italiane principali per lo scraping distribuito
 * Usato dal sistema di seeding per popolare la tabella zones_to_scrape
 * Ogni zona include nome, regione, popolazione stimata per la priorità e coordinate approssimative
 */

export interface ItalianZone {
  name: string;
  region: string;
  population: number; // Usato per calcolare la priorità iniziale
  lat: number;
  lng: number;
  geohash?: string; // Sarà calcolato automaticamente
}

export const ITALIAN_ZONES: ItalianZone[] = [
  // Lombardia
  { name: "Milano", region: "Lombardia", population: 1396059, lat: 45.4642, lng: 9.1900 },
  { name: "Brescia", region: "Lombardia", population: 196745, lat: 45.5416, lng: 10.2118 },
  { name: "Bergamo", region: "Lombardia", population: 120287, lat: 45.6947, lng: 9.6704 },
  { name: "Monza", region: "Lombardia", population: 123598, lat: 45.5845, lng: 9.2744 },
  { name: "Como", region: "Lombardia", population: 85240, lat: 45.8081, lng: 9.0852 },
  { name: "Varese", region: "Lombardia", population: 80544, lat: 45.8206, lng: 8.8252 },
  { name: "Pavia", region: "Lombardia", population: 72773, lat: 45.1847, lng: 9.1582 },

  // Lazio
  { name: "Roma", region: "Lazio", population: 2872800, lat: 41.9028, lng: 12.4964 },
  { name: "Latina", region: "Lazio", population: 126474, lat: 41.4677, lng: 12.9037 },
  { name: "Frosinone", region: "Lazio", population: 46286, lat: 41.6401, lng: 13.3401 },
  { name: "Viterbo", region: "Lazio", population: 67965, lat: 42.4175, lng: 12.1067 },

  // Campania
  { name: "Napoli", region: "Campania", population: 967069, lat: 40.8518, lng: 14.2681 },
  { name: "Salerno", region: "Campania", population: 133970, lat: 40.6824, lng: 14.7681 },
  { name: "Caserta", region: "Campania", population: 76326, lat: 41.0732, lng: 14.3330 },
  { name: "Avellino", region: "Campania", population: 54857, lat: 40.9145, lng: 14.7907 },
  { name: "Benevento", region: "Campania", population: 60833, lat: 41.1297, lng: 14.7697 },

  // Sicilia
  { name: "Palermo", region: "Sicilia", population: 673735, lat: 38.1157, lng: 13.3613 },
  { name: "Catania", region: "Sicilia", population: 315601, lat: 37.5079, lng: 15.0830 },
  { name: "Messina", region: "Sicilia", population: 238439, lat: 38.1938, lng: 15.5540 },
  { name: "Siracusa", region: "Sicilia", population: 121605, lat: 37.0755, lng: 15.2866 },
  { name: "Trapani", region: "Sicilia", population: 68346, lat: 38.0176, lng: 12.5365 },

  // Piemonte
  { name: "Torino", region: "Piemonte", population: 870952, lat: 45.0703, lng: 7.6869 },
  { name: "Novara", region: "Piemonte", population: 104268, lat: 45.4469, lng: 8.6218 },
  { name: "Alessandria", region: "Piemonte", population: 93902, lat: 44.9133, lng: 8.6156 },
  { name: "Asti", region: "Piemonte", population: 76211, lat: 44.8992, lng: 8.2061 },
  { name: "Cuneo", region: "Piemonte", population: 56281, lat: 44.3841, lng: 7.5420 },

  // Veneto
  { name: "Venezia", region: "Veneto", population: 261905, lat: 45.4408, lng: 12.3155 },
  { name: "Verona", region: "Veneto", population: 259608, lat: 45.4384, lng: 10.9916 },
  { name: "Padova", region: "Veneto", population: 214198, lat: 45.4064, lng: 11.8768 },
  { name: "Vicenza", region: "Veneto", population: 111500, lat: 45.5455, lng: 11.5353 },
  { name: "Treviso", region: "Veneto", population: 84669, lat: 45.6669, lng: 12.2433 },

  // Liguria
  { name: "Genova", region: "Liguria", population: 583601, lat: 44.4056, lng: 8.9463 },
  { name: "La Spezia", region: "Liguria", population: 94621, lat: 44.1074, lng: 9.8281 },
  { name: "Savona", region: "Liguria", population: 60546, lat: 44.3095, lng: 8.4811 },
  { name: "Imperia", region: "Liguria", population: 42704, lat: 43.8879, lng: 8.0273 },

  // Emilia-Romagna
  { name: "Bologna", region: "Emilia-Romagna", population: 391317, lat: 44.4949, lng: 11.3426 },
  { name: "Modena", region: "Emilia-Romagna", population: 185273, lat: 44.6473, lng: 10.9250 },
  { name: "Parma", region: "Emilia-Romagna", population: 195687, lat: 44.8015, lng: 10.3279 },
  { name: "Reggio Emilia", region: "Emilia-Romagna", population: 171944, lat: 44.6989, lng: 10.6297 },
  { name: "Ravenna", region: "Emilia-Romagna", population: 159115, lat: 44.4184, lng: 12.2035 },
  { name: "Ferrara", region: "Emilia-Romagna", population: 132009, lat: 44.8381, lng: 11.6198 },
  { name: "Forlì", region: "Emilia-Romagna", population: 117913, lat: 44.2226, lng: 12.0401 },
  { name: "Piacenza", region: "Emilia-Romagna", population: 103707, lat: 45.0526, lng: 9.6934 },
  { name: "Rimini", region: "Emilia-Romagna", population: 150951, lat: 44.0678, lng: 12.5695 },

  // Toscana
  { name: "Firenze", region: "Toscana", population: 382808, lat: 43.7696, lng: 11.2558 },
  { name: "Prato", region: "Toscana", population: 195213, lat: 43.8777, lng: 11.0955 },
  { name: "Livorno", region: "Toscana", population: 158493, lat: 43.5482, lng: 10.3116 },
  { name: "Arezzo", region: "Toscana", population: 99543, lat: 43.4632, lng: 11.8796 },
  { name: "Pisa", region: "Toscana", population: 91104, lat: 43.7228, lng: 10.4017 },
  { name: "Lucca", region: "Toscana", population: 89046, lat: 43.8430, lng: 10.5015 },
  { name: "Pistoia", region: "Toscana", population: 90363, lat: 43.9335, lng: 10.9177 },

  // Puglia
  { name: "Bari", region: "Puglia", population: 325052, lat: 41.1171, lng: 16.8719 },
  { name: "Taranto", region: "Puglia", population: 200154, lat: 40.4668, lng: 17.2520 },
  { name: "Foggia", region: "Puglia", population: 153143, lat: 41.4621, lng: 15.5442 },
  { name: "Lecce", region: "Puglia", population: 95766, lat: 40.3515, lng: 18.1750 },
  { name: "Brindisi", region: "Puglia", population: 87267, lat: 40.6384, lng: 17.9421 },
  { name: "Andria", region: "Puglia", population: 100052, lat: 41.2273, lng: 16.2967 },

  // Calabria
  { name: "Reggio Calabria", region: "Calabria", population: 182551, lat: 38.1061, lng: 15.6444 },
  { name: "Catanzaro", region: "Calabria", population: 91298, lat: 38.9098, lng: 16.5987 },
  { name: "Cosenza", region: "Calabria", population: 67546, lat: 39.2989, lng: 16.2543 },
  { name: "Crotone", region: "Calabria", population: 65078, lat: 39.0808, lng: 17.1252 },
  { name: "Vibo Valentia", region: "Calabria", population: 33642, lat: 38.6760, lng: 16.1020 },

  // Sardegna
  { name: "Cagliari", region: "Sardegna", population: 154460, lat: 39.2238, lng: 9.1217 },
  { name: "Sassari", region: "Sardegna", population: 127525, lat: 40.7259, lng: 8.5590 },
  { name: "Quartu Sant'Elena", region: "Sardegna", population: 71216, lat: 39.2428, lng: 9.1847 },
  { name: "Olbia", region: "Sardegna", population: 60346, lat: 40.9267, lng: 9.4983 },

  // Marche
  { name: "Ancona", region: "Marche", population: 101997, lat: 43.6158, lng: 13.5189 },
  { name: "Pesaro", region: "Marche", population: 95011, lat: 43.9095, lng: 12.9131 },
  { name: "Macerata", region: "Marche", population: 42654, lat: 43.3008, lng: 13.4534 },
  { name: "Ascoli Piceno", region: "Marche", population: 49307, lat: 42.8534, lng: 13.5759 },

  // Umbria
  { name: "Perugia", region: "Umbria", population: 166134, lat: 43.1122, lng: 12.3888 },
  { name: "Terni", region: "Umbria", population: 111189, lat: 42.5633, lng: 12.6466 },

  // Abruzzo
  { name: "Pescara", region: "Abruzzo", population: 119217, lat: 42.4584, lng: 14.2081 },
  { name: "L'Aquila", region: "Abruzzo", population: 70967, lat: 42.3498, lng: 13.3995 },
  { name: "Chieti", region: "Abruzzo", population: 51834, lat: 42.3476, lng: 14.1676 },
  { name: "Teramo", region: "Abruzzo", population: 54935, lat: 42.6589, lng: 13.7036 },

  // Friuli-Venezia Giulia
  { name: "Trieste", region: "Friuli-Venezia Giulia", population: 204338, lat: 45.6495, lng: 13.7768 },
  { name: "Udine", region: "Friuli-Venezia Giulia", population: 99627, lat: 46.0748, lng: 13.2423 },
  { name: "Pordenone", region: "Friuli-Venezia Giulia", population: 51229, lat: 45.9632, lng: 12.6605 },
  { name: "Gorizia", region: "Friuli-Venezia Giulia", population: 34455, lat: 45.9411, lng: 13.6222 },

  // Trentino-Alto Adige
  { name: "Trento", region: "Trentino-Alto Adige", population: 118142, lat: 46.0748, lng: 11.1217 },
  { name: "Bolzano", region: "Trentino-Alto Adige", population: 107436, lat: 46.4983, lng: 11.3548 },

  // Valle d'Aosta
  { name: "Aosta", region: "Valle d'Aosta", population: 34062, lat: 45.7372, lng: 7.3205 },

  // Basilicata
  { name: "Potenza", region: "Basilicata", population: 67122, lat: 40.6420, lng: 15.8056 },
  { name: "Matera", region: "Basilicata", population: 60436, lat: 40.6664, lng: 16.6043 },

  // Molise
  { name: "Campobasso", region: "Molise", population: 49593, lat: 41.5630, lng: 14.6560 },
  { name: "Isernia", region: "Molise", population: 21811, lat: 41.5956, lng: 14.2309 },

  // Altre città importanti
  { name: "Bolzano", region: "Trentino-Alto Adige", population: 107436, lat: 46.4983, lng: 11.3548 },
  { name: "Cremona", region: "Lombardia", population: 72077, lat: 45.1327, lng: 10.0266 },
  { name: "Mantova", region: "Lombardia", population: 49490, lat: 45.1564, lng: 10.7914 },
  { name: "Lodi", region: "Lombardia", population: 45252, lat: 45.3142, lng: 9.5034 },
  { name: "Lecco", region: "Lombardia", population: 48177, lat: 45.8566, lng: 9.3934 },
  { name: "Sondrio", region: "Lombardia", population: 21876, lat: 46.1699, lng: 9.8782 },
  { name: "Rieti", region: "Lazio", population: 47700, lat: 42.4040, lng: 12.8628 },
  { name: "Ragusa", region: "Sicilia", population: 73288, lat: 36.9278, lng: 14.7337 },
  { name: "Caltanissetta", region: "Sicilia", population: 62797, lat: 37.4863, lng: 14.0623 },
  { name: "Agrigento", region: "Sicilia", population: 59084, lat: 37.3257, lng: 13.5756 },
  { name: "Enna", region: "Sicilia", population: 27855, lat: 37.5641, lng: 14.2806 },
  { name: "Biella", region: "Piemonte", population: 44616, lat: 45.5661, lng: 8.0544 },
  { name: "Verbania", region: "Piemonte", population: 30827, lat: 45.9214, lng: 8.5441 },
  { name: "Vercelli", region: "Piemonte", population: 46552, lat: 45.3181, lng: 8.4234 },
  { name: "Rovigo", region: "Veneto", population: 51378, lat: 45.0713, lng: 11.7903 },
  { name: "Belluno", region: "Veneto", population: 35870, lat: 46.1388, lng: 12.2158 },
  { name: "Cesena", region: "Emilia-Romagna", population: 97137, lat: 44.1391, lng: 12.2431 },
  { name: "Imola", region: "Emilia-Romagna", population: 69936, lat: 44.3534, lng: 11.7134 },
  { name: "Faenza", region: "Emilia-Romagna", population: 58892, lat: 44.2886, lng: 11.8854 },
  { name: "Carpi", region: "Emilia-Romagna", population: 71370, lat: 44.7842, lng: 10.8815 },
  { name: "Siena", region: "Toscana", population: 53901, lat: 43.3188, lng: 11.3307 },
  { name: "Grosseto", region: "Toscana", population: 82284, lat: 42.7606, lng: 11.1073 },
  { name: "Massa", region: "Toscana", population: 68927, lat: 44.0356, lng: 10.1411 },
  { name: "Carrara", region: "Toscana", population: 63133, lat: 44.0806, lng: 10.0924 },
  { name: "Barletta", region: "Puglia", population: 94671, lat: 41.3176, lng: 16.2820 },
  { name: "Trani", region: "Puglia", population: 56097, lat: 41.2792, lng: 16.4177 },
  { name: "Altamura", region: "Puglia", population: 70595, lat: 40.8267, lng: 16.5524 },
  { name: "Cerignola", region: "Puglia", population: 58534, lat: 41.2630, lng: 15.8946 },
];

// Fonti di scraping supportate
export const SCRAPING_SOURCES = [
  'google_maps',
  'yelp', 
  'pagine_gialle'
] as const;

// Categorie business da scrappare - ESPANSE per maggiore copertura
export const BUSINESS_CATEGORIES = [
  // Ristorazione & Food
  'ristoranti',
  'pizzerie',
  'bar caffetterie',
  'pasticcerie',
  'gelaterie',
  'panifici',
  'macellerie',
  'pescherie',
  'enoteche',
  'catering',

  // Salute & Benessere
  'dentisti',
  'fisioterapisti',
  'osteopati',
  'psicologi',
  'nutrizionisti',
  'centri estetici',
  'palestre fitness',
  'centri yoga',
  'spa centri benessere',
  'farmacie',
  'ottici',
  'veterinari',

  // Cura Persona
  'parrucchieri',
  'barberie',
  'estetiste',
  'centri abbronzatura',
  'nail salon',

  // Casa & Manutenzione
  'idraulici',
  'elettricisti',
  'fabbri',
  'imbianchini',
  'muratori',
  'giardinieri',
  'imprese pulizie',
  'disinfestazioni',
  'traslochi',
  'falegnamerie',
  'serramentisti',
  'climatizzazione',
  'caldaie riscaldamento',

  // Auto & Trasporti
  'officine meccaniche',
  'carrozzerie',
  'gommisti',
  'autolavaggi',
  'autoscuole',
  'noleggio auto',
  'taxi ncc',

  // Servizi Professionali
  'commercialisti',
  'avvocati',
  'notai',
  'consulenti lavoro',
  'agenzie immobiliari',
  'agenzie assicurative',
  'studi architettura',
  'geometri',
  'ingegneri',
  'agenzie marketing',
  'web agency',
  'fotografi',
  'videomaker',

  // Retail & Commercio
  'negozi abbigliamento',
  'negozi scarpe',
  'gioiellerie',
  'fioristi',
  'librerie',
  'cartolerie',
  'ferramenta',
  'casalinghi',
  'elettronica',
  'telefonia',

  // Educazione & Formazione
  'scuole guida',
  'scuole lingue',
  'centri formazione',
  'ripetizioni private',
  'scuole musica',
  'scuole danza',
  'asili nido',

  // Eventi & Tempo Libero
  'wedding planner',
  'agenzie viaggi',
  'sale ricevimenti',
  'discoteche club',
  'cinema',
  'teatri',
  'bowling',
  'escape room',

  // Animali
  'pet shop',
  'toelettatura cani',
  'pensioni animali',
  'addestramento cani',

  // Altro
  'tipografie',
  'copisterie',
  'lavanderie',
  'sartorie',
  'calzolerie',
  'orologerie',
  'onoranze funebri'
] as const;

// Categorie raggruppate per settore (utile per UI)
export const CATEGORY_GROUPS = {
  'Ristorazione & Food': [
    'ristoranti', 'pizzerie', 'bar caffetterie', 'pasticcerie', 'gelaterie',
    'panifici', 'macellerie', 'pescherie', 'enoteche', 'catering'
  ],
  'Salute & Benessere': [
    'dentisti', 'fisioterapisti', 'osteopati', 'psicologi', 'nutrizionisti',
    'centri estetici', 'palestre fitness', 'centri yoga', 'spa centri benessere',
    'farmacie', 'ottici', 'veterinari'
  ],
  'Cura Persona': [
    'parrucchieri', 'barberie', 'estetiste', 'centri abbronzatura', 'nail salon'
  ],
  'Casa & Manutenzione': [
    'idraulici', 'elettricisti', 'fabbri', 'imbianchini', 'muratori',
    'giardinieri', 'imprese pulizie', 'disinfestazioni', 'traslochi',
    'falegnamerie', 'serramentisti', 'climatizzazione', 'caldaie riscaldamento'
  ],
  'Auto & Trasporti': [
    'officine meccaniche', 'carrozzerie', 'gommisti', 'autolavaggi',
    'autoscuole', 'noleggio auto', 'taxi ncc'
  ],
  'Servizi Professionali': [
    'commercialisti', 'avvocati', 'notai', 'consulenti lavoro',
    'agenzie immobiliari', 'agenzie assicurative', 'studi architettura',
    'geometri', 'ingegneri', 'agenzie marketing', 'web agency', 'fotografi', 'videomaker'
  ],
  'Retail & Commercio': [
    'negozi abbigliamento', 'negozi scarpe', 'gioiellerie', 'fioristi',
    'librerie', 'cartolerie', 'ferramenta', 'casalinghi', 'elettronica', 'telefonia'
  ],
  'Educazione & Formazione': [
    'scuole guida', 'scuole lingue', 'centri formazione', 'ripetizioni private',
    'scuole musica', 'scuole danza', 'asili nido'
  ],
  'Eventi & Tempo Libero': [
    'wedding planner', 'agenzie viaggi', 'sale ricevimenti', 'discoteche club',
    'cinema', 'teatri', 'bowling', 'escape room'
  ],
  'Animali': [
    'pet shop', 'toelettatura cani', 'pensioni animali', 'addestramento cani'
  ],
  'Altri Servizi': [
    'tipografie', 'copisterie', 'lavanderie', 'sartorie', 'calzolerie',
    'orologerie', 'onoranze funebri'
  ]
} as const;

export type ScrapingSource = typeof SCRAPING_SOURCES[number];
export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];
export type CategoryGroup = keyof typeof CATEGORY_GROUPS;
