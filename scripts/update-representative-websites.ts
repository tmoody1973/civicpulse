/**
 * Update Representative Websites from Congress Legislators Data
 *
 * Fetches current legislator data from unitedstates/congress-legislators
 * and updates missing website_url fields in the representatives table.
 *
 * Usage: npx tsx scripts/update-representative-websites.ts
 */

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const LEGISLATORS_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json';

interface Legislator {
  id: {
    bioguide: string;
    govtrack?: number;
  };
  name: {
    first: string;
    last: string;
    official_full: string;
  };
  terms: Array<{
    type: 'rep' | 'sen';
    start: string;
    end: string;
    state: string;
    district?: number;
    party: string;
    url?: string;
  }>;
}

async function fetchLegislators(): Promise<Legislator[]> {
  console.log('📥 Fetching current legislators from GitHub...');

  const response = await fetch(LEGISLATORS_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch legislators: ${response.status}`);
  }

  const data: Legislator[] = await response.json();
  console.log(`✅ Fetched ${data.length} legislators`);

  return data;
}

async function getRepresentativesWithoutWebsites(): Promise<Array<{ bioguide_id: string; name: string }>> {
  console.log('\n🔍 Finding representatives without websites in database...');

  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'representatives',
      query: `SELECT bioguide_id, name FROM representatives WHERE website_url IS NULL OR website_url = ''`
    })
  });

  if (!response.ok) {
    throw new Error('Failed to query database');
  }

  const data = await response.json();
  console.log(`📊 Found ${data.rows?.length || 0} representatives without websites`);

  return data.rows || [];
}

async function updateRepresentativeWebsite(bioguideId: string, websiteUrl: string, name: string): Promise<boolean> {
  try {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'representatives',
        query: `UPDATE representatives SET website_url = '${websiteUrl}' WHERE bioguide_id = '${bioguideId}'`
      })
    });

    if (!response.ok) {
      console.error(`   ❌ Failed to update ${name} (${bioguideId})`);
      return false;
    }

    console.log(`   ✅ Updated ${name}: ${websiteUrl}`);
    return true;

  } catch (error) {
    console.error(`   ❌ Error updating ${name}:`, error);
    return false;
  }
}

async function updateMissingWebsites() {
  console.log('\n🔄 UPDATE REPRESENTATIVE WEBSITES\n');
  console.log('='.repeat(80));

  if (!RAINDROP_SERVICE_URL) {
    console.error('❌ ERROR: RAINDROP_SERVICE_URL not found in environment');
    return;
  }

  try {
    // Step 1: Fetch current legislators from GitHub
    const legislators = await fetchLegislators();

    // Step 2: Find representatives without websites in database
    const repsWithoutWebsites = await getRepresentativesWithoutWebsites();

    if (repsWithoutWebsites.length === 0) {
      console.log('\n✅ All representatives already have websites!');
      return;
    }

    // Step 3: Create lookup map from legislators data
    const websiteMap = new Map<string, string>();

    legislators.forEach(legislator => {
      const bioguideId = legislator.id.bioguide;
      const currentTerm = legislator.terms[legislator.terms.length - 1]; // Get most recent term

      if (currentTerm.url) {
        websiteMap.set(bioguideId, currentTerm.url);
      }
    });

    console.log(`\n📋 Mapped ${websiteMap.size} websites from legislators data`);

    // Step 4: Update missing websites
    console.log('\n🔄 Updating representatives...\n');

    let updated = 0;
    let notFound = 0;

    for (const rep of repsWithoutWebsites) {
      const websiteUrl = websiteMap.get(rep.bioguide_id);

      if (websiteUrl) {
        const success = await updateRepresentativeWebsite(
          rep.bioguide_id,
          websiteUrl,
          rep.name
        );
        if (success) updated++;
      } else {
        console.log(`   ⚠️  No website found for ${rep.name} (${rep.bioguide_id})`);
        notFound++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 UPDATE SUMMARY\n');
    console.log(`   Total representatives without websites: ${repsWithoutWebsites.length}`);
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ⚠️  Not found in legislators data: ${notFound}`);

    if (updated > 0) {
      console.log('\n✅ Website update completed! Press releases will now work for more representatives.');
    }

  } catch (error) {
    console.error('\n❌ Error during update:', error);
  }
}

// Run the update
updateMissingWebsites();
