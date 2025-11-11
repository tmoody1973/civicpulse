#!/usr/bin/env node
/**
 * Test Perplexity API with image support
 */

require('dotenv').config({ path: '.env.local' });

async function testPerplexity() {
  console.log('🧪 Testing Perplexity API with image support\n');

  const payload = {
    model: 'sonar',
    messages: [
      {
        role: 'system',
        content: 'You are a precise policy news aggregator. Always return valid JSON arrays with complete source URLs.'
      },
      {
        role: 'user',
        content: `Give me an extended summary (2 items) of the latest U.S. education policy from the past 7 days. For each item, include:
- date
- type (e.g., Federal Regulation, Legal Ruling)
- title
- detailed summary
- source_url

Output as valid JSON array.

Search only: ed.gov, npr.org, politico.com

Fetch only last 7 days news.`
      }
    ],
    temperature: 0.2,
    max_tokens: 2000,
    search_domain_filter: ['ed.gov', 'npr.org', 'politico.com'],
    search_recency_filter: 'week',
    return_images: true,
    image_domain_filter: ['ed.gov', 'npr.org', 'politico.com'],
    image_format_filter: ['jpeg', 'png', 'webp']
  };

  console.log('📤 Request payload:', JSON.stringify(payload, null, 2).substring(0, 500) + '...\n');

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    console.log(`📥 Response status: ${response.status}\n`);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Success!\n');

    // Check for images
    if (data.images && data.images.length > 0) {
      console.log(`🖼️  Images returned: ${data.images.length}`);
      data.images.forEach((img, i) => {
        const imgStr = typeof img === 'string' ? img : JSON.stringify(img);
        console.log(`   ${i + 1}. ${imgStr.substring(0, 100)}`);
      });
      console.log('');
    } else {
      console.log('ℹ️  No images in response\n');
    }

    console.log('📊 Full response structure:');
    console.log('   - images type:', typeof data.images);
    console.log('   - images is array:', Array.isArray(data.images));
    if (data.images && data.images.length > 0) {
      console.log('   - first image type:', typeof data.images[0]);
      console.log('   - first image:', data.images[0]);
    }
    console.log('');

    // Check for content
    const content = data.choices?.[0]?.message?.content || '';
    console.log('📄 Content preview:', content.substring(0, 300) + '...\n');

    // Try to extract JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      console.log(`📰 Articles found: ${items.length}`);
      items.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.title || 'No title'}`);
      });
    } else {
      console.log('⚠️  No JSON array found in response');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPerplexity();
