#!/bin/bash
#
# Test Image Worker
#
# Tests the image fetch worker by submitting a test job to the queue.
#

echo "🖼️  Testing Image Worker"
echo ""

# Check if Redis is running
echo "1️⃣  Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
  echo "❌ Redis is not running"
  echo "   Start Redis with: redis-server"
  exit 1
fi
echo "✅ Redis is running"
echo ""

# Submit a test image fetch job
echo "2️⃣  Submitting test image fetch job..."

# Using Node.js to add a job to the queue
node -e "
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

const imageQueue = new Queue('image-fetch', { connection });

(async () => {
  try {
    const job = await imageQueue.add('fetch-image', {
      briefId: 'test-brief-123',
      title: 'California Wildfire Prevention Bill',
      description: 'New legislation to prevent wildfires in California through forest management',
      keywords: ['wildfire', 'california', 'forest management', 'fire prevention']
    });

    console.log('✅ Job submitted successfully!');
    console.log('   Job ID:', job.id);
    console.log('   Data:', JSON.stringify(job.data, null, 2));
    console.log('');
    console.log('📊 Check worker logs to see the job being processed');
    console.log('   Run: npm run worker:images');

    await connection.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to submit job:', error.message);
    await connection.quit();
    process.exit(1);
  }
})();
" 2>&1
