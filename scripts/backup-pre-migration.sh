#!/bin/bash

# Script di backup pre-migrazione per sistema unificato deduplicazione lead
# Questo script crea un backup completo del database prima di applicare la migrazione

set -e

# Configurazione
BACKUP_DIR="./backup-$(date +%Y%m%d_%H%M%S)"
DB_NAME="${1:-clientsniper}"
BACKUP_FILE="${BACKUP_DIR}/pre-migration-backup.sql"

echo "🔄 Inizio backup pre-migrazione..."

# Crea directory di backup
mkdir -p "$BACKUP_DIR"

echo "📦 Creazione backup completo database..."

# Backup completo del database
pg_dump "$DB_NAME" > "$BACKUP_FILE"

echo "📊 Backup della tabella leads (solo dati)..."

# Backup specifico della tabella leads con solo i dati
pg_dump "$DB_NAME" --table=leads --data-only > "$BACKUP_DIR/leads-data-only.sql"

echo "📈 Estrazione statistiche pre-migrazione..."

# Estrai statistiche pre-migrazione
psql "$DB_NAME" -c "
SELECT 
  'Pre-migration stats' as info,
  COUNT(*) as total_leads,
  COUNT(DISTINCT unique_key) as unique_keys,
  COUNT(*) FILTER (WHERE source = 'google_maps') as google_maps_leads,
  COUNT(*) FILTER (WHERE source = 'manual_scan') as manual_scan_leads,
  COUNT(*) FILTER (WHERE source LIKE '%pagine%') as pagine_gialle_leads,
  COUNT(DISTINCT business_name || '_' || city) as potential_unique_businesses
FROM leads;
" > "$BACKUP_DIR/pre-migration-stats.txt"

# Estrai potenziali duplicati
psql "$DB_NAME" -c "
SELECT 
  business_name,
  city,
  COUNT(*) as count,
  array_agg(id) as lead_ids,
  array_agg(source) as sources
FROM leads 
GROUP BY business_name, city
HAVING COUNT(*) > 1
ORDER BY count DESC;
" > "$BACKUP_DIR/potential-duplicates.txt"

echo "✅ Backup completato!"
echo "📁 File di backup salvati in: $BACKUP_DIR"
echo ""
echo "📋 Contenuto backup:"
echo "   - $BACKUP_FILE (backup completo)"
echo "   - $BACKUP_DIR/leads-data-only.sql (solo dati leads)"  
echo "   - $BACKUP_DIR/pre-migration-stats.txt (statistiche pre-migrazione)"
echo "   - $BACKUP_DIR/potential-duplicates.txt (duplicati potenziali)"
echo ""
echo "🚀 Per applicare la migrazione:"
echo "   psql $DB_NAME -f database/unified-lead-deduplication.sql"
echo ""
echo "🔙 Per ripristinare in caso di problemi:"
echo "   psql $DB_NAME < $BACKUP_FILE"
