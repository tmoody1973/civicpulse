'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileCheck2, ExternalLink, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RepresentativeVote {
  voteNumber: number;
  congress: number;
  session: number;
  voteDate: string;
  voteResult: string;
  voteType: string;
  votePosition: string; // Can be: Yea, Nay, Present, Not Voting, etc.
  billNumber?: string;
  billTitle?: string;
  billUrl?: string;
  voteQuestion?: string;
}

interface VotingHistoryProps {
  bioguideId: string;
  chamber: 'house' | 'senate';
  limit?: number;
}

export function VotingHistory({ bioguideId, chamber, limit = 10 }: VotingHistoryProps) {
  const [votes, setVotes] = useState<RepresentativeVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        setLoading(true);

        // Skip API call for Senators - Senate votes not available
        if (chamber === 'senate') {
          setError('Senate vote data not available via Congress.gov API');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/representatives/${bioguideId}/votes?limit=${limit}`);
        const data = await response.json();

        if (data.success) {
          setVotes(data.votes || []);
        } else {
          setError(data.error || 'Failed to load voting history');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load voting history');
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();
  }, [bioguideId, chamber, limit]);

  const getResultBadgeVariant = (result: string) => {
    if (result.toLowerCase().includes('passed') || result.toLowerCase().includes('agreed')) {
      return 'default';
    }
    if (result.toLowerCase().includes('failed') || result.toLowerCase().includes('rejected')) {
      return 'destructive';
    }
    return 'secondary';
  };

  const getVotePositionBadge = (position: string) => {
    const positionLower = position.toLowerCase();

    // Handle affirmative votes (Yea, Yes, Aye)
    if (positionLower === 'yea' || positionLower === 'yes' || positionLower === 'aye') {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">{position}</Badge>;
    }

    // Handle negative votes (Nay, No)
    if (positionLower === 'nay' || positionLower === 'no') {
      return <Badge variant="destructive">{position}</Badge>;
    }

    // Handle present
    if (positionLower === 'present') {
      return <Badge variant="secondary">{position}</Badge>;
    }

    // Handle not voting or other
    return <Badge variant="outline">{position}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5" />
            Recent Voting History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || votes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5" />
            Recent Voting History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            {error || 'No recent votes available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5" />
          Recent Voting History
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Recent House roll call votes
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {votes.map((vote) => {
          return (
            <div
              key={`${vote.congress}-${vote.session}-${vote.voteNumber}`}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {vote.billNumber && (
                      <h4 className="font-semibold text-sm">{vote.billNumber}</h4>
                    )}
                    <Badge variant={getResultBadgeVariant(vote.voteResult)} className="text-xs">
                      {vote.voteResult}
                    </Badge>
                  </div>
                  {vote.billTitle && (
                    <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">
                      {vote.billTitle}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(vote.voteDate), { addSuffix: true })} •
                    Vote #{vote.voteNumber} • Congress {vote.congress}
                  </p>
                </div>
                {/* Vote position badge */}
                <div className="flex-shrink-0">
                  {getVotePositionBadge(vote.votePosition)}
                </div>
              </div>

              {/* Vote Type */}
              {vote.voteType && (
                <p className="text-xs text-muted-foreground mb-3">
                  {vote.voteType}
                </p>
              )}

              {/* Action */}
              {vote.billUrl && (
                <div className="pt-3 border-t">
                  <a
                    href={vote.billUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View Bill Details
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          );
        })}

        {/* Note */}
        <div className="pt-4 border-t">
          <p className="text-xs text-center text-muted-foreground">
            Showing {votes.length} most recent House votes
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
