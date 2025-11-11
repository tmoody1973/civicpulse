import { executeQuery } from './lib/db/client';
import { inngest } from './src/inngest/client';

async function clearAndTest() {
  console.log('🗑️  Clearing old broken articles...');

  await executeQuery('DELETE FROM news_articles', 'users');

  console.log('✅ Database cleared\n');
  console.log('🚀 Triggering Inngest with fixed image handling...\n');

  await inngest.send({
    name: 'news/generate-personalized',
    data: {
      userId: 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4',
      policyInterests: ['education', 'science'],
      state: 'CA',
      district: '12',
      limit: 10
    }
  });

  console.log('✅ Event sent! Wait 60 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 60000));

  console.log('🔍 Checking results...\n');

  const result = await executeQuery(
    'SELECT title, image_url FROM news_articles LIMIT 5',
    'users'
  );

  const articles = result.rows || [];

  for (const article of articles) {
    const shortTitle = article.title.substring(0, 50);
    const shortUrl = article.image_url?.substring(0, 80) || 'None';
    console.log(`📄 ${shortTitle}`);
    console.log(`   Image: ${shortUrl}\n`);
  }
}

clearAndTest();
