'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Sparkles, Database, Zap, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BillCard } from '@/components/dashboard/bill-card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SearchResult {
  id: string;
  bill_number: number;
  bill_type: string;
  congress: number;
  title: string;
  summary: string | null;
  status: string;
  issue_categories: string | null;
  impact_score: number;
  latest_action_date: string | null;
  latest_action_text: string | null;
  sponsor_name: string | null;
  sponsor_bioguide_id: string | null;
  sponsor_party: string | null;
  sponsor_state: string | null;
  sponsor_district: string | null;
  introduced_date: string | null;
  cosponsor_count: number;
  committees: string[] | null;
  policy_area: string | null;
  relevance_score?: number; // For semantic search (0-1, lower is better)
  _explanation?: string; // Why this result matches
}

interface SearchResponse {
  success: boolean;
  searchType: string;
  layer: string;
  query: string;
  results: SearchResult[];
  facets?: any;
  meta: {
    duration: number;
    count: number;
    total: number;
    strategy: string;
  };
}

const LAYER_INFO = {
  sql: {
    icon: Database,
    label: 'SQL Exact',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Instant bill number lookup',
  },
  algolia: {
    icon: Zap,
    label: 'Fast Search',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Lightning-fast keyword search',
  },
  smartbuckets: {
    icon: Sparkles,
    label: 'AI Search',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'AI-powered semantic search',
  },
  hybrid: {
    icon: Zap,
    label: 'Hybrid Search',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Fast + AI combined',
  },
};

/**
 * Detect if a query will be fast (Algolia) or slow (SmartBuckets)
 * Matches the backend determineSearchStrategy logic
 */
function predictSearchSpeed(query: string, hasFilters: boolean): 'fast' | 'slow' {
  // Bill numbers are instant
  if (/^(hr?|s|h\.?j\.?res|s\.?j\.?res)\.?\s*\d+$/i.test(query.trim())) {
    return 'fast';
  }

  // Filters use Algolia (fast)
  if (hasFilters) return 'fast';

  // Short queries (1-2 words) use Algolia
  const words = query.trim().split(/\s+/);
  if (words.length <= 2) return 'fast';

  // Complex queries use AI (slow)
  if (query.includes('?') || words.length >= 5) return 'slow';

  // Medium complexity (hybrid) starts fast
  return 'fast';
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalResults, setTotalResults] = useState(0);

  // Sorting
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'cosponsors'>('relevance');

  // Tracking state
  const [trackedBills, setTrackedBills] = useState<Set<string>>(new Set());
  const [trackingLoading, setTrackingLoading] = useState<Set<string>>(new Set());

  // Mock user ID (replace with real auth later)
  const userId = 'demo-user';

  // Filters (note: not yet supported with AI search)
  const [filters, setFilters] = useState({
    billType: [] as string[],
    status: [] as string[],
    party: [] as string[],
    hasFullText: false,
    lawsOnly: false,
  });

  // Load tracked bills on mount
  useEffect(() => {
    const loadTrackedBills = async () => {
      try {
        const response = await fetch(`/api/bills/track?userId=${userId}`);
        const data = await response.json();
        if (data.success) {
          setTrackedBills(new Set(data.trackedBills));
        }
      } catch (error) {
        console.error('Failed to load tracked bills:', error);
      }
    };
    loadTrackedBills();
  }, [userId]);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '200', // Fetch up to 200 results for client-side pagination
      });

      // Add filters
      if (filters.billType.length > 0) {
        filters.billType.forEach(type => params.append('billType', type));
      }
      if (filters.status.length > 0) {
        filters.status.forEach(status => params.append('status', status));
      }
      if (filters.party.length > 0) {
        filters.party.forEach(party => params.append('party', party));
      }
      if (filters.hasFullText) {
        params.append('hasFullText', 'true');
      }

      const response = await fetch(`/api/search?${params}`);
      const data: SearchResponse = await response.json();

      if (!data.success) {
        throw new Error(data.meta?.strategy || 'Search failed');
      }

      setSearchResponse(data);
      setTotalResults(data.meta.total || data.results.length);

      // Apply client-side sorting
      let sortedResults = [...data.results];
      if (sortBy === 'date' && data.results[0]?.latest_action_date) {
        sortedResults.sort((a, b) =>
          new Date(b.latest_action_date || 0).getTime() - new Date(a.latest_action_date || 0).getTime()
        );
      } else if (sortBy === 'cosponsors') {
        sortedResults.sort((a, b) => (b.cosponsor_count || 0) - (a.cosponsor_count || 0));
      }
      // relevance is default from API

      setResults(sortedResults);
      setPage(1); // Reset to first page on new search

      // Update URL
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);

    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search bills');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const clearFilters = () => {
    setFilters({
      billType: [],
      status: [],
      party: [],
      hasFullText: false,
      lawsOnly: false,
    });
  };

  const handleTrack = async (billId: string) => {
    setTrackingLoading(prev => new Set(prev).add(billId));

    try {
      const response = await fetch('/api/bills/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, billId }),
      });

      const data = await response.json();

      if (data.success) {
        setTrackedBills(prev => new Set(prev).add(billId));
      } else {
        throw new Error(data.error || 'Failed to track bill');
      }
    } catch (error: any) {
      console.error('Track error:', error);
      alert('Failed to track bill. Please try again.');
    } finally {
      setTrackingLoading(prev => {
        const next = new Set(prev);
        next.delete(billId);
        return next;
      });
    }
  };

  const handleUntrack = async (billId: string) => {
    setTrackingLoading(prev => new Set(prev).add(billId));

    try {
      const response = await fetch(`/api/bills/track?userId=${userId}&billId=${billId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setTrackedBills(prev => {
          const next = new Set(prev);
          next.delete(billId);
          return next;
        });
      } else {
        throw new Error(data.error || 'Failed to untrack bill');
      }
    } catch (error: any) {
      console.error('Untrack error:', error);
      alert('Failed to untrack bill. Please try again.');
    } finally {
      setTrackingLoading(prev => {
        const next = new Set(prev);
        next.delete(billId);
        return next;
      });
    }
  };

  const hasActiveFilters = filters.billType.length > 0 || filters.status.length > 0 || filters.party.length > 0 || filters.hasFullText || filters.lawsOnly;

  // Use searchType for display (algolia, semantic, hybrid)
  const layerInfo = searchResponse ? LAYER_INFO[searchResponse.searchType as keyof typeof LAYER_INFO] : null;
  const LayerIcon = layerInfo?.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search bills... (e.g., 'HR 1234', 'healthcare reform', 'climate change')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="min-w-[100px]">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge className="ml-2" variant="secondary">
                      {filters.billType.length + filters.status.length + filters.party.length + (filters.hasFullText ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Search Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search with filters
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* AI Search Info */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-900 dark:text-green-100">AI-Powered Search</h3>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Our AI understands concepts and finds all relevant legislation. Results may take 3-5 seconds.
                    </p>
                  </div>

                  {/* Bill Type */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Bill Type</Label>
                    <div className="space-y-2">
                      {['hr', 's', 'hjres', 'sjres'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={filters.billType.includes(type)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                billType: checked
                                  ? [...prev.billType, type]
                                  : prev.billType.filter(t => t !== type),
                              }));
                            }}
                          />
                          <Label htmlFor={`type-${type}`} className="font-normal">
                            {type === 'hr' ? 'House Bill' : type === 's' ? 'Senate Bill' : type.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Status</Label>
                    <div className="space-y-2">
                      {[
                        { value: 'introduced', label: 'Introduced' },
                        { value: 'committee', label: 'In Committee' },
                        { value: 'passed-senate', label: 'Passed Senate' },
                        { value: 'enacted', label: 'Enacted' }
                      ].map(({ value, label }) => (
                        <div key={value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${value}`}
                            checked={filters.status.includes(value)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                status: checked
                                  ? [...prev.status, value]
                                  : prev.status.filter(s => s !== value),
                              }));
                            }}
                          />
                          <Label htmlFor={`status-${value}`} className="font-normal">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Party */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Sponsor Party</Label>
                    <div className="space-y-2">
                      {['D', 'R', 'I'].map(party => (
                        <div key={party} className="flex items-center space-x-2">
                          <Checkbox
                            id={`party-${party}`}
                            checked={filters.party.includes(party)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                party: checked
                                  ? [...prev.party, party]
                                  : prev.party.filter(p => p !== party),
                              }));
                            }}
                          />
                          <Label htmlFor={`party-${party}`} className="font-normal">
                            {party === 'D' ? 'Democrat' : party === 'R' ? 'Republican' : 'Independent'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full Text */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fullText"
                      checked={filters.hasFullText}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasFullText: !!checked }))}
                    />
                    <Label htmlFor="fullText" className="font-normal">
                      Only bills with full text
                    </Label>
                  </div>

                  {/* Laws Only */}
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                      id="lawsOnly"
                      checked={filters.lawsOnly}
                      onCheckedChange={(checked) => {
                        setFilters(prev => ({
                          ...prev,
                          lawsOnly: !!checked,
                          // When Laws Only is checked, automatically set status to enacted
                          status: checked ? ['enacted'] : prev.status.filter(s => s !== 'enacted'),
                        }));
                      }}
                    />
                    <Label htmlFor="lawsOnly" className="font-normal">
                      <span className="font-semibold">Laws Only</span>
                      <span className="text-muted-foreground text-sm ml-1">(Enacted Legislation)</span>
                    </Label>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button variant="outline" className="w-full" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        {/* Search Strategy Indicator */}
        {searchResponse && layerInfo && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${layerInfo.bgColor}`}>
                  {LayerIcon && <LayerIcon className={`w-6 h-6 ${layerInfo.color}`} />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{layerInfo.label}</h3>
                  <p className="text-sm text-muted-foreground">{layerInfo.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{searchResponse.meta.count}</p>
                  <p className="text-xs text-muted-foreground">results in {searchResponse.meta.duration}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sorting Controls */}
        {!loading && results.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Latest Action</SelectItem>
                  <SelectItem value="cosponsors">Most Cosponsors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, totalResults)}-{Math.min(page * pageSize, totalResults)} of {totalResults}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && query && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results Grid */}
        {!loading && results.length > 0 && (
          <>
            <div className="space-y-4">
              {results
                .slice((page - 1) * pageSize, page * pageSize)
                .map((bill) => {
              // Skip bills with missing required fields
              if (!bill.bill_type || !bill.bill_number || !bill.title) {
                console.warn('Skipping bill with missing data:', bill);
                return null;
              }

              // issue_categories can be either an array (from Algolia) or a JSON string (from database)
              const issueCategories = Array.isArray(bill.issue_categories)
                ? bill.issue_categories
                : bill.issue_categories
                ? JSON.parse(bill.issue_categories)
                : [];

              const isTracked = trackedBills.has(bill.id);
              const isLoading = trackingLoading.has(bill.id);
              const isSemanticSearch = searchResponse?.meta.strategy === 'smartbuckets';
              const hasRelevanceScore = typeof bill.relevance_score === 'number';

              return (
                <div key={bill.id} className="space-y-2">
                  {/* Relevance Indicator for Semantic Search */}
                  {isSemanticSearch && hasRelevanceScore && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {Math.round((1 - (bill.relevance_score || 0)) * 100)}% Match
                      </Badge>
                      {bill._explanation && (
                        <span className="text-muted-foreground">
                          {bill._explanation}
                        </span>
                      )}
                    </div>
                  )}

                  <BillCard
                    bill={{
                    id: bill.id,
                    number: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
                    congress: bill.congress,
                    title: bill.title,
                    summary: bill.summary || 'No summary available',
                    status: bill.status as any,
                    issueCategories,
                    impactScore: bill.impact_score,
                    lastActionDate: bill.latest_action_date || new Date().toISOString(),
                    lastAction: bill.latest_action_text || 'No recent action',
                    sponsorName: bill.sponsor_name || undefined,
                    sponsorBioguideId: bill.sponsor_bioguide_id || undefined,
                    sponsorParty: bill.sponsor_party || undefined,
                    sponsorState: bill.sponsor_state || undefined,
                    sponsorDistrict: bill.sponsor_district || undefined,
                    introducedDate: bill.introduced_date || undefined,
                    cosponsorCount: bill.cosponsor_count || 0,
                    committees: bill.committees || undefined,
                    policyArea: bill.policy_area || undefined,
                  }}
                  tracked={isTracked}
                  loading={isLoading}
                  onTrack={() => handleTrack(bill.id)}
                  onUntrack={() => handleUntrack(bill.id)}
                  searchQuery={query}
                />
                </div>
              );
              })}
            </div>

            {/* Pagination Controls */}
            {totalResults > pageSize && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalResults / pageSize)) }, (_, i) => {
                    const totalPages = Math.ceil(totalResults / pageSize);
                    let pageNum: number;

                    // Show first page, last page, current page, and pages around current
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={i}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(Math.ceil(totalResults / pageSize), p + 1))}
                  disabled={page >= Math.ceil(totalResults / pageSize)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Loading State - Smart UI based on predicted speed */}
        {loading && (() => {
          const predictedSpeed = predictSearchSpeed(query, hasActiveFilters);
          const isFast = predictedSpeed === 'fast';

          return (
            <div className="space-y-6">
              {/* Loading Message */}
              <Card className={isFast ? "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10" : "border-green-200 bg-green-50/50 dark:bg-green-900/10"}>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {isFast ? (
                        <>
                          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-12 h-12 text-green-600 animate-pulse" />
                          <div className="absolute inset-0 animate-ping opacity-20">
                            <Sparkles className="w-12 h-12 text-green-600" />
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      {isFast ? (
                        <>
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Searching...
                          </h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Finding bills with fast keyword matching
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                            AI is analyzing legislation...
                          </h3>
                          <p className="text-sm text-green-800 dark:text-green-200 mb-1">
                            Using AI to find all relevant bills by concept
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            This may take 10-20 seconds for comprehensive results
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skeleton Cards */}
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
