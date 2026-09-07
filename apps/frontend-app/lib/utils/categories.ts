/**
 * Categorie e ruoli — traduzioni in italiano per la UI.
 *
 * Estratto dalla dashboard (app/dashboard/page.tsx) dove viveva inline:
 * - translateCategory: normalizza le categorie libere dei lead (Google Maps
 *   restituisce valori misti EN/IT) in etichette italiane leggibili.
 * - translateRole: traduce i ruoli professionali richiesti.
 * - CATEGORY_OPTIONS: lista statica curata per il filtro "Categoria".
 *   NOTA: /api/leads filtra con eq('category', value) — match esatto. I valori
 *   qui sotto sono le categorie delle zone di scraping (zones_to_scrape), che
 *   il motore usa come fallback quando Google Maps non espone la categoria.
 *
 * Usato da: dashboard, LeadCard.
 */

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  // Traduzioni base
  'restaurants': 'Ristoranti',
  'plumbers': 'Idraulici',
  'dentists': 'Dentisti',
  'lawyers': 'Avvocati',
  'photographers': 'Fotografi',
  'hotels': 'Hotel',
  'cafes': 'Bar e Caffè',
  'beauty': 'Bellezza',
  'fitness': 'Fitness',
  'mechanics': 'Meccanici',
  'electricians': 'Elettricisti',
  'construction': 'Edilizia',
  'real_estate': 'Immobiliare',
  'medical': 'Medico',
  'veterinary': 'Veterinario',
  'accounting': 'Contabilità',
  'insurance': 'Assicurazioni',
  'travel': 'Viaggi',
  'education': 'Istruzione',
  'automotive': 'Automotive',
  'retail': 'Retail',
  'technology': 'Tecnologia',
  'consulting': 'Consulenza',
  'finance': 'Finanza',
  'healthcare': 'Sanità',
  'entertainment': 'Intrattenimento',
  'sports': 'Sport',
  'fashion': 'Moda',
  'food': 'Alimentari',
  'home_services': 'Servizi Casa',
  'professional_services': 'Servizi Professionali',
  // Traduzioni specifiche per categorie che potrebbero apparire nel database
  'restaurant': 'Ristorante',
  'tuscan restaurant': 'Ristorante Toscano',
  'italian restaurant': 'Ristorante Italiano',
  'pizza restaurant': 'Pizzeria',
  'chinese restaurant': 'Ristorante Cinese',
  'japanese restaurant': 'Ristorante Giapponese',
  'sushi restaurant': 'Ristorante Sushi',
  'seafood restaurant': 'Ristorante di Pesce',
  'mediterranean restaurant': 'Ristorante Mediterraneo',
  'bar': 'Bar',
  'cafe': 'Caffè',
  'bakery': 'Panificio',
  'pizzeria': 'Pizzeria',
  'hotel': 'Hotel',
  'bed and breakfast': 'Bed & Breakfast',
  'apartment': 'Appartamento',
  'villa': 'Villa',
  'resort': 'Resort',
  'dentist': 'Dentista',
  'doctor': 'Medico',
  'medical center': 'Centro Medico',
  'pharmacy': 'Farmacia',
  'veterinarian': 'Veterinario',
  'lawyer': 'Avvocato',
  'law firm': 'Studio Legale',
  'notary': 'Notaio',
  'accountant': 'Commercialista',
  'beauty salon': 'Salone di Bellezza',
  'hair salon': 'Parrucchiere',
  'barber shop': 'Barbiere',
  'spa': 'Centro Benessere',
  'gym': 'Palestra',
  'fitness center': 'Centro Fitness',
  'personal trainer': 'Personal Trainer',
  'mechanic': 'Meccanico',
  'auto repair': 'Autofficina',
  'electrician': 'Elettricista',
  'plumber': 'Idraulico',
  'contractor': 'Impresa Edile',
  'real estate agency': 'Agenzia Immobiliare',
  'photographer': 'Fotografo',
  'travel agency': 'Agenzia Viaggi',
  'tour operator': 'Tour Operator',
  'school': 'Scuola',
  'university': 'Università',
  'training center': 'Centro Formazione',
  'clothing store': 'Negozio di Abbigliamento',
  'shoe store': 'Negozio di Scarpe',
  'electronics store': 'Negozio di Elettronica',
  'furniture store': 'Negozio di Mobili',
  'bookstore': 'Libreria',
  'florist': 'Fiorista',
  'pet store': 'Negozio Animali',
  'jewelry store': 'Gioielleria',
  'optician': 'Ottico',
  'other': 'Altro'
}

/**
 * Traduce una categoria libera (EN/IT, qualsiasi case) in italiano leggibile.
 */
export function translateCategory(category: string): string {
  if (!category) return 'Attività locale'

  // Prova prima con la stringa esatta (case-insensitive)
  const exactMatch = CATEGORY_TRANSLATIONS[category.toLowerCase()]
  if (exactMatch) return exactMatch

  // Se non trova corrispondenza esatta, cerca parole chiave
  const categoryLower = category.toLowerCase()

  if (categoryLower.includes('restaurant') || categoryLower.includes('ristorante')) {
    if (categoryLower.includes('pizza')) return 'Pizzeria'
    if (categoryLower.includes('chinese') || categoryLower.includes('cinese')) return 'Ristorante Cinese'
    if (categoryLower.includes('japanese') || categoryLower.includes('giapponese')) return 'Ristorante Giapponese'
    if (categoryLower.includes('sushi')) return 'Ristorante Sushi'
    if (categoryLower.includes('seafood') || categoryLower.includes('pesce')) return 'Ristorante di Pesce'
    if (categoryLower.includes('tuscan') || categoryLower.includes('toscano')) return 'Ristorante Toscano'
    if (categoryLower.includes('italian') || categoryLower.includes('italiano')) return 'Ristorante Italiano'
    if (categoryLower.includes('mediterranean') || categoryLower.includes('mediterraneo')) return 'Ristorante Mediterraneo'
    return 'Ristorante'
  }

  if (categoryLower.includes('hotel') || categoryLower.includes('albergo')) return 'Hotel'
  if (categoryLower.includes('bar') && !categoryLower.includes('barber')) return 'Bar'
  if (categoryLower.includes('cafe') || categoryLower.includes('caffè')) return 'Caffè'
  if (categoryLower.includes('pizza')) return 'Pizzeria'
  if (categoryLower.includes('bakery') || categoryLower.includes('panificio')) return 'Panificio'
  if (categoryLower.includes('dentist') || categoryLower.includes('dentista')) return 'Dentista'
  if (categoryLower.includes('doctor') || categoryLower.includes('medico')) return 'Medico'
  if (categoryLower.includes('lawyer') || categoryLower.includes('avvocato')) return 'Avvocato'
  if (categoryLower.includes('beauty') || categoryLower.includes('bellezza')) return 'Salone di Bellezza'
  if (categoryLower.includes('hair') || categoryLower.includes('parrucchiere')) return 'Parrucchiere'
  if (categoryLower.includes('barber') || categoryLower.includes('barbiere')) return 'Barbiere'
  if (categoryLower.includes('gym') || categoryLower.includes('palestra')) return 'Palestra'
  if (categoryLower.includes('mechanic') || categoryLower.includes('meccanico')) return 'Meccanico'
  if (categoryLower.includes('electrician') || categoryLower.includes('elettricista')) return 'Elettricista'
  if (categoryLower.includes('plumber') || categoryLower.includes('idraulico')) return 'Idraulico'

  // Se non trova nessuna corrispondenza, capitalizza la prima lettera
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
}

/**
 * Traduce un ruolo professionale richiesto in etichetta italiana.
 */
export function translateRole(role: string): string {
  const translations: Record<string, string> = {
    'designer': 'Web Designer',
    'developer': 'Sviluppatore',
    'seo': 'SEO Specialist',
    'copywriter': 'Copywriter',
    'photographer': 'Fotografo',
    'adv': 'Advertising',
    'social': 'Social Media',
    'gdpr': 'Privacy/GDPR'
  }
  return translations[role.toLowerCase()] || role
}

/**
 * Opzioni statiche per il filtro "Categoria" della dashboard.
 * value = valore salvato nel DB (categorie delle zone di scraping),
 * label = etichetta mostrata all'utente.
 */
export const CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ristoranti', label: 'Ristoranti' },
  { value: 'pizzerie', label: 'Pizzerie' },
  { value: 'bar', label: 'Bar e Caffetterie' },
  { value: 'gelaterie', label: 'Gelaterie' },
  { value: 'panifici', label: 'Panifici e Pasticcerie' },
  { value: 'enoteche', label: 'Enoteche' },
  { value: 'catering', label: 'Catering' },
  { value: 'parrucchieri', label: 'Parrucchieri' },
  { value: 'barberie', label: 'Barbieri' },
  { value: 'estetiste', label: 'Centri Estetici' },
  { value: 'centri benessere', label: 'Centri Benessere' },
  { value: 'palestre', label: 'Palestre' },
  { value: 'personal trainer', label: 'Personal Trainer' },
  { value: 'studi dentistici', label: 'Studi Dentistici' },
  { value: 'fisioterapisti', label: 'Fisioterapisti' },
  { value: 'psicologi', label: 'Psicologi' },
  { value: 'nutrizionisti', label: 'Nutrizionisti' },
  { value: 'veterinari', label: 'Veterinari' },
  { value: 'avvocati', label: 'Avvocati' },
  { value: 'commercialisti', label: 'Commercialisti' },
  { value: 'consulenti aziendali', label: 'Consulenti Aziendali' },
  { value: 'agenzie immobiliari', label: 'Agenzie Immobiliari' },
  { value: 'assicurazioni', label: 'Assicurazioni' },
  { value: 'agenzie viaggi', label: 'Agenzie Viaggi' },
  { value: 'idraulici', label: 'Idraulici' },
  { value: 'elettricisti', label: 'Elettricisti' },
  { value: 'imprese edili', label: 'Imprese Edili' },
  { value: 'imbianchini', label: 'Imbianchini' },
  { value: 'serramentisti', label: 'Serramentisti' },
  { value: 'giardinieri', label: 'Giardinieri' },
  { value: 'imprese di pulizie', label: 'Imprese di Pulizie' },
  { value: 'autofficine', label: 'Autofficine' },
  { value: 'gommisti', label: 'Gommisti' },
  { value: 'carrozzerie', label: 'Carrozzerie' },
  { value: 'fotografi', label: 'Fotografi' },
  { value: 'videomaker', label: 'Videomaker' },
  { value: 'wedding planner', label: 'Wedding Planner' },
  { value: 'boutique', label: 'Boutique e Abbigliamento' },
  { value: 'fioristi', label: 'Fioristi' },
  { value: 'librerie', label: 'Librerie' },
  { value: 'mobilifici', label: 'Mobilifici' },
  { value: 'scuole di lingue', label: 'Scuole di Lingue' },
  { value: 'scuole guida', label: 'Autoscuole' },
  { value: 'centri di formazione', label: 'Centri di Formazione' },
  { value: 'lavanderie', label: 'Lavanderie' },
  { value: 'tipografie', label: 'Tipografie' }
]
