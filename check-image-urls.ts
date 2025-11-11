import { executeQuery } from './lib/db/client';

async function checkImageUrls() {
  const sql = `
    SELECT title, image_url, created_at
    FROM news_articles
    WHERE image_url IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 5
  `;

  const result = await executeQuery(sql, 'users');
  const articles = result.rows || [];

  console.log('Recent articles with image URLs:\n');

  for (const article of articles) {
    const shortTitle = article.title.substring(0, 60);
    console.log(`📄 ${shortTitle}`);
    console.log(`   URL: ${article.image_url}`);

    // Test if URL is accessible
    try {
      const response = await fetch(article.image_url, { method: 'HEAD' });
      console.log(`   Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    } catch (error: any) {
      console.log(`   ❌ Fetch failed: ${error.message}`);
    }
    console.log('');
  }
}

checkImageUrls();
