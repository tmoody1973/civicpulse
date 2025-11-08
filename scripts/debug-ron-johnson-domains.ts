/**
 * Debug: See all domains returned for Ron Johnson to understand filtering
 */

async function debugRonJohnson() {
  const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY!;

  const params = new URLSearchParams({
    q: 'senator "ron johnson" press releases',
    count: '50',
    safesearch: 'moderate',
    freshness: 'pm'
  });

  const response = await fetch(
    `https://api.search.brave.com/res/v1/news/search?${params}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    }
  );

  const data = await response.json();

  console.log(`\n📊 Total results: ${data.results?.length || 0}\n`);

  // Group by domain
  const domainCounts = new Map<string, number>();
  const domainExamples = new Map<string, string>();

  data.results?.forEach((result: any) => {
    try {
      const url = new URL(result.url);
      const domain = url.hostname;
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      if (!domainExamples.has(domain)) {
        domainExamples.set(domain, result.title);
      }
    } catch {}
  });

  // Sort by count
  const sorted = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('📋 Results by domain:\n');
  sorted.forEach(([domain, count]) => {
    const example = domainExamples.get(domain);
    console.log(`${domain} (${count} results)`);
    console.log(`   Example: ${example}\n`);
  });

  // Count .gov sites
  const govCount = sorted.filter(([domain]) =>
    domain.includes('.gov')
  ).reduce((sum, [_, count]) => sum + count, 0);

  console.log(`\n✅ Total .gov results: ${govCount}`);
  console.log(`⚠️  Total non-.gov results: ${data.results?.length - govCount}`);
}

debugRonJohnson();
