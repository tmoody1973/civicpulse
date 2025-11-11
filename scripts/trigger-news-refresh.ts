/**
 * Trigger news pool refresh
 * Populates the local civic_db.sqlite with articles from Perplexity
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

// Connect to local SQLite database
const db = new Database('./civic_db.sqlite');

console.log('🔄 Starting news refresh...');
console.log('📍 Target database: civic_db.sqlite');
console.log('');

// Mock articles for testing (would normally come from Perplexity)
const mockArticles = [
  {
    title: 'Congressional Healthcare Reform Bill Advances',
    url: 'https://npr.org/healthcare-reform-2025',
    summary: 'A bipartisan healthcare reform bill advances in Congress, proposing changes to Medicare and Medicaid coverage.',
    source: 'npr.org',
    published_date: new Date().toISOString().split('T')[0],
    relevant_topics: JSON.stringify(['healthcare']),
    image_url: null
  },
  {
    title: 'Climate Action Legislation Gains Momentum',
    url: 'https://politico.com/climate-action-2025',
    summary: 'New climate legislation proposes significant investments in renewable energy and carbon reduction initiatives.',
    source: 'politico.com',
    published_date: new Date().toISOString().split('T')[0],
    relevant_topics: JSON.stringify(['climate', 'energy']),
    image_url: null
  },
  {
    title: 'Education Funding Bill Passes Committee',
    url: 'https://thehill.com/education-funding-2025',
    summary: 'Education funding bill passes committee with provisions for increased teacher salaries and school infrastructure.',
    source: 'thehill.com',
    published_date: new Date().toISOString().split('T')[0],
    relevant_topics: JSON.stringify(['education']),
    image_url: null
  }
];

const insertStmt = db.prepare(`
  INSERT INTO news_articles (
    id, title, url, summary, source, published_date, relevant_topics, image_url, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
  )
`);

let inserted = 0;
let skipped = 0;

for (const article of mockArticles) {
  try {
    insertStmt.run(
      randomUUID(),
      article.title,
      article.url,
      article.summary,
      article.source,
      article.published_date,
      article.relevant_topics,
      article.image_url
    );
    inserted++;
    console.log(`✅ Inserted: ${article.title}`);
  } catch (error: any) {
    if (error.message.includes('UNIQUE')) {
      skipped++;
      console.log(`⏭️  Skipped (duplicate): ${article.title}`);
    } else {
      console.error(`❌ Error inserting article:`, error.message);
    }
  }
}

console.log('');
console.log(`📊 Summary:`);
console.log(`   Inserted: ${inserted} articles`);
console.log(`   Skipped: ${skipped} articles`);

// Verify final count
const count = db.prepare('SELECT COUNT(*) as total FROM news_articles').get() as { total: number };
console.log(`   Total in database: ${count.total} articles`);

db.close();
console.log('');
console.log('✅ News refresh complete!');
