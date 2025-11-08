/**
 * Representative Press Releases API
 *
 * Fetches press releases for a specific representative from their official RSS feeds
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPressReleasesHybrid } from '@/lib/congress/press-releases-brave-search';

const RAINDROP_SERVICE_URL = process.env.RAINDROP_SERVICE_URL!;

// Cache for 6 hours (press releases don't change that often)
export const revalidate = 21600;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bioguideId: string }> }
) {
  try {
    const { bioguideId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!bioguideId) {
      return NextResponse.json(
        { error: 'bioguideId is required' },
        { status: 400 }
      );
    }

    console.log(`📰 Fetching press releases for representative: ${bioguideId}`);

    // Fetch representative from database to get chamber and name
    const repResponse = await fetch(`${RAINDROP_SERVICE_URL}/api/admin/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'representatives',
        query: `SELECT name, chamber, website_url FROM representatives WHERE bioguide_id = '${bioguideId}'`
      })
    });

    if (!repResponse.ok) {
      throw new Error('Failed to fetch representative from database');
    }

    const repData = await repResponse.json();
    const rep = repData.rows?.[0];

    if (!rep) {
      return NextResponse.json(
        { error: 'Representative not found' },
        { status: 404 }
      );
    }

    // Extract last name from full name (e.g., "Gwen Moore" → "Moore")
    const lastName = rep.name.split(' ').pop() || rep.name;

    console.log(`📋 Representative: ${rep.name} (${rep.chamber}), Last name: ${lastName}`);

    // Fetch press releases using hybrid approach (RSS + Brave Search fallback)
    const pressReleases = await fetchPressReleasesHybrid(
      {
        name: rep.name,
        lastName,
        chamber: rep.chamber,
        websiteUrl: rep.website_url
      },
      limit
    );

    return NextResponse.json({
      success: true,
      data: pressReleases,
      meta: {
        representative: rep.name,
        bioguideId,
        total: pressReleases.length,
        source: pressReleases[0]?.source || 'none'
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching press releases:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch press releases',
        message: error.message || 'Unknown error',
        data: [] // Return empty array so UI doesn't break
      },
      { status: 500 }
    );
  }
}
