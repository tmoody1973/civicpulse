'use client';

import { useAudioPlayer } from '@/contexts/audio-player-context';

export function PlayerAwareLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAudioPlayer();

  return (
    <div className={state.isPlayerVisible ? 'pt-20' : ''}>
      {children}
    </div>
  );
}
