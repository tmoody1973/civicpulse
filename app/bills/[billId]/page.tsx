'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { BillAnalysis } from '@/lib/ai/cerebras';

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
  introduced_date: string | null;
  latest_action_date: string | null;
  latest_action_text: string | null;
  status: string;
  issue_categories: string[] | null;
  cosponsor_count: number;
  smartbucket_key: string | null;
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
  const billId = params.billId as string;

  const [bill, setBill] = useState<Bill | null>(null);
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bill data
  useEffect(() => {
    async function fetchBill() {
      try {
        const response = await fetch(`/api/bills/${billId}`);
        if (!response.ok) throw new Error('Failed to fetch bill');
        const data = await response.json();
        setBill(data.bill || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bill');
      } finally {
        setLoading(false);
      }
    }

    fetchBill();
  }, [billId]);

  // Fetch AI analysis
  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const response = await fetch(`/api/bills/${billId}/analysis`);
        if (!response.ok) throw new Error('Failed to fetch analysis');
        const data = await response.json();
        setAnalysis(data.analysis);
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

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        source: data.source,
        similarBills: data.similarBills || undefined,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error answering your question. Please try again.',
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // Suggested questions
  const suggestedQuestions = [
    'What does this bill do?',
    'Who would this bill affect?',
    'What are the key provisions?',
    'Are there similar bills?',
    'When would this take effect?',
  ];

  if (loading) {
    return (
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
    );
  }

  if (error || !bill) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert variant="destructive">
          <p className="font-semibold">Error</p>
          <p>{error || 'Bill not found'}</p>
        </Alert>
      </div>
    );
  }

  const partyColor = {
    R: 'bg-red-100 text-red-800',
    D: 'bg-blue-100 text-blue-800',
    I: 'bg-purple-100 text-purple-800',
  }[bill.sponsor_party || ''] || 'bg-gray-100 text-gray-800';

  return (
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
              <span className="text-sm">+ {bill.cosponsor_count} cosponsors</span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Facts */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Facts</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Introduced</p>
                <p className="font-medium">
                  {bill.introduced_date
                    ? new Date(bill.introduced_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Congress</p>
                <p className="font-medium">{bill.congress}th Congress</p>
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

                  {/* Potential Impact */}
                  <div>
                    <h3 className="font-semibold mb-3">Potential Impact</h3>
                    <Tabs defaultValue="positive">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="positive">Positive</TabsTrigger>
                        <TabsTrigger value="negative">Negative</TabsTrigger>
                        <TabsTrigger value="neutral">Neutral</TabsTrigger>
                      </TabsList>
                      <TabsContent value="positive" className="mt-4">
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {analysis.potentialImpact.positive.map((impact, i) => (
                            <li key={i}>{impact}</li>
                          ))}
                        </ul>
                      </TabsContent>
                      <TabsContent value="negative" className="mt-4">
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {analysis.potentialImpact.negative.map((impact, i) => (
                            <li key={i}>{impact}</li>
                          ))}
                        </ul>
                      </TabsContent>
                      <TabsContent value="neutral" className="mt-4">
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {analysis.potentialImpact.neutral.map((impact, i) => (
                            <li key={i}>{impact}</li>
                          ))}
                        </ul>
                      </TabsContent>
                    </Tabs>
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
        </div>

        {/* Chat Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 h-[calc(100vh-2rem)] flex flex-col">
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
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                    {/* Similar Bills List */}
                    {msg.similarBills && msg.similarBills.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold opacity-80">Related Bills:</p>
                        {msg.similarBills.map((similarBill) => (
                          <a
                            key={similarBill.id}
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
        </div>
      </div>
    </div>
  );
}
