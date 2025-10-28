import algoliasearch from 'algoliasearch';

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);

const billsIndex = client.initIndex('bills');

async function configureIndex() {
  console.log('🔧 Configuring Algolia index...');

  await billsIndex.setSettings({
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
  });

  console.log('✅ Algolia index configured!');
}

configureIndex()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Configuration failed:', err);
    process.exit(1);
  });
