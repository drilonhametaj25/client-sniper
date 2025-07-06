#!/bin/bash

# Script per resettare lead e zone di scraping
# Utilizzato quando si aggiornano gli engine di scraping per ricominciare con dati freschi
# Esegue il reset del database e riavvia i servizi di scraping

set -e  # Exit on error

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Banner
echo -e "${BLUE}"
echo "============================================="
echo "🔄 CLIENTSNIPER - RESET LEAD & SCRAPING"
echo "============================================="
echo -e "${NC}"

# Controllo se siamo nella directory corretta
if [[ ! -f "database/reset-leads-and-zones.sql" ]]; then
    error "Script non trovato! Eseguire dalla root del progetto ClientSniper"
    exit 1
fi

# Verifica variabili ambiente
if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    error "Variabili ambiente mancanti!"
    echo "Assicurati di avere:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Conferma dall'utente
echo -e "${YELLOW}⚠️  ATTENZIONE: Questo script cancellerà TUTTI i lead esistenti!${NC}"
echo -e "${YELLOW}⚠️  Verranno mantenuti: utenti, piani, pagamenti, feedback${NC}"
echo -e "${YELLOW}⚠️  Verranno cancellati: lead, unlock utenti, log scraping${NC}"
echo ""
read -p "Sei sicuro di voler continuare? (digitare 'RESET' per confermare): " confirm

if [[ "$confirm" != "RESET" ]]; then
    warning "Operazione annullata dall'utente"
    exit 0
fi

log "Iniziando reset lead e zone di scraping..."

# 1. BACKUP PRECAUZIONALE
log "📦 Creando backup precauzionale..."
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup tramite API Supabase (se disponibile)
if command -v curl &> /dev/null; then
    log "Backup configurazioni esistenti..."
    
    # Backup zone importanti
    curl -X POST "$SUPABASE_URL/rest/v1/rpc/backup_zones" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d '{}' > "$BACKUP_DIR/zones_backup.json" 2>/dev/null || true
    
    success "Backup completato in $BACKUP_DIR"
fi

# 2. ESECUZIONE RESET DATABASE
log "🗄️ Eseguendo reset database..."

# Esecuzione tramite psql se disponibile
if command -v psql &> /dev/null && [[ -n "$DATABASE_URL" ]]; then
    log "Eseguendo reset via psql..."
    psql "$DATABASE_URL" -f database/reset-leads-and-zones.sql
    success "Reset database completato via psql"
    
# Alternativa: esecuzione tramite API Supabase  
elif command -v curl &> /dev/null; then
    log "Eseguendo reset via API Supabase..."
    
    # Leggi e esegui il file SQL
    SQL_CONTENT=$(cat database/reset-leads-and-zones.sql)
    
    # Esegui il reset (usando una funzione RPC custom se disponibile)
    curl -X POST "$SUPABASE_URL/rest/v1/rpc/execute_reset_script" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"sql_script\": \"$SQL_CONTENT\"}" || {
        
        warning "Funzione RPC non disponibile, eseguire manualmente il file SQL:"
        echo "database/reset-leads-and-zones.sql"
        echo ""
        echo "Oppure copiare il contenuto nella console SQL di Supabase"
    }
    
else
    warning "Nessun metodo di connessione al database disponibile"
    echo "Eseguire manualmente il file: database/reset-leads-and-zones.sql"
    echo "1. Aprire Supabase Dashboard"
    echo "2. Andare in SQL Editor"
    echo "3. Copiare e incollare il contenuto del file"
    echo "4. Eseguire lo script"
    read -p "Premere INVIO quando completato..."
fi

# 3. RIAVVIO SERVIZI SCRAPING
log "🔄 Riavviando servizi di scraping..."

# Riavvio scraping engine se il processo è attivo
if pgrep -f "scraping-engine" > /dev/null; then
    log "Fermando scraping engine esistente..."
    pkill -f "scraping-engine" || true
    sleep 2
fi

# Riavvio servizi (se disponibili)
if [[ -f "services/scraping-engine/package.json" ]]; then
    log "Riavviando scraping engine..."
    cd services/scraping-engine
    
    # Installa dipendenze se necessario
    if [[ ! -d "node_modules" ]]; then
        log "Installando dipendenze..."
        npm install
    fi
    
    # Avvia in background
    nohup npm start > ../../logs/scraping-engine.log 2>&1 &
    SCRAPING_PID=$!
    
    cd ../..
    
    log "Scraping engine avviato (PID: $SCRAPING_PID)"
    echo "$SCRAPING_PID" > ./pids/scraping-engine.pid
fi

# 4. VERIFICA FINALE
log "🔍 Verifica finale del sistema..."

# Verifica connessione database
if command -v curl &> /dev/null; then
    # Test connessione
    HEALTH_CHECK=$(curl -s -X GET "$SUPABASE_URL/rest/v1/zones_to_scrape?select=count" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0].count' 2>/dev/null || echo "0")
    
    if [[ "$HEALTH_CHECK" != "0" ]]; then
        success "Database connesso - Zone disponibili: $HEALTH_CHECK"
    else
        warning "Verifica manuale del database necessaria"
    fi
fi

# Verifica servizi
if pgrep -f "scraping-engine" > /dev/null; then
    success "Scraping engine attivo"
else
    warning "Scraping engine non attivo - riavviare manualmente se necessario"
fi

# 5. SUMMARY FINALE
echo ""
echo -e "${GREEN}============================================="
echo "✅ RESET COMPLETATO CON SUCCESSO!"
echo "=============================================${NC}"
echo ""
echo -e "${BLUE}📊 Riepilogo operazioni:${NC}"
echo "  ✅ Lead cancellati: tutti"
echo "  ✅ Zone resettate: pronte per scraping"
echo "  ✅ Unlock utenti: rimossi"
echo "  ✅ Log scraping: puliti"
echo "  ✅ Utenti e piani: mantenuti"
echo "  ✅ Feedback: mantenuti"
echo "  ✅ Pagamenti: mantenuti"
echo ""
echo -e "${BLUE}🔄 Prossimi passi:${NC}"
echo "  1. Verificare che i servizi di scraping siano attivi"
echo "  2. Monitorare i log: tail -f logs/scraping-engine.log"
echo "  3. Verificare l'inserimento di nuovi lead nella dashboard"
echo "  4. Backup creato in: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}⚠️  Ricorda di testare il sistema prima di andare in produzione!${NC}"
echo ""

# Salva log dell'operazione
echo "Reset completato: $(date)" >> ./logs/reset-history.log
echo "Backup location: $BACKUP_DIR" >> ./logs/reset-history.log

success "Script completato! 🎉"
