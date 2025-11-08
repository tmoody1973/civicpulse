'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface BillAction {
  billId: string;
  billNumber: string;
  billTitle: string;
  actionDate: string;
  actionText: string;
  congress: number;
  url: string;
  sponsorBioguideId: string | null;
  sponsorName: string | null;
  sponsorParty: string | null;
  sponsorState: string | null;
}

interface RepresentativePhoto {
  bioguideId: string;
  imageUrl: string | null;
}

interface LatestActionsWidgetProps {
  limit?: number;
}

export function LatestActionsWidget({ limit = 5 }: LatestActionsWidgetProps) {
  const router = useRouter();
  const [actions, setActions] = useState<BillAction[]>([]);
  const [sponsorPhotos, setSponsorPhotos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestActions();
  }, [limit]);

  const fetchSponsorPhotos = async (bioguideIds: string[]) => {
    try {
      console.log('[Latest Actions] Fetching photos for bioguideIds:', bioguideIds);

      // Fetch photos in parallel for all sponsors
      const photoPromises = bioguideIds.map(async (bioguideId) => {
        try {
          console.log(`[Latest Actions] Fetching photo for: ${bioguideId}`);
          const response = await fetch(`/api/representatives/${bioguideId}`);

          if (response.ok) {
            const data = await response.json();
            const imageUrl = data.representative?.imageUrl || null;
            console.log(`[Latest Actions] Photo for ${bioguideId}:`, imageUrl);
            return { bioguideId, imageUrl };
          } else {
            console.warn(`[Latest Actions] API error for ${bioguideId}:`, response.status);
          }
        } catch (err) {
          console.warn(`[Latest Actions] Failed to fetch photo for ${bioguideId}:`, err);
        }
        return { bioguideId, imageUrl: null };
      });

      const photos = await Promise.all(photoPromises);
      console.log('[Latest Actions] All photos fetched:', photos);

      // Create map of bioguideId -> imageUrl
      const photoMap = new Map<string, string>();
      photos.forEach(({ bioguideId, imageUrl }) => {
        if (imageUrl) {
          photoMap.set(bioguideId, imageUrl);
        }
      });

      console.log('[Latest Actions] Photo map created:', Array.from(photoMap.entries()));
      setSponsorPhotos(photoMap);
    } catch (error) {
      console.error('[Latest Actions] Error fetching sponsor photos:', error);
    }
  };

  const fetchLatestActions = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/bills/latest-actions', window.location.origin);
      url.searchParams.set('limit', String(limit));

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch latest actions');
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('[Latest Actions] Raw data received:', data.data);
        console.log('[Latest Actions] First action details:', JSON.stringify(data.data[0], null, 2));
        setActions(data.data);

        // Fetch sponsor photos for bills that have sponsors
        const bioguideIds = data.data
          .filter((action: BillAction) => action.sponsorBioguideId)
          .map((action: BillAction) => action.sponsorBioguideId);

        console.log('[Latest Actions] Extracted bioguideIds:', bioguideIds);

        if (bioguideIds.length > 0) {
          fetchSponsorPhotos(bioguideIds);
        } else {
          console.warn('[Latest Actions] No bioguideIds found in actions');
        }
      }
    } catch (error) {
      console.error('Error fetching latest actions:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM. dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getBillInternalUrl = (action: BillAction): string => {
    // Convert billId format from "S1234" to internal URL format "119-s-1234"
    const match = action.billId.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const billType = match[1].toLowerCase();
      const billNumber = match[2];
      return `/bills/${action.congress}-${billType}-${billNumber}`;
    }
    // Fallback to external URL if format doesn't match
    return action.url;
  };

  const handleBillClick = (action: BillAction) => {
    const internalUrl = getBillInternalUrl(action);
    if (internalUrl.startsWith('/bills/')) {
      router.push(internalUrl);
    } else {
      // Fallback to external URL
      window.open(action.url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading latest actions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => fetchLatestActions()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No recent actions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => {
        const photoUrl = action.sponsorBioguideId ? sponsorPhotos.get(action.sponsorBioguideId) : undefined;
        const hasPhoto = !!photoUrl;

        if (action.sponsorBioguideId) {
          console.log(`[Latest Actions] Rendering ${action.billId}:`, {
            bioguideId: action.sponsorBioguideId,
            hasPhotoInMap: sponsorPhotos.has(action.sponsorBioguideId),
            photoUrl: photoUrl,
            willRender: hasPhoto
          });
        }

        return (
          <Card
            key={action.billId}
            className="group overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => handleBillClick(action)}
          >
            <div className="p-3">
              {/* Bill Number Badge and Sponsor */}
              <div className="flex items-center gap-2 mb-2">
                {/* Sponsor Photo (if available) */}
                {hasPhoto && photoUrl && (
                  <img
                    src={photoUrl}
                    alt={action.sponsorName || 'Sponsor'}
                    className="w-8 h-8 rounded-full object-cover border border-border"
                  />
                )}

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                    {action.billNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {action.congress}th Congress
                  </span>
                </div>

                {/* Sponsor Name */}
                {action.sponsorName && (
                  <span className="text-xs text-muted-foreground">
                    Sponsor: {action.sponsorName} ({action.sponsorParty}-{action.sponsorState})
                  </span>
                )}
              </div>
            </div>

            {/* Bill Title */}
            <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
              {action.billTitle}
            </h3>

            {/* Action Text */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {action.actionText}
            </p>

            {/* Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(action.actionDate)}</span>
              </div>
            </div>
          </div>
        </Card>
      );
    })}
    </div>
  );
}
