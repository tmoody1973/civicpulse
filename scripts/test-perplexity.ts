#!/usr/bin/env tsx
/**
 * Test Perplexity API Integration
 *
 * Tests the personalized news prompt and response parsing
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { getPersonalizedNews, buildPersonalizedNewsPrompt } from '../lib/api/perplexity';

config({ path: resolve(process.cwd(), '.env.local') });

async function testPerplexityIntegration() {
  console.log('\n🧪 Testing Perplexity API Integration\n');
  console.log('='.repeat(60));

  // Test case: User interested in healthcare and education
  const testInterests = ['healthcare', 'education'];
  const testState = 'MA';
  const testDistrict = '7';
  const testRepresentatives = ['Elizabeth Warren', 'Ed Markey', 'Ayanna Pressley'];

  console.log('\n📋 Test Parameters:');
  console.log(`  Interests: ${testInterests.join(', ')}`);
  console.log(`  Location: ${testState}-${testDistrict}`);
  console.log(`  Representatives: ${testRepresentatives.join(', ')}`);

  // Show the prompt that will be sent
  console.log('\n📝 Generated Prompt:');
  console.log('─'.repeat(60));
  const prompt = buildPersonalizedNewsPrompt(
    testInterests,
    testState,
    testDistrict,
    testRepresentatives
  );
  console.log(prompt);
  console.log('─'.repeat(60));

  try {
    console.log('\n🔍 Calling Perplexity API...');
    const startTime = Date.now();

    const articles = await getPersonalizedNews(
      testInterests,
      testState,
      testDistrict,
      testRepresentatives
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Success! Retrieved ${articles.length} articles in ${duration}ms`);
    console.log('\n📰 Articles:\n');

    articles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Source: ${article.source} | Date: ${article.publishedDate}`);
      console.log(`   URL: ${article.url}`);
      console.log(`   Image: ${article.imageUrl || 'None'}`);
      console.log(`   Topics: ${article.relevantTopics.join(', ')}`);
      console.log(`   Summary: ${article.summary.substring(0, 150)}...`);
      console.log('');
    });

    // Evaluation
    console.log('\n📊 Evaluation:');
    const articlesWithImages = articles.filter(a => a.imageUrl).length;
    const relevantTopics = articles.flatMap(a => a.relevantTopics);
    const uniqueTopics = [...new Set(relevantTopics)];

    console.log(`  ✓ Articles with images: ${articlesWithImages}/${articles.length}`);
    console.log(`  ✓ Unique topics covered: ${uniqueTopics.join(', ')}`);
    console.log(`  ✓ Average summary length: ${Math.round(articles.reduce((acc, a) => acc + a.summary.length, 0) / articles.length)} chars`);

    // Check if response matches interests
    const matchesInterests = articles.some(a =>
      a.relevantTopics.some(topic =>
        testInterests.includes(topic.toLowerCase())
      )
    );

    console.log(`  ${matchesInterests ? '✓' : '✗'} Articles match user interests: ${matchesInterests}`);

    // Check if mentions representatives
    const mentionsReps = articles.some(a =>
      testRepresentatives.some(rep =>
        a.title.includes(rep) || a.summary.includes(rep)
      )
    );

    console.log(`  ${mentionsReps ? '✓' : '✗'} Articles mention user's representatives: ${mentionsReps}`);

    console.log('\n✅ Test Complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testPerplexityIntegration();
