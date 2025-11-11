/**
 * Test if news_articles table exists in remote Raindrop database
 */

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

if (!RAINDROP_SERVICE_URL) {
  console.error('❌ RAINDROP_SERVICE_URL not set');
  process.exit(1);
}

async function testRemoteDatabase() {
  console.log('🔍 Testing remote Raindrop database...');
  console.log(`📍 Service URL: ${RAINDROP_SERVICE_URL}`);
  console.log('');

  // Test 1: Check if news_articles table exists
  console.log('Test 1: Checking if news_articles table exists...');
  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'news_articles',
        query: `SELECT name FROM sqlite_master WHERE type='table' AND name='news_articles'`
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.log('❌ Error:', data.error);
    } else if (data.rows && data.rows.length > 0) {
      console.log('✅ Table exists!');
    } else {
      console.log('⚠️  Table not found in database');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }

  console.log('');

  // Test 2: Try to count rows in news_articles
  console.log('Test 2: Counting rows in news_articles...');
  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'news_articles',
        query: `SELECT COUNT(*) as count FROM news_articles`
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.log('❌ Error:', data.error);
    } else {
      console.log('✅ Query succeeded! Count:', data.rows?.[0]?.count);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }

  console.log('');

  // Test 3: Check briefs table for comparison (should work)
  console.log('Test 3: Checking briefs table (should work)...');
  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'briefs',
        query: `SELECT COUNT(*) as count FROM briefs`
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.log('❌ Error:', data.error);
    } else {
      console.log('✅ Briefs table works! Count:', data.rows?.[0]?.count);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testRemoteDatabase();
