import { NextResponse } from 'next/server';
import { z } from 'zod';

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';

// Type definitions
interface RepresentativeVote {
  voteNumber: number;
  congress: number;
  session: number;
  voteDate: string;
  voteResult: string;
  voteType: string;
  votePosition: string; // Yea, Nay, Present, Not Voting, etc.
  billNumber?: string;
  billTitle?: string;
  billUrl?: string;
  voteQuestion?: string;
}

// Request validation schema
const querySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).optional().default('10'),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  try {
    const { bioguideId } = await params;

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const { limit } = querySchema.parse({
      limit: searchParams.get('limit') || '10',
    });

    if (!CONGRESS_API_KEY) {
      return NextResponse.json(
        { error: 'Congress API key not configured' },
        { status: 500 }
      );
    }

    // Fetch recent House votes (fetch more than needed since we'll filter)
    const votesResponse = await fetch(
      `${CONGRESS_API_BASE}/house-vote?limit=50&api_key=${CONGRESS_API_KEY}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 600 }, // Cache for 10 minutes
      }
    );

    if (!votesResponse.ok) {
      throw new Error(`Congress API error: ${votesResponse.status}`);
    }

    const votesData = await votesResponse.json();
    const votes = votesData.houseRollCallVotes || [];

    // For each vote, fetch member data and filter for this representative
    const representativeVotes: RepresentativeVote[] = [];

    for (const vote of votes) {
      if (representativeVotes.length >= limit) break;

      try {
        // Fetch member votes for this roll call
        const membersUrl = `${CONGRESS_API_BASE}/house-vote/${vote.congress}/${vote.sessionNumber}/${vote.rollCallNumber}/members?api_key=${CONGRESS_API_KEY}`;
        const membersResponse = await fetch(membersUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!membersResponse.ok) {
          console.error(`Failed to fetch members for vote ${vote.rollCallNumber}:`, membersResponse.status);
          continue;
        }

        const membersData = await membersResponse.json();
        const memberVotes = membersData.houseRollCallVoteMemberVotes?.results || [];

        // Find this representative's vote
        const repVote = memberVotes.find((m: any) =>
          m.bioguideID?.toUpperCase() === bioguideId.toUpperCase()
        );

        if (repVote) {
          // Fetch bill title if we have bill information
          let billTitle = vote.legislationTitle || vote.question || undefined;

          if (!billTitle && vote.legislationNumber && vote.legislationType) {
            try {
              // Fetch official bill title from Congress API
              const billType = vote.legislationType.toLowerCase();
              const billTitlesUrl = `${CONGRESS_API_BASE}/bill/${vote.congress}/${billType}/${vote.legislationNumber}/titles?api_key=${CONGRESS_API_KEY}`;
              const titlesResponse = await fetch(billTitlesUrl, {
                headers: { 'Accept': 'application/json' },
                next: { revalidate: 86400 }, // Cache for 24 hours
              });

              if (titlesResponse.ok) {
                const titlesData = await titlesResponse.json();
                const titles = titlesData.titles || [];
                // Get the official title (usually the first one)
                const officialTitle = titles.find((t: any) => t.titleType === 'Official Title as Introduced' || t.titleType === 'Short Title(s) as Introduced');
                billTitle = officialTitle?.title || titles[0]?.title || undefined;
              }
            } catch (error) {
              console.error(`Error fetching bill title for ${vote.legislationType} ${vote.legislationNumber}:`, error);
            }
          }

          // This representative voted on this bill
          representativeVotes.push({
            voteNumber: vote.rollCallNumber || 0,
            congress: vote.congress || 0,
            session: vote.sessionNumber || 0,
            voteDate: vote.startDate || '',
            voteResult: vote.result || '',
            voteType: vote.voteType || '',
            votePosition: repVote.voteCast || 'Not Voting',
            billNumber: vote.legislationNumber && vote.legislationType
              ? `${vote.legislationType} ${vote.legislationNumber}`
              : undefined,
            billTitle,
            billUrl: vote.legislationUrl || undefined,
            voteQuestion: vote.question || undefined,
          });
        }
      } catch (error) {
        console.error(`Error fetching members for vote ${vote.rollCallNumber}:`, error);
        continue;
      }
    }

    // Sort votes by date (newest first)
    representativeVotes.sort((a, b) => {
      const dateA = new Date(a.voteDate).getTime();
      const dateB = new Date(b.voteDate).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    return NextResponse.json({
      success: true,
      bioguideId,
      votes: representativeVotes,
      count: representativeVotes.length,
    });

  } catch (error) {
    console.error('Representative votes API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch representative votes',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
