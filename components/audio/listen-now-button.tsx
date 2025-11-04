'use client';

import { useAudioPlayer, Brief } from '@/contexts/audio-player-context';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListenNowButtonProps {
  brief: Brief;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

export function ListenNowButton({
  brief,
  variant = 'outline',
  size = 'default',
  className,
  showIcon = true,
  showText = true,
}: ListenNowButtonProps) {
  const { state, loadBrief, togglePlay } = useAudioPlayer();

  // Check if this is the currently playing brief
  const isCurrentBrief = state.currentBrief?.id === brief.id;
  const isPlaying = isCurrentBrief && state.isPlaying;

  const handleClick = () => {
    if (isCurrentBrief) {
      // If this brief is already loaded, just toggle play/pause
      togglePlay();
    } else {
      // Load and play this brief
      loadBrief(brief);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
      onClick={handleClick}
      aria-label={isPlaying ? 'Pause' : 'Listen Now'}
    >
      {showIcon && (
        <>
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
        </>
      )}
      {showText && <span>{isPlaying ? 'Pause' : 'Listen Now'}</span>}
    </Button>
  );
}
