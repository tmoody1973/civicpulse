'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonalizedNewsCard, type PersonalizedArticle } from '@/components/dashboard/personalized-news-card';

interface PersonalizedNewsWidgetProps {
  limit?: number;
  showRefresh?: boolean;
}

export function PersonalizedNewsWidget({
  limit = 10,
  showRefresh = true
}: PersonalizedNewsWidgetProps) {
  const [articles, setArticles] = useState<PersonalizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const url = new URL('/api/news/personalized', window.location.origin);
      url.searchParams.set('limit', String(limit));
      if (forceRefresh) {
        url.searchParams.set('refresh', 'true');
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch personalized news');
      }

      if (data.success && data.data) {
        setArticles(data.data);
      }
    } catch (error) {
      console.error('Error fetching personalized news:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [limit]);

  const handleRefresh = () => {
    fetchNews(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Finding news tailored for you...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => fetchNews()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No personalized news yet</p>
        <p className="text-sm">
          Update your interests in settings to get personalized news articles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      {showRefresh && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Personalized for your interests</span>
          </div>
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
        </div>
      )}

      {/* Single-column stack of full-width articles */}
      <div className="space-y-4">
        {articles.map((article, index) => (
          <PersonalizedNewsCard
            key={index}
            article={article}
          />
        ))}
      </div>
    </div>
  );
}
