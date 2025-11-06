#!/bin/bash

# Load environment variables
set -a
source .env.local
set +a

echo "🧪 Testing Tavily + Cerebras Integration"
echo "=========================================="
echo ""

# 1. Test Tavily API
echo "1️⃣  Testing Tavily API..."
TAVILY_RESPONSE=$(curl -s -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "'$TAVILY_API_KEY'",
    "query": "latest congressional news healthcare 2025",
    "max_results": 3,
    "search_depth": "advanced",
    "days": 7
  }')

if echo "$TAVILY_RESPONSE" | grep -q '"results"'; then
  RESULT_COUNT=$(echo "$TAVILY_RESPONSE" | grep -o '"results":\[' | wc -l)
  echo "✅ Tavily API working"
  echo "   Response contains results array"
else
  echo "❌ Tavily API failed"
  echo "   Response: $TAVILY_RESPONSE"
  exit 1
fi

echo ""

# 2. Test Cerebras API
echo "2️⃣  Testing Cerebras API..."
CEREBRAS_RESPONSE=$(curl -s -X POST https://api.cerebras.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CEREBRAS_API_KEY" \
  -d '{
    "model": "gpt-oss-120b",
    "messages": [
      {
        "role": "user",
        "content": "Say hello in JSON format: {\"message\": \"your message here\"}"
      }
    ],
    "max_tokens": 50,
    "temperature": 0.2
  }')

if echo "$CEREBRAS_RESPONSE" | grep -q '"choices"'; then
  echo "✅ Cerebras API working"
  echo "   Model: gpt-oss-120b"
else
  echo "❌ Cerebras API failed"
  echo "   Response: $CEREBRAS_RESPONSE"
  exit 1
fi

echo ""

# 3. Test Claude API (for bill analysis)
echo "3️⃣  Testing Claude API..."
CLAUDE_RESPONSE=$(curl -s -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 50,
    "messages": [
      {
        "role": "user",
        "content": "Say hello"
      }
    ]
  }')

if echo "$CLAUDE_RESPONSE" | grep -q '"content"'; then
  echo "✅ Claude API working"
  echo "   Model: claude-sonnet-4-20250514 (reserved for bill analysis)"
else
  echo "❌ Claude API failed"
  echo "   Response: $CLAUDE_RESPONSE"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ All APIs configured correctly!"
echo ""
echo "Summary:"
echo "  - Tavily: Fast news search (~500ms)"
echo "  - Cerebras: AI synthesis with gpt-oss-120b (~2-3s)"
echo "  - Claude: Reserved for bill analysis"
echo ""
echo "Ready to test personalized news endpoint! 🚀"
