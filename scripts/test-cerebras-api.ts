/**
 * Test Cerebras API connection and key validity
 */
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testCerebrasAPI() {
  console.log('\n🔍 Testing Cerebras API...\n');

  // Check if API key is set
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    console.error('❌ CEREBRAS_API_KEY not found in environment');
    console.log('Please set it in .env.local');
    process.exit(1);
  }

  console.log(`✅ API Key found (length: ${apiKey.length})`);
  console.log(`   Starts with: ${apiKey.substring(0, 10)}...`);

  // Initialize client
  const cerebras = new Cerebras({ apiKey });

  try {
    console.log('\n📡 Testing API with simple request...\n');

    const response = await cerebras.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond with valid JSON only.',
        },
        {
          role: 'user',
          content: 'Say hello in JSON format: {"message": "your greeting"}',
        },
      ],
      model: 'gpt-oss-120b',
      stream: false,
      max_completion_tokens: 100,
      temperature: 0.3,
    });

    const choices = response.choices as Array<{ message?: { content?: string } }>;
    const content = choices[0]?.message?.content || '';

    console.log('✅ API Response:', content);

    // Try parsing as JSON
    try {
      JSON.parse(content.trim());
      console.log('✅ JSON parsing successful');
    } catch (e) {
      console.warn('⚠️  Response is not valid JSON:', e);
    }

    console.log('\n✅ Cerebras API is working correctly!\n');
  } catch (error: any) {
    console.error('\n❌ API Test Failed:');
    console.error('Status:', error?.status);
    console.error('Message:', error?.message);
    console.error('Full error:', error);

    if (error?.status === 401) {
      console.log('\n💡 The API key appears to be invalid or expired.');
      console.log('   Please get a new key from: https://cloud.cerebras.ai/');
    }

    process.exit(1);
  }
}

testCerebrasAPI();
