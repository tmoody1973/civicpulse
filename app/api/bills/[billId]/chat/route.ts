import { NextResponse } from 'next/server';
import { z } from 'zod';
import { answerBillQuestion, answerBillQuestionStream, generateSimilarBillsExplanation } from '@/lib/ai/cerebras';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

const requestSchema = z.object({
  question: z.string().min(1).max(1000),
});

// Keywords that indicate user is asking about similar bills
const SIMILAR_BILL_KEYWORDS = [
  'similar bills',
  'related bills',
  'other bills like this',
  'comparable legislation',
  'bills about the same',
  'same topic',
  'related legislation',
  'bills like this',
  'similar legislation',
  'related laws',
];

interface Bill {
  id: string;
  title: string;
  summary: string | null;
  bill_type: string;
  bill_number: number;
  sponsor_name: string | null;
  sponsor_party: string | null;
  introduced_date: string | null;
  latest_action_text: string | null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    // Validate input
    const body = await req.json();
    const validated = requestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error },
        { status: 400 }
      );
    }

    const { question } = validated.data;

    // Check if user is asking about similar bills
    const isSimilarBillQuery = SIMILAR_BILL_KEYWORDS.some(keyword =>
      question.toLowerCase().includes(keyword)
    );

    if (isSimilarBillQuery) {
      try {
        // Fetch similar bills from Raindrop service
        const similarResponse = await fetch(
          `${RAINDROP_SERVICE_URL}/api/smartbucket/similar`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ billId, limit: 5 }),
          }
        );

        const similarData = await similarResponse.json();

        if (similarData.success && similarData.similarBills.length > 0) {
          // Fetch current bill details for context
          const billResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/bills?id=${billId}`);
          const billData = await billResponse.json();
          const currentBill = billData.bill;

          // Generate narrative explanation using Cerebras
          const explanation = await generateSimilarBillsExplanation(
            {
              id: currentBill.id,
              title: currentBill.title,
              summary: currentBill.summary || null,
              bill_type: currentBill.bill_type,
              bill_number: currentBill.bill_number,
              sponsor_name: currentBill.sponsor_name || null,
              sponsor_party: currentBill.sponsor_party || null,
              introduced_date: currentBill.introduced_date || null,
              latest_action_text: currentBill.latest_action_text || null,
            },
            similarData.similarBills
          );

          return NextResponse.json({
            success: true,
            answer: explanation,
            similarBills: similarData.similarBills,
            source: 'semantic-search',
            billId,
          });
        } else {
          // No similar bills found
          return NextResponse.json({
            success: true,
            answer: 'I couldn\'t find any similar bills in the current database. This bill may be addressing a unique topic, or similar bills may not have been indexed yet.',
            similarBills: [],
            source: 'semantic-search',
            billId,
          });
        }
      } catch (error) {
        console.error('Similar bills search error:', error);
        // Fall through to regular chat if similar bills search fails
      }
    }

    // Try SmartBucket documentChat first (via Raindrop service)
    const raindropResponse = await fetch(
      `${RAINDROP_SERVICE_URL}/api/smartbucket/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, question }),
      }
    );

    const raindropData = await raindropResponse.json();

    // If SmartBucket chat succeeded, return the answer
    if (raindropData.success && raindropData.usedFullText) {
      return NextResponse.json({
        success: true,
        answer: raindropData.answer,
        source: 'smartbucket',
        billId,
      });
    }

    // If SmartBucket indicated fallback needed, use Cerebras with streaming
    if (raindropData.useFallback) {
      // Fetch complete bill data for better context
      const billResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/bills?id=${billId}`);

      if (!billResponse.ok) {
        throw new Error('Failed to fetch bill data for Cerebras fallback');
      }

      const billData = await billResponse.json();
      const fullBill = billData.bill;

      const bill: Bill = {
        id: fullBill.id,
        title: fullBill.title,
        summary: fullBill.summary || null,
        full_text: fullBill.full_text || null, // Include full text for comprehensive analysis
        bill_type: fullBill.bill_type,
        bill_number: fullBill.bill_number,
        sponsor_name: fullBill.sponsor_name || null,
        sponsor_party: fullBill.sponsor_party || null,
        introduced_date: fullBill.introduced_date || null,
        latest_action_text: fullBill.latest_action_text || null,
      };

      // Context is no longer needed - Cerebras functions now use full_text directly
      const context = undefined;

      // Create a streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send metadata first
            const metadata = {
              success: true,
              source: 'cerebras',
              billId,
              note: raindropData.message || 'Using AI fallback - bill may not have full text yet',
              streaming: true,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'metadata', data: metadata })}\n\n`));

            // Stream the answer
            for await (const chunk of answerBillQuestionStream(bill, question, context)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', data: chunk })}\n\n`));
            }

            // Send done signal
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // If bill not found
    if (raindropResponse.status === 404) {
      return NextResponse.json(
        { error: 'Bill not found', billId },
        { status: 404 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to answer question',
        details: raindropData.message || 'Unknown error',
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
