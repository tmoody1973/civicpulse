'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Loader2, Phone, MapPin, Twitter, Facebook, Youtube, Instagram } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BillCard } from '@/components/dashboard/bill-card';
import type { Bill } from '@/components/dashboard/bill-card';
import { Representative } from '@/components/dashboard/representative-card';
import { NewsFeedCard } from '@/components/dashboard/news-feed-card';
import { FeedSettings } from '@/components/dashboard/feed-settings';
import { getFeedsForInterests } from '@/lib/rss/the-hill-feeds';
import { PodcastPlayer, type PodcastEpisode } from '@/components/podcast/player';
import { EpisodeCard } from '@/components/podcast/episode-card';

interface NewsArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  source: string;
  imageUrl?: string;
}

export default function DashboardPage() {
  const router = useRouter();

  // Mock user interests (would come from user preferences in real app)
  const userInterests = ['healthcare', 'technology', 'defense', 'finance', 'transportation'];

  // Get default feeds based on interests (Senate + House + policy feeds)
  const defaultFeeds = getFeedsForInterests(userInterests);
  const defaultFeedIds = defaultFeeds.map(feed => feed.id);

  // Track selected feeds (in real app, this would sync with user preferences)
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>(defaultFeedIds);

  // Fetch real data from APIs
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ state: string; district: number; city?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Podcast state
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);
  const [currentPodcast, setCurrentPodcast] = useState<PodcastEpisode | null>(null);
  const [generatingPodcast, setGeneratingPodcast] = useState(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);

  // Check authentication and onboarding status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (!data.user) {
          // User not logged in, redirect to login
          router.push('/auth/login');
        } else if (!data.user.onboardingCompleted) {
          // User logged in but hasn't completed onboarding
          console.log('⚠️  Onboarding not completed, redirecting...');
          router.push('/onboarding');
        } else {
          // User authenticated and onboarded
          setAuthChecking(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      }
    };
    checkAuth();
  }, [router]);

  // Fetch news articles when component mounts or when selected feeds change
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setNewsLoading(true);
        const feedsParam = selectedFeedIds.join(',');
        const response = await fetch(`/api/news?feeds=${feedsParam}&limit=20`);
        const data = await response.json();

        if (data.success && data.data) {
          setNewsArticles(data.data);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [selectedFeedIds]);

  // Group articles by category for organized display
  const congressionalNews = newsArticles.filter(article =>
    ['Senate', 'House', 'Administration', 'Campaign'].includes(article.source)
  );

  const policyNews = newsArticles.filter(article =>
    ['Healthcare', 'Defense', 'Energy & Environment', 'Finance', 'Technology', 'Transportation', 'International'].includes(article.source)
  );

  // Fetch representatives and bills on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user location from localStorage (set during onboarding)
        const userLocationStr = localStorage.getItem('userLocation');
        const location = userLocationStr ? JSON.parse(userLocationStr) : { state: 'CA', district: 12 };

        // Store in state for display
        setUserLocation(location);

        // Fetch representatives from database (not Congress.gov API)
        const repsResponse = await fetch(`/api/representatives/db?state=${location.state}&district=${location.district}`);
        const repsData = await repsResponse.json();

        if (repsData.success && repsData.data.all) {
          // Map database data to Representative interface with full contact info
          const mappedReps: Representative[] = repsData.data.all.map((rep: any) => ({
            id: rep.bioguideId,
            name: rep.name,
            party: (rep.party === 'Democrat' || rep.party === 'Democratic') ? 'Democrat' as const : rep.party === 'Republican' ? 'Republican' as const : 'Independent' as const,
            chamber: rep.chamber as 'Senate' | 'House',
            state: rep.state,
            district: rep.district?.toString(),
            photoUrl: rep.imageUrl,
            websiteUrl: rep.websiteUrl || rep.officialUrl,
            officePhone: rep.phone,
            officeAddress: rep.officeAddress,
            twitterHandle: rep.twitterHandle,
            facebookUrl: rep.facebookUrl,
            youtubeUrl: rep.youtubeUrl,
            instagramHandle: rep.instagramHandle,
            committees: [], // Would need separate API call for committee membership
          }));
          setRepresentatives(mappedReps);
        }

        // Fetch recent bills
        const billsResponse = await fetch('/api/bills?limit=10');
        const billsData = await billsResponse.json();

        if (billsData.success && billsData.data) {
          // Map Congress.gov API data to Bill interface
          const mappedBills: Bill[] = billsData.data.map((bill: any) => ({
            id: `${bill.congress}-${bill.billType}-${bill.billNumber}`,
            number: `${bill.billType.toUpperCase()}. ${bill.billNumber}`,
            congress: bill.congress,
            title: bill.title,
            summary: bill.summary || 'No summary available',
            status: 'introduced' as const, // Default status, could be enhanced later
            issueCategories: [], // Would come from bill metadata/classification
            impactScore: 0, // Would come from AI analysis
            lastAction: bill.latestActionText || 'No recent action',
            lastActionDate: bill.latestActionDate || '',
            // Sponsor information for linking to representative pages
            sponsorName: bill.sponsorName,
            sponsorBioguideId: bill.sponsorBioguideId,
            sponsorParty: bill.sponsorParty,
            sponsorState: bill.sponsorState,
            introducedDate: bill.introducedDate,
          }));
          setBills(mappedBills);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFeedSettingsSave = (feedIds: string[]) => {
    setSelectedFeedIds(feedIds);
    // In real app: save to user preferences via API
    console.log('Saved feed preferences:', feedIds);
  };

  const handleGeneratePodcast = async (type: 'daily' | 'weekly') => {
    setGeneratingPodcast(true);
    setPodcastError(null);

    try {
      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          type,
          useTestData: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate podcast');
      }

      // Create podcast episode from response
      const newEpisode: PodcastEpisode = {
        audioUrl: data.audioUrl,
        title: `${type === 'daily' ? 'Daily Brief' : 'Weekly Deep Dive'} - ${new Date().toLocaleDateString()}`,
        type,
        duration: data.duration,
        billsCovered: data.billsCovered,
        transcript: data.transcript,
        generatedAt: new Date(),
      };

      // Add to podcasts list
      setPodcasts((prev) => [newEpisode, ...prev]);

      // Auto-play the new podcast
      setCurrentPodcast(newEpisode);
    } catch (error) {
      setPodcastError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error generating podcast:', error);
    } finally {
      setGeneratingPodcast(false);
    }
  };

  // Separate senators and house rep
  const senators = representatives.filter(r => r.chamber === 'Senate');
  const houseRep = representatives.filter(r => r.chamber === 'House')[0];

  // Show loading state while checking authentication
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Feed settings - moved to top right */}
        <div className="flex justify-end mb-4">
          <FeedSettings
            selectedFeedIds={selectedFeedIds}
            onSave={handleFeedSettingsSave}
          />
        </div>
        {/* Welcome Banner */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">Welcome to HakiVo</h1>
          <p className="text-muted-foreground">
            Your personalized source for congressional updates and legislative news
          </p>
        </div>

        {/* Your Representatives - Horizontal Cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold">Your Representatives</h2>
            {userLocation && (
              <span className="text-sm text-muted-foreground">
                {userLocation.state} • District {userLocation.district}
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading representatives...</div>
          ) : representatives.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {senators.map((senator) => (
                <Link key={senator.id} href={`/representatives/${senator.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <img
                          src={senator.photoUrl || `https://www.congress.gov/img/member/noimage.jpg`}
                          alt={senator.name}
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{senator.name}</h3>
                            <Badge variant={senator.party === 'Democrat' ? 'default' : senator.party === 'Republican' ? 'destructive' : 'secondary'} className="flex-shrink-0 text-xs">
                              {senator.party.charAt(0)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">U.S. Senator</p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1.5 mb-3">
                        {senator.officePhone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{senator.officePhone}</span>
                          </div>
                        )}
                        {senator.officeAddress && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{senator.officeAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Social Media */}
                      {(senator.twitterHandle || senator.facebookUrl || senator.youtubeUrl || senator.instagramHandle) && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {senator.twitterHandle && (
                            <a
                              href={`https://twitter.com/${senator.twitterHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Twitter className="w-4 h-4" />
                            </a>
                          )}
                          {senator.facebookUrl && (
                            <a
                              href={senator.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Facebook className="w-4 h-4" />
                            </a>
                          )}
                          {senator.youtubeUrl && (
                            <a
                              href={senator.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Youtube className="w-4 h-4" />
                            </a>
                          )}
                          {senator.instagramHandle && (
                            <a
                              href={`https://instagram.com/${senator.instagramHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Instagram className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {houseRep && (
                <Link href={`/representatives/${houseRep.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <img
                          src={houseRep.photoUrl || `https://www.congress.gov/img/member/noimage.jpg`}
                          alt={houseRep.name}
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{houseRep.name}</h3>
                            <Badge variant={houseRep.party === 'Democrat' ? 'default' : houseRep.party === 'Republican' ? 'destructive' : 'secondary'} className="flex-shrink-0 text-xs">
                              {houseRep.party.charAt(0)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">U.S. Representative • District {houseRep.district}</p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1.5 mb-3">
                        {houseRep.officePhone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{houseRep.officePhone}</span>
                          </div>
                        )}
                        {houseRep.officeAddress && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{houseRep.officeAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Social Media */}
                      {(houseRep.twitterHandle || houseRep.facebookUrl || houseRep.youtubeUrl || houseRep.instagramHandle) && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {houseRep.twitterHandle && (
                            <a
                              href={`https://twitter.com/${houseRep.twitterHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Twitter className="w-4 h-4" />
                            </a>
                          )}
                          {houseRep.facebookUrl && (
                            <a
                              href={houseRep.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Facebook className="w-4 h-4" />
                            </a>
                          )}
                          {houseRep.youtubeUrl && (
                            <a
                              href={houseRep.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Youtube className="w-4 h-4" />
                            </a>
                          )}
                          {houseRep.instagramHandle && (
                            <a
                              href={`https://instagram.com/${houseRep.instagramHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Instagram className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No representatives found</div>
          )}
        </div>

        {/* Two-Column Newspaper Layout */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* LEFT COLUMN - News & Updates (50%) */}
          <div className="space-y-6">
            {/* Hero News Story */}
            {!newsLoading && newsArticles.length > 0 && (
              <section>
                <div className="border-b-2 border-primary mb-4 pb-2">
                  <h2 className="text-2xl font-serif font-bold">Today's Headlines</h2>
                </div>
                <NewsFeedCard article={newsArticles[0]} featured />
              </section>
            )}

            {/* Top Stories Grid */}
            {!newsLoading && newsArticles.length > 1 && (
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newsArticles.slice(1, 5).map((article, index) => (
                    <NewsFeedCard key={index} article={article} />
                  ))}
                </div>
              </section>
            )}

            {/* Congressional News Section */}
            {congressionalNews.length > 0 && (
              <section>
                <div className="border-b-2 border-blue-500 mb-4 pb-2">
                  <h2 className="text-xl font-serif font-bold">Congressional Updates</h2>
                  <p className="text-sm text-muted-foreground">Latest from the Senate and House</p>
                </div>
                <div className="space-y-3">
                  {congressionalNews.slice(0, 5).map((article, index) => (
                    <a
                      key={index}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border-b pb-3 last:border-0 hover:bg-muted/50 -mx-2 px-2 py-2 rounded transition-colors"
                    >
                      <h3 className="font-semibold text-sm mb-1 hover:text-primary">{article.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{article.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">{article.source}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{new Date(article.pubDate).toLocaleDateString()}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Policy News Section */}
            {policyNews.length > 0 && (
              <section>
                <div className="border-b-2 border-green-500 mb-4 pb-2">
                  <h2 className="text-xl font-serif font-bold">Policy & Issues</h2>
                  <p className="text-sm text-muted-foreground">Healthcare, Environment, Economy & More</p>
                </div>
                <div className="space-y-3">
                  {policyNews.slice(0, 5).map((article, index) => (
                    <a
                      key={index}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border-b pb-3 last:border-0 hover:bg-muted/50 -mx-2 px-2 py-2 rounded transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="flex-shrink-0 text-xs">
                          {article.source}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1 hover:text-primary">{article.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{article.description}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {newsLoading && (
              <div className="text-center py-12 text-muted-foreground">Loading news...</div>
            )}
          </div>

          {/* RIGHT COLUMN - Bills & Podcasts (50%) */}
          <div className="space-y-6">
            {/* Generate Podcast Section */}
            <section>
              <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">AI Podcast Briefs</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get the latest legislation in audio format
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {podcastError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-800">{podcastError}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => handleGeneratePodcast('daily')}
                    disabled={generatingPodcast}
                    className="w-full"
                    size="sm"
                  >
                    {generatingPodcast ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Radio className="w-4 h-4 mr-2" />
                    )}
                    Generate Daily Brief (3-4 min)
                  </Button>

                  {podcasts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Recent Episodes</p>
                      {podcasts.slice(0, 2).map((episode, index) => (
                        <EpisodeCard
                          key={index}
                          episode={episode}
                          onPlay={() => setCurrentPodcast(episode)}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Active Legislation */}
            <section>
              <div className="border-b-2 border-orange-500 mb-4 pb-2">
                <h2 className="text-xl font-serif font-bold">Active Legislation</h2>
                <p className="text-sm text-muted-foreground">New bills in Congress</p>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : bills.length > 0 ? (
                <div className="space-y-4">
                  {bills.slice(0, 6).map((bill) => (
                    <BillCard key={bill.id} bill={bill} compact />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No bills found</div>
              )}
            </section>

            {/* Quick Facts */}
            <section>
              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">This Week in Congress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">New Bills</span>
                    <span className="font-semibold">{bills.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">News Articles</span>
                    <span className="font-semibold">{newsArticles.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your Podcasts</span>
                    <span className="font-semibold">{podcasts.length}</span>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>

        {/* Spacer when player is visible to prevent content from being hidden */}
        {currentPodcast && <div className="h-32 sm:h-24" aria-hidden="true" />}
      </main>

      {/* Podcast Player (Fixed Bottom) */}
      {currentPodcast && (
        <PodcastPlayer
          episode={currentPodcast}
          onClose={() => setCurrentPodcast(null)}
        />
      )}
    </div>
  );
}
