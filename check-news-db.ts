/**
 * Check what's in the news_articles database
 */

import { executeQuery } from './lib/db/client';

async function checkDatabase() {
  console.log('🔍 Checking news_articles database...\n');

  try {
    // Count total articles
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM news_articles`,
      'users'
    );
    console.log(`Total articles in database: ${countResult.rows[0].total}`);

    // Get recent articles
    const recentResult = await executeQuery(
      `SELECT
        id, title, url, source, published_date,
        relevant_topics, image_url,
        created_at
      FROM news_articles
      ORDER BY created_at DESC
      LIMIT 10`,
      'users'
    );

    if (recentResult.rows.length === 0) {
      console.log('\n❌ NO ARTICLES FOUND IN DATABASE\n');
      return;
    }

    console.log(`\n📰 Recent ${recentResult.rows.length} articles:\n`);

    recentResult.rows.forEach((row: any, i: number) => {
      console.log(`${i + 1}. ${row.title.substring(0, 60)}...`);
      console.log(`   Topics: ${row.relevant_topics}`);
      console.log(`   Image: ${row.image_url ? '✅ Has image' : '❌ No image'}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Database error:', error.message);
  }
}

checkDatabase();
