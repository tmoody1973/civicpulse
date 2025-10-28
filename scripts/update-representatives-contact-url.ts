/**
 * Migration script to add contact_url to existing representatives
 * This fetches all representatives and updates them with proper contact_url field
 *
 * Run with: npx tsx scripts/update-representatives-contact-url.ts
 */

import { executeQuery } from '../lib/db/client';

async function updateRepresentativesContactUrl() {
  try {
    console.log('🔍 Fetching all representatives from database...');

    // Get all representatives
    const result = await executeQuery(
      `SELECT bioguide_id, name, twitter_handle FROM representatives`,
      'representatives'
    );

    if (!result.rows || result.rows.length === 0) {
      console.log('✅ No representatives found in database');
      return;
    }

    console.log(`📊 Found ${result.rows.length} representatives to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const rep of result.rows) {
      const bioguideId = rep.bioguide_id as string;
      const name = rep.name as string;
      const twitterHandle = rep.twitter_handle as string | null;

      // Check if twitter_handle contains a URL (not just a handle)
      const isUrl = twitterHandle && (
        twitterHandle.includes('http') ||
        twitterHandle.includes('www.') ||
        twitterHandle.includes('.gov') ||
        twitterHandle.includes('.com')
      );

      if (isUrl) {
        console.log(`📝 Updating ${name} (${bioguideId})`);
        console.log(`   Moving URL from twitter_handle to contact_url: ${twitterHandle}`);

        // Move URL from twitter_handle to contact_url using UPDATE
        await executeQuery(
          `UPDATE representatives
           SET contact_url = '${twitterHandle.replace(/'/g, "''")}',
               twitter_handle = NULL,
               updated_at = '${new Date().toISOString()}'
           WHERE bioguide_id = '${bioguideId}'`,
          'representatives'
        );

        updatedCount++;
      } else {
        // Just update the timestamp
        await executeQuery(
          `UPDATE representatives SET updated_at = '${new Date().toISOString()}' WHERE bioguide_id = '${bioguideId}'`,
          'representatives'
        );
        skippedCount++;
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Updated: ${updatedCount} representatives`);
    console.log(`   Skipped: ${skippedCount} representatives (no URL in twitter_handle)`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
updateRepresentativesContactUrl()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
