#!/bin/bash

# Script di post-deploy per indicizzazione automatica
# Utilizzato da: Vercel dopo ogni deploy per accelerare indicizzazione
# Eseguito da: webhook Vercel o GitHub Actions

echo "🚀 Starting post-deploy SEO optimization..."

# 1. Ping Google con la sitemap
echo "📡 Notifying Google about sitemap..."
curl -s "https://www.google.com/ping?sitemap=https://trovami.pro/sitemap.xml"

# 2. Ping Bing con la sitemap  
echo "📡 Notifying Bing about sitemap..."
curl -s "https://www.bing.com/ping?sitemap=https://trovami.pro/sitemap.xml"

# 3. Notify IndexNow (se configurato)
if [ ! -z "$INDEXNOW_KEY" ]; then
    echo "📡 Notifying IndexNow..."
    curl -s -X POST "https://api.indexnow.org/indexnow" \
        -H "Content-Type: application/json" \
        -d '{
            "host": "trovami.pro",
            "key": "'$INDEXNOW_KEY'",
            "urlList": [
                "https://trovami.pro",
                "https://trovami.pro/register", 
                "https://trovami.pro/tools/public-scan"
            ]
        }'
fi

# 4. Test principali endpoint
echo "🔍 Testing main endpoints..."
curl -s -o /dev/null -w "%{http_code}" "https://trovami.pro" 
curl -s -o /dev/null -w "%{http_code}" "https://trovami.pro/sitemap.xml"
curl -s -o /dev/null -w "%{http_code}" "https://trovami.pro/robots.txt"

echo "✅ Post-deploy SEO optimization completed!"
