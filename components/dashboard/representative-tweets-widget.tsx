'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Twitter, ExternalLink, Heart, Repeat, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Tweet {
  id: string;
  text: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  publishedAt: string;
  url: string;
  media?: {
    type: 'photo' | 'video';
    url: string;
    thumbnailUrl?: string;
  }[];
  stats?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
}

interface RepresentativeTweets {
  representative: {
    id: string;
    name: string;
    twitterHandle: string;
    chamber: 'Senate' | 'House';
    photoUrl?: string;
  };
  tweets: Tweet[];
}

interface RepresentativeTweetsWidgetProps {
  limit?: number;
  showRefresh?: boolean;
}

export function RepresentativeTweetsWidget({
  limit = 5,
  showRefresh = true
}: RepresentativeTweetsWidgetProps) {
  const [data, setData] = useState<RepresentativeTweets[]>([]);
  const [activeRepIndex, setActiveRepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTweets = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const url = new URL('/api/representatives/tweets', window.location.origin);
      url.searchParams.set('limit', String(limit));
      if (forceRefresh) {
        url.searchParams.set('refresh', 'true');
      }

      const response = await fetch(url.toString());
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch tweets');
      }

      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching tweets:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTweets();
  }, [limit]);

  const handleRefresh = () => {
    fetchTweets(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Loading recent tweets...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => fetchTweets()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Twitter className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No tweets available</p>
          <p className="text-sm">
            Your representatives don't have Twitter accounts or tweets available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeRep = data[activeRepIndex];
  const totalTweets = data.reduce((sum, r) => sum + r.tweets.length, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            Representative Tweets
          </CardTitle>
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Representative Tabs */}
        {data.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {data.map((repData, index) => (
              <button
                key={repData.representative.id}
                onClick={() => setActiveRepIndex(index)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  "flex items-center gap-2 flex-shrink-0",
                  activeRepIndex === index
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={repData.representative.photoUrl} />
                  <AvatarFallback>{repData.representative.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                {repData.representative.name.split(' ')[1] || repData.representative.name}
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-1 px-1.5 py-0 text-xs",
                    activeRepIndex === index && "bg-primary-foreground/20 border-primary-foreground/30"
                  )}
                >
                  {repData.tweets.length}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* Tweets */}
        <div className="space-y-4">
          {activeRep.tweets.map((tweet) => (
            <div
              key={tweet.id}
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {/* Tweet Header */}
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activeRep.representative.photoUrl} />
                  <AvatarFallback>{activeRep.representative.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{activeRep.representative.name}</p>
                    <a
                      href={`https://twitter.com/${tweet.author.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      @{tweet.author.username}
                    </a>
                    <Badge variant="secondary" className="text-xs">
                      {activeRep.representative.chamber}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tweet.publishedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Tweet Text */}
              <p className="text-sm mb-3 whitespace-pre-wrap">{tweet.text}</p>

              {/* Tweet Media */}
              {tweet.media && tweet.media.length > 0 && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  <img
                    src={tweet.media[0].url}
                    alt="Tweet media"
                    className="w-full max-h-64 object-cover"
                  />
                </div>
              )}

              {/* Tweet Actions */}
              <div className="flex items-center gap-4 text-muted-foreground">
                {tweet.stats?.replies !== undefined && (
                  <div className="flex items-center gap-1 text-xs">
                    <MessageCircle className="h-4 w-4" />
                    {tweet.stats.replies}
                  </div>
                )}
                {tweet.stats?.retweets !== undefined && (
                  <div className="flex items-center gap-1 text-xs">
                    <Repeat className="h-4 w-4" />
                    {tweet.stats.retweets}
                  </div>
                )}
                {tweet.stats?.likes !== undefined && (
                  <div className="flex items-center gap-1 text-xs">
                    <Heart className="h-4 w-4" />
                    {tweet.stats.likes}
                  </div>
                )}
                <a
                  href={tweet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs hover:text-primary transition-colors"
                >
                  View on X
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-sm text-center pt-4 border-t text-muted-foreground">
          Showing {activeRep.tweets.length} recent tweet{activeRep.tweets.length !== 1 ? 's' : ''}
          {' '}from <strong>{activeRep.representative.name}</strong>
          {data.length > 1 && (
            <span className="block text-xs mt-1">
              {data.length} representative{data.length !== 1 ? 's' : ''} • {totalTweets} total tweet{totalTweets !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
