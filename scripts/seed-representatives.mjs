/**
 * Seed Representatives Data
 *
 * Add multiple representatives for testing Geocodio integration
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

async function seedRepresentatives() {
  console.log('🌱 Seeding representatives data...\n');

  const representatives = [
    // California Representatives (already have Pelosi)
    {
      bioguide_id: 'P000145',
      name: 'Alex Padilla',
      party: 'Democratic',
      state: 'CA',
      district: null, // Senator
      chamber: 'senate',
      phone: '(202) 224-3553',
      website_url: 'https://www.padilla.senate.gov',
      image_url: 'https://www.congress.gov/img/member/p000145.jpg',
      twitter_handle: '@SenAlexPadilla',
      committees: JSON.stringify(['Environment and Public Works', 'Judiciary', 'Homeland Security and Governmental Affairs'])
    },
    {
      bioguide_id: 'S001150',
      name: 'Adam Schiff',
      party: 'Democratic',
      state: 'CA',
      district: null, // Senator
      chamber: 'senate',
      phone: '(202) 224-3553',
      website_url: 'https://www.schiff.senate.gov',
      image_url: 'https://www.congress.gov/img/member/s001150.jpg',
      committees: JSON.stringify(['Intelligence', 'Judiciary'])
    },
    {
      bioguide_id: 'S001225',
      name: 'Lateefah Simon',
      party: 'Democratic',
      state: 'CA',
      district: 12,
      chamber: 'house',
      phone: '(202) 225-5065',
      website_url: 'https://simon.house.gov',
      image_url: 'https://www.congress.gov/img/member/s001225.jpg',
      committees: JSON.stringify(['Transportation and Infrastructure', 'Oversight and Accountability'])
    },
    // New York Representatives
    {
      bioguide_id: 'S000248',
      name: 'José E. Serrano',
      party: 'Democratic',
      state: 'NY',
      district: 15,
      chamber: 'house',
      phone: '(202) 225-4361',
      website_url: 'https://serrano.house.gov',
      image_url: 'https://www.congress.gov/img/member/s000248.jpg',
      committees: JSON.stringify(['Appropriations'])
    },
    {
      bioguide_id: 'G000555',
      name: 'Kirsten Gillibrand',
      party: 'Democratic',
      state: 'NY',
      district: null, // Senator
      chamber: 'senate',
      phone: '(202) 224-4451',
      website_url: 'https://www.gillibrand.senate.gov',
      image_url: 'https://www.congress.gov/img/member/g000555.jpg',
      committees: JSON.stringify(['Armed Services', 'Agriculture, Nutrition, and Forestry', 'Environment and Public Works'])
    },
    {
      bioguide_id: 'S000148',
      name: 'Charles Schumer',
      party: 'Democratic',
      state: 'NY',
      district: null, // Senator
      chamber: 'senate',
      phone: '(202) 224-6542',
      website_url: 'https://www.schumer.senate.gov',
      image_url: 'https://www.congress.gov/img/member/s000148.jpg',
      committees: JSON.stringify(['Finance', 'Rules and Administration', 'Joint Committee on the Library'])
    },
    // Texas Representatives
    {
      bioguide_id: 'C001125',
      name: 'Colin Allred',
      party: 'Democratic',
      state: 'TX',
      district: null, // Senator
      chamber: 'senate',
      phone: '(202) 224-2934',
      website_url: 'https://www.allred.senate.gov',
      image_url: 'https://www.congress.gov/img/member/c001125.jpg',
      committees: JSON.stringify(['Armed Services', 'Commerce, Science, and Transportation'])
    },
    {
      bioguide_id: 'C001063',
      name: 'Henry Cuellar',
      party: 'Democratic',
      state: 'TX',
      district: 28,
      chamber: 'house',
      phone: '(202) 225-1640',
      website_url: 'https://cuellar.house.gov',
      image_url: 'https://www.congress.gov/img/member/c001063.jpg',
      committees: JSON.stringify(['Appropriations'])
    },
    // Florida Representatives
    {
      bioguide_id: 'R000435',
      name: 'Maria Elvira Salazar',
      party: 'Republican',
      state: 'FL',
      district: 27,
      chamber: 'house',
      phone: '(202) 225-3931',
      website_url: 'https://salazar.house.gov',
      image_url: 'https://www.congress.gov/img/member/r000435.jpg',
      committees: JSON.stringify(['Foreign Affairs', 'Small Business'])
    },
    {
      bioguide_id: 'R000609',
      name: 'John Rutherford',
      party: 'Republican',
      state: 'FL',
      district: 5,
      chamber: 'house',
      phone: '(202) 225-2501',
      website_url: 'https://rutherford.house.gov',
      image_url: 'https://www.congress.gov/img/member/r000609.jpg',
      committees: JSON.stringify(['Appropriations', 'Ethics'])
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const rep of representatives) {
    try {
      const sql = `
        INSERT OR REPLACE INTO representatives (
          bioguide_id, name, party, state, district, chamber,
          phone, website_url, image_url, twitter_handle, committees, updated_at
        ) VALUES (
          '${rep.bioguide_id}',
          '${rep.name}',
          '${rep.party}',
          '${rep.state}',
          ${rep.district === null ? 'NULL' : rep.district},
          '${rep.chamber}',
          '${rep.phone}',
          '${rep.website_url}',
          '${rep.image_url}',
          ${rep.twitter_handle ? `'${rep.twitter_handle}'` : 'NULL'},
          '${rep.committees}',
          CURRENT_TIMESTAMP
        )
      `;

      await executeSql(sql, 'representatives');
      console.log(`✅ Added: ${rep.name} (${rep.party}, ${rep.state}${rep.district ? '-' + rep.district : ''})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to add ${rep.name}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${representatives.length}`);

  // Verify final count
  try {
    const result = await executeSql('SELECT COUNT(*) as count FROM representatives', 'representatives');
    console.log(`\n✅ Total representatives in database: ${result.rows[0].count}`);
  } catch (error) {
    console.error('Error getting final count:', error.message);
  }
}

seedRepresentatives();
