// Questo file gestisce il logging per il scraping engine
// È parte del modulo services/scraping-engine
// Viene utilizzato da tutti i componenti per logging strutturato
// Oltre alla console, ogni riga viene appesa come JSON line a logs/run-<timestamp>.jsonl
// (un file per processo) così il workflow GitHub Actions può caricare logs/ come artifact.
// ⚠️ Aggiornare se si cambia il formato dei log o si aggiungono nuovi livelli

import * as fs from 'fs'
import * as path from 'path'

// Directory logs/ nella root del scraping engine (services/scraping-engine/logs).
// Calcolata da __dirname (src/utils o dist/utils) così funziona sia con tsx che
// con la build compilata, indipendentemente dalla cwd del processo.
const LOGS_DIR = path.resolve(__dirname, '../../logs')

// Nome file calcolato UNA volta al load del modulo: un file per processo.
const RUN_LOG_FILE = (() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return path.join(LOGS_DIR, `run-${stamp}.jsonl`)
})()

// Crea la directory al load del modulo (best-effort: mai bloccare il processo)
try {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
} catch {
  // Ignora: il logging su file è best-effort
}

/**
 * Rende serializzabili gli argomenti extra del log (gli Error diventano
 * oggetti espliciti, altrimenti JSON.stringify li ridurrebbe a {}).
 */
function serializeLogData(args: any[]): any {
  if (args.length === 0) return undefined
  const mapped = args.map(arg =>
    arg instanceof Error
      ? { name: arg.name, message: arg.message, stack: arg.stack }
      : arg
  )
  return mapped.length === 1 ? mapped[0] : mapped
}

/**
 * Appende una riga JSON al file di log del run. Best-effort: non lancia MAI.
 */
function appendJsonLine(level: string, scope: string, message: string, args: any[]): void {
  try {
    const entry: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message
    }
    const data = serializeLogData(args)
    if (data !== undefined) entry.data = data

    let line: string
    try {
      line = JSON.stringify(entry)
    } catch {
      // Dati non serializzabili (riferimenti circolari, BigInt, ...): fallback a stringa
      entry.data = args.map(a => String(a)).join(' ')
      line = JSON.stringify(entry)
    }

    fs.appendFileSync(RUN_LOG_FILE, line + '\n', 'utf8')
  } catch {
    // Ignora qualsiasi errore di I/O (permessi, disco pieno, dir rimossa, ...)
  }
}

export class Logger {
  private context: string

  constructor(context: string) {
    this.context = context
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : ''

    return `[${timestamp}] [${level}] [${this.context}] ${message}${formattedArgs}`
  }

  info(message: string, ...args: any[]): void {
    console.log(this.formatMessage('INFO', message, ...args))
    appendJsonLine('INFO', this.context, message, args)
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('WARN', message, ...args))
    appendJsonLine('WARN', this.context, message, args)
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('ERROR', message, ...args))
    appendJsonLine('ERROR', this.context, message, args)
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG === 'true') {
      console.debug(this.formatMessage('DEBUG', message, ...args))
    }
    // Su file SEMPRE (il file è economico e utile per il debug post-mortem)
    appendJsonLine('DEBUG', this.context, message, args)
  }

  success(message: string, ...args: any[]): void {
    console.log(this.formatMessage('SUCCESS', message, ...args))
    appendJsonLine('SUCCESS', this.context, message, args)
  }
}
