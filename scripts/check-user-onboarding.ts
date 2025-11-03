import { executeQuery } from '../lib/db/client';

async function checkOnboarding() {
  try {
    // Check tarikjmoody@gmail.com
    console.log('\n=== Checking tarikjmoody@gmail.com ===');
    const tarik = await executeQuery(
      `SELECT id, email, onboarding_completed, zip_code, state, district FROM users WHERE email = 'tarikjmoody@gmail.com' LIMIT 1`,
      'users'
    );
    console.log('Result:', tarik.rows);

    // Check technical@radiomilwaukee.org
    console.log('\n=== Checking technical@radiomilwaukee.org ===');
    const technical = await executeQuery(
      `SELECT id, email, onboarding_completed, zip_code, state, district FROM users WHERE email = 'technical@radiomilwaukee.org' LIMIT 1`,
      'users'
    );
    console.log('Result:', technical.rows);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkOnboarding();
