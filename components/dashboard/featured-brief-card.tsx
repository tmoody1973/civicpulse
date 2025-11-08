'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Bookmark, Download, ChevronRight } from 'lucide-react';
import { useAudioPlayer, type Brief } from '@/contexts/audio-player-context';

interface FeaturedBriefCardProps {
  brief: {
    id: string;
    title: string;
    audio_url: string;
    featured_image_url: string | null;
    duration: number;
    headline?: string;
    excerpt?: string;
    category?: string;
    author?: string;
    generated_at: string;
    policy_areas?: string[];
  };
}

export function FeaturedBriefCard({ brief }: FeaturedBriefCardProps) {
  const { loadBrief } = useAudioPlayer();

  const handleListen = () => {
    // Use the global persistent audio player
    loadBrief({
      id: brief.id,
      title: brief.title,
      audio_url: brief.audio_url,
      featured_image_url: brief.featured_image_url,
      duration: brief.duration,
      type: 'daily',
      generated_at: brief.generated_at,
      policy_areas: brief.policy_areas,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    // TODO: Implement save/bookmark functionality
    console.log('Save brief:', brief.id);
  };

  const handleDownload = () => {
    // Download the audio file
    const link = document.createElement('a');
    link.href = brief.audio_url;
    link.download = `${brief.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          🎙️ Today's Daily Brief
        </h2>
        <Link href="/briefs">
          <Button variant="ghost" size="sm" className="gap-1">
            View Previous Briefs
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Featured Card - Full Width */}
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Left: Featured Image */}
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {brief.featured_image_url ? (
                <img
                  src={brief.featured_image_url}
                  alt={brief.headline || brief.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-800">
                  <span className="text-white text-sm opacity-50">Daily Brief</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex-1 flex flex-col">
            {/* Headline */}
            <h3 className="text-2xl font-bold mb-2 line-clamp-2">
              {brief.headline || brief.title || 'Your Daily Legislative Brief'}
            </h3>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              {brief.category && (
                <>
                  <span className="font-medium text-primary">{brief.category}</span>
                  <span>•</span>
                </>
              )}
              <span>by {brief.author || 'Civic Pulse AI'}</span>
            </div>

            {/* Excerpt */}
            <p className="text-muted-foreground mb-6 line-clamp-3">
              {brief.excerpt || 'Your personalized daily audio brief covering the latest Congressional news, legislative updates, and policy developments.'}
            </p>

            {/* Policy Areas */}
            {brief.policy_areas && brief.policy_areas.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {brief.policy_areas.slice(0, 4).map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
                {brief.policy_areas.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{brief.policy_areas.length - 4} more
                  </Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-auto">
              <Button onClick={handleListen} size="lg" className="gap-2">
                <Play className="w-4 h-4" />
                Listen {formatDuration(brief.duration)}
              </Button>

              <Button variant="outline" size="lg" className="gap-2" onClick={handleSave}>
                <Bookmark className="w-4 h-4" />
                Save
              </Button>

              <Button variant="outline" size="lg" className="gap-2" onClick={handleDownload}>
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>

            {/* Links */}
            <div className="flex items-center gap-4 mt-4 text-sm">
              <Link
                href={`/briefs/${brief.id}`}
                className="text-primary hover:underline font-medium"
              >
                Read Full Digest →
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
