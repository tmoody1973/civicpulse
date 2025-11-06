'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PersonalizedNewsCard, type PersonalizedArticle } from '@/components/dashboard/personalized-news-card';
import { cn } from '@/lib/utils';

interface TopicSection {
  topic: string;
  displayName: string;
  articles: PersonalizedArticle[];
  color: string;
}

const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  'healthcare': 'Healthcare',
  'education': 'Education',
  'science': 'Science',
  'technology': 'Technology',
  'climate': 'Climate',
  'economy': 'Economy',
  'business': 'Business',
  'taxes': 'Taxes',
  'immigration': 'Immigration',
  'housing': 'Housing',
  'defense': 'Defense',
  'transportation': 'Transportation',
  'agriculture': 'Agriculture',
  'social': 'Social Services',
  'civil-rights': 'Civil Rights'
};

const TOPIC_COLORS: Record<string, string> = {
  'healthcare': 'blue',
  'education': 'orange',
  'science': 'green',
  'technology': 'cyan',
  'climate': 'emerald',
  'economy': 'purple',
  'business': 'violet',
  'taxes': 'red',
  'immigration': 'yellow',
  'housing': 'lime',
  'defense': 'amber',
  'transportation': 'slate',
  'agriculture': 'green',
  'social': 'orange',
  'civil-rights': 'red'
};

interface PersonalizedNewsWidgetProps {
  limit?: number;
  showRefresh?: boolean;
}

export function PersonalizedNewsWidget({
  limit = 20,
  showRefresh = true
}: PersonalizedNewsWidgetProps) {
  const [topicSections, setTopicSections] = useState<TopicSection[]>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; latency?: number } | null>(null);

  const organizeByTopics = (articles: PersonalizedArticle[]): TopicSection[] => {
    const sections = new Map<string, PersonalizedArticle[]>();

    // Group articles by topic
    articles.forEach(article => {
      article.relevantTopics?.forEach(topic => {
        if (!sections.has(topic)) {
          sections.set(topic, []);
        }
        sections.get(topic)!.push(article);
      });
    });

    // Convert to array and sort by article count (most articles first)
    return Array.from(sections.entries())
      .map(([topic, articles]) => ({
        topic,
        displayName: TOPIC_DISPLAY_NAMES[topic] || topic,
        articles,
        color: TOPIC_COLORS[topic] || 'blue'
      }))
      .sort((a, b) => b.articles.length - a.articles.length);
  };

  const fetchNews = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      // Check client-side cache first (localStorage)
      const cacheKey = `personalized-news-${limit}`;
      const cachedData = !forceRefresh && localStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const cacheAge = Date.now() - parsed.timestamp;

          // Use cache if less than 5 minutes old
          if (cacheAge < 5 * 60 * 1000) {
            console.log(`✅ Using client-side cache (${Math.round(cacheAge / 1000)}s old)`);
            const sections = organizeByTopics(parsed.articles);
            setTopicSections(sections);
            setCacheInfo({
              cached: true,
              latency: Math.round(cacheAge / 1000)
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse cached news:', e);
          localStorage.removeItem(cacheKey);
        }
      }

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
        const sections = organizeByTopics(data.data);
        setTopicSections(sections);
        setCacheInfo({
          cached: data.meta?.cached || false,
          latency: data.meta?.latency
        });

        // Store in client-side cache (5 minute TTL)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            articles: data.data,
            timestamp: Date.now()
          }));
          console.log('💾 Stored in client-side cache (5min TTL)');
        } catch (e) {
          console.warn('Failed to cache news:', e);
        }
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

  if (topicSections.length === 0) {
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

  const activeTopic = topicSections[activeTopicIndex];
  const totalArticles = topicSections.reduce((sum, t) => sum + t.articles.length, 0);

  return (
    <div className="space-y-6">
      {/* Header with refresh button and cache indicator */}
      {showRefresh && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Personalized for your interests</span>
            </div>
            {cacheInfo && cacheInfo.cached && (
              <Badge variant="secondary" className="text-xs">
                Cached {cacheInfo.latency && `• ${cacheInfo.latency}ms`}
              </Badge>
            )}
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

      {/* Topic Pills (Horizontal Scroll) */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {topicSections.map((section, index) => (
          <button
            key={section.topic}
            onClick={() => setActiveTopicIndex(index)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              "flex items-center gap-2 flex-shrink-0",
              activeTopicIndex === index
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {section.displayName}
            <Badge
              variant="outline"
              className={cn(
                "ml-1 px-1.5 py-0 text-xs",
                activeTopicIndex === index && "bg-primary-foreground/20 border-primary-foreground/30"
              )}
            >
              {section.articles.length}
            </Badge>
          </button>
        ))}
      </div>

      {/* Active Topic Articles */}
      <div className="space-y-4">
        {activeTopic.articles.map((article, idx) => (
          <PersonalizedNewsCard
            key={idx}
            article={article}
          />
        ))}
      </div>

      {/* Coverage Indicator */}
      <div className="text-sm text-center space-y-2 pt-4 border-t">
        <p className="text-muted-foreground">
          Showing <strong>{activeTopic.articles.length}</strong> article{activeTopic.articles.length !== 1 ? 's' : ''}
          {' '}in <strong>{activeTopic.displayName}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          {topicSections.length} topic{topicSections.length !== 1 ? 's' : ''} • {totalArticles} total article{totalArticles !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
