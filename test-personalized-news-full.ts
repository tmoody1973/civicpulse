/**
 * Full test of personalized news generation
 */

const TEST_USER_ID = 'user_01K8NC5EJ3JBZKC9EQRQBQQVK4';
const TEST_INTERESTS = ['Education', 'Science', 'Technology'];

console.log('🧪 Testing Personalized News Generation\n');
console.log('User ID:', TEST_USER_ID);
console.log('Interests:', TEST_INTERESTS.join(', '));
console.log('\n📤 Triggering Inngest event...\n');

// Trigger the Inngest event
fetch('http://localhost:3000/api/inngest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'news/generate-personalized',
    data: {
      userId: TEST_USER_ID,
      policyInterests: TEST_INTERESTS,
      limit: 15
    }
  })
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Event triggered:', data);
    console.log('\n⏳ Waiting 60 seconds for processing...\n');

    // Wait 60 seconds
    setTimeout(() => {
      console.log('📊 Checking results...\n');

      // Check the API endpoint
      fetch(`http://localhost:3000/api/news/personalized?userId=${TEST_USER_ID}`)
        .then(res => res.json())
        .then(data => {
          console.log('API Response:', JSON.stringify(data, null, 2));

          if (data.articles && data.articles.length > 0) {
            console.log(`\n✅ SUCCESS: Found ${data.articles.length} articles`);
            console.log('\nSample articles:');
            data.articles.slice(0, 3).forEach((article: any, i: number) => {
              console.log(`\n${i + 1}. ${article.title}`);
              console.log(`   URL: ${article.url}`);
              console.log(`   Image: ${article.imageUrl || 'None'}`);
              console.log(`   Topics: ${article.relevantTopics?.join(', ') || 'None'}`);
            });
          } else {
            console.log('\n❌ FAILED: No articles found');
            console.log('Response:', data);
          }
        })
        .catch(err => {
          console.error('❌ API Error:', err.message);
        });
    }, 60000);
  })
  .catch(err => {
    console.error('❌ Event Error:', err.message);
  });
