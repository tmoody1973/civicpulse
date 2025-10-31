/**
 * Re-sync all bills to SmartBucket with comprehensive metadata
 * This updates existing bills to include sponsor, dates, status, etc.
 */

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL || 'https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run';

async function resetSyncStatus() {
  console.log('🔄 Resetting SmartBucket sync status for all bills with full text...');

  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query: `
        UPDATE bills
        SET smartbucket_key = NULL,
            synced_to_smartbucket_at = NULL
        WHERE full_text IS NOT NULL
      `,
    }),
  });

  const data = await response.json();
  console.log('✅ Reset sync status:', data);
}

async function syncBatch(limit: number = 50) {
  console.log(`\n📤 Syncing batch of ${limit} bills...`);

  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/smartbucket/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit }),
  });

  const data = await response.json();

  if (data.success) {
    console.log(`✅ Synced: ${data.synced} bills`);
    if (data.failed > 0) {
      console.log(`❌ Failed: ${data.failed} bills`);
      console.log('Errors:', data.errors);
    }
    return data.synced;
  } else {
    throw new Error('Sync failed: ' + JSON.stringify(data));
  }
}

async function main() {
  console.log('🚀 Starting SmartBucket re-sync with comprehensive metadata...\n');

  // Step 1: Reset sync status
  await resetSyncStatus();

  // Step 2: Sync in batches
  let totalSynced = 0;
  let batchCount = 0;
  const batchSize = 50;

  while (true) {
    batchCount++;
    console.log(`\n--- Batch ${batchCount} ---`);

    const synced = await syncBatch(batchSize);
    totalSynced += synced;

    if (synced < batchSize) {
      // No more bills to sync
      break;
    }

    // Wait a bit between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n🎉 Re-sync complete! Total synced: ${totalSynced} bills`);
  console.log('\n✨ All bills now include comprehensive metadata:');
  console.log('   - Sponsor information');
  console.log('   - Introduction and action dates');
  console.log('   - Status and cosponsors');
  console.log('   - Full bill text');
}

main().catch(error => {
  console.error('❌ Re-sync failed:', error);
  process.exit(1);
});
