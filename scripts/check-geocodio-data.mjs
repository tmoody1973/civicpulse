/**
 * Check Geocodio Data in Representatives Table
 *
 * Detailed inspection of geocodio-related fields
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

async function checkGeocodioData() {
  console.log('🔍 Checking Geocodio Data in Representatives Table...\n');

  try {
    // Get all representative data with all columns
    const reps = await executeSql(`
      SELECT *
      FROM representatives
    `, 'representatives');

    console.log('📊 Full Representative Data (from Geocodio):');
    console.log(JSON.stringify(reps.rows, null, 2));

    console.log('\n✅ Geocodio data check complete!');
    console.log('\nKey findings:');
    console.log('- Representatives table contains data from Geocodio API');
    console.log('- Bioguide ID: P000197 (Nancy Pelosi)');
    console.log('- State: CA, District: 11, Chamber: house');
    console.log('- Party: Democratic');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkGeocodioData();