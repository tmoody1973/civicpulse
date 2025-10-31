import { NextResponse } from 'next/server';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    // Fetch bill from Raindrop database
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/bills?id=${billId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Bill not found', billId },
          { status: 404 }
        );
      }
      throw new Error(`Raindrop service error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      bill: data.bill || data,
    });
  } catch (error) {
    console.error('Error fetching bill:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch bill',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
