'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { BillAnalysis } from '@/lib/ai/cerebras';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClientHeader } from '@/components/shared/client-header';
import { BillProgressTimeline } from '@/components/bills/bill-progress-timeline';
import { BillTldrCard } from '@/components/bills/bill-tldr-card';
import { BillSponsorCard } from '@/components/bills/bill-sponsor-card';
import { JargonTooltip, legislativeTerms } from '@/components/ui/jargon-tooltip';
import { Mail, Bell, ExternalLink, ThumbsUp, ThumbsDown, AlertCircle, Check } from 'lucide-react';

interface Bill {
  id: string;
  congress: number;
  bill_type: string;
  bill_number: number;
  title: string;
  summary: string | null;
  full_text: string | null;
  sponsor_name: string | null;
  sponsor_party: string | null;
  sponsor_state: string | null;
  sponsor_image_url?: string | null;
  sponsor_office_address?: string | null;
  sponsor_phone?: string | null;
  sponsor_website_url?: string | null;
  sponsor_contact_url?: string | null;
  sponsor_twitter_handle?: string | null;
  sponsor_facebook_url?: string | null;
  introduced_date: string | null;
  latest_action_date: string | null;
  latest_action_text: string | null;
  status: string;
  issue_categories: string[] | null;
  cosponsor_count: number;
  smartbucket_key: string | null;
  updated_at?: string;
}

interface SimilarBill {
  id: string;
  title: string;
  billNumber: string;
  sponsor_name: string | null;
  sponsor_party: string | null;
  status: string;
  similarity: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'smartbucket' | 'cerebras' | 'semantic-search';
  similarBills?: SimilarBill[];
}

export default function BillDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const rawBillId = params.billId as string;

  // Normalize bill ID format
  // Handle both "119-s-3038" (correct) and "s3038-119" (old format)
  const billId = (() => {
    const parts = rawBillId.split('-');
    if (parts.length === 2) {
      // Format: "s3038-119" -> convert to "119-s-3038"
      const [typeNum, congress] = parts;
      const match = typeNum.match(/^([a-z]+)(\d+)$/i);
      if (match) {
        return `${congress}-${match[1].toLowerCase()}-${match[2]}`;
      }
    }
    // Already correct format or unknown format, use as-is
    return rawBillId;
  })();

  const [bill, setBill] = useState<Bill | null>(null);
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (!data.user) {
          // User not logged in, redirect to login
          router.push('/auth/login');
        } else {
          setAuthChecking(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth/login');
      }
    };
    checkAuth();
  }, [router]);

  // Fetch bill data function (extracted so it can be reused)
  const fetchBill = async (skipRefreshCheck = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bills/${billId}`);
      if (!response.ok) throw new Error('Failed to fetch bill');
      const data = await response.json();
      const billData = data.bill || data;
      setBill(billData);

      // Auto-sync: Refresh bill if stale or missing full text
      if (!skipRefreshCheck) {
        const needsRefresh = checkIfBillNeedsRefresh(billData);
        if (needsRefresh.shouldRefresh) {
          console.log(`🔄 Auto-refreshing ${billId}: ${needsRefresh.reason}`);
          triggerBillRefresh(billId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bill');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bill data on mount
  useEffect(() => {
    fetchBill();
  }, [billId]);

  // Check if bill needs refresh
  function checkIfBillNeedsRefresh(bill: Bill): { shouldRefresh: boolean; reason?: string } {
    // Check if bill was last updated more than 24 hours ago
    if (bill.updated_at) {
      const updatedAt = new Date(bill.updated_at).getTime();
      const now = Date.now();
      const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);

      if (hoursSinceUpdate > 24) {
        return { shouldRefresh: true, reason: `Stale (${Math.round(hoursSinceUpdate)}h old)` };
      }
    }

    // Check if missing full text
    if (!bill.full_text) {
      return { shouldRefresh: true, reason: 'Missing full text' };
    }

    // Check if missing summary
    if (!bill.summary) {
      return { shouldRefresh: true, reason: 'Missing summary' };
    }

    // Check if missing sponsor data
    if (!bill.sponsor_name || bill.sponsor_name === 'Unknown') {
      return { shouldRefresh: true, reason: 'Missing sponsor data' };
    }

    return { shouldRefresh: false };
  }

  // Trigger background refresh
  async function triggerBillRefresh(billId: string) {
    try {
      // Fire and forget - don't block UI
      fetch(`/api/bills/${billId}/refresh`, {
        method: 'POST'
      }).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Bill refreshed successfully:`, data.updated);

          // Re-fetch bill to show updated data immediately
          console.log('🔄 Reloading bill data to show updates...');
          await fetchBill(true); // Skip refresh check to avoid infinite loop
        } else {
          console.warn(`⚠️  Bill refresh failed (${response.status})`);
        }
      }).catch(err => {
        console.error('Background refresh error:', err);
      });
    } catch (err) {
      console.error('Failed to trigger bill refresh:', err);
    }
  }

  // Fetch AI analysis
  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const response = await fetch(`/api/bills/${billId}/analysis`);
        if (!response.ok) {
          // Analysis is optional - log but don't throw
          console.warn(`Analysis fetch failed with status ${response.status}`);
          return;
        }
        const data = await response.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
        }
      } catch (err) {
        console.error('Analysis error:', err);
        // Don't set error - analysis is optional
      } finally {
        setAnalysisLoading(false);
      }
    }

    if (billId) {
      fetchAnalysis();
    }
  }, [billId]);

  // Handle chat submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`/api/bills/${billId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatInput }),
      });

      if (!response.ok) throw new Error('Failed to get answer');

      // Check if response is streaming
      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('text/event-stream')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let streamedContent = '';
        let metadata: any = null;

        if (!reader) throw new Error('No reader available');

        // Add placeholder message that will be updated
        const messageIndex = chatMessages.length + 1; // +1 for user message already added
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '', source: 'cerebras' },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'metadata') {
                metadata = data.data;
              } else if (data.type === 'chunk') {
                streamedContent += data.data;
                // Update the last message with accumulated content
                setChatMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[messageIndex] = {
                    role: 'assistant',
                    content: streamedContent,
                    source: metadata?.source || 'cerebras',
                  };
                  return newMessages;
                });
              } else if (data.type === 'done') {
                setChatLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            }
          }
        }
      } else {
        // Handle non-streaming response (SmartBucket, similar bills)
        const data = await response.json();
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.answer,
          source: data.source,
          similarBills: data.similarBills || undefined,
        };

        setChatMessages((prev) => [...prev, assistantMessage]);
        setChatLoading(false);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error answering your question. Please try again.',
      };
      setChatMessages((prev) => [...prev, errorMessage]);
      setChatLoading(false);
    }
  };

  // Citizen-focused suggested questions
  const suggestedQuestions = [
    'Will this cost me money?',
    'How do I qualify for this?',
    'When will this take effect?',
    'Are there similar bills?',
    'Who opposes this bill and why?',
  ];

  // Show loading state while checking authentication
  if (authChecking) {
    return (
      <>
        <ClientHeader />
        <div className="container mx-auto px-4 py-8 max-w-6xl flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <ClientHeader />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <div>
            <Skeleton className="h-screen" />
          </div>
        </div>
      </div>
      </>
    );
  }

  if (error || !bill) {
    return (
      <>
        <ClientHeader />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert variant="destructive">
          <p className="font-semibold">Error</p>
          <p>{error || 'Bill not found'}</p>
        </Alert>
      </div>
      </>
    );
  }

  const partyColor = {
    R: 'bg-red-100 text-red-800',
    D: 'bg-blue-100 text-blue-800',
    I: 'bg-purple-100 text-purple-800',
  }[bill.sponsor_party || ''] || 'bg-gray-100 text-gray-800';

  return (
    <>
      <ClientHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-sm font-mono">
            {bill.bill_type.toUpperCase()} {bill.bill_number}
          </Badge>
          <Badge variant="secondary">{bill.status}</Badge>
          {bill.issue_categories && bill.issue_categories.length > 0 && (
            <Badge variant="outline">{bill.issue_categories[0]}</Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-4">{bill.title}</h1>

        {bill.sponsor_name && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Sponsored by</span>
            <Badge className={partyColor}>
              {bill.sponsor_name} ({bill.sponsor_party}-{bill.sponsor_state})
            </Badge>
            {bill.cosponsor_count > 0 && (
              <span className="text-sm">
                + {bill.cosponsor_count}{' '}
                <JargonTooltip
                  term={legislativeTerms.cosponsor.term}
                  explanation={legislativeTerms.cosponsor.explanation}
                >
                  {bill.cosponsor_count === 1 ? 'cosponsor' : 'cosponsors'}
                </JargonTooltip>
              </span>
            )}
          </div>
        )}
      </div>

      {/* TL;DR Summary Card */}
      {analysis && (
        <div className="mb-8">
          <BillTldrCard
            whatItDoes={analysis.whatItDoes}
            whoItAffects={analysis.whoItAffects}
            status={bill.status}
            introducedDate={bill.introduced_date}
          />
        </div>
      )}

      {/* Sponsor Information */}
      {bill.sponsor_name && (
        <div className="mb-8">
          <BillSponsorCard
            name={bill.sponsor_name}
            party={bill.sponsor_party}
            state={bill.sponsor_state}
            imageUrl={bill.sponsor_image_url}
            officeAddress={bill.sponsor_office_address}
            phone={bill.sponsor_phone}
            websiteUrl={bill.sponsor_website_url}
            contactUrl={bill.sponsor_contact_url}
            twitterHandle={bill.sponsor_twitter_handle}
            facebookUrl={bill.sponsor_facebook_url}
          />
        </div>
      )}

      {/* Visual Progress Timeline */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bill Progress</CardTitle>
            <CardDescription>Track where this bill is in the legislative process</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <BillProgressTimeline billStatus={bill.status} />
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Bill Details and Chat */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Bill Details</TabsTrigger>
          <TabsTrigger value="chat">Ask About the Bill</TabsTrigger>
        </TabsList>

        {/* Bill Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Quick Facts */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Facts</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  <JargonTooltip
                    term={legislativeTerms.introduced.term}
                    explanation={legislativeTerms.introduced.explanation}
                  />
                </p>
                <p className="font-medium">
                  {bill.introduced_date
                    ? new Date(bill.introduced_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Congress</p>
                <p className="font-medium">
                  <JargonTooltip
                    term={legislativeTerms.congress(bill.congress).term}
                    explanation={legislativeTerms.congress(bill.congress).explanation}
                  />
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latest Action</p>
                <p className="font-medium">
                  {bill.latest_action_date
                    ? new Date(bill.latest_action_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Full Text</p>
                <p className="font-medium">
                  {bill.full_text ? 'Available' : 'Not yet available'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
              <CardDescription>
                Generated by Cerebras GPT OSS 120B - Fast & accurate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-24" />
                </div>
              ) : analysis ? (
                <div className="space-y-6">
                  {/* What It Does */}
                  <div>
                    <h3 className="font-semibold mb-2">What It Does</h3>
                    <p className="text-muted-foreground">{analysis.whatItDoes}</p>
                  </div>

                  {/* Who It Affects */}
                  <div>
                    <h3 className="font-semibold mb-2">Who It Affects</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.whoItAffects.map((group, i) => (
                        <Badge key={i} variant="secondary">
                          {group}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Key Provisions */}
                  <div>
                    <h3 className="font-semibold mb-2">Key Provisions</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {analysis.keyProvisions.map((provision, i) => (
                        <li key={i}>{provision}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Potential Impact - Visual Pros/Cons */}
                  <div>
                    <h3 className="font-semibold mb-4">Potential Impact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Positive Impacts */}
                      {analysis.potentialImpact.positive.length > 0 && (
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                          <div className="flex items-center gap-2 mb-3">
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                            <h4 className="font-semibold text-green-900 dark:text-green-100">Potential Benefits</h4>
                          </div>
                          <ul className="space-y-2">
                            {analysis.potentialImpact.positive.map((impact, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-green-800 dark:text-green-200">{impact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Negative Impacts */}
                      {analysis.potentialImpact.negative.length > 0 && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                          <div className="flex items-center gap-2 mb-3">
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                            <h4 className="font-semibold text-red-900 dark:text-red-100">Potential Concerns</h4>
                          </div>
                          <ul className="space-y-2">
                            {analysis.potentialImpact.negative.map((impact, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <span className="text-red-800 dark:text-red-200">{impact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Neutral Impacts */}
                      {analysis.potentialImpact.neutral.length > 0 && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-800 md:col-span-2">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-gray-600" />
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Other Considerations</h4>
                          </div>
                          <ul className="space-y-2">
                            {analysis.potentialImpact.neutral.map((impact, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-gray-700 dark:text-gray-300">{impact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(analysis.fundingAmount || analysis.timeline) && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      {analysis.fundingAmount && (
                        <div>
                          <h3 className="font-semibold mb-1">Funding</h3>
                          <p className="text-muted-foreground">{analysis.fundingAmount}</p>
                        </div>
                      )}
                      {analysis.timeline && (
                        <div>
                          <h3 className="font-semibold mb-1">Timeline</h3>
                          <p className="text-muted-foreground">{analysis.timeline}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <p>Unable to generate analysis. Please try again later.</p>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Take Action</CardTitle>
              <CardDescription>Make your voice heard on this bill</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" size="lg">
                <Mail className="mr-2 h-4 w-4" />
                Contact Your Representative
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg">
                <Bell className="mr-2 h-4 w-4" />
                Track This Bill for Updates
              </Button>
              <Button variant="outline" className="w-full justify-start" size="lg">
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Congress.gov
              </Button>
            </CardContent>
          </Card>

          {/* Summary & Full Text */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Text</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="summary">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="full">Full Text</TabsTrigger>
                  <TabsTrigger value="action">Latest Action</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="mt-4">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {bill.summary || 'No summary available yet.'}
                  </p>
                </TabsContent>
                <TabsContent value="full" className="mt-4">
                  {bill.full_text ? (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {bill.full_text}
                      </pre>
                    </div>
                  ) : (
                    <Alert>
                      <p>Full text not yet available from Congress.gov</p>
                    </Alert>
                  )}
                </TabsContent>
                <TabsContent value="action" className="mt-4">
                  <p className="text-muted-foreground">
                    {bill.latest_action_text || 'No recent action recorded.'}
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ask About the Bill Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card className="h-[calc(100vh-16rem)] flex flex-col">
            <CardHeader>
              <CardTitle>Ask About This Bill</CardTitle>
              <CardDescription>
                {bill.smartbucket_key
                  ? 'Powered by Raindrop SmartBucket RAG'
                  : 'Powered by Cerebras AI'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              {/* Suggested Questions */}
              {chatMessages.length === 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
                  <div className="space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start h-auto py-2 text-xs"
                        onClick={() => {
                          setChatInput(q);
                          handleChatSubmit({ preventDefault: () => {} } as React.FormEvent);
                        }}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-8'
                        : 'bg-muted mr-8'
                    }`}
                  >
                    {/* Markdown-rendered content */}
                    <div className={`text-sm prose prose-sm max-w-none prose-p:my-2 prose-headings:my-2 prose-li:my-1 ${
                      msg.role === 'user'
                        ? 'prose-invert'
                        : 'dark:prose-invert'
                    }`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Style tables nicely
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-3">
                              <table className="min-w-full divide-y divide-border border border-border rounded-md" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-muted/50" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-3 py-2 text-left text-xs font-semibold" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-3 py-2 text-xs border-t border-border" {...props} />
                          ),
                          // Style lists
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-inside space-y-1" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal list-inside space-y-1" {...props} />
                          ),
                          // Style bold text
                          strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-foreground" {...props} />
                          ),
                          // Style paragraphs
                          p: ({ node, ...props }) => (
                            <p className="leading-relaxed" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Similar Bills List */}
                    {msg.similarBills && msg.similarBills.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold opacity-80">Related Bills:</p>
                        {msg.similarBills
                          .filter((bill, index, self) =>
                            index === self.findIndex(b => b.id === bill.id)
                          )
                          .map((similarBill, index) => (
                          <a
                            key={`${similarBill.id}-${index}`}
                            href={`/bills/${similarBill.id}`}
                            className="block p-2 bg-background/50 rounded border border-border/50 hover:bg-background/80 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {similarBill.billNumber}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {Math.round(similarBill.similarity * 100)}% similar
                                  </Badge>
                                </div>
                                <p className="text-xs font-medium line-clamp-2">{similarBill.title}</p>
                                {similarBill.sponsor_name && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {similarBill.sponsor_name} ({similarBill.sponsor_party})
                                  </p>
                                )}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {msg.source && msg.role === 'assistant' && (
                      <p className="text-xs mt-2 opacity-70">
                        Source: {
                          msg.source === 'smartbucket' ? 'Full Bill Text' :
                          msg.source === 'semantic-search' ? 'Semantic Search' :
                          'AI Summary'
                        }
                      </p>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-muted p-3 rounded-lg mr-8">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={chatLoading || !chatInput.trim()}>
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
