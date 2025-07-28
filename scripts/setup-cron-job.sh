#!/bin/bash

# 🕒 GUIDA COMPLETA CONFIGURAZIONE CRON JOB
# Script per configurare il reset automatico dei crediti

echo "🕒 CONFIGURAZIONE CRON JOB per Reset Crediti - TrovaMi"
echo "====================================================="
echo ""

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_section() {
    echo -e "\n${BLUE}$1${NC}"
    echo "$(printf '%.0s-' {1..60})"
}

print_option() {
    echo -e "${GREEN}✅ OPZIONE $1${NC}"
    echo ""
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Opzione 1: Vercel Cron (più semplice)
show_vercel_cron() {
    print_option "1: VERCEL CRON (CONSIGLIATO)"
    
    echo "📋 Setup automatico con Vercel:"
    echo ""
    echo "1. 📝 Il vercel.json è già configurato con:"
    echo '   "crons": [{'
    echo '     "path": "/api/cron/reset-credits",'
    echo '     "schedule": "0 0 * * *"  // Ogni giorno a mezzanotte'
    echo '   }]'
    echo ""
    echo "2. 🔐 Aggiungi variabile ambiente in Vercel:"
    echo "   CRON_SECRET=your-secure-random-string"
    echo ""
    echo "3. 🚀 Deploy il progetto:"
    echo "   vercel --prod"
    echo ""
    echo "4. ✅ Vercel triggerà automaticamente il cron ogni giorno"
    echo ""
    echo "📊 Schedule options:"
    echo "   '0 0 * * *'     = Ogni giorno a mezzanotte UTC"
    echo "   '0 0 1 * *'     = Primo giorno di ogni mese"
    echo "   '0 2 */3 * *'   = Ogni 3 giorni alle 2:00 AM"
    echo ""
    print_warning "Vercel Cron è gratis fino a 1000 invocazioni/mese"
}

# Opzione 2: GitHub Actions (alternativa)
show_github_actions() {
    print_option "2: GITHUB ACTIONS"
    
    echo "📋 Setup con GitHub Actions workflow:"
    echo ""
    echo "1. 📝 Crea file .github/workflows/reset-credits.yml:"
    cat << 'EOF'
name: Reset Credits Cron Job

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:     # Manual trigger

jobs:
  reset-credits:
    runs-on: ubuntu-latest
    steps:
      - name: Call Reset Credits API
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/reset-credits" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
EOF
    echo ""
    echo "2. 🔐 Aggiungi secrets in GitHub:"
    echo "   APP_URL = https://yourdomain.com"
    echo "   CRON_SECRET = your-secure-random-string"
    echo ""
    echo "3. ✅ GitHub triggerà automaticamente ogni giorno"
    echo ""
    print_warning "Gratis per repository pubblici, usage limitato per privati"
}

# Opzione 3: Server esterno/VPS
show_external_cron() {
    print_option "3: SERVER ESTERNO / VPS"
    
    echo "📋 Setup su server Linux/VPS:"
    echo ""
    echo "1. 📝 Aggiungi a crontab:"
    echo "   crontab -e"
    echo ""
    echo "2. 📝 Inserisci questa riga:"
    echo "   0 0 * * * curl -X POST 'https://yourdomain.com/api/cron/reset-credits' -H 'Authorization: Bearer YOUR_SECRET'"
    echo ""
    echo "3. 💾 Salva e chiudi"
    echo ""
    echo "📋 Esempi di schedule:"
    echo "   0 0 * * *     = Ogni giorno a mezzanotte"
    echo "   0 0 1 * *     = Primo di ogni mese"
    echo "   */30 * * * *  = Ogni 30 minuti (per test)"
    echo ""
    print_warning "Richiede un server sempre acceso"
}

# Opzione 4: Servizi cron esterni
show_external_services() {
    print_option "4: SERVIZI CRON ESTERNI"
    
    echo "📋 Servizi di cron hosting:"
    echo ""
    echo "🌐 CRON-JOB.ORG (Gratuito):"
    echo "   1. Vai su https://cron-job.org"
    echo "   2. Registrati gratis"
    echo "   3. Crea nuovo job:"
    echo "      URL: https://yourdomain.com/api/cron/reset-credits"
    echo "      Method: POST"
    echo "      Headers: Authorization: Bearer YOUR_SECRET"
    echo "      Schedule: Daily"
    echo ""
    echo "🌐 EASYCRON.COM:"
    echo "   - Simile a cron-job.org"
    echo "   - Piano gratuito disponibile"
    echo ""
    echo "🌐 ZAPIER:"
    echo "   - Crea Zap con Schedule trigger"
    echo "   - Webhook action verso il tuo endpoint"
    echo ""
    print_warning "Dipendi da servizi terzi"
}

# Opzione 5: Sistema interno con setTimeout
show_internal_system() {
    print_option "5: SISTEMA INTERNO (Non raccomandato)"
    
    echo "📋 Timer interno all'app:"
    echo ""
    echo "⚠️  Problemi con questo approccio:"
    echo "   - Serverless functions non rimangono attive"
    echo "   - Next.js non è progettato per long-running tasks"
    echo "   - Non affidabile in produzione"
    echo ""
    print_error "NON USARE questo approccio per produzione"
}

# Test del sistema
test_cron_endpoint() {
    print_section "🧪 TESTING CRON ENDPOINT"
    
    echo "📋 Come testare manualmente:"
    echo ""
    echo "1. 🔍 Preview utenti che necessitano reset:"
    echo "   curl 'http://localhost:3000/api/cron/reset-credits'"
    echo ""
    echo "2. 🔄 Esegui reset manuale (development):"
    echo "   curl -X POST 'http://localhost:3000/api/cron/reset-credits' \\"
    echo "     -H 'Authorization: Bearer development-secret'"
    echo ""
    echo "3. 🚀 Test su produzione:"
    echo "   curl -X POST 'https://yourdomain.com/api/cron/reset-credits' \\"
    echo "     -H 'Authorization: Bearer YOUR_PRODUCTION_SECRET'"
    echo ""
    echo "4. 📊 Controlla risultati nel database:"
    echo "   SELECT * FROM plan_status_logs WHERE action = 'auto_reset_credits';"
}

# Raccomandazioni
show_recommendations() {
    print_section "🎯 RACCOMANDAZIONI"
    
    echo "🥇 MIGLIORE OPZIONE: Vercel Cron"
    echo "   ✅ Integrazione nativa"
    echo "   ✅ Configurazione semplice"
    echo "   ✅ Affidabile"
    echo "   ✅ Gratuito per la maggior parte dei casi"
    echo ""
    echo "🥈 ALTERNATIVA: GitHub Actions"
    echo "   ✅ Gratuito per repo pubblici"
    echo "   ✅ Controllo versioning del cron"
    echo "   ⚠️  Usage limitato per repo privati"
    echo ""
    echo "🥉 BACKUP: Servizi esterni"
    echo "   ✅ Funziona ovunque"
    echo "   ⚠️  Dipendenza da terzi"
    echo ""
    
    echo "🔐 IMPORTANTE - Sicurezza:"
    echo "   ✅ Usa SEMPRE un CRON_SECRET sicuro"
    echo "   ✅ Non esporre l'endpoint pubblicamente"
    echo "   ✅ Monitora i log per accessi non autorizzati"
}

# Setup instructions per Vercel
setup_vercel() {
    print_section "🛠️  SETUP VERCEL CRON (STEP-BY-STEP)"
    
    echo "📋 Procedura completa:"
    echo ""
    echo "1. 📝 Genera un secret sicuro:"
    echo "   openssl rand -base64 32"
    echo ""
    echo "2. 🔐 Aggiungi variabile ambiente in Vercel:"
    echo "   vercel env add CRON_SECRET"
    echo "   (inserisci il secret generato sopra)"
    echo ""
    echo "3. 🚀 Deploy il progetto:"
    echo "   vercel --prod"
    echo ""
    echo "4. ✅ Verifica configurazione:"
    echo "   - Vai nel dashboard Vercel"
    echo "   - Project → Functions → Crons"
    echo "   - Dovresti vedere '/api/cron/reset-credits' schedualto"
    echo ""
    echo "5. 🧪 Test manuale:"
    echo "   curl -X POST 'https://yourdomain.com/api/cron/reset-credits' \\"
    echo "     -H 'Authorization: Bearer YOUR_SECRET'"
    echo ""
    echo "6. 📊 Monitora i log:"
    echo "   - Vercel → Project → Functions → View Logs"
    echo "   - Cerca 'STARTING AUTOMATIC CREDITS RESET'"
}

# Main execution
main() {
    echo "🎯 Scegli il metodo che preferisci per configurare il cron job:"
    echo ""
    
    show_vercel_cron
    show_github_actions
    show_external_cron
    show_external_services
    show_internal_system
    test_cron_endpoint
    show_recommendations
    setup_vercel
    
    echo ""
    print_section "🎉 READY TO GO!"
    echo ""
    echo "Il tuo endpoint /api/cron/reset-credits è pronto."
    echo "Scegli una delle opzioni sopra per configurare l'automazione."
    echo ""
    echo "💡 TIP: Inizia con Vercel Cron se usi Vercel - è il più semplice!"
}

# Esegui se chiamato direttamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
