#!/usr/bin/env tsx
/**
 * Test full daily brief generation with all API integrations
 * Now that we have API keys, let's test the complete pipeline:
 * Perplexity → Claude → ElevenLabs → Vultr → Database
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testFullGeneration() {
  console.log('\n🎙️  Testing Full Daily Brief Generation\n');
  console.log('='.repeat(60));

  try {
    // Check that required keys are present
    console.log('\n✅ Checking environment variables...');
    const requiredKeys = [
      'ANTHROPIC_API_KEY',
      'ELEVENLABS_API_KEY',
      'VULTR_STORAGE_ENDPOINT',
      'VULTR_ACCESS_KEY',
      'VULTR_SECRET_KEY'
    ];

    const missing = requiredKeys.filter(key => !process.env[key]);
    if (missing.length > 0) {
      console.error(`❌ Missing keys: ${missing.join(', ')}`);
      process.exit(1);
    }

    console.log('✅ All required API keys present\n');

    // Test with demo user
    const userId = 'user-001'; // Demo user: demo@civicpulse.com

    console.log(`📊 Testing for user: ${userId} (demo@civicpulse.com)`);
    console.log(`   Interests: healthcare, education, climate\n`);

    // Make request to test endpoint (bypasses auth)
    console.log('🚀 Calling POST /api/briefs/test-generation...');
    console.log(`   Endpoint: ${APP_URL}/api/briefs/test-generation\n`);
    console.log('⚠️  Using TEST endpoint (bypasses auth)\n');

    const startTime = Date.now();

    const response = await fetch(`${APP_URL}/api/briefs/test-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ API Error (${response.status}):`, errorData);
      process.exit(1);
    }

    const result = await response.json();

    console.log('='.repeat(60));
    console.log('✅ BRIEF GENERATION SUCCESSFUL!\n');
    console.log(`⏱️  Total time: ${Math.round(duration / 1000)}s`);
    console.log(`🆔 Brief ID: ${result.brief.id}`);
    console.log(`🎵 Audio URL: ${result.brief.audio_url}`);
    console.log(`⏰ Duration: ${result.brief.duration}s (${Math.floor(result.brief.duration / 60)}m ${result.brief.duration % 60}s)`);
    console.log(`📰 News articles: ${result.brief.news_count}`);
    console.log(`📜 Bills covered: ${result.brief.bill_count}`);
    console.log(`📊 Policy areas: ${result.brief.policy_areas.join(', ')}`);
    console.log(`📅 Generated: ${result.brief.generated_at}\n`);

    console.log('='.repeat(60));
    console.log('✅ All systems working:');
    console.log('   ✅ Perplexity API (news fetching)');
    console.log('   ✅ Claude API (script generation)');
    console.log('   ✅ ElevenLabs API (audio generation)');
    console.log('   ✅ Vultr Storage (CDN upload)');
    console.log('   ✅ Raindrop Database (brief saved)');
    console.log('='.repeat(60));

    console.log('\n💡 Next steps:');
    console.log('   1. Visit /admin to see the brief in database');
    console.log('   2. Listen to audio at:', result.brief.audio_url);
    console.log('   3. Build enhanced audio player component');
    console.log('   4. Create curated bill feed\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testFullGeneration().catch(console.error);
