/**
 * Sistema di seeding per popolare la tabella zones_to_scrape
 * Usato per inizializzare il database con tutte le combinazioni di zone, fonti e categorie
 * Eseguito automaticamente all'avvio o manualmente tramite script
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ITALIAN_ZONES, SCRAPING_SOURCES, BUSINESS_CATEGORIES, ScrapingSource, BusinessCategory } from '../data/italian-zones.js';

interface ZoneToSeed {
  source: ScrapingSource;
  category: BusinessCategory;
  location_name: string;
  region: string;
  lat: number;
  lng: number;
  geohash: string;
  score: number;
  last_scraped_at: null;
  is_scraping_now: false;
  times_scraped: 0;
  total_leads_found: 0;
}

export class DatabaseSeeder {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Calcola un semplice geohash basato su lat/lng per il clustering geografico
   */
  private calculateGeohash(lat: number, lng: number, precision: number = 5): string {
    // Implementazione semplificata di geohash
    const latRange = [-90.0, 90.0];
    const lngRange = [-180.0, 180.0];
    let geohash = '';
    let bit = 0;
    let even = true;
    
    const chars = '0123456789bcdefghjkmnpqrstuvwxyz';

    while (geohash.length < precision) {
      const range = even ? lngRange : latRange;
      const val = even ? lng : lat;
      const mid = (range[0] + range[1]) / 2;
      
      if (val >= mid) {
        bit = (bit << 1) | 1;
        range[0] = mid;
      } else {
        bit = bit << 1;
        range[1] = mid;
      }
      
      if (even ? !even : even) {
        if ((bit & 31) === bit) {
          geohash += chars[bit];
          bit = 0;
        }
      }
      even = !even;
    }
    
    return geohash;
  }

  /**
   * Calcola il punteggio iniziale basato sulla popolazione
   */
  private calculateInitialScore(population: number): number {
    // Normalizza la popolazione su una scala 0-100
    // Roma (max ~2.8M) -> 100, città piccole (min ~20K) -> 20
    const minPop = 20000;
    const maxPop = 2900000;
    const normalizedPop = Math.min(Math.max(population, minPop), maxPop);
    return Math.round(20 + ((normalizedPop - minPop) / (maxPop - minPop)) * 80);
  }

  /**
   * Genera tutte le combinazioni zona-fonte-categoria per il seeding
   */
  private generateZonesToSeed(): ZoneToSeed[] {
    const zones: ZoneToSeed[] = [];

    for (const zone of ITALIAN_ZONES) {
      for (const source of SCRAPING_SOURCES) {
        for (const category of BUSINESS_CATEGORIES) {
          zones.push({
            source,
            category,
            location_name: zone.name,
            region: zone.region,
            lat: zone.lat,
            lng: zone.lng,
            geohash: this.calculateGeohash(zone.lat, zone.lng),
            score: this.calculateInitialScore(zone.population),
            last_scraped_at: null,
            is_scraping_now: false,
            times_scraped: 0,
            total_leads_found: 0,
          });
        }
      }
    }

    return zones;
  }

  /**
   * Verifica se il seeding è già stato eseguito
   */
  private async isAlreadySeeded(): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('zones_to_scrape')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Errore nel controllo seeding:', error);
        return false;
      }

      // Se abbiamo già più di 1000 zone, assumiamo che il seeding sia già stato fatto
      return (count || 0) > 1000;
    } catch (error) {
      console.error('Errore nel controllo seeding:', error);
      return false;
    }
  }

  /**
   * Inserisce le zone nel database in batch per evitare timeout
   */
  private async insertZonesInBatches(zones: ZoneToSeed[], batchSize: number = 100): Promise<void> {
    const totalBatches = Math.ceil(zones.length / batchSize);
    
    console.log(`Inserimento di ${zones.length} zone in ${totalBatches} batch...`);

    for (let i = 0; i < zones.length; i += batchSize) {
      const batch = zones.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const { error } = await this.supabase
          .from('zones_to_scrape')
          .insert(batch);

        if (error) {
          console.error(`Errore nel batch ${batchNumber}:`, error);
          throw error;
        }

        console.log(`✓ Batch ${batchNumber}/${totalBatches} completato (${batch.length} zone)`);
        
        // Piccola pausa per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Errore critico nel batch ${batchNumber}:`, error);
        throw error;
      }
    }
  }

  /**
   * Esegue il seeding completo del database
   */
  async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Avvio seeding database...');

      // Controlla se il seeding è già stato eseguito
      const alreadySeeded = await this.isAlreadySeeded();
      if (alreadySeeded) {
        console.log('✓ Database già popolato, salto il seeding');
        return;
      }

      // Genera tutte le combinazioni
      const zonesToSeed = this.generateZonesToSeed();
      console.log(`Generazione di ${zonesToSeed.length} combinazioni zona-fonte-categoria`);
      console.log(`- ${ITALIAN_ZONES.length} zone italiane`);
      console.log(`- ${SCRAPING_SOURCES.length} fonti (${SCRAPING_SOURCES.join(', ')})`);
      console.log(`- ${BUSINESS_CATEGORIES.length} categorie (${BUSINESS_CATEGORIES.join(', ')})`);

      // Inserisce nel database
      await this.insertZonesInBatches(zonesToSeed);

      console.log('🎉 Seeding completato con successo!');
      
      // Statistiche finali
      const { count } = await this.supabase
        .from('zones_to_scrape')
        .select('*', { count: 'exact', head: true });
        
      console.log(`📊 Totale zone nel database: ${count}`);

    } catch (error) {
      console.error('❌ Errore durante il seeding:', error);
      throw error;
    }
  }

  /**
   * Resetta e ri-esegue il seeding (solo per sviluppo!)
   */
  async resetAndSeed(): Promise<void> {
    try {
      console.log('⚠️  RESET completo del database...');
      
      // Elimina tutte le zone esistenti
      const { error: deleteError } = await this.supabase
        .from('zones_to_scrape')
        .delete()
        .neq('id', 0); // Cancella tutto

      if (deleteError) {
        console.error('Errore durante il reset:', deleteError);
        throw deleteError;
      }

      console.log('✓ Database resettato');

      // Esegue il seeding
      await this.seedDatabase();

    } catch (error) {
      console.error('❌ Errore durante il reset e seeding:', error);
      throw error;
    }
  }

  /**
   * Mostra statistiche delle zone nel database
   */
  async showStats(): Promise<void> {
    try {
      const { data: stats, error } = await this.supabase
        .from('zones_to_scrape')
        .select('source, category, region')
        .limit(10000);

      if (error) {
        console.error('Errore nel recupero statistiche:', error);
        return;
      }

      if (!stats || stats.length === 0) {
        console.log('📊 Nessuna zona trovata nel database');
        return;
      }

      // Statistiche per fonte
      const bySource = stats.reduce((acc, zone) => {
        acc[zone.source] = (acc[zone.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Statistiche per categoria
      const byCategory = stats.reduce((acc, zone) => {
        acc[zone.category] = (acc[zone.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Statistiche per regione
      const byRegion = stats.reduce((acc, zone) => {
        acc[zone.region] = (acc[zone.region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📊 STATISTICHE ZONES_TO_SCRAPE');
      console.log('================================');
      console.log(`Totale zone: ${stats.length}`);
      
      console.log('\n🔍 Per fonte:');
      Object.entries(bySource).forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
      });

      console.log('\n🏢 Per categoria:');
      Object.entries(byCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });

      console.log('\n🌍 Prime 10 regioni:');
      Object.entries(byRegion)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([region, count]) => {
          console.log(`  ${region}: ${count}`);
        });

    } catch (error) {
      console.error('❌ Errore nel recupero statistiche:', error);
    }
  }
}
