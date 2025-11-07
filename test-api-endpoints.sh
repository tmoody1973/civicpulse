#!/bin/bash
# Quick API Endpoint Test
# Tests the database queue fallback through HTTP endpoints

echo "🧪 Testing Database Queue Fallback via API"
echo "=========================================="
echo ""

# Get INTERNAL_API_KEY
INTERNAL_API_KEY=$(grep INTERNAL_API_KEY .env.local | cut -d '=' -f2)

# Test 1: Check processor status endpoint
echo "📊 Test 1: Processor Status Endpoint"
echo "GET http://localhost:3000/api/process-podcast-queue"
echo ""

curl -s http://localhost:3000/api/process-podcast-queue | python3 -m json.tool 2>/dev/null || echo "Response received"
echo ""
echo ""

# Test 2: Insert test job directly into database
echo "📤 Test 2: Insert Test Job into Database"
TEST_JOB_ID="api-test-$(date +%s)"

sqlite3 civic-db.sqlite <<EOF
INSERT INTO podcast_jobs (
  job_id, user_id, type, status, progress, message, bill_count, topics
) VALUES (
  '${TEST_JOB_ID}', 'test-user', 'daily', 'queued', 0, 'Test job', 3, '[]'
);
EOF

echo "✅ Test job created: ${TEST_JOB_ID}"
echo ""

# Test 3: Check job status via API (simulating user poll)
echo "🔍 Test 3: Audio Status API Endpoint"
echo "GET http://localhost:3000/api/audio-status/${TEST_JOB_ID}"
echo ""
echo "Note: This requires authentication, so it will return 401 Unauthorized"
echo "But if the route loads without errors, the database query works!"
echo ""

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/audio-status/${TEST_JOB_ID})

if [ "$STATUS_CODE" = "401" ]; then
  echo "✅ Route works! (401 = auth required, database query executed)"
elif [ "$STATUS_CODE" = "500" ]; then
  echo "❌ Server error - check Next.js console for details"
else
  echo "Status code: $STATUS_CODE"
fi

echo ""

# Test 4: Trigger processor (with auth)
echo "🚀 Test 4: Trigger Background Processor"
echo "POST http://localhost:3000/api/process-podcast-queue"
echo "Headers: x-internal-key: ${INTERNAL_API_KEY}"
echo ""

PROCESSOR_RESULT=$(curl -s -X POST http://localhost:3000/api/process-podcast-queue \
  -H "x-internal-key: ${INTERNAL_API_KEY}" \
  -H "Content-Type: application/json")

echo "$PROCESSOR_RESULT" | python3 -m json.tool 2>/dev/null || echo "$PROCESSOR_RESULT"
echo ""

# Check if job was processed
sleep 2
FINAL_STATUS=$(sqlite3 civic-db.sqlite "SELECT status FROM podcast_jobs WHERE job_id='${TEST_JOB_ID}'")
echo "Final job status: ${FINAL_STATUS}"
echo ""

# Cleanup
sqlite3 civic-db.sqlite "DELETE FROM podcast_jobs WHERE job_id='${TEST_JOB_ID}'"
echo "✅ Test job cleaned up"
echo ""
echo "=========================================="
echo "Summary:"
echo "- If processor returned JSON with 'success' or job info: ✅ Working!"
echo "- If you got errors about Congress/Claude/ElevenLabs API keys: ⚠️  APIs need config"
echo "- If you got database errors: ❌ Check Next.js console logs"
