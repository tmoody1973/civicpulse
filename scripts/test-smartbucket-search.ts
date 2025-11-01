#!/usr/bin/env tsx
/**
 * Test SmartBucket Semantic Search
 * 
 * Tests semantic search capabilities on indexed bills
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

const TEST_QUERIES = [
  {
    name: 'Healthcare Access',
    query: 'improving access to healthcare and reducing medical costs for families',
    description: 'Should find bills about healthcare affordability and access'
  },
  {
    name: 'Climate Change',
    query: 'reducing carbon emissions and addressing climate change impacts',
    description: 'Should find environmental and climate-related bills'
  },
  {
    name: 'Education Funding',
    query: 'increasing funding for schools and teacher salaries',
    description: 'Should find education and funding bills'
  },
  {
    name: 'Small Business',
    query: 'supporting small businesses and entrepreneurship',
    description: 'Should find economic development and business bills'
  },
  {
    name: 'Veterans Benefits',
    query: 'improving benefits and healthcare for military veterans',
    description: 'Should find veterans affairs bills'
  }
];

async function testSemanticSearch(query: string): Promise<any[]> {
  // Use our unified search API with semantic strategy
  const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}&strategy=semantic&limit=5`);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function main() {
  console.log('🔍 Testing SmartBucket Semantic Search\n');
  console.log('='.repeat(60));

  for (const test of TEST_QUERIES) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Expected: ${test.description}`);
    console.log('-'.repeat(60));

    try {
      const results = await testSemanticSearch(test.query);

      if (results.length === 0) {
        console.log('⚠️  No results found');
      } else {
        console.log(`✅ Found ${results.length} results:\n`);

        results.forEach((result, i) => {
          console.log(`${i + 1}. ${result.title || 'Unknown'}`);
          console.log(`   Bill: ${result.id}`);
          console.log(`   Type: ${result.bill_type?.toUpperCase()} ${result.bill_number}`);
          console.log(`   Sponsor: ${result.sponsor_name || 'Unknown'} (${result.sponsor_party || 'N/A'}-${result.sponsor_state || 'N/A'})`);
          console.log(`   Status: ${result.status || 'unknown'}`);
          if (result.relevance_score) {
            console.log(`   Relevance: ${((1 - result.relevance_score) * 100).toFixed(1)}%`);
          }
          console.log();
        });
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }

    console.log('='.repeat(60));
  }

  console.log('\n✨ Testing complete!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
