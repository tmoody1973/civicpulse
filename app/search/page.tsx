'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, Sparkles, Database, Zap, X } from 'lucide-react';
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
  sponsor_party: string | null;
  sponsor_state: string | null;
  relevance_score?: number; // For semantic search
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
  smartbuckets: {
    icon: Sparkles,
    label: 'AI Search',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'AI-powered semantic search (default)',
  },
};

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
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
      setResults(data.results);

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

  const hasActiveFilters = filters.billType.length > 0 || filters.status.length > 0 || filters.party.length > 0 || filters.hasFullText;

  const layerInfo = searchResponse ? LAYER_INFO[searchResponse.layer as keyof typeof LAYER_INFO] : null;
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
                      {['introduced', 'passed', 'enacted'].map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.status.includes(status)}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                status: checked
                                  ? [...prev.status, status]
                                  : prev.status.filter(s => s !== status),
                              }));
                            }}
                          />
                          <Label htmlFor={`status-${status}`} className="font-normal capitalize">
                            {status}
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
          <div className="space-y-4">
            {results.map((bill) => {
              // Skip bills with missing required fields
              if (!bill.bill_type || !bill.bill_number || !bill.title) {
                console.warn('Skipping bill with missing data:', bill);
                return null;
              }

              const issueCategories = bill.issue_categories
                ? JSON.parse(bill.issue_categories)
                : [];

              const isTracked = trackedBills.has(bill.id);
              const isLoading = trackingLoading.has(bill.id);

              return (
                <BillCard
                  key={bill.id}
                  bill={{
                    id: bill.id,
                    number: `${bill.bill_type.toUpperCase()} ${bill.bill_number}`,
                    title: bill.title,
                    summary: bill.summary || 'No summary available',
                    status: bill.status as any,
                    issueCategories,
                    impactScore: bill.impact_score,
                    lastActionDate: bill.latest_action_date || new Date().toISOString(),
                    lastAction: bill.latest_action_text || 'No recent action',
                  }}
                  tracked={isTracked}
                  loading={isLoading}
                  onTrack={() => handleTrack(bill.id)}
                  onUntrack={() => handleUntrack(bill.id)}
                />
              );
            })}
          </div>
        )}

        {/* Loading State - AI Search */}
        {loading && (
          <div className="space-y-6">
            {/* AI Loading Message */}
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
              <CardContent className="pt-6 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Sparkles className="w-12 h-12 text-green-600 animate-pulse" />
                    <div className="absolute inset-0 animate-ping opacity-20">
                      <Sparkles className="w-12 h-12 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                      AI is searching legislation...
                    </h3>
                    <p className="text-sm text-green-800 dark:text-green-200 mb-1">
                      Analyzing thousands of bills to find all relevant results
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      This usually takes 3-5 seconds
                    </p>
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
        )}
      </div>
    </div>
  );
}
