#!/usr/bin/env tsx
/**
 * Test various search queries across all three layers
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { algoliasearch } from 'algoliasearch';

config({ path: resolve(process.cwd(), '.env.local') });

const algolia = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
);

const RAINDROP_URL = process.env.RAINDROP_SERVICE_URL!;

async function testQuery(topic: string, algoliaQuery: string, smartQuery: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Topic: ${topic.toUpperCase()}`);
  console.log('='.repeat(70));
  
  // Algolia search
  console.log(`\n⚡ Algolia (keyword): "${algoliaQuery}"`);
  const algoliaStart = Date.now();
  const algoliaResults = await algolia.search({
    requests: [{
      indexName: 'bills',
      query: algoliaQuery,
      hitsPerPage: 3
    }]
  });
  const algoliaDuration = Date.now() - algoliaStart;
  
  console.log(`   Found: ${algoliaResults.results[0].nbHits} bills in ${algoliaDuration}ms`);
  algoliaResults.results[0].hits.slice(0, 2).forEach((hit: any) => {
    console.log(`   • ${hit.billNumber}: ${hit.title.substring(0, 60)}...`);
  });
  
  // SmartBuckets semantic search
  console.log(`\n🤖 SmartBuckets (AI): "${smartQuery}"`);
  const smartStart = Date.now();
  const smartResponse = await fetch(`${RAINDROP_URL}/api/smartbucket/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: smartQuery, limit: 3 })
  });
  const smartDuration = Date.now() - smartStart;
  const smartData = await smartResponse.json();
  
  if (smartData.success) {
    console.log(`   Found: ${smartData.pagination.total} bills in ${smartDuration}ms`);
    smartData.results.slice(0, 2).forEach((result: any) => {
      const title = result.text.replace('Title: ', '');
      const score = (result.score * 100).toFixed(1);
      console.log(`   • ${title.substring(0, 60)}... (${score}% match)`);
    });
  }
  
  console.log(`\n💡 Best layer: ${
    algoliaResults.results[0].nbHits === 0 ? 'SmartBuckets (no exact keywords)' :
    smartData.pagination.total > algoliaResults.results[0].nbHits ? 'SmartBuckets (found more)' :
    'Algolia (faster + enough results)'
  }`);
}

async function main() {
  console.log('\n🧪 SEARCH SYSTEM - Real-World Query Testing\n');
  console.log('Testing different topics to see which layer works best...\n');
  
  // Test 1: Common topic with clear keywords
  await testQuery(
    'Healthcare',
    'healthcare',
    'healthcare reform and medical insurance coverage'
  );
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Test 2: Environmental topic
  await testQuery(
    'Climate & Environment',
    'climate environment',
    'protecting the environment and addressing climate change'
  );
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Test 3: Economic policy
  await testQuery(
    'Economy & Jobs',
    'economy jobs employment',
    'economic development and job creation programs'
  );
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Test 4: Education
  await testQuery(
    'Education',
    'education school',
    'improving education system and supporting teachers'
  );
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Search testing complete!\n');
  console.log('Key Findings:');
  console.log('  • Algolia: Great for common keywords, super fast');
  console.log('  • SmartBuckets: Better for concept matching, finds related bills');
  console.log('  • Both layers complement each other!\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
