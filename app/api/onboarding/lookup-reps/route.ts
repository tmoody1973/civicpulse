/**
 * Onboarding API: Look up representatives by ZIP code
 *
 * POST /api/onboarding/lookup-reps
 *
 * Body: { zipCode: string, userId?: string }
 * Returns: { success: true, district: {...}, representatives: [...] }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRepresentativesByZip, extractStateFromOcdId } from '@/lib/api/geocodio';
import { fetchMemberDetails } from '@/lib/api/congress';

const requestSchema = z.object({
  zipCode: z.string().regex(/^\d{5}$/, 'Invalid ZIP code. Must be 5 digits.'),
  userId: z.string().uuid().optional()
});

export async function POST(req: Request) {
  try {
    // 1. Validate input
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { zipCode, userId } = validation.data;

    // 2. Look up representatives via Geocodio
    const districtData = await getRepresentativesByZip(zipCode);

    if (!districtData || districtData.length === 0) {
      return NextResponse.json(
        { error: 'No congressional district found for this ZIP code' },
        { status: 404 }
      );
    }

    const primaryDistrict = districtData[0];

    if (!primaryDistrict?.current_legislators || primaryDistrict.current_legislators.length === 0) {
      return NextResponse.json(
        { error: 'No representatives found for this ZIP code' },
        { status: 404 }
      );
    }

    // 3. Enrich representative data with Congress.gov API
    const state = extractStateFromOcdId(primaryDistrict.ocd_id);
    const district = primaryDistrict.district_number;

    const representatives = await Promise.all(
      primaryDistrict.current_legislators.map(async (leg) => {
        // Fetch detailed member info from Congress.gov to get state and other data
        let congressData;
        try {
          congressData = await fetchMemberDetails(leg.references.bioguide_id);
        } catch (error) {
          console.warn(`Failed to fetch Congress.gov data for ${leg.references.bioguide_id}:`, error);
          congressData = null;
        }

        return {
          bioguide_id: leg.references.bioguide_id,
          name: `${leg.bio.first_name} ${leg.bio.last_name}`,
          first_name: leg.bio.first_name,
          last_name: leg.bio.last_name,
          party: leg.bio.party,
          type: leg.type,
          chamber: leg.type === 'representative' ? 'House' : 'Senate',
          state: congressData?.state || state, // Use Congress.gov state or fallback to extracted state
          district: leg.type === 'representative' ? district : null, // Only House members have districts
          photo: leg.bio.photo_url,
          phone: leg.contact.phone,
          contact_url: leg.contact.url, // Contact form URL
          website: null, // Can be populated later if needed
          address: leg.contact.address,
          twitter: leg.social?.twitter || null, // Twitter handle only
          facebook: leg.social?.facebook || null,
          youtube: leg.social?.youtube || null,
          seniority: leg.seniority
        };
      })
    );

    return NextResponse.json({
      success: true,
      district: {
        name: primaryDistrict.name,
        number: primaryDistrict.district_number,
        state: extractStateFromOcdId(primaryDistrict.ocd_id),
        congress: primaryDistrict.congress_number,
        years: primaryDistrict.congress_years,
        ocd_id: primaryDistrict.ocd_id
      },
      representatives
    });

  } catch (error) {
    console.error('Representative lookup error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Invalid ZIP code')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (error.message.includes('Geocodio API error')) {
        return NextResponse.json(
          { error: 'Failed to lookup ZIP code. Please try again.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to look up representatives. Please try again.' },
      { status: 500 }
    );
  }
}
