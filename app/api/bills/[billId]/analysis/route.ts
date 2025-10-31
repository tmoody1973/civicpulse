import { NextResponse } from 'next/server';
import { generateBillAnalysis, BillAnalysis } from '@/lib/ai/cerebras';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

interface BillFromDB {
  id: string;
  title: string;
  summary: string | null;
  bill_type: string;
  bill_number: number;
  sponsor_name: string | null;
  sponsor_party: string | null;
  introduced_date: string | null;
  latest_action_text: string | null;
  plain_english_summary: string | null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    // Fetch bill from database via Raindrop service
    const response = await fetch(
      `${RAINDROP_SERVICE_URL}/api/bills?id=${billId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Bill not found', billId },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch bill: ${response.statusText}`);
    }

    const data = await response.json();
    const bill: BillFromDB = data.bill || data;

    // Check if we already have cached analysis
    if (bill.plain_english_summary) {
      try {
        const cachedAnalysis: BillAnalysis = JSON.parse(bill.plain_english_summary);
        return NextResponse.json({
          success: true,
          analysis: cachedAnalysis,
          cached: true,
          billId,
        });
      } catch {
        // If parsing fails, regenerate
        console.log('Cached analysis invalid, regenerating...');
      }
    }

    // Generate new analysis using Cerebras
    const analysis = await generateBillAnalysis({
      id: bill.id,
      title: bill.title,
      summary: bill.summary,
      bill_type: bill.bill_type,
      bill_number: bill.bill_number,
      sponsor_name: bill.sponsor_name,
      sponsor_party: bill.sponsor_party,
      introduced_date: bill.introduced_date,
      latest_action_text: bill.latest_action_text,
    });

    // Cache the analysis in the database
    try {
      await fetch(`${RAINDROP_SERVICE_URL}/api/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bill.id,
          plain_english_summary: JSON.stringify(analysis),
        }),
      });
    } catch (error) {
      console.error('Failed to cache analysis:', error);
      // Continue even if caching fails
    }

    return NextResponse.json({
      success: true,
      analysis,
      cached: false,
      billId,
    });
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  // Allow forcing regeneration via POST
  const { billId } = await params;
  const { forceRegenerate } = await req.json();

  if (!forceRegenerate) {
    return NextResponse.json(
      { error: 'Use GET for cached analysis, or POST with forceRegenerate: true' },
      { status: 400 }
    );
  }

  try {
    // Fetch bill
    const response = await fetch(
      `${RAINDROP_SERVICE_URL}/api/bills?id=${billId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error('Bill not found');
    }

    const data = await response.json();
    const bill: BillFromDB = data.bill || data;

    // Generate fresh analysis
    const analysis = await generateBillAnalysis({
      id: bill.id,
      title: bill.title,
      summary: bill.summary,
      bill_type: bill.bill_type,
      bill_number: bill.bill_number,
      sponsor_name: bill.sponsor_name,
      sponsor_party: bill.sponsor_party,
      introduced_date: bill.introduced_date,
      latest_action_text: bill.latest_action_text,
    });

    // Update cache
    await fetch(`${RAINDROP_SERVICE_URL}/api/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: bill.id,
        plain_english_summary: JSON.stringify(analysis),
      }),
    });

    return NextResponse.json({
      success: true,
      analysis,
      cached: false,
      regenerated: true,
      billId,
    });
  } catch (error) {
    console.error('Analysis regeneration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to regenerate analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
