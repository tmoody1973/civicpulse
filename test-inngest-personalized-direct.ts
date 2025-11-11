/**
 * Direct Inngest Event Test
 *
 * Manually sends an Inngest event to test the personalized news function
 * without going through the API route (bypasses authentication)
 */

import { inngest } from './src/inngest/client';

async function testPersonalizedNewsInngest() {
  console.log('🚀 Testing Inngest personalized news function directly...\n');

  try {
    // Send event with proper test data
    const result = await inngest.send({
      name: 'news/generate-personalized',
      data: {
        userId: 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4',
        policyInterests: ['education', 'science', 'technology'],
        state: 'CA',
        district: '12',
        limit: 20
      }
    });

    console.log('✅ Event sent successfully!');
    console.log('   Event IDs:', result.ids);
    console.log('\n📊 Check the Inngest dev server at http://localhost:8288');
    console.log('   You should see the "Generate Personalized News" function processing\n');

    console.log('⏳ Wait 30-60 seconds for the function to complete...');
    console.log('   Then check /api/news/personalized to see the new articles\n');

  } catch (error: any) {
    console.error('❌ Error sending event:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testPersonalizedNewsInngest();
