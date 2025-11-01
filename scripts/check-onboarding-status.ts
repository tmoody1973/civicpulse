import { executeQuery } from '../lib/db/client';

async function checkOnboardingStatus() {
  try {
    const result = await executeQuery(
      "SELECT id, email, onboarding_completed, zip_code, state FROM users WHERE email = 'tarikjmoody@gmail.com' LIMIT 1",
      'users'
    );

    if (result.rows && result.rows.length > 0) {
      console.log('\n✅ User found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      console.log('\nOnboarding completed:', result.rows[0].onboarding_completed ? 'YES ✅' : 'NO ❌');
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkOnboardingStatus();
