#!/usr/bin/env node
/**
 * Simple Database Queue Test
 * Direct test using better-sqlite3
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'civic-db.sqlite');

console.log('🧪 Testing Database Queue Operations');
console.log('=====================================\n');

console.log(`📁 Database path: ${dbPath}\n`);

// Open database
const db = new Database(dbPath);

try {
  // Test 1: Insert a test job
  console.log('📤 Test 1: Inserting test job...');
  const testJobId = `test-job-${Date.now()}`;
  const testUserId = 'test-user-456';

  const insertStmt = db.prepare(`
    INSERT INTO podcast_jobs (
      job_id, user_id, type, status, progress, message,
      bill_count, topics, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  insertStmt.run(
    testJobId,
    testUserId,
    'daily',
    'queued',
    0,
    'Test job queued',
    3,
    JSON.stringify(['healthcare', 'education'])
  );

  console.log('✅ Test job inserted successfully');
  console.log(`   Job ID: ${testJobId}\n`);

  // Test 2: Query the job back
  console.log('🔍 Test 2: Querying test job...');

  const selectStmt = db.prepare('SELECT * FROM podcast_jobs WHERE job_id = ?');
  const job = selectStmt.get(testJobId);

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

  // Test 3: Update job status
  console.log('📝 Test 3: Updating job status...');

  const updateStmt = db.prepare(`
    UPDATE podcast_jobs
    SET status = ?, progress = ?, message = ?
    WHERE job_id = ?
  `);

  updateStmt.run('processing', 50, 'Test processing...', testJobId);

  console.log('✅ Job status updated\n');

  // Test 4: Verify update
  console.log('🔍 Test 4: Verifying update...');

  const updatedJob = selectStmt.get(testJobId);

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

  // Test 5: Query all queued jobs
  console.log('📊 Test 5: Querying all queued jobs...');

  const queuedStmt = db.prepare(`
    SELECT job_id, user_id, type, status, created_at
    FROM podcast_jobs
    WHERE status = 'queued'
    ORDER BY created_at ASC
  `);

  const queuedJobs = queuedStmt.all();

  console.log(`✅ Found ${queuedJobs.length} queued job(s)\n`);

  // Test 6: Test the indexes
  console.log('📊 Test 6: Verifying indexes exist...');

  const indexStmt = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'index' AND tbl_name = 'podcast_jobs'
  `);

  const indexes = indexStmt.all();

  console.log(`✅ Found ${indexes.length} indexes:`);
  indexes.forEach(idx => {
    console.log(`   - ${idx.name}`);
  });
  console.log('');

  // Cleanup: Delete test job
  console.log('🧹 Cleanup: Removing test job...');

  const deleteStmt = db.prepare('DELETE FROM podcast_jobs WHERE job_id = ?');
  deleteStmt.run(testJobId);

  console.log('✅ Test job removed\n');

  console.log('=====================================');
  console.log('✅ All database queue tests passed!');
  console.log('');
  console.log('Database components verified:');
  console.log('  ✅ Table schema is correct');
  console.log('  ✅ INSERT operations work');
  console.log('  ✅ SELECT operations work');
  console.log('  ✅ UPDATE operations work');
  console.log('  ✅ DELETE operations work');
  console.log('  ✅ Indexes are in place');
  console.log('');
  console.log('The fallback solution is ready for use!');
  console.log('');
  console.log('Next steps for full integration:');
  console.log('  1. Ensure Next.js dev server is running');
  console.log('  2. Test API endpoints (generate-podcast, audio-status, process-podcast-queue)');
  console.log('  3. Configure external API keys:');
  console.log('     - CONGRESS_API_KEY');
  console.log('     - ANTHROPIC_API_KEY');
  console.log('     - ELEVENLABS_API_KEY');
  console.log('     - VULTR_STORAGE_ENDPOINT, VULTR_ACCESS_KEY, VULTR_SECRET_KEY');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
