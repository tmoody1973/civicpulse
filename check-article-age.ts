import { executeQuery } from './lib/db/client';

async function checkAge() {
  const result = await executeQuery(
    'SELECT id, title, created_at FROM news_articles ORDER BY created_at DESC LIMIT 5',
    'users'
  );

  console.log('Most recent articles:');
  result.rows.forEach((r: any) => {
    const age = Date.now() - new Date(r.created_at).getTime();
    const ageHours = Math.floor(age / (1000 * 60 * 60));
    const ageMinutes = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60));
    console.log(`  ${r.title.substring(0, 50)}... - ${r.created_at} (${ageHours}h ${ageMinutes}m ago)`);
  });
}

checkAge();
