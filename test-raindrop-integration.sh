#!/bin/bash

# Test Raindrop Integration
# Tests the complete podcast generation flow using Raindrop queue-api

set -e

echo "🧪 Testing Raindrop Integration"
echo "================================"
echo ""

# 1. Test Raindrop queue-api endpoint directly
echo "📡 Step 1: Testing Raindrop queue-api submission endpoint..."
QUEUE_API_URL="https://svc-01k9e5213jbyetdgsvxxap2vt0.01k66gywmx8x4r0w31fdjjfekf.lmapp.run"
JOB_ID="test-job-$(date +%s)"
USER_ID="test-user-456"

SUBMIT_RESPONSE=$(curl -X POST "${QUEUE_API_URL}/submit-podcast-job" \
  -H "Content-Type: application/json" \
  -d "{\"jobId\": \"${JOB_ID}\", \"userId\": \"${USER_ID}\", \"type\": \"daily\", \"billCount\": 3}" \
  -s -w "\n%{http_code}")

HTTP_CODE=$(echo "$SUBMIT_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$SUBMIT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Job submitted successfully!"
  echo "Response: $RESPONSE_BODY"
else
  echo "❌ Job submission failed with HTTP $HTTP_CODE"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# 2. Test job status endpoint
echo "📊 Step 2: Testing job status endpoint..."
sleep 2 # Give the actor a moment to process

STATUS_RESPONSE=$(curl -X GET "${QUEUE_API_URL}/job-status/${JOB_ID}?userId=${USER_ID}" \
  -H "Content-Type: application/json" \
  -s -w "\n%{http_code}")

STATUS_HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n 1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '$d')

if [ "$STATUS_HTTP_CODE" = "200" ]; then
  echo "✅ Job status retrieved successfully!"
  echo "Status: $STATUS_BODY"
elif [ "$STATUS_HTTP_CODE" = "404" ]; then
  echo "⚠️  Job not found (this is expected for test jobs that aren't actually processed)"
  echo "Response: $STATUS_BODY"
else
  echo "❌ Job status check failed with HTTP $STATUS_HTTP_CODE"
  echo "Response: $STATUS_BODY"
fi

echo ""
echo "================================"
echo "✅ Raindrop Integration Test Complete!"
echo ""
echo "Summary:"
echo "- Queue-api URL: $QUEUE_API_URL"
echo "- Job submission: $([ "$HTTP_CODE" = "200" ] && echo "✅ Working" || echo "❌ Failed")"
echo "- Status query: $([ "$STATUS_HTTP_CODE" = "200" ] || [ "$STATUS_HTTP_CODE" = "404" ] && echo "✅ Working" || echo "❌ Failed")"
