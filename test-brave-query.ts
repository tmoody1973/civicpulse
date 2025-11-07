/**
 * Test script for Brave Search query
 */

// Simulate the query building function
function buildBraveQuery(interests: string[]): string {
  const topicMap: Record<string, string> = {
    'healthcare': 'healthcare',
    'education': 'education',
    'science': 'science',
    'technology': 'tech',
    'climate': 'climate',
    'economy': 'economy',
    'business': 'business',
    'taxes': 'taxes',
    'immigration': 'immigration',
    'housing': 'housing',
    'defense': 'defense',
    'transportation': 'infrastructure',
    'agriculture': 'agriculture',
    'social': 'social',
    'civil-rights': 'civil rights'
  };

  const keywords = interests
    .slice(0, 5)
    .map(interest => topicMap[interest] || interest);

  const excludeTerms = '-state -states -legislature -governor -california -florida -utah';

  const query = `${keywords.join(' ')} U.S. federal ${excludeTerms}`;
  return query;
}

async function testBraveSearch(interest: string) {
  const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
  if (!BRAVE_API_KEY) {
    console.error('❌ BRAVE_SEARCH_API_KEY not set');
    return;
  }

  const query = buildBraveQuery([interest]);
  console.log(`\n🔍 Testing query for: ${interest}`);
  console.log(`📝 Query: ${query}`);
  console.log(`📏 Query length: ${query.length} characters\n`);

  const params = new URLSearchParams({
    q: query,
    safesearch: 'off',
    freshness: 'pw',
    count: '16'
  });

  try {
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

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Brave API error: ${response.status} - ${error}`);
      return;
    }

    const data: any = await response.json();
    console.log(`✅ Brave returned ${data.results?.length || 0} results`);

    // Filter out excluded domains (matching actual implementation)
    const EXCLUDED_DOMAINS = ['gov.uk', 'GOV.UK'];
    const filteredResults = data.results?.filter((result: any) => {
      try {
        const hostname = new URL(result.url).hostname.toLowerCase();
        return !EXCLUDED_DOMAINS.some(domain => hostname.includes(domain.toLowerCase()));
      } catch {
        return true; // Include if URL parsing fails
      }
    }) || [];

    console.log(`🌍 Filtered to ${filteredResults.length} U.S. sources (excluded non-US domains)\n`);

    if (filteredResults.length > 0) {
      console.log(`📰 Sample results:`);
      filteredResults.slice(0, 5).forEach((result: any, i: number) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   Source: ${result.meta_url?.hostname || 'Unknown'}`);
        console.log(`   Age: ${result.age || 'Unknown'}`);
      });

      // Count sources
      const sources = filteredResults.map((r: any) => r.meta_url?.hostname || 'Unknown');
      const sourceCounts = sources.reduce((acc: any, source: string) => {
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      console.log(`\n📊 Source distribution:`);
      Object.entries(sourceCounts)
        .sort(([,a]: any, [,b]: any) => b - a)
        .forEach(([source, count]) => {
          console.log(`   ${source}: ${count} article${count !== 1 ? 's' : ''}`);
        });
    }

  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

// Test with multiple interests
async function runTests() {
  const testInterests = ['healthcare', 'technology', 'education'];

  for (const interest of testInterests) {
    await testBraveSearch(interest);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
}

runTests();
