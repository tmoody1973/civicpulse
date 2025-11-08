/**
 * Debug: Test Gwen Moore press releases with freshness=pm
 */

import { fetchPressReleasesViaBraveSearch } from '../lib/congress/press-releases-brave-search';

async function testGwenMoore() {
  console.log('\n🔍 Testing Gwen Moore Press Releases with freshness=pm\n');
  console.log('='.repeat(80));

  const releases = await fetchPressReleasesViaBraveSearch(
    'Gwen Moore',
    'House',
    'https://gwenmoore.house.gov',
    10
  );

  console.log(`\n📊 Found ${releases.length} press releases:\n`);

  releases.forEach((release, index) => {
    const date = new Date(release.publishedAt);
    console.log(`${index + 1}. ${release.title}`);
    console.log(`   📅 Date: ${date.toLocaleDateString()} (${release.publishedAt})`);
    console.log(`   🔗 URL: ${release.url}`);
    console.log('');
  });
}

testGwenMoore();
