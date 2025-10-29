/**
 * AI Bill Summary Generation API
 *
 * Generates easy-to-understand summaries of bills using Claude AI
 * Caches summaries in database for reuse
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { fetchBillText } from '@/lib/api/congress';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate AI summary for a bill
 */
export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const { billId, billNumber, title, existingSummary, fullText } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Generating AI summary for ${billNumber || billId || title}...`);

    // Try to fetch from database first (for caching), but don't fail if not found
    let bill = null;
    let databaseId = null;

    if (billId) {
      console.log('🔍 [API] Attempting database lookup for caching...');

      let whereClause = `id = '${billId}'`;

      // If billId looks like a synthetic ID (congress-type-number), parse it
      const syntheticIdMatch = billId.match(/^(\d+)-([a-z]+)-(\d+)$/);

      if (syntheticIdMatch) {
        const [_, congress, billType, number] = syntheticIdMatch;
        whereClause = `congress = ${congress} AND bill_type = '${billType}' AND bill_number = ${number}`;
      }

      try {
        const billDataResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'bills',
            query: `
              SELECT id, ai_summary, ai_summary_generated_at, full_text, summary, title
              FROM bills
              WHERE ${whereClause}
              LIMIT 1
            `
          })
        });

        const billData = await billDataResponse.json();
        bill = billData.rows?.[0];
        databaseId = bill?.id;

        if (bill) {
          console.log(`✅ Found bill in database: ${bill.id}`);

          // Return cached summary if it exists and is recent (< 7 days old)
          if (bill.ai_summary) {
            const generatedAt = new Date(bill.ai_summary_generated_at);
            const daysSince = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);

            if (daysSince < 7) {
              console.log(`✅ Using cached AI summary (${Math.round(daysSince)} days old)`);
              return NextResponse.json({
                success: true,
                summary: bill.ai_summary,
                cached: true,
                generatedAt: bill.ai_summary_generated_at,
              });
            }
          }
        } else {
          console.log('⚠️  Bill not in database - will generate summary without caching');
        }
      } catch (dbError) {
        console.log('⚠️  Database lookup failed - will generate summary without caching');
      }
    }

    // Build context for Claude using request data or database data
    const billTitle = title || bill?.title || 'Untitled Bill';
    const billSummary = existingSummary || bill?.summary;
    let billFullText = fullText || bill?.full_text;

    // If no full text available, try fetching from Congress.gov
    if (!billFullText && billId) {
      console.log('📡 No full text provided - attempting to fetch from Congress.gov...');

      // Parse billId to extract congress, type, and number
      const syntheticIdMatch = billId.match(/^(\d+)-([a-z]+)-(\d+)$/);

      if (syntheticIdMatch) {
        const [_, congress, billType, number] = syntheticIdMatch;
        try {
          const fetchedText = await fetchBillText(
            parseInt(congress),
            billType,
            parseInt(number)
          );

          if (fetchedText) {
            billFullText = fetchedText;
            console.log(`✅ Fetched full text from Congress.gov (${billFullText.length} chars)`);
          } else {
            console.log('⚠️  No full text available at Congress.gov yet');
          }
        } catch (error) {
          console.error('❌ Failed to fetch full text from Congress.gov:', error);
        }
      }
    }

    let context = `Bill Title: ${billTitle}`;

    if (billNumber) {
      context += `\nBill Number: ${billNumber}`;
    }

    if (billSummary) {
      context += `\n\nExisting Summary:\n${billSummary}`;
    }

    // Use full text if available
    if (billFullText) {
      // Limit full text to ~4000 chars to avoid token limits but give Claude enough context
      const truncatedText = billFullText.substring(0, 4000);
      context += `\n\nBill Text (excerpt):\n${truncatedText}${billFullText.length > 4000 ? '...' : ''}`;
      console.log(`📄 Using full text (${billFullText.length} chars, showing first ${Math.min(4000, billFullText.length)})`);
    } else {
      console.log(`⚠️ No full text available for this bill`);
    }

    // Generate summary with Claude
    const hasFullText = !!billFullText;
    const promptInstructions = hasFullText
      ? `You are helping citizens understand legislation. Generate a clear, concise summary of this bill in plain English based on the actual legislative text provided.

${context}

Create a summary that:
1. Explains what the bill does in 2-3 sentences (avoid legal jargon)
2. Uses simple language anyone can understand
3. Focuses on practical impact and key provisions from the actual bill text
4. Highlights who this affects and what would change
5. Is objective and factual (no opinions)

Since you have access to the actual bill text, provide specific details about what the legislation proposes.

Summary:`
      : `You are helping citizens understand legislation. Generate a clear, concise summary of this bill in plain English.

${context}

Create a summary that:
1. Explains what the bill does in 2-3 sentences (avoid legal jargon)
2. Uses simple language anyone can understand
3. Focuses on practical impact ("This bill would..." or "This bill aims to...")
4. Is objective and factual (no opinions)

Note: Full legislative text is not available, so work with the title and existing summary provided.

Summary:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600, // Increased slightly to allow for more detailed summaries when full text is available
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: promptInstructions
      }]
    });

    // Extract summary from Claude's response
    const aiSummary = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : 'Unable to generate summary';

    // Cache the summary in database (only if bill exists)
    if (databaseId) {
      try {
        await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'bills',
            query: `
              UPDATE bills
              SET ai_summary = '${aiSummary.replace(/'/g, "''")}',
                  ai_summary_generated_at = datetime('now')
              WHERE id = '${databaseId}'
            `
          })
        });
        console.log(`✅ Cached summary in database for bill ${databaseId}`);
      } catch (cacheError) {
        console.log('⚠️  Failed to cache summary - will still return result');
      }
    } else {
      console.log('ℹ️  Bill not in database - summary not cached');
    }

    const duration = Date.now() - start;
    console.log(`✅ AI summary generated in ${duration}ms`);

    return NextResponse.json({
      success: true,
      summary: aiSummary,
      cached: false,
      generatedAt: new Date().toISOString(),
      duration,
    });

  } catch (error: any) {
    console.error('AI summary generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate summary',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Get existing AI summary for a bill
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const billId = searchParams.get('billId');

    if (!billId) {
      return NextResponse.json(
        { error: 'billId is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'bills',
        query: `
          SELECT ai_summary, ai_summary_generated_at
          FROM bills
          WHERE id = '${billId}'
        `
      })
    });

    const data = await response.json();
    const result = data.rows?.[0];

    if (!result?.ai_summary) {
      return NextResponse.json({
        success: false,
        message: 'No AI summary found'
      });
    }

    return NextResponse.json({
      success: true,
      summary: result.ai_summary,
      generatedAt: result.ai_summary_generated_at,
    });

  } catch (error: any) {
    console.error('Get AI summary error:', error);
    return NextResponse.json(
      { error: 'Failed to get summary', message: error.message },
      { status: 500 }
    );
  }
}
