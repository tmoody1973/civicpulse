'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, Users, TrendingUp, Newspaper, Settings, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BillCard } from '@/components/dashboard/bill-card';
import { RepresentativeCard } from '@/components/dashboard/representative-card';
import { NewsFeedCard } from '@/components/dashboard/news-feed-card';
import { FeedSettings } from '@/components/dashboard/feed-settings';
import { MOCK_BILLS, MOCK_REPRESENTATIVES, MOCK_NEWS_ARTICLES } from '@/lib/data/mock-data';
import { getFeedsForInterests } from '@/lib/rss/the-hill-feeds';

export default function DashboardPage() {
  // Mock user interests (would come from user preferences in real app)
  const userInterests = ['healthcare', 'climate', 'education'];

  // Get default feeds based on interests (Senate + House + policy feeds)
  const defaultFeeds = getFeedsForInterests(userInterests);
  const defaultFeedIds = defaultFeeds.map(feed => feed.id);

  // Track selected feeds (in real app, this would sync with user preferences)
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>(defaultFeedIds);

  const handleFeedSettingsSave = (feedIds: string[]) => {
    setSelectedFeedIds(feedIds);
    // In real app: save to user preferences via API
    console.log('Saved feed preferences:', feedIds);
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Civic Pulse"
                className="h-8 sm:h-10 w-auto"
              />
            </div>
            <nav className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                My Bills
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                Representatives
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Welcome message */}
        <div className="mb-6 sm:mb-8 bg-primary/10 border border-primary/20 rounded-lg p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">Welcome to Civic Pulse!</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Tracking {userInterests.length} policy areas and showing news from The Hill based on your interests.
              </p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{MOCK_BILLS.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Bills Tracked</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{MOCK_REPRESENTATIVES.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Your Reps</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Newspaper className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{MOCK_NEWS_ARTICLES.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">News Today</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Headphones className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">0</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Podcasts</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main content tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Congressional News from The Hill */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl">Latest from The Hill</CardTitle>
                  <FeedSettings
                    selectedFeedIds={selectedFeedIds}
                    onSave={handleFeedSettingsSave}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Showing {selectedFeedIds.length} feeds: Senate, House, and policy areas
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {MOCK_NEWS_ARTICLES.slice(0, 4).map((article, index) => (
                    <NewsFeedCard key={index} article={article} />
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline">View All News</Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Bills */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Active Bills in Your Areas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Legislation matching your selected interests
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {MOCK_BILLS.slice(0, 2).map((bill) => (
                    <BillCard key={bill.id} bill={bill} />
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline">Browse All Bills</Button>
                </div>
              </CardContent>
            </Card>

            {/* Your Representatives */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Your Representatives</CardTitle>
                <p className="text-sm text-muted-foreground">
                  2 Senators and 1 House Representative
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {MOCK_REPRESENTATIVES.map((rep) => (
                    <RepresentativeCard key={rep.id} representative={rep} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bills Tab */}
          <TabsContent value="bills" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">All Bills</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {MOCK_BILLS.length} bills matching your interests
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {MOCK_BILLS.map((bill) => (
                    <BillCard key={bill.id} bill={bill} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Congressional News</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedFeedIds.length} active feeds
                    </p>
                  </div>
                  <FeedSettings
                    selectedFeedIds={selectedFeedIds}
                    onSave={handleFeedSettingsSave}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {MOCK_NEWS_ARTICLES.map((article, index) => (
                    <NewsFeedCard key={index} article={article} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
