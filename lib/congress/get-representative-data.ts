/**
 * Get Representative Data
 * 
 * Shared function to fetch representative data from Raindrop database
 * Used by both the API route and the page component to avoid circular dependencies
 */

import { fetchMemberBills, calculateBillStats, type CongressBill } from './fetch-member-bills';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

// Transform snake_case API response to camelCase for frontend
function transformBillForFrontend(bill: CongressBill) {
  return {
    billId: bill.id || `${bill.congress}-${bill.bill_type}-${bill.bill_number}`,
    billNumber: bill.bill_number || '',
    billType: bill.bill_type || '',
    congress: bill.congress || 0,
    title: bill.title || '',
    introducedDate: bill.introduced_date || '',
    latestActionDate: bill.latest_action_date || '',
    latestAction: bill.latest_action_text || '',
    status: bill.status || '',
    policyArea: bill.policy_area || '',
  };
}

export interface RepresentativeData {
  representative: any;
  sponsoredBills: any[];
  cosponsoredBills: any[];
  stats: {
    totalSponsored: number;
    totalCosponsored: number;
    lawsPassed: number;
    activeBills: number;
    policyAreas: number;
  };
}

export async function getRepresentativeData(
  bioguideId: string
): Promise<RepresentativeData | null> {
  try {
    if (!RAINDROP_SERVICE_URL) {
      console.error('❌ RAINDROP_SERVICE_URL not configured');
      return null;
    }

    console.log(`📋 Fetching data for representative: ${bioguideId}`);

    // Fetch representative profile from database
    const repResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'representatives',
        query: `SELECT * FROM representatives WHERE bioguide_id = '${bioguideId}'`
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000),
    });

    if (!repResponse.ok) {
      console.error('❌ Failed to fetch representative:', await repResponse.text());
      return null;
    }

    const repData = await repResponse.json();
    const representative = repData.rows?.[0];

    if (!representative) {
      console.log(`❌ Representative ${bioguideId} not found in database`);
      return null;
    }

    console.log(`✅ Found representative: ${representative.name}`);

    // Check if we have pre-computed stats
    const hasPrecomputedStats = representative.stats_updated_at !== null;

    let stats;
    let sponsoredBills = [];
    let cosponsoredBills = [];

    if (hasPrecomputedStats) {
      // Use pre-computed stats from database
      stats = {
        totalSponsored: representative.bills_sponsored_total || 0,
        totalCosponsored: representative.bills_cosponsored_total || 0,
        lawsPassed: representative.bills_laws_passed || 0,
        activeBills: representative.bills_active || 0,
        policyAreas: representative.policy_areas_count || 0
      };
      console.log('📊 Using pre-computed stats from database');

      // Fetch recent bills for display
      const { sponsoredBills: sponsored, cosponsoredBills: cosponsored } = 
        await fetchMemberBills(bioguideId, {
          limit: 10,
          timeout: 20000 // 20 second timeout
        });
      
      sponsoredBills = sponsored;
      cosponsoredBills = cosponsored;

    } else {
      // Calculate stats on-the-fly
      console.log('⚠️  No pre-computed stats found, calculating on-the-fly...');
      
      const { sponsoredBills: sponsored, cosponsoredBills: cosponsored } = 
        await fetchMemberBills(bioguideId, {
          timeout: 20000 // 20 second timeout
        });

      sponsoredBills = sponsored;
      cosponsoredBills = cosponsored;

      // Calculate stats
      stats = calculateBillStats(sponsoredBills, cosponsoredBills);
      console.log('📊 Calculated stats:', stats);
    }

    // Transform data for frontend
    const transformedRep = {
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
      committees: representative.committees || []
    };

    return {
      representative: transformedRep,
      sponsoredBills: sponsoredBills.map(transformBillForFrontend),
      cosponsoredBills: cosponsoredBills.map(transformBillForFrontend),
      stats
    };

  } catch (error: any) {
    console.error('❌ Error fetching representative data:', error);
    return null;
  }
}
