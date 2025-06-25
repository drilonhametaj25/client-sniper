#!/usr/bin/env node

/**
 * Script CLI per la migrazione del database ClientSniper
 * Uso: npm run migrate
 * Gestisce schema, tabelle e seeding in un unico comando
 */

import { config } from 'dotenv';
import { DatabaseMigrator } from '../utils/database-migrator.js';

// Carica le variabili d'ambiente
config();

async function main() {
  try {
    console.log('🔄 Avvio migrazione database ClientSniper...');
    
    const migrator = new DatabaseMigrator();
    
    // Esegue migrazione completa
    await migrator.migrate();
    
    console.log('🎉 Migrazione completata con successo!');
    console.log('');
    console.log('📊 Per vedere le statistiche: npm run seed:stats');
    console.log('🚀 Per avviare il sistema: npm run dev');
    
    process.exit(0);

  } catch (error) {
    console.error('💥 Errore durante la migrazione:', error);
    console.log('');
    console.log('🔧 Possibili soluzioni:');
    console.log('1. Verifica le credenziali Supabase nel file .env');
    console.log('2. Controlla che il database sia raggiungibile');
    console.log('3. Esegui manualmente il file database/setup.sql');
    console.log('4. Prova con: npm run seed');
    
    process.exit(1);
  }
}

// Esegue solo se chiamato direttamente
if (require.main === module) {
  main();
}
