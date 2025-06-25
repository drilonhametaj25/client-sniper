/**
 * Script di migrazione per aggiornare il database di ClientSniper
 * Gestisce la creazione di tabelle, indici e il seeding iniziale
 * Eseguito automaticamente all'avvio o manualmente per aggiornamenti
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { DatabaseSeeder } from '../utils/database-seeder.js';

export class DatabaseMigrator {
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
   * Controlla se una tabella existe
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Esegue una query SQL raw (solo per setup)
   */
  private async executeSql(sql: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('exec_sql', { query: sql });
      if (error) {
        throw error;
      }
    } catch (error) {
      // Se la funzione exec_sql non esiste, proviamo altro approccio
      console.warn('Non è possibile eseguire SQL raw, verifica manualmente:', sql);
    }
  }

  /**
   * Applica lo schema dal file setup.sql
   */
  async applySchema(): Promise<void> {
    try {
      console.log('📋 Applicazione schema database...');

      // Legge il file setup.sql
      const setupSqlPath = resolve(__dirname, '../../database/setup.sql');
      const setupSql = readFileSync(setupSqlPath, 'utf-8');

      // Dividi in singole query (semplificato)
      const queries = setupSql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'));

      console.log(`Esecuzione di ${queries.length} query...`);

      for (const query of queries) {
        try {
          await this.executeSql(query);
        } catch (error) {
          console.warn(`Query fallita (potrebbe essere normale): ${query.substring(0, 50)}...`);
        }
      }

      console.log('✓ Schema applicato');

    } catch (error) {
      console.error('❌ Errore nell\'applicazione dello schema:', error);
      throw error;
    }
  }

  /**
   * Verifica lo stato delle tabelle necessarie
   */
  async checkRequiredTables(): Promise<boolean> {
    const requiredTables = [
      'users',
      'plans', 
      'leads',
      'lead_analysis',
      'zones_to_scrape',
      'scrape_logs',
      'settings'
    ];

    console.log('🔍 Controllo tabelle necessarie...');

    let allTablesExist = true;
    for (const table of requiredTables) {
      const exists = await this.tableExists(table);
      console.log(`  ${table}: ${exists ? '✓' : '❌'}`);
      if (!exists) {
        allTablesExist = false;
      }
    }

    return allTablesExist;
  }

  /**
   * Esegue la migrazione completa
   */
  async migrate(): Promise<void> {
    try {
      console.log('🔄 Avvio migrazione database...');

      // Controlla se le tabelle esistono
      const tablesExist = await this.checkRequiredTables();
      
      if (!tablesExist) {
        console.log('⚠️  Alcune tabelle mancano, applicazione schema...');
        await this.applySchema();
        
        // Ri-controlla
        const recheckTables = await this.checkRequiredTables();
        if (!recheckTables) {
          throw new Error('Tabelle ancora mancanti dopo l\'applicazione dello schema');
        }
      }

      // Esegue il seeding
      console.log('🌱 Seeding database...');
      const seeder = new DatabaseSeeder();
      await seeder.seedDatabase();

      console.log('🎉 Migrazione completata con successo!');

    } catch (error) {
      console.error('💥 Errore durante la migrazione:', error);
      throw error;
    }
  }

  /**
   * Migrazione sicura per produzione (solo controlli, no modifiche automatiche)
   */
  async safeMigrate(): Promise<void> {
    try {
      console.log('🛡️  Migrazione sicura (modalità produzione)...');

      const tablesExist = await this.checkRequiredTables();
      
      if (!tablesExist) {
        console.log('❌ Alcune tabelle mancano. In produzione, applica manualmente:');
        console.log('   1. Esegui il file database/setup.sql');
        console.log('   2. Esegui: npm run seed');
        throw new Error('Schema non completo in produzione');
      }

      // Solo seeding (idempotente)
      const seeder = new DatabaseSeeder();
      await seeder.seedDatabase();

      console.log('✅ Migrazione sicura completata');

    } catch (error) {
      console.error('💥 Errore durante la migrazione sicura:', error);
      throw error;
    }
  }
}
