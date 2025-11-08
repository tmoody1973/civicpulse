'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PersonalizedNewsCard, type PersonalizedArticle } from '@/components/dashboard/personalized-news-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TopicImage {
  topic: string;
  imageUrl: string;
  imageAlt: string;
  photographer: string;
  photographerUrl: string;
}

interface TopicSection {
  topic: string;
  displayName: string;
  articles: PersonalizedArticle[];
  color: string;
  image?: TopicImage;
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
  limit = 10,
  showRefresh = true
}: PersonalizedNewsWidgetProps) {
  const [topicSections, setTopicSections] = useState<TopicSection[]>([]);
  const [topicImages, setTopicImages] = useState<TopicImage[]>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; latency?: number } | null>(null);

  const organizeByTopics = (articles: PersonalizedArticle[], images: TopicImage[] = []): TopicSection[] => {
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
        color: TOPIC_COLORS[topic] || 'blue',
        image: images.find(img => img.topic === topic)
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
      // CACHE VERSION: Bump this when architecture changes (e.g., Cerebras -> Brave)
      const CACHE_VERSION = 'v2-brave';
      const cacheKey = `personalized-news-${CACHE_VERSION}-${limit}`;
      const cachedData = !forceRefresh && localStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const cacheAge = Date.now() - parsed.timestamp;

          // Use cache if less than 5 minutes old
          if (cacheAge < 5 * 60 * 1000) {
            console.log(`✅ Using client-side cache (${Math.round(cacheAge / 1000)}s old)`);
            const images = parsed.topicImages || [];
            setTopicImages(images);
            const sections = organizeByTopics(parsed.articles, images);
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

      console.log('[PersonalizedNews] Fetching from:', url.toString());
      const response = await fetch(url.toString(), {
        credentials: 'include', // Send cookies for authentication
      });
      console.log('[PersonalizedNews] Response status:', response.status, 'OK:', response.ok);

      // Check response status first before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Failed to fetch personalized news';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('[PersonalizedNews] API error:', {
            status: response.status,
            error: errorMessage,
            fullData: errorData,
            errorString: JSON.stringify(errorData, null, 2)
          });
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
          console.error('[PersonalizedNews] Parse error:', {
            status: response.status,
            statusText: response.statusText,
            parseError: e
          });
        }
        throw new Error(`${errorMessage} (status: ${response.status})`);
      }

      // Safe to parse JSON for successful responses
      const data = await response.json();

      if (data.success && data.data) {
        const images = data.topicImages || [];
        setTopicImages(images);
        const sections = organizeByTopics(data.data, images);
        setTopicSections(sections);
        setCacheInfo({
          cached: data.meta?.cached || false,
          latency: data.meta?.latency
        });

        // Store in client-side cache (5 minute TTL)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            articles: data.data,
            topicImages: images,
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
    // Clear old cache versions on mount (one-time cleanup)
    const CACHE_VERSION = 'v2-brave';
    try {
      // Remove all old cache keys that don't match current version
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('personalized-news-') && !key.includes(CACHE_VERSION)) {
          console.log(`🧹 Clearing old cache: ${key}`);
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Failed to clear old cache:', e);
    }

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
    <div className="space-y-3">
      {/* Header with refresh button - Compact */}
      {showRefresh && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Personalized</span>
            {cacheInfo && cacheInfo.cached && (
              <Badge variant="secondary" className="text-xs h-5">
                Cached
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}

      {/* Topic Dropdown Filter - Compact */}
      <div className="flex items-center gap-2 mb-3">
        <label htmlFor="topic-filter" className="text-xs font-medium text-muted-foreground">
          Topic:
        </label>
        <Select
          value={activeTopicIndex.toString()}
          onValueChange={(value) => setActiveTopicIndex(parseInt(value))}
        >
          <SelectTrigger id="topic-filter" className="w-[200px] h-8 text-xs">
            <SelectValue>
              <div className="flex items-center justify-between w-full">
                <span>{activeTopic.displayName}</span>
                <Badge variant="secondary" className="ml-2 h-4 text-xs px-1.5">
                  {activeTopic.articles.length}
                </Badge>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {topicSections.map((section, index) => (
              <SelectItem key={section.topic} value={index.toString()} className="text-xs">
                <div className="flex items-center justify-between w-full gap-4">
                  <span className="font-medium">{section.displayName}</span>
                  <Badge variant="outline" className="ml-auto h-4 text-xs px-1.5">
                    {section.articles.length}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Topic Header Image - Compact */}
      {activeTopic.image && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3">
          <img
            src={activeTopic.image.imageUrl}
            alt={activeTopic.image.imageAlt}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <h2 className="text-lg font-bold text-white">{activeTopic.displayName}</h2>
          </div>
        </div>
      )}

      {/* Active Topic Articles - Compact spacing */}
      <div className="space-y-2">
        {activeTopic.articles.slice(0, 5).map((article, idx) => (
          <PersonalizedNewsCard
            key={idx}
            article={article}
          />
        ))}
      </div>

      {/* Coverage Indicator - Compact */}
      <div className="text-xs text-center pt-3 border-t text-muted-foreground">
        <p>
          <strong>{activeTopic.articles.length}</strong> article{activeTopic.articles.length !== 1 ? 's' : ''} in <strong>{activeTopic.displayName}</strong>
          {' '}• {topicSections.length} topic{topicSections.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
