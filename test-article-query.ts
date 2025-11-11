/**
 * Test article matching query
 */
import { executeQuery } from './lib/db/client';

async function testQuery() {
  const TEST_INTERESTS = ['education', 'science', 'technology', 'business', 'taxes', 'transportation', 'defense', 'civil-rights'];

  console.log('Testing article query with interests:', TEST_INTERESTS);
  console.log('');

  // Build the same query as getRecentNewsArticles
  const escapeSql = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const cutoffDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  const cutoffTimestamp = cutoffDate.toISOString();

  // Build topic filter
  const topicConditions = TEST_INTERESTS.map(
    topic => `relevant_topics LIKE ${escapeSql(`%${topic}%`)}`
  );
  const topicFilter = `AND (${topicConditions.join(' OR ')})`;

  const sql = `
    SELECT id, title, relevant_topics, created_at
    FROM news_articles
    WHERE created_at >= ${escapeSql(cutoffTimestamp)}
    ${topicFilter}
    ORDER BY published_date DESC, created_at DESC
    LIMIT 20
  `;

  console.log('SQL Query:');
  console.log(sql);
  console.log('');

  try {
    const result = await executeQuery(sql, 'users');
    console.log(`✅ Found ${result.rows.length} matching articles:`);
    console.log('');

    result.rows.forEach((row: any, i: number) => {
      console.log(`${i + 1}. ${row.title.substring(0, 60)}...`);
      console.log(`   Topics: ${row.relevant_topics}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
  }
}

testQuery();
