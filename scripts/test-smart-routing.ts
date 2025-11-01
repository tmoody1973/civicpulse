#!/usr/bin/env tsx
/**
 * Test smart routing between Algolia (fast) and SmartBuckets (AI)
 */

interface TestCase {
  name: string;
  query: string;
  filters?: Record<string, string>;
  expectedStrategy: 'algolia' | 'hybrid' | 'semantic';
  expectedSpeed: string; // for display
}

const testCases: TestCase[] = [
  {
    name: 'Bill number (should use Algolia - instant)',
    query: 'HR 5824',
    expectedStrategy: 'algolia',
    expectedSpeed: '< 200ms',
  },
  {
    name: 'Short keyword (should use Algolia - fast)',
    query: 'healthcare',
    expectedStrategy: 'algolia',
    expectedSpeed: '< 500ms',
  },
  {
    name: 'Two words (should use Algolia - fast)',
    query: 'climate change',
    expectedStrategy: 'algolia',
    expectedSpeed: '< 500ms',
  },
  {
    name: 'Medium query (should use hybrid)',
    query: 'veteran healthcare benefits',
    expectedStrategy: 'hybrid',
    expectedSpeed: '< 1s if Algolia works',
  },
  {
    name: 'Complex question (should use AI - slow)',
    query: 'What bills address climate change and renewable energy?',
    expectedStrategy: 'semantic',
    expectedSpeed: '10-20s',
  },
  {
    name: 'Long phrase (should use AI - slow)',
    query: 'legislation addressing veteran mental health services and PTSD treatment',
    expectedStrategy: 'semantic',
    expectedSpeed: '10-20s',
  },
  {
    name: 'With filters (should use Algolia - fast)',
    query: 'healthcare',
    filters: { status: 'passed' },
    expectedStrategy: 'algolia',
    expectedSpeed: '< 500ms',
  },
];

async function testSearch(testCase: TestCase) {
  const startTime = Date.now();

  try {
    const params = new URLSearchParams({ q: testCase.query });

    if (testCase.filters) {
      Object.entries(testCase.filters).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    const response = await fetch(`http://localhost:3000/api/search?${params}`);
    const data = await response.json();

    const duration = Date.now() - startTime;

    // Check if strategy matches expected
    const actualStrategy = data.strategy || data.searchType;
    const strategyMatch = actualStrategy === testCase.expectedStrategy;

    console.log(`\n${ strategyMatch ? '✅' : '⚠️' } ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    if (testCase.filters) {
      console.log(`   Filters: ${JSON.stringify(testCase.filters)}`);
    }
    console.log(`   Expected: ${testCase.expectedStrategy} (${testCase.expectedSpeed})`);
    console.log(`   Actual: ${actualStrategy} (${duration}ms)`);
    console.log(`   Results: ${data.results?.length || 0} found`);

    if (!strategyMatch) {
      console.log(`   ⚠️  WARNING: Strategy mismatch!`);
    }

    if (actualStrategy === 'algolia' && duration > 1000) {
      console.log(`   ⚠️  WARNING: Algolia search took longer than expected!`);
    }

    if (actualStrategy === 'semantic' && duration < 3000) {
      console.log(`   ℹ️   Note: Semantic search was unusually fast`);
    }

    return {
      success: strategyMatch,
      duration,
      actualStrategy,
    };
  } catch (error: any) {
    console.log(`\n❌ ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log(`   Error: ${error.message}`);
    return {
      success: false,
      duration: Date.now() - startTime,
      actualStrategy: 'error',
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Smart Search Routing\n');
  console.log('=' .repeat(60));

  const results = [];

  for (const testCase of testCases) {
    const result = await testSearch(testCase);
    results.push({ testCase, result });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:');

  const passed = results.filter(r => r.result.success).length;
  const total = results.length;

  console.log(`   Tests passed: ${passed}/${total}`);

  const algoliaSpeeds = results
    .filter(r => r.result.actualStrategy === 'algolia')
    .map(r => r.result.duration);

  if (algoliaSpeeds.length > 0) {
    const avgAlgolia = Math.round(algoliaSpeeds.reduce((a, b) => a + b, 0) / algoliaSpeeds.length);
    console.log(`   Algolia avg speed: ${avgAlgolia}ms`);
  }

  const semanticSpeeds = results
    .filter(r => r.result.actualStrategy === 'semantic')
    .map(r => r.result.duration);

  if (semanticSpeeds.length > 0) {
    const avgSemantic = Math.round(semanticSpeeds.reduce((a, b) => a + b, 0) / semanticSpeeds.length);
    console.log(`   Semantic avg speed: ${avgSemantic}ms`);
  }

  console.log('\n✅ Tests completed!');
}

runTests();
