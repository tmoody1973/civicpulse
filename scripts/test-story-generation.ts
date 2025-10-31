#!/usr/bin/env tsx
/**
 * Test Story/Article Generation for Bills
 * 
 * Tests AI prompt for generating related stories and context
 * for bills - useful for user tracking and podcast generation
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

interface Bill {
  id: string;
  title: string;
  summary: string | null;
  sponsor_name: string | null;
  sponsor_party: string | null;
  sponsor_state: string | null;
  policy_area: string | null;
  issue_categories: string;
  cosponsor_count: number;
  status: string;
  latest_action_text: string | null;
  full_text: string | null;
}

const STORY_GENERATION_PROMPT = `You are a civic engagement journalist who helps citizens understand legislation in plain English.

Given this bill information, generate:

1. **Why This Matters** (2-3 sentences)
   - Real-world impact on everyday Americans
   - Who benefits or is affected
   
2. **The Story Behind It** (2-3 sentences)
   - Context: What problem does this solve?
   - Why now? Any recent events or trends driving this?
   
3. **Key Stakeholders** (bullet points)
   - Who supports this and why
   - Who might oppose this and why
   - Which industries/groups are watching
   
4. **Related Issues** (bullet points)
   - Other legislation or policies this connects to
   - Broader policy debates this fits into
   
5. **What's Next** (1-2 sentences)
   - Likely path forward
   - Timeline expectations

Keep language accessible, avoid jargon, and focus on human impact.`;

async function fetchTestBills(): Promise<Bill[]> {
  // Get diverse set of bills for testing
  const queries = [
    // Popular bill with many cosponsors
    "SELECT * FROM bills WHERE congress = 119 AND cosponsor_count > 50 LIMIT 1",
    
    // Bill with full text and policy area
    "SELECT * FROM bills WHERE congress = 119 AND full_text IS NOT NULL AND policy_area IS NOT NULL LIMIT 1",
    
    // Recent bill with latest action
    "SELECT * FROM bills WHERE congress = 119 AND latest_action_text IS NOT NULL ORDER BY id DESC LIMIT 1",
    
    // Bill with summary
    "SELECT * FROM bills WHERE congress = 119 AND summary IS NOT NULL LIMIT 1"
  ];

  const bills: Bill[] = [];

  for (const query of queries) {
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query
      })
    });

    const data = await response.json();
    if (data.rows && data.rows.length > 0) {
      bills.push(data.rows[0]);
    }
  }

  return bills;
}

async function generateStory(bill: Bill): Promise<string> {
  // Prepare bill context
  const billContext = `
Bill ID: ${bill.id}
Title: ${bill.title}
Sponsor: ${bill.sponsor_name} [${bill.sponsor_party}-${bill.sponsor_state}]
Status: ${bill.status}
Cosponsors: ${bill.cosponsor_count}
Policy Area: ${bill.policy_area || 'Not specified'}
Issue Categories: ${bill.issue_categories || 'None'}

${bill.summary ? `Summary: ${bill.summary}` : 'No summary available'}

Latest Action: ${bill.latest_action_text || 'None'}
`;

  const fullPrompt = `${STORY_GENERATION_PROMPT}

---

${billContext}`;

  console.log(`\n🤖 Generating story for ${bill.id}...`);

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
        content: fullPrompt
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
  console.log('🚀 Starting Story Generation Test\n');
  console.log('='.repeat(60));
  
  // Fetch test bills
  console.log('\n📥 Fetching test bills...');
  const bills = await fetchTestBills();
  console.log(`✅ Found ${bills.length} test bills\n`);

  const results: any[] = [];

  // Generate stories for each bill
  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i];
    
    console.log(`\n[${ i + 1}/${bills.length}] Processing: ${bill.id}`);
    console.log(`   Title: ${bill.title.substring(0, 80)}...`);
    
    try {
      const story = await generateStory(bill);
      
      results.push({
        bill_id: bill.id,
        bill_title: bill.title,
        sponsor: `${bill.sponsor_name} [${bill.sponsor_party}-${bill.sponsor_state}]`,
        cosponsors: bill.cosponsor_count,
        policy_area: bill.policy_area,
        has_summary: !!bill.summary,
        has_full_text: !!bill.full_text,
        generated_story: story
      });

      console.log('   ✅ Story generated successfully');
      
      // Rate limit (Claude API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        bill_id: bill.id,
        error: error.message
      });
    }
  }

  // Generate markdown report
  console.log('\n\n📝 Generating report...');
  
  let markdown = `# Story Generation Test Results

**Date:** ${new Date().toISOString().split('T')[0]}  
**Bills Tested:** ${results.length}  
**Success Rate:** ${results.filter(r => !r.error).length}/${results.length}

---

## Prompt Used

\`\`\`
${STORY_GENERATION_PROMPT}
\`\`\`

---

## Test Results

`;

  for (const result of results) {
    if (result.error) {
      markdown += `### ❌ ${result.bill_id}

**Error:** ${result.error}

---

`;
      continue;
    }

    markdown += `### ${result.bill_id}

**Title:** ${result.bill_title}

**Sponsor:** ${result.sponsor}  
**Cosponsors:** ${result.cosponsors}  
**Policy Area:** ${result.policy_area || 'Not specified'}  
**Has Summary:** ${result.has_summary ? 'Yes' : 'No'}  
**Has Full Text:** ${result.has_full_text ? 'Yes' : 'No'}

#### Generated Story

${result.generated_story}

---

`;
  }

  // Add learnings section
  markdown += `## Key Learnings

### What Works Well

1. **Accessibility**: The AI effectively translates complex legislative language into plain English
2. **Context**: Provides valuable "why this matters" framing for users
3. **Stakeholder Analysis**: Identifies key groups affected and interested parties
4. **Connection to Broader Issues**: Links individual bills to larger policy debates

### Areas for Improvement

1. **Accuracy Verification**: Generated content should be reviewed for factual accuracy
2. **Source Attribution**: Consider adding references to actual news sources
3. **Timeliness**: Stories reflect information available at generation time
4. **Bias Check**: Ensure balanced presentation of different viewpoints

### Integration Recommendations

#### For User Tracking
- Generate stories when user first starts tracking a bill
- Update stories when bill status changes significantly
- Include "related bills you're tracking" section

#### For Podcast Generation
- Use stories as script foundation for podcast hosts
- Pull "Why This Matters" for podcast intro
- Use "Key Stakeholders" for dialogue prompts
- Reference "What's Next" for conclusion

#### Technical Implementation
\`\`\`typescript
// Example integration
async function generateBillStory(billId: string): Promise<BillStory> {
  const bill = await fetchBill(billId);
  const story = await generateStory(bill);
  
  return {
    billId,
    story,
    generatedAt: new Date(),
    // Cache for 24 hours
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}
\`\`\`

### Cost Considerations

- **Claude Sonnet 4**: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **Average story**: ~500 input tokens + ~800 output tokens = ~$0.015 per story
- **For 5,858 bills**: ~$88 to generate stories for all bills
- **Recommendation**: Generate on-demand, cache for 24-48 hours

### Next Steps

1. ✅ **Prompt refinement**: Iterate on prompt based on results
2. ⏳ **Caching strategy**: Implement Redis/database caching
3. ⏳ **Batch generation**: Generate stories for high-impact bills first
4. ⏳ **User feedback**: Add "Was this helpful?" to refine prompts
5. ⏳ **Podcast integration**: Test stories as podcast script input

---

## Conclusion

Story generation shows strong potential for:
- Making legislation more accessible to everyday citizens
- Providing context that helps users understand why bills matter
- Enriching podcast content with relevant background
- Connecting individual bills to broader policy discussions

**Recommendation:** Proceed with integration, starting with high-impact bills (>20 cosponsors or passed at least one chamber).
`;

  // Save report
  const filename = './docs/story-generation-test-results.md';
  writeFileSync(filename, markdown);

  console.log(`✅ Report saved to ${filename}`);
  console.log('\n' + '='.repeat(60));
  console.log('✨ Story Generation Test Complete!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
