/**
 * Create news_articles table in remote CIVIC_DB
 * Uses the admin-api to execute SQL directly
 */

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

if (!RAINDROP_SERVICE_URL) {
  console.error('❌ RAINDROP_SERVICE_URL not set');
  process.exit(1);
}

const createTableSQL = `
CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  source TEXT NOT NULL,
  published_date TEXT NOT NULL,
  relevant_topics TEXT NOT NULL,
  image_url TEXT,
  image_alt TEXT,
  image_photographer TEXT,
  image_photographer_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_articles_topics_date
  ON news_articles(relevant_topics, published_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_articles_created
  ON news_articles(created_at);

CREATE INDEX IF NOT EXISTS idx_news_articles_url
  ON news_articles(url);
`;

async function createTable() {
  console.log('🔨 Creating news_articles table in remote CIVIC_DB...');
  console.log(`📍 Service URL: ${RAINDROP_SERVICE_URL}`);
  console.log('');

  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'news_articles',  // This will fail but we need to use query directly
        query: createTableSQL
      })
    });

    const data = await response.json();

    if (data.error) {
      console.log('⚠️  Got error from admin-api:', data.error);
      console.log('This is expected - the table doesn\'t exist yet in the whitelist');
      console.log('');
      console.log('Solution: The table creation SQL needs to be run by the civic-db module itself');
      console.log('We need to add a startup script or use db.exec() from a service');
    } else {
      console.log('✅ Table created successfully!');
      console.log(data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

createTable();
