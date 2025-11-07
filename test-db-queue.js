#!/usr/bin/env node
/**
 * Quick Database Queue Test
 * Tests the database helper functions and job queue operations
 */

const path = require('path');

// Set up environment
process.env.RAINDROP_SQL_URL = path.join(process.cwd(), 'civic-db.sqlite');

async function main() {
  console.log('🧪 Testing Database Queue Operations');
  console.log('=====================================\n');

  // Import database helpers
  const { execute, query, queryOne } = require('./lib/db/sqlite');

  // Test 1: Insert a test job
  console.log('📤 Test 1: Inserting test job...');
  const testJobId = `test-job-${Date.now()}`;
  const testUserId = 'test-user-456';

  try {
    execute(
      `INSERT INTO podcast_jobs (
        job_id, user_id, type, status, progress, message,
        bill_count, topics, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        testJobId,
        testUserId,
        'daily',
        'queued',
        0,
        'Test job queued',
        3,
        JSON.stringify(['healthcare', 'education'])
      ]
    );
    console.log('✅ Test job inserted successfully\n');
  } catch (error) {
    console.error('❌ Failed to insert job:', error.message);
    process.exit(1);
  }

  // Test 2: Query the job back
  console.log('🔍 Test 2: Querying test job...');
  try {
    const job = queryOne(
      `SELECT * FROM podcast_jobs WHERE job_id = ?`,
      [testJobId]
    );

    if (!job) {
      console.error('❌ Job not found!');
      process.exit(1);
    }

    console.log('✅ Job found:');
    console.log(`   ID: ${job.job_id}`);
    console.log(`   User: ${job.user_id}`);
    console.log(`   Type: ${job.type}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Progress: ${job.progress}%\n`);
  } catch (error) {
    console.error('❌ Failed to query job:', error.message);
    process.exit(1);
  }

  // Test 3: Update job status
  console.log('📝 Test 3: Updating job status...');
  try {
    execute(
      `UPDATE podcast_jobs
       SET status = ?, progress = ?, message = ?
       WHERE job_id = ?`,
      ['processing', 50, 'Test processing...', testJobId]
    );
    console.log('✅ Job status updated\n');
  } catch (error) {
    console.error('❌ Failed to update job:', error.message);
    process.exit(1);
  }

  // Test 4: Verify update
  console.log('🔍 Test 4: Verifying update...');
  try {
    const updatedJob = queryOne(
      `SELECT status, progress, message FROM podcast_jobs WHERE job_id = ?`,
      [testJobId]
    );

    if (updatedJob.status !== 'processing' || updatedJob.progress !== 50) {
      console.error('❌ Job update verification failed!');
      console.error('   Expected: status=processing, progress=50');
      console.error(`   Got: status=${updatedJob.status}, progress=${updatedJob.progress}`);
      process.exit(1);
    }

    console.log('✅ Update verified:');
    console.log(`   Status: ${updatedJob.status}`);
    console.log(`   Progress: ${updatedJob.progress}%`);
    console.log(`   Message: ${updatedJob.message}\n`);
  } catch (error) {
    console.error('❌ Failed to verify update:', error.message);
    process.exit(1);
  }

  // Test 5: Query all queued jobs
  console.log('📊 Test 5: Querying all queued jobs...');
  try {
    const queuedJobs = query(
      `SELECT job_id, user_id, type, status, created_at
       FROM podcast_jobs
       WHERE status = 'queued'
       ORDER BY created_at ASC`
    );

    console.log(`✅ Found ${queuedJobs.length} queued job(s)\n`);
  } catch (error) {
    console.error('❌ Failed to query queued jobs:', error.message);
    process.exit(1);
  }

  // Cleanup: Delete test job
  console.log('🧹 Cleanup: Removing test job...');
  try {
    execute(
      `DELETE FROM podcast_jobs WHERE job_id = ?`,
      [testJobId]
    );
    console.log('✅ Test job removed\n');
  } catch (error) {
    console.error('❌ Failed to cleanup:', error.message);
  }

  console.log('=====================================');
  console.log('✅ All database queue tests passed!');
  console.log('');
  console.log('The fallback solution components are working:');
  console.log('  ✅ Database table created');
  console.log('  ✅ Database helper functions work');
  console.log('  ✅ Job insertion works');
  console.log('  ✅ Job queries work');
  console.log('  ✅ Job updates work');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Start Next.js dev server: npm run dev');
  console.log('  2. Test the full flow through the API endpoints');
  console.log('  3. Configure external API keys for actual podcast generation');
}

main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
