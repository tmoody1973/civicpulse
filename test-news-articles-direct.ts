/**
 * Direct test of news_articles table
 * Bypasses admin API to see actual database state
 */
import { executeQuery } from './lib/db/client';

async function testDirect() {
  console.log('🔍 Testing news_articles table directly...\n');

  try {
    // Test 1: Count all articles
    console.log('1️⃣ Counting all articles in table:');
    const countSql = 'SELECT COUNT(*) as total FROM news_articles';
    const countResult = await executeQuery(countSql, 'news_articles');
    console.log(`   Total articles: ${countResult.rows[0]?.total || 0}\n`);

    // Test 2: Get first 5 articles
    console.log('2️⃣ Fetching first 5 articles:');
    const selectSql = 'SELECT id, title, url, published_date, relevant_topics FROM news_articles LIMIT 5';
    const selectResult = await executeQuery(selectSql, 'news_articles');

    if (selectResult.rows.length === 0) {
      console.log('   ⚠️  No articles found\n');
    } else {
      selectResult.rows.forEach((row: any, index: number) => {
        console.log(`   ${index + 1}. ${row.title.substring(0, 60)}...`);
        console.log(`      URL: ${row.url.substring(0, 70)}...`);
        console.log(`      Date: ${row.published_date}`);
        console.log(`      Topics: ${row.relevant_topics}\n`);
      });
    }

    // Test 3: Check table schema
    console.log('3️⃣ Table schema:');
    const schemaSql = 'PRAGMA table_info(news_articles)';
    const schemaResult = await executeQuery(schemaSql, 'news_articles');
    schemaResult.rows.forEach((col: any) => {
      console.log(`   ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testDirect();
