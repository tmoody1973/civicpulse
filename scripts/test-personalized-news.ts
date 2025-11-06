/**
 * Test Script: Personalized News with Tavily + Cerebras
 *
 * Run with: npx tsx scripts/test-personalized-news.ts
 */

// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

// Now import the functions (they'll see the env vars)
import { getPersonalizedNewsFast, healthCheck } from '../lib/api/cerebras-tavily';
import { enrichArticlesWithImages } from '../lib/api/perplexity';

async function main() {
  console.log('🧪 Testing Personalized News with Tavily + Cerebras\n');

  // 1. Health check
  console.log('1️⃣  Running health check...');
  try {
    const health = await healthCheck();
    console.log('Health Status:');
    console.log(`  - Tavily: ${health.tavily ? '✅' : '❌'}`);
    console.log(`  - Cerebras: ${health.cerebras ? '✅' : '❌'}`);

    if (health.errors.length > 0) {
      console.error('\n⚠️  Errors:', health.errors);
    }

    if (!health.tavily || !health.cerebras) {
      console.error('\n❌ API keys not configured properly');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }

  console.log('\n2️⃣  Fetching personalized news...');

  const testInterests = ['healthcare', 'climate', 'education'];
  const testState = 'CA';
  const testDistrict = '12';

  console.log(`   Interests: ${testInterests.join(', ')}`);
  console.log(`   Location: ${testState}-${testDistrict}\n`);

  const startTime = Date.now();

  try {
    // Fetch articles
    console.log('📡 Calling Tavily + Cerebras...');
    const rawArticles = await getPersonalizedNewsFast(
      testInterests,
      testState,
      testDistrict
    );

    const fetchTime = Date.now() - startTime;
    console.log(`✅ Fetch complete in ${fetchTime}ms`);
    console.log(`📰 Found ${rawArticles.length} articles\n`);

    // Display articles
    console.log('📋 Articles:');
    rawArticles.slice(0, 5).forEach((article, i) => {
      console.log(`\n${i + 1}. ${article.title}`);
      console.log(`   Source: ${article.source}`);
      console.log(`   URL: ${article.url}`);
      console.log(`   Topics: ${article.relevantTopics.join(', ')}`);
      console.log(`   Summary: ${article.summary.substring(0, 100)}...`);
    });

    // Enrich with images
    console.log('\n3️⃣  Enriching with images...');
    const enrichedArticles = await enrichArticlesWithImages(rawArticles);

    const withImages = enrichedArticles.filter(a => a.imageUrl).length;
    console.log(`✅ ${withImages}/${enrichedArticles.length} articles have images`);

    // Final stats
    const totalTime = Date.now() - startTime;
    console.log(`\n📊 Total time: ${totalTime}ms`);
    console.log(`   - Tavily + Cerebras: ${fetchTime}ms`);
    console.log(`   - Image enrichment: ${totalTime - fetchTime}ms`);

    console.log('\n✅ Test complete! All systems working.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
