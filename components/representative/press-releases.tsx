'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Calendar, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PressRelease {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  publishedAt: string;
  source: 'house.gov' | 'senate.gov' | 'representative_site';
}

interface PressReleasesProps {
  bioguideId: string;
  limit?: number;
}

export function PressReleases({ bioguideId, limit = 5 }: PressReleasesProps) {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPressReleases();
  }, [bioguideId, limit]);

  const fetchPressReleases = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/representatives/${bioguideId}/press-releases?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch press releases');
      }

      const data = await response.json();

      if (data.success) {
        setReleases(data.data);
      } else {
        setError(data.message || 'Failed to load press releases');
      }
    } catch (error) {
      console.error('Error fetching press releases:', error);
      setError('Unable to load press releases at this time');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Press Releases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading press releases...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Press Releases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchPressReleases} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (releases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Press Releases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No press releases available
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'house.gov':
        return <Badge variant="secondary" className="text-xs">House.gov</Badge>;
      case 'senate.gov':
        return <Badge variant="secondary" className="text-xs">Senate.gov</Badge>;
      case 'representative_site':
        return <Badge variant="outline" className="text-xs">Official Site</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Press Releases
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {releases.length} recent
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {releases.map((release) => (
            <div
              key={release.id}
              className="group border-b last:border-0 pb-4 last:pb-0"
            >
              {/* Header with source badge and date */}
              <div className="flex items-center justify-between mb-2">
                {getSourceBadge(release.source)}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(release.publishedAt), {
                      addSuffix: true
                    })}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h4 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {release.title}
              </h4>

              {/* Excerpt */}
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {release.excerpt}
              </p>

              {/* Read more link */}
              <a
                href={release.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Read full release
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>

        {/* View all button */}
        {releases.length >= limit && (
          <div className="mt-6 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // TODO: Implement "view all" modal or separate page
                window.open(releases[0]?.url.replace(/\/\d{4}\/.*/, ''), '_blank');
              }}
            >
              View All Press Releases
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
