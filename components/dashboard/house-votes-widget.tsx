'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ThumbsUp, ThumbsDown, Eye, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VoteResult {
  voteNumber: number;
  congress: number;
  session: number;
  chamber: string;
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
}

export function HouseVotesWidget() {
  const [votes, setVotes] = useState<VoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/votes/house?limit=10');
        const data = await response.json();

        if (data.success) {
          setVotes(data.votes || []);
        } else {
          setError(data.error || 'Failed to load votes');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load House votes');
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();
  }, []);

  const getResultBadgeVariant = (result: string) => {
    if (result.toLowerCase().includes('passed') || result.toLowerCase().includes('agreed')) {
      return 'default';
    }
    if (result.toLowerCase().includes('failed') || result.toLowerCase().includes('rejected')) {
      return 'destructive';
    }
    return 'secondary';
  };

  const formatVoteTitle = (vote: VoteResult): string => {
    if (vote.billNumber && vote.billTitle) {
      return `${vote.billNumber}: ${vote.billTitle}`;
    }
    if (vote.voteQuestion) {
      return vote.voteQuestion;
    }
    return `Vote #${vote.voteNumber}`;
  };

  const getVotePercentages = (vote: VoteResult) => {
    const total = vote.yeas + vote.nays + vote.present + vote.notVoting;
    if (total === 0) return { yeasPct: 0, naysPct: 0 };

    return {
      yeasPct: Math.round((vote.yeas / total) * 100),
      naysPct: Math.round((vote.nays / total) * 100),
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5" />
            Recent House Votes
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
            <ThumbsUp className="w-5 h-5" />
            Recent House Votes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
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
          <ThumbsUp className="w-5 h-5" />
          Recent House Votes
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Latest roll call votes from the U.S. House of Representatives
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {votes.map((vote) => {
          const { yeasPct, naysPct } = getVotePercentages(vote);
          const voteTitle = formatVoteTitle(vote);

          return (
            <div
              key={`${vote.congress}-${vote.session}-${vote.voteNumber}`}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                    {voteTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(vote.voteDate), { addSuffix: true })} •
                    Vote #{vote.voteNumber} • Congress {vote.congress}
                  </p>
                </div>
                <Badge variant={getResultBadgeVariant(vote.voteResult)}>
                  {vote.voteResult}
                </Badge>
              </div>

              {/* Vote Type */}
              {vote.voteType && (
                <p className="text-xs text-muted-foreground mb-3">
                  {vote.voteType}
                </p>
              )}

              {/* Vote Breakdown */}
              <div className="space-y-2">
                {/* Progress Bar */}
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  <div
                    className="bg-green-500"
                    style={{ width: `${yeasPct}%` }}
                    title={`Yes: ${yeasPct}%`}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${naysPct}%` }}
                    title={`No: ${naysPct}%`}
                  />
                </div>

                {/* Vote Counts */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-green-500" />
                      <span className="font-medium">{vote.yeas}</span>
                      <span className="text-muted-foreground">Yes ({yeasPct}%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3 text-red-500" />
                      <span className="font-medium">{vote.nays}</span>
                      <span className="text-muted-foreground">No ({naysPct}%)</span>
                    </div>
                  </div>
                  {(vote.present > 0 || vote.notVoting > 0) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {vote.present > 0 && (
                        <span>Present: {vote.present}</span>
                      )}
                      {vote.notVoting > 0 && (
                        <span>Not Voting: {vote.notVoting}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {vote.billUrl && (
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => window.open(vote.billUrl, '_blank')}
                  >
                    <Eye className="w-3 h-3" />
                    View Bill Details
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* View More */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open('https://clerk.house.gov/Votes', '_blank')}
          >
            View All House Votes
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
