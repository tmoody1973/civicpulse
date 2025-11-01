import { config } from 'dotenv';
import { algoliasearch } from 'algoliasearch';

// Load environment variables from .env.local
config({ path: '.env.local' });

const appId = process.env.ALGOLIA_APP_ID;
const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;

if (!appId || !apiKey) {
  console.error('❌ Missing Algolia credentials in .env.local');
  console.error('   Required: ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY');
  process.exit(1);
}

console.log(`🔗 Connecting to Algolia app: ${appId}`);

const client = algoliasearch(appId, apiKey);

async function configureIndex() {
  console.log('🔧 Configuring Algolia index...');

  try {
    // Set index settings using v5 API
    await client.setSettings({
      indexName: 'bills',
      indexSettings: {
        searchableAttributes: [
          'billNumber',        // Highest priority
          'title',
          'shortTitle',
          'plainEnglishSummary',
          'summary',
          'sponsorName',
          'cosponsorNames',
          'topics'
        ],
        attributesForFaceting: [
          'searchable(issueCategories)',
          'congress',
          'sponsorParty',
          'sponsorState',
          'billStatus',
          'statesAffected',
          'bipartisanScore'
        ],
        customRanking: [
          'desc(trackingCount)',
          'desc(progressScore)',
          'desc(bipartisanScore)',
          'desc(introducedTimestamp)'
        ],
        ranking: [
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom'
        ],
        typoTolerance: true,
        minWordSizefor1Typo: 4,
        minWordSizefor2Typos: 8,
        attributesToRetrieve: [
          'objectID',
          'billNumber',
          'title',
          'plainEnglishSummary',
          'summary',
          'sponsorName',
          'sponsorParty',
          'issueCategories',
          'billStatus',
          'trackingCount',
          'introducedTimestamp'
        ]
      }
    });

    console.log('✅ Algolia index configured!');
    console.log('\n📊 Configuration applied:');
    console.log('   - Searchable attributes: billNumber, title, summary, etc.');
    console.log('   - Facets: issueCategories, congress, sponsorParty, etc.');
    console.log('   - Custom ranking: trackingCount, progressScore, bipartisan score');
    console.log('   - Typo tolerance: enabled (min 4 chars)');
    console.log('\n✨ Ready for search!');
  } catch (error: any) {
    console.error('❌ Configuration failed:', error.message);
    if (error.message.includes('Index does not exist')) {
      console.error('   💡 Create the "bills" index in Algolia dashboard first');
    }
    throw error;
  }
}

configureIndex()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });
