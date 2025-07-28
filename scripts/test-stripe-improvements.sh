#!/bin/bash

# Script per testare e monitorare il sistema Stripe migliorato
# Permette di verificare il funzionamento di webhook e reset crediti

echo "🔧 Testing Enhanced Stripe System - TrovaMi"
echo "=================================================="

# Funzione per controllare se il server è attivo
check_server() {
    echo "🔍 Checking if development server is running..."
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ Development server is running"
        return 0
    else
        echo "❌ Development server is not running"
        echo "💡 Please start with: npm run dev"
        return 1
    fi
}

# Funzione per testare l'endpoint di preview reset crediti
test_credits_reset_preview() {
    echo ""
    echo "📊 Testing credits reset preview..."
    echo "------------------------------------"
    
    response=$(curl -s "http://localhost:3000/api/cron/reset-credits")
    
    if [[ $? -eq 0 ]]; then
        echo "✅ Credits reset preview endpoint is working"
        echo "📋 Response:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo "❌ Credits reset preview endpoint failed"
    fi
}

# Funzione per controllare la tabella webhook events
check_webhook_events() {
    echo ""
    echo "🎯 Recent webhook events (if any)..."
    echo "------------------------------------"
    
    # Questa richiederà accesso al database - placeholder per ora
    echo "💡 To check webhook events, run this SQL query:"
    echo "   SELECT stripe_event_id, type, processed, created_at FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 5;"
}

# Funzione per verificare utenti con reset date scadute
check_users_needing_reset() {
    echo ""
    echo "👥 Users needing credits reset..."
    echo "--------------------------------"
    
    echo "💡 To check users needing reset, run this SQL query:"
    echo "   SELECT id, email, plan, credits_remaining, credits_reset_date"
    echo "   FROM users"
    echo "   WHERE credits_reset_date IS NOT NULL AND credits_reset_date <= NOW();"
}

# Funzione per mostrare i miglioramenti implementati
show_improvements() {
    echo ""
    echo "🚀 Stripe System Improvements Implemented"
    echo "========================================="
    echo ""
    echo "✅ 1. FIXED REGISTRATION WITH PAYMENT:"
    echo "   - No more temp UUID errors"
    echo "   - Email-based identification during checkout"
    echo "   - Automatic email confirmation for new users"
    echo ""
    echo "✅ 2. ENHANCED USER SEARCH IN WEBHOOKS:"
    echo "   - Fallback search by subscription_id → customer_id → email"
    echo "   - Better error handling and logging"
    echo "   - Automatic Stripe data updates"
    echo ""
    echo "✅ 3. AUTOMATIC CREDITS RESET:"
    echo "   - New cron endpoint: /api/cron/reset-credits"
    echo "   - Handles non-Stripe users (admin/custom plans)"
    echo "   - Monthly reset based on credits_reset_date field"
    echo ""
    echo "✅ 4. IMPROVED ERROR HANDLING:"
    echo "   - Webhook events saved to database for debugging"
    echo "   - Detailed error logging with context"
    echo "   - Retry logic preparation"
    echo ""
    echo "✅ 5. DATABASE ENHANCEMENTS:"
    echo "   - New stripe_webhook_events table"
    echo "   - credits_reset_date field in users table"
    echo "   - Better indexing for performance"
    echo ""
}

# Funzione per mostrare i prossimi passi
show_next_steps() {
    echo ""
    echo "📋 Next Steps to Complete Setup"
    echo "==============================="
    echo ""
    echo "1. 📊 APPLY DATABASE CHANGES:"
    echo "   Run: psql -d your_db -f database/stripe-webhook-improvements.sql"
    echo ""
    echo "2. 🌐 DEPLOY TO PRODUCTION:"
    echo "   Deploy the updated webhook handler to production"
    echo ""
    echo "3. ⏰ SETUP CRON JOB:"
    echo "   Schedule monthly calls to /api/cron/reset-credits"
    echo "   Example: First day of each month at 00:00 UTC"
    echo ""
    echo "4. 🔐 SET ENVIRONMENT VARIABLES:"
    echo "   Add CRON_SECRET to your environment variables"
    echo ""
    echo "5. 🧪 TEST WEBHOOK ENDPOINTS:"
    echo "   Use Stripe CLI to test webhook handling:"
    echo "   stripe listen --forward-to localhost:3000/api/stripe/webhook"
    echo ""
    echo "6. 📈 MONITOR WEBHOOK EVENTS:"
    echo "   Check stripe_webhook_events table for failed events"
    echo "   Monitor plan_status_logs for user operations"
    echo ""
}

# Funzione principale
main() {
    show_improvements
    
    if check_server; then
        test_credits_reset_preview
        check_webhook_events
        check_users_needing_reset
    fi
    
    show_next_steps
    
    echo ""
    echo "🎉 Enhanced Stripe System Setup Complete!"
    echo "Monitor the logs and webhook events table for any issues."
    echo ""
}

# Esegui se chiamato direttamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
