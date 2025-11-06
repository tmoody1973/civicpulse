'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Bookmark, Download, Clock } from 'lucide-react';
import { useAudioPlayer } from '@/contexts/audio-player-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';

interface Brief {
  id: string;
  title: string;
  audio_url: string;
  written_digest?: string;
  featured_image_url?: string | null;
  duration: number;
  type: 'daily' | 'weekly';
  policy_areas?: string[];
  generated_at: string;
  news_count?: number;
  bill_count?: number;
}

interface BriefCardProps {
  brief: Brief;
}

export function BriefCard({ brief }: BriefCardProps) {
  const { loadBrief } = useAudioPlayer();
  const [showDigest, setShowDigest] = useState(false);

  const handleListenNow = () => {
    loadBrief({
      id: brief.id,
      title: brief.title,
      audio_url: brief.audio_url,
      featured_image_url: brief.featured_image_url || null,
      duration: brief.duration,
      type: brief.type,
      generated_at: brief.generated_at,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
        {/* Featured Image */}
        <div
          className="relative h-48 bg-gradient-to-br from-emerald-600 to-emerald-800 cursor-pointer"
          onClick={() => setShowDigest(true)}
        >
          {brief.featured_image_url ? (
            <img
              src={brief.featured_image_url}
              alt={brief.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src="/images/capitol-dome.png"
                alt="Capitol"
                className="w-24 h-24 opacity-20"
              />
            </div>
          )}

          {/* Title Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6">
            <h3 className="text-white font-bold text-xl leading-tight line-clamp-2">
              {brief.title}
            </h3>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {brief.policy_areas && brief.policy_areas.slice(0, 2).map((area) => (
              <Badge key={area} variant="secondary" className="text-xs">
                {area.toLowerCase()}
              </Badge>
            ))}
            {brief.policy_areas && brief.policy_areas.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{brief.policy_areas.length - 2}
              </Badge>
            )}
          </div>

          {/* Title (repeated for accessibility) */}
          <h4
            className="font-semibold text-lg line-clamp-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => setShowDigest(true)}
          >
            {brief.title}
          </h4>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatDate(brief.generated_at)}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(brief.duration)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleListenNow}
              className="flex-1"
              size="default"
            >
              <Play className="w-4 h-4 mr-2" />
              Listen Now
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement bookmark
              }}
            >
              <Bookmark className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement download
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* Read Full Digest Link */}
          {brief.written_digest && (
            <button
              onClick={() => setShowDigest(true)}
              className="text-sm text-primary hover:underline font-medium w-full text-center pt-2"
            >
              Read Full Digest →
            </button>
          )}
        </div>
      </Card>

      {/* Full Digest Modal */}
      {brief.written_digest && (
        <Dialog open={showDigest} onOpenChange={setShowDigest}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{brief.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {formatDate(brief.generated_at)} • {formatDuration(brief.duration)} audio
              </p>
            </DialogHeader>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{brief.written_digest}</ReactMarkdown>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleListenNow} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Listen to Audio Version
              </Button>
              <Button variant="outline" onClick={() => setShowDigest(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
