/**
 * Test the news pool refresh function
 */
import { inngest } from './src/inngest/client';

async function testRefresh() {
  console.log('🧪 Testing News Pool Refresh');
  console.log('');

  try {
    // Send manual trigger event
    const result = await inngest.send({
      name: 'news/refresh-pool',
      data: {
        triggeredBy: 'manual-test',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ News pool refresh triggered!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('⏳ Check Inngest dev server UI at http://localhost:8288');
    console.log('📊 Check /admin for news_articles table in ~2-3 minutes');
    console.log('');
    console.log('Expected: 40 articles (2 per topic × 20 topics)');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testRefresh();
