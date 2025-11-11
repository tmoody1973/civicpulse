import { NextResponse } from 'next/server';
import { z } from 'zod';

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';

// Type definitions
interface VoteMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  votePosition: 'Yes' | 'No' | 'Present' | 'Not Voting';
}

interface VoteResult {
  voteNumber: number;
  congress: number;
  session: number;
  chamber: 'House';
  voteDate: string;
  voteQuestion: string;
  voteResult: string;
  voteType: string;
  billNumber?: string;
  billTitle?: string;
  billUrl?: string;
  description?: string;
  yeas: number;
  nays: number;
  present: number;
  notVoting: number;
  members?: VoteMember[];
}

// Request validation schema
const querySchema = z.object({
  congress: z.string().optional(),
  session: z.string().optional(),
  voteNumber: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
  includeMembers: z.string().transform(val => val === 'true').optional().default('false'),
});

export async function GET(request: Request) {
  try {
    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      congress: searchParams.get('congress') || undefined,
      session: searchParams.get('session') || undefined,
      voteNumber: searchParams.get('voteNumber') || undefined,
      limit: searchParams.get('limit') || '20',
      includeMembers: searchParams.get('includeMembers') || 'false',
    });

    if (!CONGRESS_API_KEY) {
      return NextResponse.json(
        { error: 'Congress API key not configured' },
        { status: 500 }
      );
    }

    // Build API URL based on parameters
    let apiUrl: string;

    if (params.voteNumber && params.congress && params.session) {
      // Specific vote with details
      apiUrl = `${CONGRESS_API_BASE}/house-vote/${params.congress}/${params.session}/${params.voteNumber}`;
    } else if (params.congress && params.session) {
      // Votes for specific Congress and session
      apiUrl = `${CONGRESS_API_BASE}/house-vote/${params.congress}/${params.session}?limit=${params.limit}`;
    } else if (params.congress) {
      // Votes for specific Congress
      apiUrl = `${CONGRESS_API_BASE}/house-vote/${params.congress}?limit=${params.limit}`;
    } else {
      // Recent votes (current Congress)
      apiUrl = `${CONGRESS_API_BASE}/house-vote?limit=${params.limit}`;
    }

    // Fetch from Congress.gov API
    const response = await fetch(`${apiUrl}&api_key=${CONGRESS_API_KEY}`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status}`);
    }

    const data = await response.json();

    // If requesting a specific vote with members
    if (params.voteNumber && params.includeMembers) {
      const membersUrl = `${CONGRESS_API_BASE}/house-vote/${params.congress}/${params.session}/${params.voteNumber}/members?api_key=${CONGRESS_API_KEY}`;
      const membersResponse = await fetch(membersUrl, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        data.members = membersData.members || [];
      }
    }

    // Transform the response to our format
    const votes = transformVotes(data);

    return NextResponse.json({
      success: true,
      votes,
      count: votes.length,
      congress: params.congress,
      session: params.session,
    });

  } catch (error) {
    console.error('House votes API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch House votes',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function transformVotes(data: any): VoteResult[] {
  // Handle houseRollCallVotes response (list endpoint)
  if (data.houseRollCallVotes && Array.isArray(data.houseRollCallVotes)) {
    return data.houseRollCallVotes.map((item: any) => transformSingleVote(item));
  }

  // Handle single vote response
  if (data.vote) {
    return [transformSingleVote(data.vote)];
  }

  // Fallback for other possible structures
  if (data.votes && Array.isArray(data.votes)) {
    return data.votes.map((item: any) => transformSingleVote(item.vote || item));
  }

  return [];
}

function transformSingleVote(vote: any): VoteResult {
  const result: VoteResult = {
    voteNumber: vote.rollCallNumber || vote.voteNumber || vote.rollCall || 0,
    congress: vote.congress || 0,
    session: vote.sessionNumber || vote.session || 0,
    chamber: 'House',
    voteDate: vote.startDate || vote.voteDate || vote.actionDate || '',
    voteQuestion: vote.question || vote.voteQuestion || '',
    voteResult: vote.result || vote.voteResult || '',
    voteType: vote.voteType || vote.type || '',
    yeas: vote.yeas || vote.totals?.yeas || 0,
    nays: vote.nays || vote.totals?.nays || 0,
    present: vote.present || vote.totals?.present || 0,
    notVoting: vote.notVoting || vote.totals?.notVoting || 0,
  };

  // Extract bill information if available
  if (vote.legislationNumber && vote.legislationType) {
    result.billNumber = `${vote.legislationType} ${vote.legislationNumber}`;
    result.billUrl = vote.legislationUrl || '';
  } else if (vote.bill) {
    result.billNumber = vote.bill.number || '';
    result.billTitle = vote.bill.title || '';
    result.billUrl = vote.bill.url || '';
  }

  // Extract description
  if (vote.description) {
    result.description = vote.description;
  }

  // Transform members if available
  if (vote.members && Array.isArray(vote.members)) {
    result.members = vote.members.map((member: any) => ({
      bioguideId: member.bioguideId || '',
      name: member.name || '',
      party: member.party || '',
      state: member.state || '',
      votePosition: member.votePosition || member.vote || '',
    }));
  }

  return result;
}
