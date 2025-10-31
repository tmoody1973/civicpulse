import { FileText, TrendingUp, Clock, Check, Plus, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BillProgressTracker } from './bill-progress-tracker';
import { useState } from 'react';

export interface Bill {
  id: string;
  number: string;
  congress?: number;
  title: string;
  summary: string;
  status: 'introduced' | 'committee' | 'passed-house' | 'passed-senate' | 'enacted';
  issueCategories: string[];
  impactScore: number;
  lastAction: string;
  lastActionDate: string;
  // Sponsor info
  sponsorName?: string;
  sponsorBioguideId?: string; // For linking to representative detail page
  sponsorParty?: string;
  sponsorState?: string;
  sponsorDistrict?: string;
  introducedDate?: string;
  // Additional info
  cosponsorCount?: number;
  committees?: string[];
  policyArea?: string;
  aiSummary?: string;
}

interface BillCardProps {
  bill: Bill;
  compact?: boolean;
  tracked?: boolean;
  loading?: boolean;
  onTrack?: (billId: string) => void;
  onUntrack?: (billId: string) => void;
  searchQuery?: string; // For highlighting search terms
}

const STATUS_LABELS: Record<Bill['status'], string> = {
  'introduced': 'Introduced',
  'committee': 'In Committee',
  'passed-house': 'Passed House',
  'passed-senate': 'Passed Senate',
  'enacted': 'Enacted',
};

const STATUS_VARIANTS: Record<Bill['status'], 'default' | 'secondary' | 'outline'> = {
  'introduced': 'outline',
  'committee': 'secondary',
  'passed-house': 'default',
  'passed-senate': 'default',
  'enacted': 'default',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCongressYears(congress: number): string {
  const startYear = 1789 + ((congress - 1) * 2);
  const endYear = startYear + 2;
  return `${startYear}-${endYear}`;
}

function formatSponsor(bill: Bill): string {
  if (!bill.sponsorName || !bill.sponsorParty || !bill.sponsorState) return '';

  const isHouse = bill.number.toUpperCase().startsWith('HR') || bill.number.toUpperCase().startsWith('H');
  const chamber = isHouse ? 'Rep.' : 'Sen.';
  const party = bill.sponsorParty;
  const state = bill.sponsorState;
  const district = bill.sponsorDistrict && isHouse ? `-${bill.sponsorDistrict}` : '';

  return `[${chamber}-${party}-${state}${district}]`;
}

function formatIntroducedDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Highlight search terms in text with case-insensitive matching
 */
function highlightText(text: string, query?: string): React.ReactNode {
  if (!query || query.trim() === '') {
    return text;
  }

  // Split query into individual terms (handle multi-word searches)
  const terms = query.trim().toLowerCase().split(/\s+/);

  // Create a regex that matches any of the terms (case-insensitive)
  const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  // Split text by matches
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches any search term
        const isMatch = terms.some(term => part.toLowerCase() === term);

        return isMatch ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 font-medium">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

export function BillCard({
  bill,
  compact = false,
  tracked = false,
  loading = false,
  onTrack,
  onUntrack,
  searchQuery
}: BillCardProps) {
  const impactColor = bill.impactScore > 70 ? 'text-red-600' : bill.impactScore > 40 ? 'text-orange-600' : 'text-blue-600';

  // AI Summary state
  const [aiSummary, setAiSummary] = useState<string | null>(bill.aiSummary || null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    setSummaryError(null);

    console.log('🔍 [BillCard] Generating AI summary for bill:', {
      billId: bill.id,
      billNumber: bill.number,
      title: bill.title,
    });

    try {
      const response = await fetch('/api/bills/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id,
          billNumber: bill.number,
          title: bill.title,
          // Don't pass fullText - let API fetch from Congress.gov automatically
        }),
      });

      const data = await response.json();

      console.log('📡 [BillCard] API response:', {
        success: data.success,
        cached: data.cached,
        error: data.error,
        message: data.message,
      });

      if (data.success) {
        setAiSummary(data.summary);
      } else {
        throw new Error(data.error || 'Failed to generate summary');
      }
    } catch (error: any) {
      console.error('❌ [BillCard] Generate summary error:', {
        billId: bill.id,
        error: error.message,
        stack: error.stack,
      });
      setSummaryError(error.message || 'Failed to generate summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Determine if we should show the AI summary button
  const shouldShowAIButton = !aiSummary && (!bill.summary || bill.summary.length < 100);
  const displaySummary = aiSummary || bill.summary;

  if (compact) {
    return (
      <div className="border-b pb-3 last:border-0 hover:bg-muted/50 -mx-2 px-2 py-2 rounded transition-colors">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-medium text-muted-foreground">{bill.number}</p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <TrendingUp className={`w-3 h-3 ${impactColor}`} />
                <span className={`text-xs font-semibold ${impactColor}`}>{bill.impactScore}</span>
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-2 leading-tight">{highlightText(bill.title, searchQuery)}</h3>
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant={STATUS_VARIANTS[bill.status]} className="text-xs">
                {STATUS_LABELS[bill.status]}
              </Badge>
              {bill.issueCategories.slice(0, 2).map(category => (
                <Badge key={category} variant="outline" className="font-normal text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="space-y-3">
        {/* Bill Number + Congress */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <a
            href={`/bills/${bill.id}`}
            className="text-blue-600 hover:underline font-medium text-base"
          >
            {bill.number}
          </a>
          {bill.congress && (
            <span className="text-sm text-muted-foreground">
              — {bill.congress}th Congress ({getCongressYears(bill.congress)})
            </span>
          )}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            <TrendingUp className={`w-4 h-4 ${impactColor}`} />
            <span className={`text-sm font-semibold ${impactColor}`}>{bill.impactScore}</span>
          </div>
        </div>

        {/* Title */}
        <CardTitle className="text-base leading-tight">
          {highlightText(bill.title, searchQuery)}
        </CardTitle>

        {/* Sponsor Info */}
        {bill.sponsorName && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Sponsor: </span>
            {bill.sponsorBioguideId ? (
              <a
                href={`/representatives/${bill.sponsorBioguideId}`}
                className="text-blue-600 hover:underline"
              >
                {bill.sponsorName}
              </a>
            ) : (
              <span className="text-blue-600">{bill.sponsorName}</span>
            )}
            {formatSponsor(bill) && (
              <span className="ml-1">{formatSponsor(bill)}</span>
            )}
            {bill.introducedDate && (
              <span> (Introduced {formatIntroducedDate(bill.introducedDate)})</span>
            )}
            {bill.cosponsorCount && bill.cosponsorCount > 0 && (
              <>
                <span className="font-medium ml-2">Cosponsors: </span>
                <a href="#" className="text-blue-600 hover:underline">
                  ({bill.cosponsorCount})
                </a>
              </>
            )}
          </div>
        )}

        {/* Committees */}
        {bill.committees && bill.committees.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Committees: </span>
            {bill.committees.join(', ')}
          </div>
        )}

        {/* Latest Action */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Latest Action: </span>
          {bill.lastAction}
          {' '}
          <a href="#" className="text-blue-600 hover:underline">
            (All Actions)
          </a>
        </div>

        {/* Progress Tracker */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Tracker:</div>
          <BillProgressTracker billStatus={bill.status} />
        </div>

        {/* Status + Categories Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={STATUS_VARIANTS[bill.status]}>
            {STATUS_LABELS[bill.status]}
          </Badge>
          {bill.policyArea && (
            <Badge variant="secondary" className="font-normal">
              {bill.policyArea}
            </Badge>
          )}
          {bill.issueCategories.map(category => (
            <Badge key={category} variant="outline" className="font-normal">
              {category}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Summary Section */}
        <div className="space-y-2">
          {aiSummary && (
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-600">AI Summary</span>
            </div>
          )}

          <p className={`text-sm ${aiSummary ? 'text-foreground' : 'text-muted-foreground'} line-clamp-3`}>
            {displaySummary ? highlightText(displaySummary, searchQuery) : 'No summary available'}
          </p>

          {/* Generate AI Summary Button */}
          {shouldShowAIButton && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
            >
              {generatingSummary ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Generating AI Summary...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-2" />
                  Generate AI Summary
                </>
              )}
            </Button>
          )}

          {/* Error Message */}
          {summaryError && (
            <p className="text-xs text-red-600">{summaryError}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Last action: {bill.lastAction} ({formatDate(bill.lastActionDate)})</span>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            View Details
          </Button>
          {tracked ? (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => onUntrack?.(bill.id)}
              disabled={loading}
            >
              <Check className="w-4 h-4 mr-2" />
              {loading ? 'Removing...' : 'Tracked'}
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onTrack?.(bill.id)}
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Adding...' : 'Track Bill'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
