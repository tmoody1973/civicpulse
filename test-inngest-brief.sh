#!/bin/bash

echo "🧪 Testing Inngest Brief Generation"
echo "===================================="
echo ""

USER_ID="user_01K8NC5EJ3JBZKC9EQRQBQQVK4"

echo "Triggering brief generation for user: $USER_ID"
echo "POST http://localhost:8888/.netlify/functions/trigger-brief"
echo ""

curl -X POST http://localhost:8888/.netlify/functions/trigger-brief \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"userEmail\": \"test@example.com\",
    \"userName\": \"Test User\",
    \"state\": \"CA\",
    \"district\": \"12\",
    \"policyInterests\": [\"healthcare\", \"education\"]
  }" \
  | jq '.'

echo ""
echo ""
echo "📊 Check Inngest Dev Server for job status:"
echo "http://localhost:8288/runs"
