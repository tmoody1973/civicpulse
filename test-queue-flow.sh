#!/bin/bash

echo "🧪 Testing BullMQ Queue Flow"
echo "============================="
echo ""

# Valid test session cookie (using real user ID from database)
# User ID: user_01K8NC5EJ3JBZKC9EQRQBQQVK4
SESSION_COOKIE="civic_pulse_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzAxSzhOQzVFSjNKQlpLQzlFUVJRQlFRVks0IiwiZW1haWwiOiJ0ZXN0QGhha2l2by5jb20iLCJpYXQiOjE3NjI1MjY2NjgsImV4cCI6MTc2MzEzMTQ2OH0.RE41dat2v0TQ6lVvMVdaV522WTPF4z2KxD3TSFWvYuk"

# Step 1: Request brief generation (should return job ID instantly)
echo "📤 Step 1: Requesting brief generation..."
response=$(curl -s -X POST http://localhost:3000/api/briefs/generate-daily \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION_COOKIE" \
  -d '{"force_regenerate": true}')

echo "Response:"
echo "$response" | jq '.'
echo ""

# Extract job ID
jobId=$(echo "$response" | jq -r '.jobId')

if [ "$jobId" = "null" ] || [ -z "$jobId" ]; then
  echo "❌ Failed to get job ID"
  echo "Response: $response"
  exit 1
fi

echo "✅ Job created: $jobId"
echo ""

# Step 2: Poll job status
echo "📊 Step 2: Polling job status (will check every 5 seconds)..."
echo ""

attempt=0
max_attempts=180  # 15 minutes max (180 * 5 seconds)

while [ $attempt -lt $max_attempts ]; do
  attempt=$((attempt + 1))

  status_response=$(curl -s "http://localhost:3000/api/briefs/status/$jobId")

  job_status=$(echo "$status_response" | jq -r '.status')
  progress=$(echo "$status_response" | jq -r '.progress')

  echo "[$attempt] Status: $job_status | Progress: $progress%"

  # Check if completed
  if [ "$job_status" = "completed" ]; then
    echo ""
    echo "✅ Brief generation completed!"
    echo ""
    echo "Full result:"
    echo "$status_response" | jq '.'
    exit 0
  fi

  # Check if failed
  if [ "$job_status" = "failed" ]; then
    echo ""
    echo "❌ Brief generation failed"
    echo ""
    echo "Error details:"
    echo "$status_response" | jq '.'
    exit 1
  fi

  # Wait 5 seconds before next check
  sleep 5
done

echo ""
echo "⏱️  Timeout: Job did not complete within 15 minutes"
exit 1
