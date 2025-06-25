// Questo è il punto di ingresso principale del scraping engine distribuito
// È parte del modulo services/scraping-engine
// Viene eseguito come servizio separato con sistema di zone intelligenti
// ⚠️ Utilizza il nuovo sistema distribuito per evitare duplicati e gestire priorità

import dotenv from 'dotenv'
import { resolve } from 'path'
import cron from 'node-cron'
import { Orchestrator } from './orchestrator-new'
import { Logger } from './utils/logger'
import { DatabaseMigrator } from './utils/database-migrator'

// Carica variabili d'ambiente
dotenv.config({ path: resolve(__dirname, '../.env') })
dotenv.config() // Carica anche .env nella directory corrente

const logger = new Logger('Main')
const orchestrator = new Orchestrator()

async function main() {
  logger.info('🚀 Avvio ClientSniper Scraping Engine (Sistema Distribuito)')
  
  // Verifica configurazione
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    logger.error('❌ Variabili d\'ambiente Supabase mancanti')
    process.exit(1)
  }

  // Esegui migrazione e seeding automatico all'avvio
  try {
    logger.info('🔄 Controllo e migrazione database...')
    const migrator = new DatabaseMigrator()
    
    // In produzione usa migrazione sicura, altrimenti migrazione completa
    if (process.env.NODE_ENV === 'production') {
      await migrator.safeMigrate()
    } else {
      await migrator.migrate()
    }
    
    logger.info('✅ Database pronto')
  } catch (error) {
    logger.error('❌ Errore durante la migrazione:', error)
    // Non bloccare l'avvio per errori di migrazione
  }

  // Esegui scraping iniziale se richiesto
  if (process.argv.includes('--run-now')) {
    logger.info('📊 Esecuzione scraping distribuito manuale...')
    try {
      await orchestrator.runDistributedScraping()
      logger.info('✅ Scraping manuale completato')
      process.exit(0)
    } catch (error) {
      logger.error('❌ Errore durante scraping manuale:', error)
      process.exit(1)
    }
  }
  // Programma scraping distribuito automatico
  // Esegue ogni 2 ore dalle 8 alle 22 (più frequente ma più intelligente)
  cron.schedule('0 8,10,12,14,16,18,20,22 * * *', async () => {
    logger.info('⏰ Avvio ciclo scraping distribuito programmato')
    try {
      await orchestrator.runDistributedScraping()
      logger.info('✅ Ciclo scraping distribuito completato')
    } catch (error) {
      logger.error('❌ Errore durante il ciclo scraping:', error)
    }
  }, {
    timezone: 'Europe/Rome'
  })

  // Gestione graceful shutdown
  process.on('SIGINT', () => {
    logger.info('🛑 Ricevuto SIGINT, chiusura in corso...')
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    logger.info('🛑 Ricevuto SIGTERM, chiusura in corso...')
    process.exit(0)
  })

  logger.info('⚡ Scraping Engine Distribuito avviato, in attesa dei job programmati...')
  logger.info('📋 Job programmati:')
  logger.info('   - Scraping Distribuito: ogni 2 ore (8-22)')
  logger.info('   - Sistema Zone Intelligenti: attivo')
  logger.info('   - Anti-duplicati: attivo')
  logger.info('🎯 Per esecuzione manuale: npm run dev -- --run-now')
}

// Avvia l'applicazione
main().catch((error) => {
  logger.error('💥 Errore critico all\'avvio:', error)
  process.exit(1)
})
