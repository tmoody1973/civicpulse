/**
 * Representative Detail API Endpoint
 *
 * Fetches comprehensive data for a single representative including:
 * - Basic profile information
 * - Sponsored bills
 * - Co-sponsored bills
 * - Quick statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchMemberBills, calculateBillStats } from '@/lib/congress/fetch-member-bills';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bioguideId: string }> }
) {
  try {
    // Next.js 16: params must be awaited
    const { bioguideId } = await context.params;

    if (!bioguideId) {
      return NextResponse.json(
        { error: 'bioguideId is required' },
        { status: 400 }
      );
    }

    if (!RAINDROP_SERVICE_URL) {
      console.error('❌ RAINDROP_SERVICE_URL not configured');
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    console.log(`📋 Fetching data for representative: ${bioguideId}`);

    // Fetch representative profile
    const repResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'representatives',
        query: `SELECT * FROM representatives WHERE bioguide_id = '${bioguideId}'`
      })
    });

    if (!repResponse.ok) {
      console.error('❌ Failed to fetch representative:', await repResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch representative' },
        { status: 500 }
      );
    }

    const repData = await repResponse.json();
    const representative = repData.rows?.[0];

    if (!representative) {
      return NextResponse.json(
        { error: 'Representative not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Found representative: ${representative.name}`);

    // Check if we have pre-computed stats in the database
    const hasPrecomputedStats = representative.stats_updated_at !== null;

    let stats;
    let sponsoredBills = [];
    let cosponsoredBills = [];

    if (hasPrecomputedStats) {
      // Use pre-computed stats from database (Phase 2 optimization)
      stats = {
        totalSponsored: representative.bills_sponsored_total || 0,
        totalCosponsored: representative.bills_cosponsored_total || 0,
        lawsPassed: representative.bills_laws_passed || 0,
        activeBills: representative.bills_active || 0,
        policyAreas: representative.policy_areas_count || 0
      };
      console.log('📊 Using pre-computed stats from database');
      console.log('⚡ Stats:', stats);

      // Still fetch recent bills for display (limit 50 for speed)
      const { sponsoredBills: sponsored, cosponsoredBills: cosponsored } = await fetchMemberBills(bioguideId, {
        limit: 50,
        timeout: 30000
      });
      sponsoredBills = sponsored;
      cosponsoredBills = cosponsored;

    } else {
      // Fallback: Calculate stats on-the-fly (slower, Phase 1 behavior)
      console.log('⚠️  No pre-computed stats found, calculating on-the-fly...');
      const { sponsoredBills: sponsored, cosponsoredBills: cosponsored } = await fetchMemberBills(bioguideId, {
        limit: 50,
        timeout: 30000
      });
      sponsoredBills = sponsored;
      cosponsoredBills = cosponsored;

      stats = calculateBillStats(sponsoredBills, cosponsoredBills);
      console.log('📊 Calculated stats:', stats);
    }

    // Parse committees if stored as JSON string
    let committees = [];
    if (representative.committees) {
      try {
        committees = typeof representative.committees === 'string'
          ? JSON.parse(representative.committees)
          : representative.committees;
      } catch (error) {
        console.error('Failed to parse committees:', error);
        committees = [];
      }
    }

    // Format response
    const response = {
      representative: {
        bioguideId: representative.bioguide_id,
        name: representative.name,
        party: representative.party,
        chamber: representative.chamber,
        state: representative.state,
        district: representative.district,
        imageUrl: representative.image_url,
        officeAddress: representative.office_address,
        phone: representative.phone,
        websiteUrl: representative.website_url,
        twitterHandle: representative.twitter_handle,
        facebookUrl: representative.facebook_url,
        youtubeUrl: representative.youtube_url,
        instagramHandle: representative.instagram_handle,
        rssUrl: representative.rss_url,
        contactUrl: representative.contact_url,
        committees
      },
      // Bills are already in correct format from utility function
      sponsoredBills: sponsoredBills.map(bill => ({
        billId: bill.id,
        congress: bill.congress,
        billNumber: bill.bill_number,
        billType: bill.bill_type,
        title: bill.title,
        introducedDate: bill.introduced_date,
        latestActionDate: bill.latest_action_date,
        latestActionText: bill.latest_action_text,
        status: bill.status,
        policyArea: bill.policy_area
      })),
      cosponsoredBills: cosponsoredBills.map(bill => ({
        billId: bill.id,
        congress: bill.congress,
        billNumber: bill.bill_number,
        billType: bill.bill_type,
        title: bill.title,
        introducedDate: bill.introduced_date,
        latestActionDate: bill.latest_action_date,
        latestActionText: bill.latest_action_text,
        status: bill.status,
        policyArea: bill.policy_area
      })),
      stats
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error in representative API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
