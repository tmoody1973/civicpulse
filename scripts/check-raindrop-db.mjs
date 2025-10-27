/**
 * Check Raindrop Database for Geocodio Data
 *
 * Queries the hosted Raindrop database to see what's stored
 */

const BACKEND_URL = process.env.RAINDROP_SERVICE_URL || 'https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run';

/**
 * Execute SQL query on Raindrop backend using admin endpoint
 */
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

async function checkDatabase() {
  console.log('🔍 Checking Raindrop Database...\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);

  try {
    // Check representatives count
    console.log('👥 Representatives data:');
    const repCount = await executeSql('SELECT COUNT(*) as count FROM representatives', 'representatives');
    console.log(`Total representatives: ${repCount.rows?.[0]?.count || 0}`);

    // Check representatives by state
    const repByState = await executeSql(`
      SELECT state, COUNT(*) as count
      FROM representatives
      GROUP BY state
      ORDER BY count DESC
      LIMIT 10
    `, 'representatives');
    console.log('\nRepresentatives by state (top 10):');
    console.table(repByState.rows || []);

    // Sample representatives
    const sampleReps = await executeSql(`
      SELECT bioguide_id, name, party, state, district, chamber
      FROM representatives
      LIMIT 10
    `, 'representatives');
    console.log('\nSample representatives:');
    console.table(sampleReps.rows || []);

    // Check bills count
    console.log('\n📜 Bills data:');
    const billCount = await executeSql('SELECT COUNT(*) as count FROM bills', 'bills');
    console.log(`Total bills: ${billCount.rows?.[0]?.count || 0}`);

    // Sample bills
    const sampleBills = await executeSql(`
      SELECT id, title, congress, bill_type, bill_number, sponsor_name
      FROM bills
      LIMIT 5
    `, 'bills');
    console.log('\nSample bills:');
    console.table(sampleBills.rows || []);

    // Check users
    console.log('\n👤 Users data:');
    const userCount = await executeSql('SELECT COUNT(*) as count FROM users', 'users');
    console.log(`Total users: ${userCount.rows?.[0]?.count || 0}`);

    // Check user_representatives
    console.log('\n🔗 User-Representative links:');
    const linkCount = await executeSql('SELECT COUNT(*) as count FROM user_representatives', 'user_representatives');
    console.log(`Total links: ${linkCount.rows?.[0]?.count || 0}`);

    console.log('\n✅ Database check complete!');
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.error(error);
  }
}

checkDatabase();
