#!/usr/bin/env tsx
/**
 * Test News Article Finding Prompt
 * 
 * Tests user's prompt for finding recent news articles about bills
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, appendFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

interface Bill {
  id: string;
  bill_number: number;
  title: string;
  summary: string | null;
  policy_area: string | null;
  issue_categories: string;
}

const NEWS_ARTICLE_PROMPT = `Find recent news articles and analysis related to [BILL_NUMBER] - [BILL_TITLE].

Bill summary: [BRIEF_SUMMARY]
Policy areas: [POLICY_AREAS]

Please provide:
1. 5-7 most relevant and recent news articles (prioritize last 6 months)
2. For each article:
   - Title
   - Publication name and date
   - Direct URL
   - 2-3 sentence summary focusing on how it relates to this legislation
   - Relevance score (high/medium/low)

Focus on:
- News coverage specifically discussing this bill or its provisions
- Related policy developments in this area
- Expert analysis and opinion pieces
- Impact assessments and stakeholder reactions

Exclude generic policy news not directly connected to this legislation.`;

async function fetchTestBill(): Promise<Bill> {
  // Get a bill with summary and policy area for best test
  const query = "SELECT * FROM bills WHERE congress = 119 AND summary IS NOT NULL AND policy_area IS NOT NULL LIMIT 1";

  const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'bills',
      query
    })
  });

  const data = await response.json();
  return data.rows[0];
}

async function testNewsPrompt(bill: Bill): Promise<string> {
  const prompt = NEWS_ARTICLE_PROMPT
    .replace('[BILL_NUMBER]', bill.id)
    .replace('[BILL_TITLE]', bill.title)
    .replace('[BRIEF_SUMMARY]', bill.summary || 'No summary available')
    .replace('[POLICY_AREAS]', bill.policy_area || 'Not specified');

  console.log(`\n🤖 Testing news article prompt for ${bill.id}...`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function main() {
  console.log('🚀 Starting News Article Prompt Test\n');
  console.log('='.repeat(60));
  
  const bill = await fetchTestBill();
  console.log(`\n📥 Testing with bill: ${bill.id}`);
  console.log(`   Title: ${bill.title.substring(0, 80)}...`);
  
  const result = await testNewsPrompt(bill);
  
  console.log('   ✅ Response received\n');

  // Append to existing report
  const appendix = `

---

## News Article Prompt Test

### Prompt Used (User-Provided)

\`\`\`
${NEWS_ARTICLE_PROMPT}
\`\`\`

### Test Bill

**Bill ID:** ${bill.id}  
**Title:** ${bill.title}  
**Policy Area:** ${bill.policy_area}

### Claude's Response

${result}

### Analysis of News Article Prompt

#### What We Learned

**❌ Limitation Identified:**
Claude does not have real-time web access or the ability to search for actual news articles. The prompt asks Claude to find news articles with URLs, publication dates, etc., but Claude cannot:
- Search the web
- Access current news databases
- Verify article URLs exist
- Check publication dates

**Result:** Claude will either:
1. Explain it cannot search for real articles
2. Generate plausible-sounding but fictional article references
3. Provide general guidance on what types of articles might exist

#### Recommended Implementation

To actually implement news article finding, you need:

**Option 1: Web Search API Integration**
\`\`\`typescript
import { Exa } from 'exa-js';

async function findNewsArticles(bill: Bill) {
  const exa = new Exa(process.env.EXA_API_KEY);
  
  const results = await exa.searchAndContents(
    \`news about \${bill.id} \${bill.title}\`,
    {
      type: 'keyword',
      category: 'news',
      numResults: 7,
      startPublishedDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 6 months
    }
  );
  
  return results.results.map(r => ({
    title: r.title,
    url: r.url,
    publishedDate: r.publishedDate,
    excerpt: r.text.substring(0, 300),
    relevance: calculateRelevance(r, bill)
  }));
}
\`\`\`

**Option 2: Perplexity API (AI-powered search)**
\`\`\`typescript
async function findNewsWithPerplexity(bill: Bill) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${process.env.PERPLEXITY_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{
        role: 'user',
        content: \`Find recent news articles about \${bill.id} - \${bill.title}\`
      }]
    })
  });
  
  return response.json();
}
\`\`\`

**Option 3: NewsAPI.org**
\`\`\`typescript
async function findNewsWithNewsAPI(bill: Bill) {
  const query = encodeURIComponent(\`\${bill.id} OR "\${bill.title}"\`);
  const response = await fetch(
    \`https://newsapi.org/v2/everything?q=\${query}&sortBy=publishedAt&apiKey=\${process.env.NEWS_API_KEY}\`
  );
  
  return response.json();
}
\`\`\`

#### Cost Comparison

| Service | Cost | Pros | Cons |
|---------|------|------|------|
| Exa | $5/1000 searches | High quality, content extraction | Expensive for scale |
| Perplexity | $5/1000 requests | AI-summarized results | Newer service |
| NewsAPI | $449/month | Comprehensive news database | Expensive, limited free tier |
| Google News RSS | Free | No API needed | Limited metadata, no filtering |

#### Recommended Approach

**Hybrid Solution:**
1. Use Google News RSS (free) for initial discovery
2. Send discovered articles to Claude for relevance scoring and summarization
3. Cache results for 24 hours to minimize API calls

\`\`\`typescript
async function findAndAnalyzeNews(bill: Bill) {
  // Step 1: Find articles via RSS
  const articles = await searchGoogleNews(\`\${bill.id} \${bill.title}\`);
  
  // Step 2: Ask Claude to filter and analyze
  const prompt = \`Given these news articles about \${bill.id}:
  
\${articles.map(a => \`- \${a.title} (\${a.url})\`).join('\\n')}

Identify the 5-7 most relevant articles and for each provide:
- Relevance score (high/medium/low)
- 2-3 sentence summary of how it relates to the bill
- Key insights\`;

  const analysis = await callClaude(prompt);
  
  return {
    articles,
    analysis
  };
}
\`\`\`

#### Integration with Existing Features

**For User Tracking:**
- Refresh news search when user opens bill details
- Show "News" tab with latest articles
- Email digest: "New articles about bills you're tracking"

**For Podcast Generation:**
- Pull recent articles as conversation topics
- Reference article quotes in podcast dialogue
- "In the news this week..." segment

---

## Comparison: Story Generation vs. News Finding

| Feature | Story Generation | News Article Finding |
|---------|-----------------|---------------------|
| **What it does** | Creates contextual analysis | Finds real news coverage |
| **Claude capability** | ✅ Works perfectly | ❌ Cannot search web |
| **Cost** | $0.015/bill | Depends on search API |
| **Timeliness** | Based on Claude's training | Real-time news |
| **Accuracy** | Analytical/predictive | Factual articles only |
| **Best for** | Understanding impact | Tracking developments |

### Recommended Combined Approach

**Use Both Together:**
1. **Story Generation** - Initial context when user starts tracking
2. **News Finding** - Ongoing updates as news breaks
3. **Podcast Integration** - Combine both for rich content

\`\`\`typescript
interface BillContext {
  bill: Bill;
  generatedStory: Story;        // Claude-generated context
  recentNews: NewsArticle[];     // Real articles via search API
  lastUpdated: Date;
}

async function getBillContext(billId: string): Promise<BillContext> {
  const bill = await fetchBill(billId);
  
  // Generate story once, cache for 24h
  const story = await generateStory(bill);
  
  // Fetch news, cache for 2h
  const news = await findNewsArticles(bill);
  
  return { bill, generatedStory: story, recentNews: news, lastUpdated: new Date() };
}
\`\`\`

---

## Final Recommendation

**✅ Implement Story Generation (Prompt #1)**
- Works immediately without additional APIs
- Provides valuable context users can't get elsewhere
- Cost-effective ($0.015 per story)
- Perfect for podcast generation scripts

**⏳ Add News Finding Later (Prompt #2)**
- Requires additional API integration (recommend Exa or Google News RSS + Claude)
- More complex to implement
- Adds ongoing API costs
- Great for "what's happening now" feature

**🎯 Start with hybrid:**
1. Generate contextual stories for all bills
2. Add manual news curation for high-priority bills (>50 cosponsors)
3. Automate news finding post-hackathon when you have budget clarity

`;

  appendFileSync('./docs/story-generation-test-results.md', appendix);

  console.log('✅ Results appended to docs/story-generation-test-results.md');
  console.log('\n' + '='.repeat(60));
  console.log('✨ News Article Prompt Test Complete!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
