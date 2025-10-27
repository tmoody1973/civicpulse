/**
 * Representatives API Route - Database Version
 *
 * Fetch representatives from Raindrop SQL database instead of Congress.gov API
 * This ensures we get all representatives that were saved during onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db/client';

// Force Node.js runtime to allow HTTPS agent for SSL bypass
export const runtime = 'nodejs';

// Map state abbreviations to full state names (as stored in database)
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stateAbbr = searchParams.get('state');
    const districtStr = searchParams.get('district');

    if (!stateAbbr) {
      return NextResponse.json(
        { error: 'State parameter is required' },
        { status: 400 }
      );
    }

    const district = districtStr ? parseInt(districtStr, 10) : undefined;

    // Smart query: Accept BOTH abbreviations (WI) AND full names (Wisconsin)
    const stateName = STATE_NAMES[stateAbbr] || stateAbbr;

    console.log(`📊 Fetching representatives from database: state=${stateAbbr} (${stateName}), district=${district || 'N/A'}`);

    // Fetch representatives for this state from database
    // Query matches BOTH abbreviation AND full name for flexibility
    const sql = `
      SELECT * FROM representatives
      WHERE state = '${stateName}' OR state = '${stateAbbr}'
      ORDER BY chamber DESC, name ASC
    `;

    const result = await executeQuery(sql, 'representatives');
    const allReps = result.rows || [];

    console.log(`✅ Found ${allReps.length} representatives in database:`, allReps.map(r => r.name));

    // Separate senators and house representative
    const senators = allReps.filter((r: any) => r.chamber === 'Senate');
    const houseReps = allReps.filter((r: any) => r.chamber === 'House');

    // Find the specific house rep for this district
    const representative = district !== undefined
      ? houseReps.find((r: any) => r.district === district.toString())
      : undefined;

    // Map to consistent format
    const mapRep = (rep: any) => ({
      bioguideId: rep.bioguide_id,
      name: rep.name,
      party: rep.party,
      chamber: rep.chamber,
      state: rep.state,
      district: rep.district,
      imageUrl: rep.image_url,
      officialUrl: rep.website_url,
      phone: rep.phone,
      twitter: rep.twitter_handle,
    });

    const mappedSenators = senators.map(mapRep);
    const mappedRep = representative ? mapRep(representative) : undefined;
    const all = [...mappedSenators];
    if (mappedRep) {
      all.push(mappedRep);
    }

    return NextResponse.json({
      success: true,
      data: {
        senators: mappedSenators,
        representative: mappedRep,
        all,
      },
    });
  } catch (error: any) {
    console.error('Error fetching representatives from database:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch representatives',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
