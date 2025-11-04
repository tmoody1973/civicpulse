#!/usr/bin/env tsx
/**
 * Simple Full Brief Generation Test
 * Tests the complete pipeline: Perplexity → Claude → ElevenLabs → Vultr → Database
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function testFullGeneration() {
  console.log('\n🎙️  Testing Full Daily Brief Generation Pipeline\n');
  console.log('='.repeat(70));
  console.log('\nThis will test:');
  console.log('  1. ✅ Fetching news from Perplexity (with images)');
  console.log('  2. ✅ Fetching bills from Congress.gov');
  console.log('  3. ✅ Generating dialogue script with Claude');
  console.log('  4. ✅ Generating audio with ElevenLabs');
  console.log('  5. ✅ Uploading to Vultr CDN');
  console.log('  6. ✅ Generating written digest');
  console.log('  7. ✅ Extracting featured image');
  console.log('  8. ✅ Saving to database');
  console.log('\n' + '='.repeat(70));

  const userId = 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4'; // Your user ID
  const startTime = Date.now();

  try {
    console.log('\n🚀 Starting brief generation...\n');
    console.log(`   User ID: ${userId}`);
    console.log(`   Type: daily`);
    console.log(`   Endpoint: http://localhost:3000/api/briefs/test-generation\n`);

    const response = await fetch('http://localhost:3000/api/briefs/test-generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type: 'daily',
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API returned ${response.status}: ${error}`);
    }

    const data = await response.json();

    console.log('\n' + '='.repeat(70));
    console.log('✅ BRIEF GENERATED SUCCESSFULLY!');
    console.log('='.repeat(70));

    console.log('\n📊 Results:\n');
    console.log(`   Brief ID: ${data.brief.id}`);
    console.log(`   Title: ${data.brief.title || 'N/A'}`);
    console.log(`   Featured Image: ${data.brief.featured_image_url ? '✅ Yes' : '❌ No'}`);
    console.log(`   Audio URL: ${data.brief.audio_url}`);
    console.log(`   Duration: ${Math.floor(data.brief.duration / 60)}:${(data.brief.duration % 60).toString().padStart(2, '0')}`);
    console.log(`   Generation Time: ${Math.round(duration / 1000)}s`);

    if (data.brief.news_articles) {
      const articles = JSON.parse(data.brief.news_articles);
      console.log(`\n📰 News Articles: ${articles.length}`);
      articles.slice(0, 3).forEach((article: any, i: number) => {
        console.log(`   ${i + 1}. ${article.title}`);
      });
    }

    if (data.brief.bills_covered) {
      const bills = JSON.parse(data.brief.bills_covered);
      console.log(`\n📜 Bills Covered: ${bills.length}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎧 Listen to your brief:');
    console.log(`   Audio: ${data.brief.audio_url}`);
    console.log('\n📖 Read the full article:');
    console.log(`   http://localhost:3000/briefs/${data.brief.id}`);
    console.log('\n📱 View all briefs:');
    console.log(`   http://localhost:3000/briefs`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(70));
    console.error('\nError:', error instanceof Error ? error.message : error);
    console.error('\nTroubleshooting:');
    console.error('  1. Check that dev server is running (npm run dev)');
    console.error('  2. Verify all API keys are set in .env.local');
    console.error('  3. Check server logs for detailed errors');
    console.error();
    process.exit(1);
  }
}

testFullGeneration();
