'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, Download, Play } from 'lucide-react';
import { ListenNowButton } from '@/components/audio/listen-now-button';
import type { Brief } from '@/contexts/audio-player-context';

interface BriefCardProps {
  id: string;
  title: string;
  featuredImage: string;
  audioUrl: string;
  duration: number;
  policyAreas: string[];
  generatedAt: Date;
  type: 'daily' | 'weekly';
  onSave?: () => void;
  onDownload?: () => void;
}

export function BriefCard({
  id,
  title,
  featuredImage,
  audioUrl,
  duration,
  policyAreas,
  generatedAt,
  type,
  onSave,
  onDownload,
}: BriefCardProps) {
  // Convert to Brief type for audio player
  const brief: Brief = {
    id,
    title,
    audio_url: audioUrl,
    featured_image_url: featuredImage,
    duration,
    type,
    generated_at: generatedAt.toISOString(),
  };
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check if featured image is valid
  const isValidImageUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http') && !url.includes('[object');
    } catch {
      return false;
    }
  };

  const hasValidImage = isValidImageUrl(featuredImage);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Featured Image */}
      <Link href={`/briefs/${id}`}>
        <div className="relative w-full aspect-video bg-muted">
          {hasValidImage ? (
            <Image
              src={featuredImage}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/10 to-primary/5">
              <span className="text-primary/40 text-sm font-medium">No Image Available</span>
            </div>
          )}
          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center group">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-8 h-8 text-gray-900 fill-gray-900" />
            </div>
          </div>
        </div>
      </Link>

      <CardContent className="p-4">
        {/* Policy Area Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {policyAreas.slice(0, 2).map((area) => (
            <span
              key={area}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              {area}
            </span>
          ))}
          {policyAreas.length > 2 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              +{policyAreas.length - 2}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/briefs/${id}`}>
          <h3 className="text-lg font-semibold mb-2 hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>

        {/* Date & Duration */}
        <p className="text-sm text-muted-foreground mb-4">
          {formatDate(generatedAt)} • {formatDuration(duration)}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <ListenNowButton
            brief={brief}
            variant="outline"
            size="sm"
            className="flex-1"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={onSave}
            className="shrink-0"
          >
            <Bookmark className="w-4 h-4" />
            <span className="sr-only">Save</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onDownload}
            className="shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="sr-only">Download</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
