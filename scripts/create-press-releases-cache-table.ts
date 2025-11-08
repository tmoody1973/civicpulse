/**
 * Create press_releases_cache table for caching Brave Search results
 *
 * Usage: npx tsx scripts/create-press-releases-cache-table.ts
 */

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

async function createPressReleasesCacheTable() {
  console.log('\n📦 Creating press_releases_cache table...\n');

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ ERROR: RAINDROP_SERVICE_URL not found in environment');
    return;
  }

  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS press_releases_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bioguide_id TEXT NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT,
        url TEXT NOT NULL UNIQUE,
        published_at TEXT NOT NULL,
        source TEXT NOT NULL,
        cached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bioguide_id) REFERENCES representatives(bioguide_id) ON DELETE CASCADE
      )
    `;

    console.log('📝 Creating table with schema:\n');
    console.log(createTableQuery);
    console.log('');

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: createTableQuery
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create table: ${error}`);
    }

    console.log('✅ Table created successfully!');

    // Create index for faster lookups
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_press_releases_bioguide_cached
      ON press_releases_cache(bioguide_id, cached_at DESC)
    `;

    console.log('\n📇 Creating index for performance...');

    const indexResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'press_releases_cache',
        query: createIndexQuery
      })
    });

    if (!indexResponse.ok) {
      console.warn('⚠️  Failed to create index (non-critical)');
    } else {
      console.log('✅ Index created successfully!');
    }

    console.log('\n✨ Press releases cache table ready!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

createPressReleasesCacheTable();
