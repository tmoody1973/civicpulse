import { NextRequest, NextResponse } from 'next/server';
import {
  fetchBillDetails,
  fetchBillCosponsors,
  fetchBillActions,
  fetchBillSubjects
} from '@/lib/api/congress';

/**
 * POST /api/bills/[billId]/refresh
 *
 * Refreshes a single bill with complete details from Congress.gov
 * Used for auto-sync on view and manual refresh
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params;

    // Parse billId: "119-hr-1234" -> congress=119, type=hr, number=1234
    const [congress, billType, billNumber] = billId.split('-');

    if (!congress || !billType || !billNumber) {
      return NextResponse.json(
        { error: 'Invalid bill ID format. Expected: congress-type-number (e.g., 119-hr-1234)' },
        { status: 400 }
      );
    }

    console.log(`🔄 Refreshing bill ${billId} from Congress.gov...`);

    // Fetch complete bill details
    const bill = await fetchBillDetails(
      parseInt(congress),
      billType,
      parseInt(billNumber),
      { fetchSummary: true, fetchFullText: true }
    );

    // Fetch additional metadata in parallel
    const [cosponsors, actions, subjects] = await Promise.all([
      fetchBillCosponsors(parseInt(congress), billType, parseInt(billNumber)),
      fetchBillActions(parseInt(congress), billType, parseInt(billNumber)),
      fetchBillSubjects(parseInt(congress), billType, parseInt(billNumber))
    ]);

    // Prepare data for database
    const billData = {
      id: billId,
      congress: parseInt(congress),
      billType: billType,
      billNumber: parseInt(billNumber),
      title: bill.title,
      summary: bill.summary || null,
      fullText: bill.fullText || null,
      sponsorBioguideId: bill.sponsorBioguideId || null,
      sponsorName: bill.sponsorName || null,
      sponsorParty: bill.sponsorParty || null,
      sponsorState: bill.sponsorState || null,
      introducedDate: bill.introducedDate || null,
      latestActionDate: bill.latestActionDate || null,
      latestActionText: bill.latestActionText || null,
      status: bill.status || 'introduced',
      policyArea: subjects?.policyArea || null,
      issueCategories: subjects?.legislativeSubjects || [],
      cosponsorCount: cosponsors?.length || 0,
      cosponsors: cosponsors || [],
      actions: actions || [],
      congressGovUrl: bill.url || null
    };

    // Update in Raindrop database
    const raindropServiceUrl = process.env.RAINDROP_SERVICE_URL;
    if (!raindropServiceUrl) {
      throw new Error('RAINDROP_SERVICE_URL not configured');
    }

    const response = await fetch(`${raindropServiceUrl}/api/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update bill in database: ${error}`);
    }

    console.log(`✅ Successfully refreshed ${billId}`);
    console.log(`   - Full text: ${bill.fullText ? Math.round(bill.fullText.length / 1024) + 'KB' : 'none'}`);
    console.log(`   - Cosponsors: ${cosponsors?.length || 0}`);
    console.log(`   - Actions: ${actions?.length || 0}`);
    console.log(`   - Subjects: ${subjects?.legislativeSubjects?.length || 0}`);

    return NextResponse.json({
      success: true,
      billId,
      updated: {
        hasFullText: !!bill.fullText,
        cosponsorCount: cosponsors?.length || 0,
        actionCount: actions?.length || 0,
        subjectCount: subjects?.legislativeSubjects?.length || 0,
        policyArea: subjects?.policyArea
      }
    });

  } catch (error: any) {
    console.error(`❌ Error refreshing bill:`, error);

    return NextResponse.json(
      {
        error: 'Failed to refresh bill',
        details: error.message
      },
      { status: 500 }
    );
  }
}
