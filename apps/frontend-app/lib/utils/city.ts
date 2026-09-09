/**
 * Normalizzazione dei nomi citta' per il filtro della dashboard.
 *
 * Percorso: apps/frontend-app/lib/utils/city.ts
 * Usato da: app/dashboard/page.tsx (menu a tendina "Tutte le citta'")
 *
 * PERCHE' ESISTE
 * Lo scraper salva l'indirizzo cosi' come lo espone Google Maps, quindi in
 * leads.city finisce la forma completa "00144 Roma RM". Il menu a tendina si
 * costruiva da quei valori grezzi: 1000 voci ordinate per CAP, con la sola
 * Roma presente 37 volte (00010, 00118, 00128...). Chi cercava clienti a
 * Milano doveva scorrere centinaia di righe, e sceglierne una restituiva
 * solo la frazione di lead con quel CAP.
 *
 * Qui il valore grezzo viene ridotto al nome della citta'. Il filtro lato
 * server usa gia' ILIKE %valore%, quindi inviare "Roma" cattura tutte le
 * varianti di CAP senza bisogno di cambiare l'API.
 *
 * LIMITE NOTO: ILIKE %Roma% cattura anche "Genzano di Roma". E' un'inclusione
 * in piu', non una mancanza, e resta dentro la stessa provincia: preferibile
 * al contrario. Per una corrispondenza esatta servirebbe una colonna
 * city_normalized indicizzata, cioe' una migrazione e un backfill.
 */

/** CAP italiano a inizio stringa: "00144 Roma RM" -> "Roma RM" */
const CAP_INIZIALE = /^\d{5}\s+/
/** Sigla provincia a fine stringa: "Roma RM" -> "Roma" */
const PROVINCIA_FINALE = /\s+[A-Z]{2}$/
/** Valori che non sono una citta' (lo scraper li produce quando l'indirizzo e' incompleto) */
const NON_CITTA = new Set(['italy', 'italia', 'it'])
/** "abcidraulica.com": il parser indirizzi finisce a volte per salvare il dominio */
const DOMINIO = /\.[a-z]{2,6}$/i

/**
 * Riduce un valore grezzo di leads.city al nome della citta'.
 * Restituisce null se il valore non e' una citta' italiana utilizzabile.
 *
 * REGOLA: si accettano solo i valori che portano un marcatore di indirizzo
 * italiano, cioe' il CAP iniziale o la sigla provincia finale. Sembra severo,
 * ma il campo e' molto sporco: su 1000 valori distinti, 405 non erano citta'
 * italiane (numeri civici "126/128", prefissi "0584", domini, citta' USA come
 * Chicago e Milwaukee, frammenti come "Estratto dal sito" e "Hotel").
 *
 * Scartare una variante NON rende irraggiungibili i suoi lead: il filtro lato
 * server usa ILIKE, quindi scegliere "Bologna" (presente nel menu grazie a
 * "40100 Bologna BO") cattura anche le righe salvate come "Bologna" secco.
 * Sparisce solo dal menu una citta' che esistesse UNICAMENTE in forma nuda,
 * e quei lead restano comunque trovabili dalla ricerca testuale.
 */
export function normalizeCity(raw: string | null | undefined): string | null {
  if (!raw) return null

  const valore = raw.trim()
  const haCap = CAP_INIZIALE.test(valore)
  const haProvincia = PROVINCIA_FINALE.test(valore)
  if (!haCap && !haProvincia) return null

  const nome = valore
    .replace(CAP_INIZIALE, '')
    .replace(PROVINCIA_FINALE, '')
    .trim()

  if (!nome) return null
  // Cifre rimaste = frammento di indirizzo, non un nome di citta'
  if (/\d/.test(nome)) return null
  if (DOMINIO.test(nome)) return null
  if (NON_CITTA.has(nome.toLowerCase())) return null

  return nome
}

/**
 * Dai valori grezzi al menu a tendina: normalizza, elimina i duplicati
 * (ignorando le maiuscole) e ordina in italiano.
 */
export function buildCityOptions(raw: (string | null | undefined)[]): string[] {
  const perChiave = new Map<string, string>()

  for (const valore of raw) {
    const nome = normalizeCity(valore)
    if (!nome) continue
    const chiave = nome.toLowerCase()
    // Prima occorrenza vince: evita che "ROMA" sostituisca "Roma"
    if (!perChiave.has(chiave)) perChiave.set(chiave, nome)
  }

  return Array.from(perChiave.values()).sort((a, b) => a.localeCompare(b, 'it'))
}
