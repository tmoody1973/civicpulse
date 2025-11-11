// Test Brave News API directly
const BRAVE_API_KEY = 'BSAlVSk26LyNPSQnbjVNlTy2DNUNYBf';

async function testBraveAPI() {
  console.log('🔍 Testing Brave News API...\n');

  const url = 'https://api.search.brave.com/res/v1/news/search?q=healthcare&count=2&freshness=pw';

  console.log(`URL: ${url}`);
  console.log(`API Key: ${BRAVE_API_KEY}\n`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:');
      console.error(errorText.substring(0, 500));
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Success! Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.results && data.results.length > 0) {
      console.log(`\n📰 Found ${data.results.length} news articles`);
    } else {
      console.log('\n⚠️  No results returned');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }
}

testBraveAPI();
