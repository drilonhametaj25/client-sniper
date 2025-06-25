#!/usr/bin/env node

/**
 * Script CLI per il seeding del database zones_to_scrape
 * Uso: npm run seed [comando]
 * Comandi disponibili:
 *   - seed: Esegue il seeding normale (idempotente)
 *   - reset: Resetta e ri-esegue il seeding (ATTENZIONE: cancella tutto!)
 *   - stats: Mostra statistiche delle zone nel database
 */

import { config } from 'dotenv';
import { DatabaseSeeder } from '../utils/database-seeder.js';

// Carica le variabili d'ambiente
config();

async function main() {
  const command = process.argv[2] || 'seed';
  
  try {
    const seeder = new DatabaseSeeder();

    switch (command) {
      case 'seed':
        console.log('🌱 Esecuzione seeding normale...');
        await seeder.seedDatabase();
        break;

      case 'reset':
        console.log('⚠️  ATTENZIONE: Questo comando cancellerà tutte le zone esistenti!');
        console.log('Continuare? (digitare "yes" per confermare)');
        
        // In un ambiente di produzione, potresti voler aggiungere un prompt interattivo
        if (process.env.NODE_ENV === 'production') {
          console.log('❌ Reset non consentito in produzione!');
          process.exit(1);
        }
        
        console.log('🔄 Esecuzione reset e seeding...');
        await seeder.resetAndSeed();
        break;

      case 'stats':
        console.log('📊 Recupero statistiche...');
        await seeder.showStats();
        break;

      default:
        console.log('❌ Comando non riconosciuto');
        console.log('Comandi disponibili:');
        console.log('  seed  - Esegue il seeding normale (raccomandato)');
        console.log('  reset - Resetta e ri-esegue il seeding (PERICOLOSO!)');
        console.log('  stats - Mostra statistiche del database');
        process.exit(1);
    }

    console.log('✅ Operazione completata');
    process.exit(0);

  } catch (error) {
    console.error('💥 Errore durante l\'esecuzione:', error);
    process.exit(1);
  }
}

// Esegue solo se chiamato direttamente
if (require.main === module) {
  main();
}
