#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { algoliasearch } from 'algoliasearch';

config({ path: resolve(process.cwd(), '.env.local') });

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_API_KEY!
);

async function test() {
  const result = await client.searchSingleIndex({
    indexName: 'bills',
    searchParams: {
      query: 'health',
      hitsPerPage: 1
    }
  });

  console.log('First hit from Algolia:');
  console.log(JSON.stringify(result.hits[0], null, 2));
}

test();
