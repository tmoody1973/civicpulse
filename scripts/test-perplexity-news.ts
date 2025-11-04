#!/usr/bin/env tsx
/**
 * Test Perplexity news fetching
 * Shows the exact prompt and response
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

async function testPerplexityNews() {
  console.log('\n📰 Testing Perplexity News Fetching\n');
  console.log('='.repeat(60));

  if (!PERPLEXITY_API_KEY) {
    console.error('❌ PERPLEXITY_API_KEY not set in .env.local');
    process.exit(1);
  }

  const policyAreas = ['healthcare', 'education', 'climate'];

  console.log(`\n📊 Fetching news for: ${policyAreas.join(', ')}\n`);

  for (const policyArea of policyAreas) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 Policy Area: ${policyArea.toUpperCase()}`);
    console.log('='.repeat(60));

    const searchQuery = policyArea === 'healthcare' ? 'healthcare and medical legislation'
      : policyArea === 'education' ? 'education and schools'
      : policyArea === 'climate' ? 'climate change and environment'
      : policyArea;

    const prompt = `Search for recent stories or articles about ${searchQuery} in the U.S.

For each story, return a JSON object with the following structure:
{
  "title": "[Story Title]",
  "summary": "[5-8 sentence detailed summary covering key points, context, and implications]",
  "policy_area": "${policyArea}",
  "link": "[URL to story]",
  "source": "[Publication name, e.g., The Hill, Politico, CNN, NPR]",
  "published_date": "[Approximate date if available, e.g., 'Today', '2 days ago', 'Nov 1, 2025']"
}

Return an array of such JSON objects—one for each relevant story. Limit to 1 most recent article.

IMPORTANT:
- Summaries should be 5-8 sentences with enough detail
- Include context about why this matters and real-world impact
- Return ONLY valid JSON array, no additional text or markdown formatting.`;

    console.log('\n📝 PROMPT:');
    console.log('-'.repeat(60));
    console.log(prompt);
    console.log('-'.repeat(60));

    console.log('\n🔄 Calling Perplexity API...');
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that searches for recent U.S. congressional news and returns structured JSON data. Only return valid JSON arrays, no markdown or additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000,
        }),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error (${response.status}):`, errorText);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      console.log(`✅ Response received (${duration}ms)`);
      console.log('\n📄 RAW RESPONSE:');
      console.log('-'.repeat(60));
      console.log(content);
      console.log('-'.repeat(60));

      // Parse JSON
      let jsonText = content;
      if (content.includes('```json')) {
        jsonText = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      } else if (content.includes('```')) {
        jsonText = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
      }

      try {
        const articles = JSON.parse(jsonText);

        console.log('\n✅ PARSED JSON:');
        console.log('-'.repeat(60));
        console.log(JSON.stringify(articles, null, 2));
        console.log('-'.repeat(60));

        if (Array.isArray(articles) && articles.length > 0) {
          const article = articles[0];
          console.log('\n📰 ARTICLE SUMMARY:');
          console.log(`   Title: ${article.title}`);
          console.log(`   Source: ${article.source || 'Unknown'}`);
          console.log(`   Date: ${article.published_date || 'Recent'}`);
          console.log(`   Link: ${article.link || 'N/A'}`);
          console.log(`   Summary: ${article.summary?.substring(0, 200)}...`);
        }

      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }

    // Rate limit: wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete!');
  console.log('='.repeat(60));
}

testPerplexityNews().catch(console.error);
