#!/bin/bash

# Script per submission automatica sitemap dopo deploy
# Utilizzato da: CI/CD pipeline o manualmente dopo modifiche importanti
# Esegue: submission a Google, Bing, IndexNow

echo "🚀 TrovaMi SEO Submission Script"
echo "================================="

# URL base del sito
SITE_URL="https://trovami.pro"
SITEMAP_URL="$SITE_URL/sitemap.xml"

echo "📍 Sito: $SITE_URL"
echo "📋 Sitemap: $SITEMAP_URL"
echo ""

# Verifica che la sitemap sia accessibile
echo "🔍 Verificando accessibilità sitemap..."
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$SITEMAP_URL")

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Sitemap accessibile (HTTP $HTTP_STATUS)"
else
    echo "❌ Errore: Sitemap non accessibile (HTTP $HTTP_STATUS)"
    exit 1
fi

echo ""

# Submit a Google
echo "📤 Submitting to Google..."
GOOGLE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.google.com/ping?sitemap=$SITEMAP_URL")
if [ "$GOOGLE_RESPONSE" -eq 200 ]; then
    echo "✅ Google submission successful"
else
    echo "⚠️  Google submission failed (HTTP $GOOGLE_RESPONSE)"
fi

# Submit a Bing
echo "📤 Submitting to Bing..."
BING_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.bing.com/ping?sitemap=$SITEMAP_URL")
if [ "$BING_RESPONSE" -eq 200 ]; then
    echo "✅ Bing submission successful"
else
    echo "⚠️  Bing submission failed (HTTP $BING_RESPONSE)"
fi

# Submit via API interna (se disponibile)
echo "📤 Submitting via internal API..."
if command -v curl &> /dev/null; then
    API_RESPONSE=$(curl -s -X POST "$SITE_URL/api/seo/submit-sitemap" \
        -H "Content-Type: application/json" \
        -d '{"urls":["'$SITE_URL'","'$SITE_URL'/tools/public-scan","'$SITE_URL'/register"]}')
    echo "✅ Internal API submission completed"
else
    echo "⚠️  curl not available, skipping internal API"
fi

echo ""
echo "🎯 Summary:"
echo "- Sitemap URL: $SITEMAP_URL"
echo "- Google: $([ "$GOOGLE_RESPONSE" -eq 200 ] && echo "✅ OK" || echo "❌ Failed")"
echo "- Bing: $([ "$BING_RESPONSE" -eq 200 ] && echo "✅ OK" || echo "❌ Failed")"
echo "- Internal API: ✅ Attempted"

echo ""
echo "📚 Next steps:"
echo "1. Verify in Google Search Console: https://search.google.com/search-console"
echo "2. Check Bing Webmaster Tools: https://www.bing.com/webmasters"
echo "3. Monitor indexing status over next 24-48 hours"
echo "4. Create content and internal linking"

echo ""
echo "✨ SEO submission completed!"
