/**
 * Database completo delle coordinate delle città italiane
 * Utilizzato per la geographic heatmap nella dashboard analytics
 */

export interface CityCoordinates {
  name: string
  lat: number
  lng: number
  region: string
  province: string
  population: number
}

export const ITALIAN_CITIES: CityCoordinates[] = [
  // Grandi città metropolitane
  { name: 'Roma', lat: 41.9028, lng: 12.4964, region: 'Lazio', province: 'RM', population: 2872800 },
  { name: 'Milano', lat: 45.4642, lng: 9.1900, region: 'Lombardia', province: 'MI', population: 1396059 },
  { name: 'Napoli', lat: 40.8518, lng: 14.2681, region: 'Campania', province: 'NA', population: 967069 },
  { name: 'Torino', lat: 45.0703, lng: 7.6869, region: 'Piemonte', province: 'TO', population: 870952 },
  { name: 'Palermo', lat: 38.1157, lng: 13.3615, region: 'Sicilia', province: 'PA', population: 673735 },
  { name: 'Genova', lat: 44.4056, lng: 8.9463, region: 'Liguria', province: 'GE', population: 583601 },
  { name: 'Bologna', lat: 44.4949, lng: 11.3426, region: 'Emilia-Romagna', province: 'BO', population: 390636 },
  { name: 'Firenze', lat: 43.7696, lng: 11.2558, region: 'Toscana', province: 'FI', population: 382258 },
  { name: 'Bari', lat: 41.1171, lng: 16.8719, region: 'Puglia', province: 'BA', population: 320475 },
  { name: 'Catania', lat: 37.5079, lng: 15.0830, region: 'Sicilia', province: 'CT', population: 311584 },
  
  // Città importanti del Nord
  { name: 'Verona', lat: 45.4384, lng: 10.9916, region: 'Veneto', province: 'VR', population: 259608 },
  { name: 'Venezia', lat: 45.4408, lng: 12.3155, region: 'Veneto', province: 'VE', population: 258685 },
  { name: 'Messina', lat: 38.1938, lng: 15.5540, region: 'Sicilia', province: 'ME', population: 238439 },
  { name: 'Padova', lat: 45.4064, lng: 11.8768, region: 'Veneto', province: 'PD', population: 214198 },
  { name: 'Trieste', lat: 45.6495, lng: 13.7768, region: 'Friuli-Venezia Giulia', province: 'TS', population: 204338 },
  { name: 'Brescia', lat: 45.5416, lng: 10.2118, region: 'Lombardia', province: 'BS', population: 196745 },
  { name: 'Taranto', lat: 40.4751, lng: 17.2294, region: 'Puglia', province: 'TA', population: 194021 },
  { name: 'Prato', lat: 43.8777, lng: 11.1021, region: 'Toscana', province: 'PO', population: 195313 },
  { name: 'Parma', lat: 44.8015, lng: 10.3279, region: 'Emilia-Romagna', province: 'PR', population: 198292 },
  { name: 'Modena', lat: 44.6473, lng: 10.9252, region: 'Emilia-Romagna', province: 'MO', population: 185273 },
  
  // Città del Centro
  { name: 'Reggio Emilia', lat: 44.6989, lng: 10.6307, region: 'Emilia-Romagna', province: 'RE', population: 171944 },
  { name: 'Reggio Calabria', lat: 38.1102, lng: 15.6410, region: 'Calabria', province: 'RC', population: 180817 },
  { name: 'Perugia', lat: 43.1107, lng: 12.3908, region: 'Umbria', province: 'PG', population: 166134 },
  { name: 'Ravenna', lat: 44.4173, lng: 12.1988, region: 'Emilia-Romagna', province: 'RA', population: 159115 },
  { name: 'Livorno', lat: 43.5428, lng: 10.3167, region: 'Toscana', province: 'LI', population: 158493 },
  { name: 'Cagliari', lat: 39.2238, lng: 9.1217, region: 'Sardegna', province: 'CA', population: 154460 },
  { name: 'Foggia', lat: 41.4621, lng: 15.5444, region: 'Puglia', province: 'FG', population: 153143 },
  { name: 'Rimini', lat: 44.0678, lng: 12.5695, region: 'Emilia-Romagna', province: 'RN', population: 150951 },
  { name: 'Salerno', lat: 40.6824, lng: 14.7681, region: 'Campania', province: 'SA', population: 133970 },
  { name: 'Ferrara', lat: 44.8381, lng: 11.6198, region: 'Emilia-Romagna', province: 'FE', population: 132009 },
  
  // Città medie e piccole del Nord
  { name: 'Sassari', lat: 40.7259, lng: 8.5594, region: 'Sardegna', province: 'SS', population: 127525 },
  { name: 'Monza', lat: 45.5845, lng: 9.2744, region: 'Lombardia', province: 'MB', population: 123598 },
  { name: 'Siracusa', lat: 37.0755, lng: 15.2866, region: 'Sicilia', province: 'SR', population: 121605 },
  { name: 'Pescara', lat: 42.4584, lng: 14.2081, region: 'Abruzzo', province: 'PE', population: 119483 },
  { name: 'Bergamo', lat: 45.6947, lng: 9.6772, region: 'Lombardia', province: 'BG', population: 120287 },
  { name: 'Vicenza', lat: 45.5455, lng: 11.5353, region: 'Veneto', province: 'VI', population: 111500 },
  { name: 'Terni', lat: 42.5633, lng: 12.6433, region: 'Umbria', province: 'TR', population: 111189 },
  { name: 'Forlì', lat: 44.2226, lng: 12.0401, region: 'Emilia-Romagna', province: 'FC', population: 118359 },
  { name: 'Trento', lat: 46.0748, lng: 11.1217, region: 'Trentino-Alto Adige', province: 'TN', population: 118142 },
  { name: 'Novara', lat: 45.4469, lng: 8.6210, region: 'Piemonte', province: 'NO', population: 104268 },
  
  // Città del Sud e isole
  { name: 'Lecce', lat: 40.3515, lng: 18.1750, region: 'Puglia', province: 'LE', population: 95766 },
  { name: 'Catanzaro', lat: 38.9072, lng: 16.5958, region: 'Calabria', province: 'CZ', population: 91000 },
  { name: 'Ancona', lat: 43.6158, lng: 13.5189, region: 'Marche', province: 'AN', population: 100861 },
  { name: 'Bolzano', lat: 46.4983, lng: 11.3548, region: 'Trentino-Alto Adige', province: 'BZ', population: 107436 },
  { name: 'La Spezia', lat: 44.1023, lng: 9.8251, region: 'Liguria', province: 'SP', population: 94979 },
  { name: 'Piacenza', lat: 45.0526, lng: 9.6929, region: 'Emilia-Romagna', province: 'PC', population: 103887 },
  { name: 'Caserta', lat: 41.0740, lng: 14.3330, region: 'Campania', province: 'CE', population: 76654 },
  { name: 'Pistoia', lat: 43.9334, lng: 10.9177, region: 'Toscana', province: 'PT', population: 90363 },
  { name: 'Brindisi', lat: 40.6320, lng: 17.9464, region: 'Puglia', province: 'BR', population: 87870 },
  { name: 'Latina', lat: 41.4677, lng: 12.9041, region: 'Lazio', province: 'LT', population: 127350 },
  
  // Città minori ma importanti
  { name: 'Udine', lat: 46.0569, lng: 13.2371, region: 'Friuli-Venezia Giulia', province: 'UD', population: 99627 },
  { name: 'Cesena', lat: 44.1391, lng: 12.2431, region: 'Emilia-Romagna', province: 'FC', population: 97324 },
  { name: 'Pesaro', lat: 43.9102, lng: 12.9113, region: 'Marche', province: 'PU', population: 95011 },
  { name: 'Arezzo', lat: 43.4633, lng: 11.8796, region: 'Toscana', province: 'AR', population: 99543 },
  { name: 'Cremona', lat: 45.1327, lng: 10.0222, region: 'Lombardia', province: 'CR', population: 72680 },
  { name: 'Gallarate', lat: 45.6614, lng: 8.7940, region: 'Lombardia', province: 'VA', population: 54251 },
  { name: 'Altamura', lat: 40.8267, lng: 16.5533, region: 'Puglia', province: 'BA', population: 70595 },
  { name: 'Carpi', lat: 44.7842, lng: 10.8832, region: 'Emilia-Romagna', province: 'MO', population: 71158 },
  { name: 'Vigevano', lat: 45.3141, lng: 8.8544, region: 'Lombardia', province: 'PV', population: 63534 },
  
  // Città della Campania
  { name: 'Torre del Greco', lat: 40.7815, lng: 14.3691, region: 'Campania', province: 'NA', population: 85664 },
  { name: 'Pozzuoli', lat: 40.8218, lng: 14.1191, region: 'Campania', province: 'NA', population: 80756 },
  { name: 'Giugliano in Campania', lat: 40.9285, lng: 14.1963, region: 'Campania', province: 'NA', population: 123428 },
  { name: 'Casoria', lat: 40.9077, lng: 14.2908, region: 'Campania', province: 'NA', population: 77642 },
  { name: 'Aversa', lat: 40.9664, lng: 14.2064, region: 'Campania', province: 'CE', population: 52974 },
  
  // Città del Lazio
  { name: 'Guidonia Montecelio', lat: 42.0186, lng: 12.7242, region: 'Lazio', province: 'RM', population: 88181 },
  { name: 'Fiumicino', lat: 41.7594, lng: 12.2258, region: 'Lazio', province: 'RM', population: 79818 },
  { name: 'Aprilia', lat: 41.5921, lng: 12.6427, region: 'Lazio', province: 'LT', population: 74506 },
  { name: 'Pomezia', lat: 41.6691, lng: 12.5073, region: 'Lazio', province: 'RM', population: 63508 },
  { name: 'Tivoli', lat: 41.9630, lng: 12.7973, region: 'Lazio', province: 'RM', population: 56648 },
  
  // Città della Lombardia
  { name: 'Sesto San Giovanni', lat: 45.5369, lng: 9.2307, region: 'Lombardia', province: 'MI', population: 81588 },
  { name: 'Cinisello Balsamo', lat: 45.5581, lng: 9.2175, region: 'Lombardia', province: 'MI', population: 75723 },
  { name: 'Varese', lat: 45.8205, lng: 8.8250, region: 'Lombardia', province: 'VA', population: 80544 },
  { name: 'Como', lat: 45.8080, lng: 9.0852, region: 'Lombardia', province: 'CO', population: 84834 },
  { name: 'Busto Arsizio', lat: 45.6107, lng: 8.8508, region: 'Lombardia', province: 'VA', population: 83405 },
  
  // Città della Sicilia
  { name: 'Gela', lat: 37.0732, lng: 14.2407, region: 'Sicilia', province: 'CL', population: 74858 },
  { name: 'Ragusa', lat: 36.9264, lng: 14.7270, region: 'Sicilia', province: 'RG', population: 73288 },
  { name: 'Trapani', lat: 38.0176, lng: 12.5365, region: 'Sicilia', province: 'TP', population: 68346 },
  { name: 'Caltanissetta', lat: 37.4861, lng: 14.0625, region: 'Sicilia', province: 'CL', population: 62317 },
  { name: 'Agrigento', lat: 37.3257, lng: 13.5765, region: 'Sicilia', province: 'AG', population: 59286 },
  
  // Città del Veneto
  { name: 'Treviso', lat: 45.6669, lng: 12.2433, region: 'Veneto', province: 'TV', population: 85188 },
  { name: 'Rovigo', lat: 45.0704, lng: 11.7903, region: 'Veneto', province: 'RO', population: 51378 },
  { name: 'Belluno', lat: 46.1391, lng: 12.2153, region: 'Veneto', province: 'BL', population: 35870 },
  { name: 'Chioggia', lat: 45.2185, lng: 12.2785, region: 'Veneto', province: 'VE', population: 49430 },
  
  // Città dell'Emilia-Romagna
  { name: 'Imola', lat: 44.3539, lng: 11.7134, region: 'Emilia-Romagna', province: 'BO', population: 69890 },
  { name: 'Faenza', lat: 44.2855, lng: 11.8847, region: 'Emilia-Romagna', province: 'RA', population: 58595 },
  { name: 'Fidenza', lat: 44.8647, lng: 10.0650, region: 'Emilia-Romagna', province: 'PR', population: 26979 },
  
  // Città della Toscana
  { name: 'Pisa', lat: 43.7228, lng: 10.4017, region: 'Toscana', province: 'PI', population: 90488 },
  { name: 'Lucca', lat: 43.8430, lng: 10.5015, region: 'Toscana', province: 'LU', population: 89046 },
  { name: 'Grosseto', lat: 42.7596, lng: 11.1077, region: 'Toscana', province: 'GR', population: 81191 },
  { name: 'Siena', lat: 43.3188, lng: 11.3307, region: 'Toscana', province: 'SI', population: 53901 },
  { name: 'Massa', lat: 44.0355, lng: 10.1411, region: 'Toscana', province: 'MS', population: 68713 },
  { name: 'Carrara', lat: 44.0806, lng: 10.1039, region: 'Toscana', province: 'MS', population: 62592 },
  
  // Città delle Marche
  { name: 'Fano', lat: 43.8436, lng: 13.0172, region: 'Marche', province: 'PU', population: 60715 },
  { name: 'Ascoli Piceno', lat: 42.8542, lng: 13.5763, region: 'Marche', province: 'AP', population: 47815 },
  { name: 'Macerata', lat: 43.2999, lng: 13.4534, region: 'Marche', province: 'MC', population: 41564 },
  
  // Città dell'Abruzzo
  { name: 'L\'Aquila', lat: 42.3498, lng: 13.3995, region: 'Abruzzo', province: 'AQ', population: 69558 },
  { name: 'Teramo', lat: 42.6589, lng: 13.7003, region: 'Abruzzo', province: 'TE', population: 54444 },
  { name: 'Chieti', lat: 42.3478, lng: 14.1694, region: 'Abruzzo', province: 'CH', population: 50770 },
  
  // Città del Molise
  { name: 'Campobasso', lat: 41.5630, lng: 14.6564, region: 'Molise', province: 'CB', population: 49341 },
  { name: 'Isernia', lat: 41.5956, lng: 14.2305, region: 'Molise', province: 'IS', population: 21678 },
  
  // Città della Basilicata
  { name: 'Potenza', lat: 40.6420, lng: 15.8059, region: 'Basilicata', province: 'PZ', population: 67122 },
  { name: 'Matera', lat: 40.6664, lng: 16.6043, region: 'Basilicata', province: 'MT', population: 60351 },
  
  // Città della Calabria
  { name: 'Cosenza', lat: 39.2906, lng: 16.2542, region: 'Calabria', province: 'CS', population: 67239 },
  { name: 'Crotone', lat: 39.0808, lng: 17.1127, region: 'Calabria', province: 'KR', population: 65078 },
  { name: 'Vibo Valentia', lat: 38.6757, lng: 16.1032, region: 'Calabria', province: 'VV', population: 33857 },
  
  // Città della Sardegna
  { name: 'Quartu Sant\'Elena', lat: 39.2429, lng: 9.1804, region: 'Sardegna', province: 'CA', population: 69296 },
  { name: 'Olbia', lat: 40.9207, lng: 9.5032, region: 'Sardegna', province: 'SS', population: 60346 },
  { name: 'Nuoro', lat: 40.3209, lng: 9.3305, region: 'Sardegna', province: 'NU', population: 36347 },
  { name: 'Oristano', lat: 39.9037, lng: 8.5916, region: 'Sardegna', province: 'OR', population: 31671 },
  
  // Città del Piemonte
  { name: 'Alessandria', lat: 44.9133, lng: 8.6146, region: 'Piemonte', province: 'AL', population: 93980 },
  { name: 'Asti', lat: 44.9009, lng: 8.2065, region: 'Piemonte', province: 'AT', population: 76164 },
  { name: 'Cuneo', lat: 44.3841, lng: 7.5426, region: 'Piemonte', province: 'CN', population: 56281 },
  { name: 'Biella', lat: 45.5659, lng: 8.0553, region: 'Piemonte', province: 'BI', population: 44616 },
  { name: 'Verbania', lat: 45.9214, lng: 8.5541, region: 'Piemonte', province: 'VB', population: 30827 },
  { name: 'Vercelli', lat: 45.3204, lng: 8.4185, region: 'Piemonte', province: 'VC', population: 46552 },
  
  // Città della Valle d'Aosta
  { name: 'Aosta', lat: 45.7369, lng: 7.3153, region: 'Valle d\'Aosta', province: 'AO', population: 34062 },
  
  // Città della Liguria
  { name: 'Imperia', lat: 43.8849, lng: 8.0276, region: 'Liguria', province: 'IM', population: 42421 },
  { name: 'Savona', lat: 44.3097, lng: 8.4814, region: 'Liguria', province: 'SV', population: 60632 },
  { name: 'Sanremo', lat: 43.8158, lng: 7.7764, region: 'Liguria', province: 'IM', population: 54236 },
]

// Funzione per cercare coordinate di una città
export function getCityCoordinates(cityName: string): CityCoordinates | null {
  const normalizedName = cityName.toLowerCase().trim()
  
  const city = ITALIAN_CITIES.find(city => 
    city.name.toLowerCase() === normalizedName ||
    city.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(city.name.toLowerCase())
  )
  
  return city || null
}

// Funzione per ottenere tutte le città di una regione
export function getCitiesByRegion(region: string): CityCoordinates[] {
  return ITALIAN_CITIES.filter(city => 
    city.region.toLowerCase() === region.toLowerCase()
  )
}

// Funzione per ottenere coordinate con fallback
export function getCityCoordinatesWithFallback(cityName: string, region?: string): { lat: number, lng: number } {
  const city = getCityCoordinates(cityName)
  
  if (city) {
    return { lat: city.lat, lng: city.lng }
  }
  
  // Fallback per regione se disponibile
  if (region) {
    const regionCities = getCitiesByRegion(region)
    if (regionCities.length > 0) {
      // Prendi la città più grande della regione
      const largestCity = regionCities.reduce((prev, current) => 
        prev.population > current.population ? prev : current
      )
      return { lat: largestCity.lat, lng: largestCity.lng }
    }
  }
  
  // Fallback su Roma se tutto fallisce
  return { lat: 41.9028, lng: 12.4964 }
}
