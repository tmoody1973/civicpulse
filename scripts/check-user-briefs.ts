import { executeQuery } from '../lib/db/client';

async function checkBriefs() {
  try {
    // Get user ID
    const userResult = await executeQuery(
      "SELECT id FROM users WHERE email = 'tarikjmoody@gmail.com' LIMIT 1",
      'users'
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }

    const userId = userResult.rows[0].id;
    console.log('User ID:', userId);
    console.log('');

    // Get all briefs for user
    const briefsResult = await executeQuery(
      `SELECT id, title, audio_url, duration, type, generated_at FROM briefs WHERE user_id = '${userId}' ORDER BY generated_at DESC`,
      'users'
    );

    console.log('Total briefs:', briefsResult.rows.length);
    console.log('');

    briefsResult.rows.forEach((brief: any, idx: number) => {
      console.log(`Brief ${idx + 1}:`);
      console.log('  ID:', brief.id);
      console.log('  Title:', brief.title);
      console.log('  Audio URL:', brief.audio_url ? brief.audio_url : 'Missing');
      console.log('  Duration:', brief.duration);
      console.log('  Type:', brief.type);
      console.log('  Generated:', brief.generated_at);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkBriefs();
