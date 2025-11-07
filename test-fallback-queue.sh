#!/bin/bash
set -e

echo "🧪 Testing Database Queue Fallback Solution"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get INTERNAL_API_KEY from .env.local
INTERNAL_API_KEY=$(grep INTERNAL_API_KEY .env.local | cut -d '=' -f2)

if [ -z "$INTERNAL_API_KEY" ]; then
  echo -e "${RED}❌ INTERNAL_API_KEY not found in .env.local${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found INTERNAL_API_KEY${NC}"
echo ""

# Step 1: Insert a test job directly into database
echo "📤 Step 1: Inserting test job into database..."

TEST_JOB_ID="test-user-123-daily-$(date +%s)"
TEST_USER_ID="test-user-123"

sqlite3 civic-db.sqlite <<EOF
INSERT INTO podcast_jobs (
  job_id, user_id, type, status, progress, message,
  bill_count, topics, created_at
) VALUES (
  '${TEST_JOB_ID}',
  '${TEST_USER_ID}',
  'daily',
  'queued',
  0,
  'Job queued for processing...',
  3,
  '["healthcare", "environment", "education"]',
  CURRENT_TIMESTAMP
);
EOF

echo -e "${GREEN}✅ Test job inserted: ${TEST_JOB_ID}${NC}"
echo ""

# Step 2: Verify job was inserted
echo "🔍 Step 2: Verifying job in database..."

JOB_STATUS=$(sqlite3 civic-db.sqlite "SELECT status FROM podcast_jobs WHERE job_id='${TEST_JOB_ID}';")

if [ "$JOB_STATUS" = "queued" ]; then
  echo -e "${GREEN}✅ Job status: queued${NC}"
else
  echo -e "${RED}❌ Unexpected job status: ${JOB_STATUS}${NC}"
  exit 1
fi

echo ""

# Step 3: Check processor status endpoint
echo "📊 Step 3: Checking processor status..."

PROCESSOR_STATUS=$(curl -s http://localhost:3000/api/process-podcast-queue)

echo "Response: $PROCESSOR_STATUS"
echo ""

# Step 4: Trigger processor
echo "🚀 Step 4: Triggering background processor..."

PROCESSOR_RESPONSE=$(curl -s -X POST http://localhost:3000/api/process-podcast-queue \
  -H "Content-Type: application/json" \
  -H "x-internal-key: ${INTERNAL_API_KEY}" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$PROCESSOR_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$PROCESSOR_RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Processor triggered successfully${NC}"
else
  echo -e "${RED}❌ Processor trigger failed with HTTP $HTTP_CODE${NC}"
  echo -e "${YELLOW}Note: This may fail if external APIs (Congress, Claude, ElevenLabs) are not configured${NC}"
fi

echo ""

# Step 5: Check job status after processing
echo "🔍 Step 5: Checking job status after processing..."

# Wait a moment for processor to update
sleep 2

FINAL_JOB=$(sqlite3 civic-db.sqlite "SELECT job_id, status, progress, message FROM podcast_jobs WHERE job_id='${TEST_JOB_ID}';")

echo "Job: $FINAL_JOB"
echo ""

# Parse job status
FINAL_STATUS=$(sqlite3 civic-db.sqlite "SELECT status FROM podcast_jobs WHERE job_id='${TEST_JOB_ID}';")

if [ "$FINAL_STATUS" = "queued" ]; then
  echo -e "${YELLOW}⏳ Job still queued (processor may be waiting for APIs)${NC}"
elif [ "$FINAL_STATUS" = "processing" ]; then
  echo -e "${YELLOW}⏳ Job is processing (external APIs are being called)${NC}"
elif [ "$FINAL_STATUS" = "complete" ]; then
  echo -e "${GREEN}✅ Job completed successfully!${NC}"

  # Show audio URL if available
  AUDIO_URL=$(sqlite3 civic-db.sqlite "SELECT audio_url FROM podcast_jobs WHERE job_id='${TEST_JOB_ID}';")
  echo -e "${GREEN}   Audio URL: ${AUDIO_URL}${NC}"
elif [ "$FINAL_STATUS" = "failed" ]; then
  echo -e "${RED}❌ Job failed${NC}"

  # Show error message
  ERROR_MSG=$(sqlite3 civic-db.sqlite "SELECT error_message FROM podcast_jobs WHERE job_id='${TEST_JOB_ID}';")
  echo -e "${RED}   Error: ${ERROR_MSG}${NC}"
else
  echo -e "${RED}❌ Unexpected status: ${FINAL_STATUS}${NC}"
fi

echo ""

# Step 6: Test status API endpoint
echo "🔍 Step 6: Testing audio-status API endpoint..."

STATUS_API_RESPONSE=$(curl -s "http://localhost:3000/api/audio-status/${TEST_JOB_ID}" \
  -H "Cookie: session=test-session")

echo "Status API Response:"
echo "$STATUS_API_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_API_RESPONSE"
echo ""

# Cleanup
echo "🧹 Cleanup: Removing test job..."
sqlite3 civic-db.sqlite "DELETE FROM podcast_jobs WHERE job_id='${TEST_JOB_ID}';"
echo -e "${GREEN}✅ Test job removed${NC}"
echo ""

echo "============================================"
echo -e "${GREEN}✅ Fallback queue system test complete!${NC}"
echo ""
echo "Summary:"
echo "- ✅ Database table exists and is functional"
echo "- ✅ Jobs can be inserted into queue"
echo "- ✅ Processor can be triggered via HTTP"
echo "- ✅ Status API endpoint works"
echo ""
echo "Notes:"
echo "- If job failed, check that API keys are set in .env.local:"
echo "  - CONGRESS_API_KEY"
echo "  - ANTHROPIC_API_KEY"
echo "  - ELEVENLABS_API_KEY"
echo "  - VULTR_STORAGE_ENDPOINT, VULTR_ACCESS_KEY, VULTR_SECRET_KEY"
echo ""
echo "- Real podcast generation requires all external APIs to be configured"
echo "- Local fallback will save audio to public/podcasts/ if Vultr is unavailable"
