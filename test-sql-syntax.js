/**
 * Script di test per verificare la sintassi SQL del file di migrazione
 * Simulazione delle operazioni senza esecuzione reale
 */

const fs = require('fs');
const path = require('path');

function testSQLSyntax() {
  const sqlFile = path.join(__dirname, 'database', 'unified-lead-deduplication.sql');
  
  try {
    const content = fs.readFileSync(sqlFile, 'utf8');
    
    // Test base: controllo che non ci siano errori di sintassi evidenti
    const lines = content.split('\n');
    let inDoBlock = false;
    let doBlockDepth = 0;
    let parenDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip commenti
      if (line.startsWith('--') || line === '') continue;
      
      // Controlla blocchi DO
      if (line.includes('DO $$')) {
        inDoBlock = true;
        doBlockDepth++;
      }
      
      if (inDoBlock && line.includes('END $$')) {
        doBlockDepth--;
        if (doBlockDepth === 0) {
          inDoBlock = false;
        }
      }
      
      // Conta parentesi per verificare bilanciamento  
      parenDepth += (line.match(/\(/g) || []).length;
      parenDepth -= (line.match(/\)/g) || []).length;
      
      // Verifica statement SQL comuni
      if (line.includes('SELECT') && !line.includes(';') && !line.includes('FROM')) {
        const nextLines = lines.slice(i + 1, i + 10).join(' ');
        if (!nextLines.includes('FROM')) {
          console.warn(`⚠️  Possible incomplete SELECT at line ${i + 1}: ${line}`);
        }
      }
    }
    
    // Verifiche finali
    if (doBlockDepth !== 0) {
      throw new Error(`DO blocks not properly closed. Open blocks: ${doBlockDepth}`);
    }
    
    if (parenDepth !== 0) {
      throw new Error(`Unbalanced parentheses. Net difference: ${parenDepth}`);
    }
    
    // Controlla strutture SQL specifiche
    const requiredElements = [
      'ALTER TABLE leads',
      'CREATE INDEX',
      'CREATE OR REPLACE VIEW',
      'CREATE OR REPLACE FUNCTION',
      'CREATE TABLE IF NOT EXISTS merge_logs'
    ];
    
    for (const element of requiredElements) {
      if (!content.includes(element)) {
        console.warn(`⚠️  Missing expected element: ${element}`);
      }
    }
    
    console.log('✅ SQL syntax validation passed');
    console.log(`📄 File size: ${content.length} characters`);
    console.log(`📏 Lines: ${lines.length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ SQL syntax validation failed:', error.message);
    return false;
  }
}

// Esegui il test
if (require.main === module) {
  testSQLSyntax();
}

module.exports = { testSQLSyntax };
