/**
 * Representatives API Route
 *
 * Fetch user's representatives (senators + house rep) from Congress.gov
 * Also stores them in the Raindrop database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRepresentativesByLocation } from '@/lib/api/congress';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const districtStr = searchParams.get('district');

    if (!state) {
      return NextResponse.json(
        { error: 'State parameter is required' },
        { status: 400 }
      );
    }

    const district = districtStr ? parseInt(districtStr, 10) : undefined;

    console.log(`📍 Fetching representatives for state: ${state}, district: ${district || 'N/A'}`);

    // Fetch from Congress.gov API
    const { senators, representative } = await getRepresentativesByLocation(
      state,
      district
    );

    // TODO: Store in Raindrop database
    // For now, just return the data

    const allReps = [...senators];
    if (representative) {
      allReps.push(representative);
    }

    console.log(`✅ Found ${allReps.length} representatives:`, allReps.map(r => r.name));

    return NextResponse.json({
      success: true,
      data: {
        senators,
        representative,
        all: allReps,
      },
    });
  } catch (error: any) {
    console.error('Error fetching representatives:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch representatives',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Store representatives for a user
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state, district, userId } = body;

    if (!state || !userId) {
      return NextResponse.json(
        { error: 'State and userId are required' },
        { status: 400 }
      );
    }

    // Fetch representatives
    const { senators, representative } = await getRepresentativesByLocation(
      state,
      district
    );

    const allReps = [...senators];
    if (representative) {
      allReps.push(representative);
    }

    // Store in Raindrop database
    const backendUrl = process.env.RAINDROP_SERVICE_URL;

    if (backendUrl) {
      for (const rep of allReps) {
        try {
          await fetch(`${backendUrl}/api/representatives`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bioguideId: rep.bioguideId,
              name: rep.name,
              party: rep.party,
              state: rep.state,
              district: rep.district,
              chamber: rep.chamber,
              imageUrl: rep.imageUrl,
              officialUrl: rep.officialUrl,
            }),
          });
        } catch (err) {
          console.warn(`Failed to store representative ${rep.name}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        senators,
        representative,
        all: allReps,
      },
      message: `Stored ${allReps.length} representatives`,
    });
  } catch (error: any) {
    console.error('Error storing representatives:', error);
    return NextResponse.json(
      {
        error: 'Failed to store representatives',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
