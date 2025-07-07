/**
 * Script di pulizia automatica per i record di analisi pubblica
 * Da eseguire periodicamente (es. con cron job) per mantenere il database pulito
 * Rimuove i record più vecchi di 30 giorni dalla tabella public_analysis_usage
 */

import { supabase } from '../lib/supabase'

export async function cleanupOldPublicAnalysis(): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_old_public_analysis')

    if (error) {
      console.error('Errore durante la pulizia:', error)
      throw error
    }

    const deletedCount = data || 0
    
    return deletedCount
  } catch (error) {
    console.error('Errore pulizia analisi pubbliche:', error)
    throw error
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  cleanupOldPublicAnalysis()
    .then(count => {
      process.exit(0)
    })
    .catch(error => {
      console.error('Script fallito:', error)
      process.exit(1)
    })
}
