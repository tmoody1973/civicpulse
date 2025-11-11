#!/bin/bash

# Trigger news pool refresh locally
# This will populate the local civic_db.sqlite database

echo "🔄 Triggering news pool refresh..."
echo "📍 Target: Local SQLite database (civic_db.sqlite)"
echo ""

# Check if Next.js is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Next.js dev server not running at localhost:3000"
    echo "   Run: npm run dev"
    exit 1
fi

# Check if Inngest CLI is running
if ! curl -s http://localhost:8288 > /dev/null 2>&1; then
    echo "⚠️  Inngest CLI not detected at localhost:8288"
    echo "   It may still work if using embedded mode"
fi

# Trigger the event manually by calling the test script
echo "📰 Fetching news for common policy topics..."
npx tsx scripts/trigger-news-refresh.ts

echo ""
echo "✅ News refresh triggered!"
echo "📊 Check articles in database:"
echo "   sqlite3 civic_db.sqlite 'SELECT COUNT(*) FROM news_articles'"
