// Questo è il punto di ingresso principale del scraping engine distribuito
// È parte del modulo services/scraping-engine
// Viene eseguito come servizio separato con sistema di zone intelligenti
// ⚠️ Utilizza il nuovo sistema distribuito per evitare duplicati e gestire priorità

import dotenv from 'dotenv'
import { resolve } from 'path'
import cron from 'node-cron'
import { Orchestrator } from './orchestrator'
import { Logger } from './utils/logger'
import { DatabaseMigrator } from './utils/database-migrator'
import { getSummary } from './utils/run-metrics'

// Carica variabili d'ambiente
dotenv.config({ path: resolve(__dirname, '../.env') })
dotenv.config() // Carica anche .env nella directory corrente

const logger = new Logger('Main')
const orchestrator = new Orchestrator()

/**
 * Logga il riepilogo metriche di fine run (linea strutturata nel JSONL + tabella
 * leggibile su stdout) e verifica la condizione di allarme rottura selettori.
 *
 * Allarme: zonesProcessed >= 3 e businessesFound === 0 -> quasi certamente i
 * selettori offuscati di Google Maps sono cambiati e l'estrazione ritorna vuoto
 * ovunque. In quel caso process.exitCode = 1 così la GitHub Action diventa rossa.
 *
 * @returns true se l'allarme è scattato
 */
function reportRunSummary(): boolean {
  const summary = getSummary()

  // Linea strutturata finale (finisce anche nel file logs/run-*.jsonl)
  logger.info('📊 RUN_SUMMARY', summary)

  // Tabella leggibile per i log di GitHub Actions
  const rows: Array<[string, number]> = [
    ['Zone processate', summary.zonesProcessed],
    ['Zone fallite', summary.zonesFailed],
    ['Business trovati', summary.businessesFound],
    ['Business con sito', summary.businessesWithWebsite],
    ['Lead salvati', summary.leadsSaved],
    ['Lead in quarantena', summary.leadsQuarantined],
    ['Errori salvataggio', summary.saveErrors],
    ['Analisi fallite', summary.analysisFailures]
  ]
  const labelWidth = Math.max(...rows.map(([label]) => label.length))
  console.log('')
  console.log('══════════════ RIEPILOGO RUN ══════════════')
  for (const [label, value] of rows) {
    console.log(`  ${label.padEnd(labelWidth)} : ${value}`)
  }
  if (summary.zones.length > 0) {
    console.log('  ─────────── Dettaglio zone ───────────')
    for (const z of summary.zones) {
      console.log(`  ${z.zone}: trovati=${z.found}, salvati=${z.saved}`)
    }
  }
  console.log('═══════════════════════════════════════════')
  console.log('')

  if (summary.zonesProcessed >= 3 && summary.businessesFound === 0) {
    logger.error(`🚨 ALLARME: 0 business estratti su ${summary.zonesProcessed} zone — probabile rottura dei selettori Google Maps`)
    process.exitCode = 1
    return true
  }

  return false
}

async function main() {
  logger.info('🚀 Avvio ClientSniper Scraping Engine (Sistema Distribuito)')
  
  // Verifica configurazione
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('❌ Variabili d\'ambiente Supabase mancanti')
    process.exit(1)
  }

  // Rileva modalità GitHub Actions
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
  const scrapeMode = process.env.SCRAPE_MODE || 'incremental'
  
  if (isGitHubActions) {
    logger.info('🔧 Modalità GitHub Actions rilevata')
    logger.info(`📊 Modalità scraping: ${scrapeMode}`)
  }

  // Esegui migrazione e seeding automatico all'avvio
  try {
    logger.info('🔄 Controllo e migrazione database...')
    const migrator = new DatabaseMigrator()
    
    // In produzione usa migrazione sicura, altrimenti migrazione completa
    if (process.env.NODE_ENV === 'production' || isGitHubActions) {
      await migrator.safeMigrate()
    } else {
      await migrator.migrate()
    }
    
    logger.info('✅ Database pronto')
  } catch (error) {
    logger.error('❌ Errore durante la migrazione:', error)
    // Non bloccare l'avvio per errori di migrazione
  }

  // Se è GitHub Actions, esegui subito lo scraping e termina
  if (isGitHubActions || process.argv.includes('--run-now')) {
    logger.info('📊 Esecuzione scraping distribuito manuale...')
    try {
      await orchestrator.runDistributedScraping()
      const alarmTriggered = reportRunSummary()
      if (alarmTriggered) {
        // Exit code 1: la GitHub Action diventa rossa invece di "successo" silenzioso
        process.exit(1)
      }
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
      reportRunSummary() // In modalità cron logga solo il riepilogo/allarme, senza terminare
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
