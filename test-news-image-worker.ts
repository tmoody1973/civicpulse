#!/usr/bin/env node
/**
 * Test Image Worker for News Articles
 * Tests the image worker integration with news_articles table
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testImageWorker() {
  // Use dynamic imports after dotenv loads
  const { imageQueue } = await import('./lib/queue/image-queue.js');
  const { executeQuery } = await import('./lib/db/client.js');
  console.log('🧪 Testing Image Worker for News Articles');
  console.log('==========================================');
  console.log('');

  // Test data
  const TEST_ARTICLE_ID = 'test_article_' + Date.now();
  const TEST_TITLE = 'Supreme Court Rules on Voting Rights Act';
  const TEST_DESCRIPTION = 'The Supreme Court issued a landmark decision on voting rights protections';
  const TEST_KEYWORDS = ['voting rights', 'supreme court', 'democracy'];

  try {
    console.log('1️⃣ Creating test article in database...');
    const sql = `
      INSERT INTO news_articles (
        id, title, url, summary, source, published_date, relevant_topics
      ) VALUES (
        '${TEST_ARTICLE_ID}',
        '${TEST_TITLE}',
        'https://example.com/test-article',
        '${TEST_DESCRIPTION}',
        'Test News',
        '${new Date().toISOString()}',
        '${JSON.stringify(TEST_KEYWORDS)}'
      )
    `;

    await executeQuery(sql, 'users');
    console.log('   ✅ Test article created');
    console.log('');

    console.log('2️⃣ Queueing image fetch job...');
    const job = await imageQueue.add('fetch-article-image', {
      articleId: TEST_ARTICLE_ID,
      title: TEST_TITLE,
      description: TEST_DESCRIPTION,
      keywords: TEST_KEYWORDS,
    });

    console.log(`   ✅ Job queued: ${job.id}`);
    console.log('   📊 Job data:', job.data);
    console.log('');

    console.log('3️⃣ Image worker should process this job now...');
    console.log('   Watch the image worker terminal for processing logs');
    console.log('');
    console.log('⏳ Waiting 15 seconds for image to be fetched...');

    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('');
    console.log('4️⃣ Checking if image was added to article...');
    const checkSql = `
      SELECT id, title, image_url, image_alt, image_photographer
      FROM news_articles
      WHERE id = '${TEST_ARTICLE_ID}'
    `;

    const result = await executeQuery(checkSql, 'users');
    const article = result.rows[0];

    console.log('   Article:', article.title);
    if (article.image_url) {
      console.log('   ✅ Image URL:', article.image_url);
      console.log('   📸 Alt text:', article.image_alt);
      console.log('   👤 Photographer:', article.image_photographer);
      console.log('');
      console.log('🎉 Success! Image worker updated the article with Unsplash image');
    } else {
      console.log('   ⚠️  No image yet - worker may still be processing');
      console.log('   💡 Check worker logs or wait longer');
    }

    console.log('');
    console.log('5️⃣ Cleaning up test article...');
    await executeQuery(`DELETE FROM news_articles WHERE id = '${TEST_ARTICLE_ID}'`, 'users');
    console.log('   ✅ Test article deleted');
    console.log('');
    console.log('✅ Test complete!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testImageWorker();
