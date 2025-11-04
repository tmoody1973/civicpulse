'use client';

import { useAudioPlayer } from '@/contexts/audio-player-context';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, X, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function PersistentPlayer() {
  const { state, togglePlay, seek, setVolume, skipForward, skipBackward, hidePlayer } = useAudioPlayer();
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);

  // Don't render if no brief is loaded or player is hidden
  if (!state.currentBrief || !state.isPlayerVisible) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(state.volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-md animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Brief Info */}
          <Link
            href={`/briefs/${state.currentBrief.id}`}
            className="flex items-center gap-3 min-w-0 flex-shrink hover:opacity-80 transition-opacity"
          >
            {state.currentBrief.featured_image_url && (
              <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                <Image
                  src={state.currentBrief.featured_image_url}
                  alt={state.currentBrief.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{state.currentBrief.title}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {state.currentBrief.type} Brief
              </p>
            </div>
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Skip Back */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => skipBackward(15)}
              aria-label="Skip back 15 seconds"
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlay}
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </Button>

            {/* Skip Forward */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => skipForward(15)}
              aria-label="Skip forward 15 seconds"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 min-w-0 hidden md:flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(state.currentTime)}
            </span>
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              className="flex-1"
              onValueChange={(value) => {
                const newTime = (value[0] / 100) * state.duration;
                seek(newTime);
              }}
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(state.duration)}
            </span>
          </div>

          {/* Volume Control - Desktop only */}
          <div className="hidden lg:flex items-center gap-2 w-32 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleVolumeToggle}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || state.volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : state.volume * 100]}
              max={100}
              step={1}
              className="flex-1"
              onValueChange={(value) => handleVolumeChange([value[0] / 100])}
            />
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={hidePlayer}
            aria-label="Close player"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile Progress Bar */}
        <div className="md:hidden mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(state.currentTime)}
          </span>
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            className="flex-1"
            onValueChange={(value) => {
              const newTime = (value[0] / 100) * state.duration;
              seek(newTime);
            }}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(state.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
