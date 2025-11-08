/**
 * Test Script: Brave Search API for Press Releases
 *
 * Tests fetching press releases using Brave Search API
 * Compares results with RSS feed approach
 *
 * Usage:
 * 1. Set BRAVE_SEARCH_API_KEY in .env.local
 * 2. Run: npx tsx scripts/test-brave-search-press-releases.ts
 */

import { fetchPressReleasesViaBraveSearch, fetchPressReleasesHybrid } from '@/lib/congress/press-releases-brave-search';
import { fetchRepresentativePressReleases } from '@/lib/congress/press-releases';

// Test with Wisconsin representatives
const testRepresentatives = [
  {
    name: 'Gwen Moore',
    lastName: 'Moore',
    chamber: 'House' as const,
    websiteUrl: 'https://gwenmoore.house.gov',
    bioguideId: 'M001160'
  },
  {
    name: 'Tammy Baldwin',
    lastName: 'Baldwin',
    chamber: 'Senate' as const,
    websiteUrl: 'https://www.baldwin.senate.gov',
    bioguideId: 'B001230'
  },
  {
    name: 'Scott Fitzgerald',
    lastName: 'Fitzgerald',
    chamber: 'House' as const,
    websiteUrl: 'https://fitzgerald.house.gov',
    bioguideId: 'F000471'
  }
];

async function testBraveSearchOnly() {
  console.log('\n🔍 TEST 1: Brave Search API Only\n');
  console.log('='.repeat(80));

  for (const rep of testRepresentatives) {
    console.log(`\n📋 Testing: ${rep.name} (${rep.chamber})`);
    console.log(`   Website: ${rep.websiteUrl}`);

    const releases = await fetchPressReleasesViaBraveSearch(
      rep.name,
      rep.websiteUrl,
      5
    );

    if (releases.length > 0) {
      console.log(`\n   ✅ Found ${releases.length} press releases:\n`);
      releases.forEach((release, i) => {
        console.log(`   ${i + 1}. ${release.title}`);
        console.log(`      URL: ${release.url}`);
        console.log(`      Published: ${new Date(release.publishedAt).toLocaleDateString()}`);
        console.log(`      Excerpt: ${release.excerpt.substring(0, 100)}...`);
        console.log('');
      });
    } else {
      console.log('   ❌ No press releases found');
    }

    console.log('-'.repeat(80));
  }
}

async function testRSSvsBraveSearch() {
  console.log('\n🆚 TEST 2: RSS vs Brave Search Comparison\n');
  console.log('='.repeat(80));

  for (const rep of testRepresentatives) {
    console.log(`\n📋 Representative: ${rep.name}`);
    console.log('─'.repeat(80));

    // Test RSS
    console.log('\n   📡 Testing RSS feeds...');
    const startRss = Date.now();
    const rssReleases = await fetchRepresentativePressReleases(
      {
        lastName: rep.lastName,
        chamber: rep.chamber,
        websiteUrl: rep.websiteUrl
      },
      5
    );
    const rssTime = Date.now() - startRss;

    console.log(`   RSS Results: ${rssReleases.length} releases in ${rssTime}ms`);
    if (rssReleases.length > 0) {
      console.log(`   Latest: ${rssReleases[0].title}`);
    }

    // Test Brave Search
    console.log('\n   🔍 Testing Brave Search...');
    const startBrave = Date.now();
    const braveReleases = await fetchPressReleasesViaBraveSearch(
      rep.name,
      rep.websiteUrl,
      5
    );
    const braveTime = Date.now() - startBrave;

    console.log(`   Brave Results: ${braveReleases.length} releases in ${braveTime}ms`);
    if (braveReleases.length > 0) {
      console.log(`   Latest: ${braveReleases[0].title}`);
    }

    // Compare
    console.log('\n   📊 Comparison:');
    console.log(`   - RSS: ${rssReleases.length} results, ${rssTime}ms`);
    console.log(`   - Brave: ${braveReleases.length} results, ${braveTime}ms`);
    console.log(`   - Faster: ${rssTime < braveTime ? 'RSS' : 'Brave Search'}`);
    console.log(`   - More results: ${rssReleases.length > braveReleases.length ? 'RSS' : 'Brave Search'}`);

    console.log('\n' + '='.repeat(80));
  }
}

async function testHybridApproach() {
  console.log('\n🔄 TEST 3: Hybrid Approach (RSS with Brave Search fallback)\n');
  console.log('='.repeat(80));

  for (const rep of testRepresentatives) {
    console.log(`\n📋 Testing: ${rep.name}`);

    const releases = await fetchPressReleasesHybrid(
      {
        name: rep.name,
        lastName: rep.lastName,
        chamber: rep.chamber,
        websiteUrl: rep.websiteUrl
      },
      5
    );

    console.log(`\n   ✅ Found ${releases.length} press releases`);
    if (releases.length > 0) {
      console.log(`   Latest: ${releases[0].title}`);
      console.log(`   Source: ${releases[0].source}`);
    }

    console.log('-'.repeat(80));
  }
}

async function runAllTests() {
  console.log('\n🧪 BRAVE SEARCH API PRESS RELEASES TEST\n');
  console.log('Testing Brave Search API as alternative to RSS feeds');
  console.log('='.repeat(80));

  // Check for API key
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    console.error('\n❌ ERROR: BRAVE_SEARCH_API_KEY not found in environment');
    console.log('\nTo get a Brave Search API key:');
    console.log('1. Visit: https://brave.com/search/api/');
    console.log('2. Sign up for free tier (2,000 queries/month)');
    console.log('3. Add to .env.local: BRAVE_SEARCH_API_KEY=your-key-here');
    console.log('4. Restart this script\n');
    return;
  }

  try {
    // Run all tests
    await testBraveSearchOnly();
    await testRSSvsBraveSearch();
    await testHybridApproach();

    console.log('\n✅ All tests completed!\n');
    console.log('📝 Summary:');
    console.log('- Brave Search API can find press releases even without RSS feeds');
    console.log('- Hybrid approach provides best reliability');
    console.log('- Consider using Brave Search as fallback when RSS fails');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run tests
runAllTests();
