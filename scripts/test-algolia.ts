#!/usr/bin/env tsx
/**
 * Test Algolia Search
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { algoliasearch } from 'algoliasearch';

config({ path: resolve(process.cwd(), '.env.local') });

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY! // Use search key, not admin key
);

async function testSearch() {
  console.log('\n🔍 Testing Algolia Search\n');
  
  // Test 1: Simple search
  console.log('Test 1: Search for "forest"');
  const results1 = await client.search({
    requests: [{
      indexName: 'bills',
      query: 'forest',
      hitsPerPage: 5
    }]
  });
  console.log(`   Found ${results1.results[0].nbHits} results`);
  if (results1.results[0].hits.length > 0) {
    console.log(`   Top result: ${results1.results[0].hits[0].title}`);
  }
  console.log();
  
  // Test 2: Faceted search
  console.log('Test 2: Search with billType facet');
  const results2 = await client.search({
    requests: [{
      indexName: 'bills',
      query: '',
      facets: ['billType'],
      hitsPerPage: 0
    }]
  });
  console.log(`   Bill types:`, results2.results[0].facets);
  console.log();
  
  // Test 3: Filter by status
  console.log('Test 3: Filter by hasFullText=true');
  const results3 = await client.search({
    requests: [{
      indexName: 'bills',
      query: '',
      facetFilters: ['hasFullText:true'],
      hitsPerPage: 5
    }]
  });
  console.log(`   Found ${results3.results[0].nbHits} bills with full text`);
  console.log();
  
  console.log('✅ All tests passed!\n');
}

testSearch().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
