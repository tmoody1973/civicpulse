/**
 * Check user's policy interests
 */

import { executeQuery } from './lib/db/client';

async function checkUserInterests() {
  const TEST_USER_ID = 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4';

  console.log(`🔍 Checking policy interests for user ${TEST_USER_ID}...\n`);

  try {
    const result = await executeQuery(
      `SELECT id, email, interests FROM users WHERE id = '${TEST_USER_ID}'`,
      'users'
    );

    if (result.rows.length === 0) {
      console.log('❌ USER NOT FOUND\n');
      return;
    }

    const user = result.rows[0];
    console.log('User found:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Interests: ${user.interests}`);

    // Parse JSON
    if (user.interests) {
      try {
        const interests = JSON.parse(user.interests);
        console.log(`\n✅ User has ${interests.length} interests:`);
        interests.forEach((interest: string, i: number) => {
          console.log(`  ${i + 1}. ${interest}`);
        });
      } catch (e) {
        console.log('\n⚠️  Failed to parse interests JSON');
      }
    } else {
      console.log('\n❌ NO INTERESTS SET');
    }

    // Now check what articles match these interests
    console.log('\n🔍 Checking matching articles in database...');

    const articlesResult = await executeQuery(
      `SELECT title, relevant_topics FROM news_articles ORDER BY created_at DESC LIMIT 20`,
      'users'
    );

    console.log(`\nFound ${articlesResult.rows.length} recent articles with topics:`);
    const allTopics = new Set<string>();

    articlesResult.rows.forEach((row: any) => {
      try {
        const topics = JSON.parse(row.relevant_topics);
        topics.forEach((topic: string) => allTopics.add(topic.toLowerCase()));
      } catch (e) {
        // Ignore
      }
    });

    console.log('\nAvailable topics in database:');
    Array.from(allTopics).sort().forEach((topic, i) => {
      console.log(`  ${i + 1}. ${topic}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkUserInterests();
