'use client';

import { useState, useEffect, useRef } from 'react';
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

// ====================
// CACHING CONFIGURATION
// ====================

const CACHE_CONFIG = {
  // Cache version - increment when data structure changes
  VERSION: 'v3-persistent',

  // Cache durations
  STALE_TIME: 30 * 60 * 1000,      // 30 minutes - show cached data without indicator
  CACHE_TIME: 24 * 60 * 60 * 1000,  // 24 hours - keep in cache before deletion
  REVALIDATE_TIME: 5 * 60 * 1000,   // 5 minutes - background revalidate interval
};

// In-memory cache (survives between component mounts within same session)
const memoryCache = new Map<string, {
  data: any;
  timestamp: number;
  expiresAt: number;
}>();

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
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [cacheInfo, setCacheInfo] = useState<{
    cached: boolean;
    latency?: number;
    isStale?: boolean;
  } | null>(null);

  // Track if component is mounted
  const isMounted = useRef(true);
  // Track last fetch time to prevent duplicate fetches
  const lastFetchTime = useRef<number>(0);
  // Track background revalidation timer
  const revalidateTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const organizeByTopics = (articles: PersonalizedArticle[], images: TopicImage[] = []): TopicSection[] => {
    const sections = new Map<string, PersonalizedArticle[]>();

    articles.forEach(article => {
      article.relevantTopics?.forEach(topic => {
        if (!sections.has(topic)) {
          sections.set(topic, []);
        }
        sections.get(topic)!.push(article);
      });
    });

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

  /**
   * Get data from multi-layer cache
   * Layer 1: Memory cache (instant)
   * Layer 2: localStorage (fast)
   */
  const getCachedData = (cacheKey: string) => {
    const now = Date.now();

    // Layer 1: Check memory cache first (fastest)
    const memCache = memoryCache.get(cacheKey);
    if (memCache && memCache.expiresAt > now) {
      const age = now - memCache.timestamp;
      const isStale = age > CACHE_CONFIG.STALE_TIME;
      console.log(`✅ Using memory cache (${Math.round(age / 1000)}s old, ${isStale ? 'stale' : 'fresh'})`);
      return { data: memCache.data, age, source: 'memory', isStale };
    }

    // Layer 2: Check localStorage (fast)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = now - parsed.timestamp;

        // Check if cache is still valid
        if (age < CACHE_CONFIG.CACHE_TIME) {
          const isStale = age > CACHE_CONFIG.STALE_TIME;

          // Update memory cache
          memoryCache.set(cacheKey, {
            data: parsed,
            timestamp: parsed.timestamp,
            expiresAt: parsed.timestamp + CACHE_CONFIG.CACHE_TIME
          });

          console.log(`✅ Using localStorage cache (${Math.round(age / 1000)}s old, ${isStale ? 'stale' : 'fresh'})`);
          return { data: parsed, age, source: 'localStorage', isStale };
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached news:', e);
    }

    return null;
  };

  /**
   * Set data in multi-layer cache
   */
  const setCachedData = (cacheKey: string, data: any) => {
    const now = Date.now();
    const cacheEntry = {
      ...data,
      timestamp: now
    };

    try {
      // Set in localStorage
      localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));

      // Set in memory cache
      memoryCache.set(cacheKey, {
        data: cacheEntry,
        timestamp: now,
        expiresAt: now + CACHE_CONFIG.CACHE_TIME
      });

      console.log('💾 Stored in cache (memory + localStorage)');
    } catch (e) {
      console.warn('Failed to cache news:', e);
    }
  };

  /**
   * Fetch news with stale-while-revalidate pattern
   */
  const fetchNews = async (forceRefresh = false, isBackgroundRevalidate = false) => {
    const cacheKey = `personalized-news-${CACHE_CONFIG.VERSION}-${limit}`;
    const now = Date.now();

    // Prevent duplicate fetches within 1 second
    if (!forceRefresh && now - lastFetchTime.current < 1000) {
      console.log('⏭️  Skipping duplicate fetch (within 1 second)');
      return;
    }

    // If background revalidate, don't show loading states
    if (!isBackgroundRevalidate) {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }

    setError(null);

    try {
      // Step 1: Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedResult = getCachedData(cacheKey);

        if (cachedResult) {
          const { data, age, source, isStale } = cachedResult;

          // Show cached data immediately
          const images = data.topicImages || [];
          setTopicImages(images);
          const sections = organizeByTopics(data.articles, images);
          setTopicSections(sections);
          setCacheInfo({
            cached: true,
            latency: Math.round(age / 1000),
            isStale
          });
          setLoading(false);

          // If data is stale, fetch in background to update cache
          if (isStale && !isBackgroundRevalidate) {
            console.log('📡 Data is stale, fetching fresh data in background...');
            setTimeout(() => fetchNews(false, true), 100);
          }

          // If not stale and not background revalidate, we're done
          if (!isStale) {
            return;
          }

          // Continue to fetch fresh data in background if stale
        }
      }

      // Step 2: Start job via queue
      lastFetchTime.current = now;

      console.log(`[PersonalizedNews] Starting job${isBackgroundRevalidate ? ' (background)' : ''}...`);

      // Start the job
      const queueResponse = await fetch('/api/news/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          limit,
          forceRefresh,
        }),
      });

      if (!queueResponse.ok) {
        let errorMessage = 'Failed to queue news generation';
        try {
          const errorData = await queueResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = queueResponse.statusText || errorMessage;
        }
        throw new Error(`${errorMessage} (status: ${queueResponse.status})`);
      }

      const queueData = await queueResponse.json();

      // If cached data is returned immediately, use it
      if (queueData.cached && queueData.articles) {
        const images = queueData.topicImages || [];
        setTopicImages(images);
        const sections = organizeByTopics(queueData.articles, images);
        setTopicSections(sections);
        setCacheInfo({
          cached: true,
          latency: 0,
          isStale: false
        });

        // Store in cache
        setCachedData(cacheKey, {
          articles: queueData.articles,
          topicImages: images
        });

        setProgress(100);
        return;
      }

      // Poll for job status
      const jobId = queueData.jobId;
      console.log(`📊 Job ${jobId} started, polling for status...`);
      setProgress(0);
      setProgressMessage('Starting news generation...');

      const pollInterval = 2000; // Poll every 2 seconds
      const maxPolls = 30; // Max 60 seconds (30 polls × 2s)
      let pollCount = 0;

      while (pollCount < maxPolls) {
        if (!isMounted.current) {
          console.log('Component unmounted, stopping poll');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        pollCount++;

        const statusResponse = await fetch(`/api/news/status/${jobId}`, {
          credentials: 'include',
        });

        if (!statusResponse.ok) {
          console.error('Status check failed:', statusResponse.status);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`📊 Job ${jobId} status:`, statusData.status, `(${statusData.progress}%)`);

        // Update progress
        if (typeof statusData.progress === 'number') {
          setProgress(statusData.progress);

          // Update progress message based on progress
          if (statusData.progress < 25) {
            setProgressMessage('Fetching user profile...');
          } else if (statusData.progress < 50) {
            setProgressMessage('Searching for news...');
          } else if (statusData.progress < 75) {
            setProgressMessage('Fetching topic images...');
          } else if (statusData.progress < 100) {
            setProgressMessage('Saving results...');
          }
        }

        // Check if job is completed
        if (statusData.status === 'completed' && statusData.result) {
          console.log('✅ Job completed successfully');
          setProgress(100);
          setProgressMessage('Done!');

          const result = statusData.result;
          const images = result.topicImages || [];
          setTopicImages(images);
          const sections = organizeByTopics(result.articles, images);
          setTopicSections(sections);
          setCacheInfo({
            cached: false,
            latency: result.processingTime,
            isStale: false
          });

          // Store in cache
          setCachedData(cacheKey, {
            articles: result.articles,
            topicImages: images
          });

          return;
        }

        // Check if job failed
        if (statusData.status === 'failed') {
          throw new Error(statusData.failedReason || 'Job failed');
        }
      }

      // If we get here, job timed out
      throw new Error('Job timed out after 60 seconds');
    } catch (error) {
      console.error('Error fetching personalized news:', error);

      // If background revalidate fails, don't show error (user already has cached data)
      if (!isBackgroundRevalidate) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    } finally {
      if (!isBackgroundRevalidate) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  /**
   * Setup background revalidation
   */
  const setupBackgroundRevalidation = () => {
    // Clear existing timer
    if (revalidateTimer.current) {
      clearInterval(revalidateTimer.current);
    }

    // Revalidate every 5 minutes in background
    revalidateTimer.current = setInterval(() => {
      if (isMounted.current) {
        console.log('🔄 Background revalidation...');
        fetchNews(false, true);
      }
    }, CACHE_CONFIG.REVALIDATE_TIME);
  };

  useEffect(() => {
    // Clear old cache versions on mount
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('personalized-news-') && !key.includes(CACHE_CONFIG.VERSION)) {
          console.log(`🧹 Clearing old cache: ${key}`);
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Failed to clear old cache:', e);
    }

    // Initial fetch
    fetchNews();

    // Setup background revalidation
    setupBackgroundRevalidation();

    // Cleanup
    return () => {
      isMounted.current = false;
      if (revalidateTimer.current) {
        clearInterval(revalidateTimer.current);
      }
    };
  }, [limit]);

  const handleRefresh = () => {
    fetchNews(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm mb-2">
          {progressMessage || 'Finding news tailored for you...'}
        </p>
        {progress > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {progress}% complete
            </p>
          </div>
        )}
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
                {cacheInfo.isStale ? 'Updating...' : 'Cached'}
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
