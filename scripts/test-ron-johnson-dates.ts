/**
 * Debug: Test Ron Johnson press releases to see why old dates are showing
 */

import { fetchPressReleasesViaBraveSearch } from '../lib/congress/press-releases-brave-search';

async function testRonJohnson() {
  console.log('\n🔍 Testing Ron Johnson Press Releases Date Sorting\n');
  console.log('='.repeat(80));

  const releases = await fetchPressReleasesViaBraveSearch(
    'Ron Johnson',
    'Senate',
    'https://www.ronjohnson.senate.gov',
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

  // Check if dates are in descending order
  console.log('\n🔍 Date Sorting Validation:');
  let isSorted = true;
  for (let i = 0; i < releases.length - 1; i++) {
    const current = new Date(releases[i].publishedAt).getTime();
    const next = new Date(releases[i + 1].publishedAt).getTime();

    if (current < next) {
      console.log(`❌ Out of order: ${releases[i].title} (${releases[i].publishedAt}) comes before ${releases[i + 1].title} (${releases[i + 1].publishedAt})`);
      isSorted = false;
    }
  }

  if (isSorted) {
    console.log('✅ Press releases are correctly sorted by date (newest first)');
  }
}

testRonJohnson();
