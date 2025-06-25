// Questo file gestisce il logging per il scraping engine
// È parte del modulo services/scraping-engine
// Viene utilizzato da tutti i componenti per logging strutturato
// ⚠️ Aggiornare se si cambia il formato dei log o si aggiungono nuovi livelli

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
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('WARN', message, ...args))
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('ERROR', message, ...args))
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG === 'true') {
      console.debug(this.formatMessage('DEBUG', message, ...args))
    }
  }

  success(message: string, ...args: any[]): void {
    console.log(this.formatMessage('SUCCESS', message, ...args))
  }
}
