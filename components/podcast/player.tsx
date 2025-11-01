'use client';

import { useEffect } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface PodcastEpisode {
  audioUrl: string;
  title: string;
  type: 'daily' | 'weekly';
  duration: number;
  billsCovered?: Array<{
    id: string;
    title: string;
  }>;
  transcript?: string;
  generatedAt: Date | string;
}

interface PodcastPlayerProps {
  episode: PodcastEpisode;
  onClose?: () => void;
  onEnded?: () => void;
}

export function PodcastPlayer({ episode, onClose, onEnded }: PodcastPlayerProps) {
  // Media Session API for mobile controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: episode.title,
        artist: 'HakiVo',
        album: episode.type === 'daily' ? 'Daily Brief' : 'Weekly Deep Dive',
        artwork: [
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    }
  }, [episode.title, episode.type]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="container mx-auto px-4 py-3">
        {/* Episode info */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-4">
            <div className="font-semibold truncate text-sm sm:text-base">{episode.title}</div>
            <div className="text-xs sm:text-sm text-muted-foreground capitalize">
              {episode.type} Brief
            </div>
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="w-8 h-8 flex-shrink-0"
              aria-label="Close player"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Audio player */}
        <AudioPlayer
          src={episode.audioUrl}
          autoPlay={false}
          showJumpControls={true}
          showSkipControls={false}
          showFilledVolume={true}
          onEnded={onEnded}
          className="shadow-none"
          style={{
            boxShadow: 'none',
            backgroundColor: 'transparent',
          }}
        />
      </div>
    </div>
  );
}
