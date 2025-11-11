/**
 * Properly trigger Inngest event using SDK
 */
import { inngest } from './src/inngest/client';

async function triggerEvent() {
  const TEST_USER_ID = 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4';
  const TEST_INTERESTS = ['Education', 'Science', 'Technology'];

  console.log('🧪 Triggering Personalized News Generation');
  console.log('User ID:', TEST_USER_ID);
  console.log('Interests:', TEST_INTERESTS.join(', '));
  console.log('');

  try {
    // Send event using Inngest SDK
    const result = await inngest.send({
      name: 'news/generate-personalized',
      data: {
        userId: TEST_USER_ID,
        policyInterests: TEST_INTERESTS,
        limit: 15
      }
    });

    console.log('✅ Event sent successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('⏳ Check the Inngest dev server UI at http://localhost:8288');
    console.log('📊 Check results in ~30 seconds at: http://localhost:3000/api/news/personalized?userId=' + TEST_USER_ID);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

triggerEvent();
