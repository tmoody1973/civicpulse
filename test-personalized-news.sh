#!/bin/bash

# Test script for triggering personalized news generation via Inngest
# This tests the full workflow: trigger Inngest -> fetch with Perplexity -> save to DB

set -e

echo "🚀 Testing Personalized News Generation with Perplexity API"
echo "============================================================"

USER_ID="user_01K8NC5EJ3JBZKC9EQRQBQQVK4"

# 1. Trigger Inngest function via API
echo ""
echo "📡 Step 1: Triggering Inngest function via /api/news/personalized?inngest=true"
echo "   This will trigger background generation using Perplexity API..."

curl -s http://localhost:3000/api/news/personalized?inngest=true \
  -H "Content-Type: application/json" \
  | jq '.meta.message, .data | length'

echo ""
echo "⏳ Waiting 30 seconds for Inngest to process..."
sleep 30

# 2. Check if articles were generated
echo ""
echo "🔍 Step 2: Checking database for new articles with thumbnails..."

curl -s http://localhost:3000/api/news/personalized \
  -H "Content-Type: application/json" \
  | jq '{
    total: .data | length,
    hasImages: [.data[] | select(.imageUrl != null)] | length,
    sampleArticles: .data[0:3] | map({title, source, imageUrl: .imageUrl // "no image"})
  }'

echo ""
echo "✅ Test complete! Check the dashboard at http://localhost:3000/dashboard"
echo "   Articles should now show thumbnails next to each headline."
