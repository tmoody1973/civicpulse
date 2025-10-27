/**
 * Live Geocodio API Test
 *
 * Tests real ZIP code lookups with Geocodio API and saves results to database
 */

const BACKEND_URL = 'https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run';

async function executeSql(sql, table = 'representatives') {
  const response = await fetch(`${BACKEND_URL}/api/admin/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ table, query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Database error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function lookupCongressionalDistrict(zipCode) {
  const apiKey = process.env.GEOCODIO_API_KEY;

  if (!apiKey) {
    throw new Error('GEOCODIO_API_KEY environment variable is not set');
  }

  console.log(`🔍 Looking up ZIP code: ${zipCode}`);

  const url = `https://api.geocod.io/v1.7/geocode?postal_code=${zipCode}&fields=cd&api_key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Geocodio API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`No results found for ZIP code: ${zipCode}`);
  }

  const result = data.results[0];
  const congressionalDistricts = result.fields?.congressional_districts || [];

  if (congressionalDistricts.length === 0) {
    throw new Error(`No congressional districts found for ZIP code: ${zipCode}`);
  }

  const district = congressionalDistricts[0];
  const legislators = district.current_legislators || [];

  console.log(`   State: ${result.address_components.state}`);
  console.log(`   District: ${district.district_number}`);
  console.log(`   Legislators found: ${legislators.length}`);

  return {
    state: result.address_components.state,
    district: district.district_number,
    legislators: legislators,
    city: result.address_components.city
  };
}

async function saveLegislatorToDatabase(legislator, state) {
  const bio = legislator.bio;
  const contact = legislator.contact;
  const references = legislator.references;

  // Determine chamber and district
  const chamber = legislator.type === 'representative' ? 'house' : 'senate';
  const district = legislator.type === 'representative' ? legislator.current_district : null;

  // Build committees JSON
  const committees = legislator.committees ? JSON.stringify(legislator.committees) : '[]';

  const sql = `
    INSERT OR REPLACE INTO representatives (
      bioguide_id, name, party, state, district, chamber,
      phone, website_url, image_url, twitter_handle, committees, updated_at
    ) VALUES (
      '${references.bioguide_id}',
      '${bio.first_name} ${bio.last_name}',
      '${bio.party}',
      '${state}',
      ${district ? `'${district}'` : 'NULL'},
      '${chamber}',
      '${contact.phone || ''}',
      '${contact.url || ''}',
      'https://www.congress.gov/img/member/${references.bioguide_id.toLowerCase()}.jpg',
      ${contact.contact_form ? `'${contact.contact_form}'` : 'NULL'},
      '${committees}',
      CURRENT_TIMESTAMP
    )
  `;

  await executeSql(sql, 'representatives');

  return references.bioguide_id;
}

async function testZipCode(zipCode) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ZIP Code: ${zipCode}`);
  console.log('='.repeat(60));

  try {
    // 1. Lookup congressional district
    const result = await lookupCongressionalDistrict(zipCode);

    console.log(`\n✅ Geocodio API Success:`);
    console.log(`   📍 Location: ${result.city}, ${result.state}`);
    console.log(`   🏛️  District: ${result.state}-${result.district}`);
    console.log(`   👥 Legislators: ${result.legislators.length}`);

    // 2. Save each legislator
    const bioguideIds = [];

    for (const legislator of result.legislators) {
      const bio = legislator.bio;
      const chamber = legislator.type === 'representative' ? 'House' : 'Senate';

      console.log(`\n   📝 Saving: ${bio.first_name} ${bio.last_name} (${bio.party}, ${chamber})`);

      const bioguideId = await saveLegislatorToDatabase(legislator, result.state);
      bioguideIds.push(bioguideId);

      console.log(`      ✅ Saved with bioguide_id: ${bioguideId}`);
    }

    // 3. Verify saved data
    console.log(`\n   🔍 Verifying database records...`);

    for (const bioguideId of bioguideIds) {
      const verifySQL = `SELECT * FROM representatives WHERE bioguide_id = '${bioguideId}'`;
      const verifyResult = await executeSql(verifySQL, 'representatives');

      if (verifyResult.rows && verifyResult.rows.length > 0) {
        const rep = verifyResult.rows[0];
        console.log(`      ✅ ${rep.name} - ${rep.party} (${rep.chamber})`);
      }
    }

    return {
      success: true,
      zipCode,
      location: `${result.city}, ${result.state}`,
      district: `${result.state}-${result.district}`,
      legislatorsAdded: bioguideIds.length,
      bioguideIds
    };

  } catch (error) {
    console.error(`\n❌ Error testing ZIP ${zipCode}:`, error.message);
    return {
      success: false,
      zipCode,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 GEOCODIO LIVE API TEST\n');
  console.log('Testing real ZIP codes with Geocodio API');
  console.log('Saving results to Raindrop database\n');

  // Test different ZIP codes across the country
  const testZipCodes = [
    '10001', // New York, NY (Manhattan)
    '90210', // Beverly Hills, CA
    '60601', // Chicago, IL
    '33139', // Miami Beach, FL
    '02108', // Boston, MA
  ];

  const results = [];

  for (const zipCode of testZipCodes) {
    const result = await testZipCode(zipCode);
    results.push(result);

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📝 Total ZIP codes tested: ${testZipCodes.length}`);

  if (successful.length > 0) {
    console.log('\n✅ Successfully tested ZIP codes:');
    successful.forEach(r => {
      console.log(`   ${r.zipCode} - ${r.location} (${r.district}) - ${r.legislatorsAdded} legislators`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed ZIP codes:');
    failed.forEach(r => {
      console.log(`   ${r.zipCode} - ${r.error}`);
    });
  }

  // Final database count
  console.log('\n📊 Final Database State:');
  const countResult = await executeSql('SELECT COUNT(*) as count FROM representatives', 'representatives');
  console.log(`   Total representatives in database: ${countResult.rows[0].count}`);

  console.log('\n✅ Live Geocodio test complete!\n');
}

runTests();
