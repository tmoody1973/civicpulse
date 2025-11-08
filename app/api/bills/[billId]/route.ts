import { NextResponse } from 'next/server';
import { fetchBillById } from '@/lib/api/congress';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    // Try to fetch bill from Raindrop database first
    const response = await fetch(`${RAINDROP_SERVICE_URL}/api/bills?id=${billId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      // Bill exists in database, return it
      const data = await response.json();
      return NextResponse.json({
        success: true,
        bill: data.bill || data,
      });
    }

    // Bill not in database - fetch from Congress.gov and save
    if (response.status === 404) {
      console.log(`[Bills API] Bill ${billId} not in database, fetching from Congress.gov...`);

      // Parse billId format: "119-s-3152" -> congress: 119, type: "s", number: 3152
      const parts = billId.split('-');
      if (parts.length !== 3) {
        return NextResponse.json(
          { error: 'Invalid bill ID format', billId },
          { status: 400 }
        );
      }

      const [congress, billType, billNumber] = parts;

      // Fetch from Congress.gov
      const congressBill = await fetchBillById(
        parseInt(congress),
        billType,
        parseInt(billNumber)
      );

      if (!congressBill) {
        return NextResponse.json(
          { error: 'Bill not found on Congress.gov', billId },
          { status: 404 }
        );
      }

      // Save to Raindrop database
      try {
        await fetch(`${RAINDROP_SERVICE_URL}/api/bills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bill: congressBill }),
        });
        console.log(`[Bills API] Bill ${billId} saved to database`);
      } catch (saveError) {
        console.error(`[Bills API] Failed to save bill ${billId}:`, saveError);
        // Continue anyway - we have the bill data from Congress.gov
      }

      // Return the bill data from Congress.gov
      return NextResponse.json({
        success: true,
        bill: congressBill,
      });
    }

    // Other error from Raindrop
    throw new Error(`Raindrop service error: ${response.statusText}`);

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
