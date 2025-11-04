'use client';

import React, { createContext, useContext, useReducer, useRef, useEffect } from 'react';

// Brief type definition
export interface Brief {
  id: string;
  title: string;
  audio_url: string;
  featured_image_url: string | null;
  duration: number;
  type: 'daily' | 'weekly';
  generated_at: string;
}

// Audio player state
interface AudioPlayerState {
  currentBrief: Brief | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isPlayerVisible: boolean;
}

// Audio player actions
type AudioPlayerAction =
  | { type: 'LOAD_BRIEF'; payload: Brief }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_PLAYBACK_RATE'; payload: number }
  | { type: 'SKIP_FORWARD'; payload: number }
  | { type: 'SKIP_BACKWARD'; payload: number }
  | { type: 'SHOW_PLAYER' }
  | { type: 'HIDE_PLAYER' }
  | { type: 'RESTORE_STATE'; payload: Partial<AudioPlayerState> };

// Context value type
interface AudioPlayerContextValue {
  state: AudioPlayerState;
  loadBrief: (brief: Brief) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  showPlayer: () => void;
  hidePlayer: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

// Create context
const AudioPlayerContext = createContext<AudioPlayerContextValue | undefined>(undefined);

// Reducer
function audioReducer(state: AudioPlayerState, action: AudioPlayerAction): AudioPlayerState {
  switch (action.type) {
    case 'LOAD_BRIEF':
      return {
        ...state,
        currentBrief: action.payload,
        isPlaying: true,
        currentTime: 0,
        isPlayerVisible: true,
      };
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.payload };
    case 'SKIP_FORWARD':
      return { ...state, currentTime: Math.min(state.currentTime + action.payload, state.duration) };
    case 'SKIP_BACKWARD':
      return { ...state, currentTime: Math.max(state.currentTime - action.payload, 0) };
    case 'SHOW_PLAYER':
      return { ...state, isPlayerVisible: true };
    case 'HIDE_PLAYER':
      return { ...state, isPlayerVisible: false };
    case 'RESTORE_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Provider component
export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(audioReducer, {
    currentBrief: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isPlayerVisible: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('hakivo-audio-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({
          type: 'RESTORE_STATE',
          payload: {
            currentBrief: parsed.currentBrief,
            currentTime: parsed.currentTime,
            volume: parsed.volume,
            playbackRate: parsed.playbackRate,
            isPlayerVisible: parsed.currentBrief ? true : false,
          },
        });
      } catch (error) {
        console.error('Failed to restore audio state:', error);
      }
    }
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    if (state.currentBrief) {
      localStorage.setItem(
        'hakivo-audio-state',
        JSON.stringify({
          currentBrief: state.currentBrief,
          currentTime: state.currentTime,
          volume: state.volume,
          playbackRate: state.playbackRate,
        })
      );
    }
  }, [state.currentBrief, state.currentTime, state.volume, state.playbackRate]);

  // Sync state across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hakivo-audio-state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          dispatch({
            type: 'RESTORE_STATE',
            payload: {
              currentBrief: parsed.currentBrief,
              currentTime: parsed.currentTime,
              volume: parsed.volume,
              playbackRate: parsed.playbackRate,
            },
          });
        } catch (error) {
          console.error('Failed to sync audio state across tabs:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Media Session API for mobile controls
  useEffect(() => {
    if ('mediaSession' in navigator && state.currentBrief) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.currentBrief.title,
        artist: 'HakiVo Daily Brief',
        artwork: state.currentBrief.featured_image_url
          ? [{ src: state.currentBrief.featured_image_url, sizes: '512x512', type: 'image/jpeg' }]
          : undefined,
      });

      navigator.mediaSession.setActionHandler('play', () => {
        dispatch({ type: 'PLAY' });
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        dispatch({ type: 'PAUSE' });
      });

      navigator.mediaSession.setActionHandler('seekbackward', () => {
        dispatch({ type: 'SKIP_BACKWARD', payload: 15 });
      });

      navigator.mediaSession.setActionHandler('seekforward', () => {
        dispatch({ type: 'SKIP_FORWARD', payload: 15 });
      });
    }
  }, [state.currentBrief]);

  // Sync audio element with state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.isPlaying) {
      audio.play().catch((error) => {
        console.error('Playback failed:', error);
        dispatch({ type: 'PAUSE' });
      });
    } else {
      audio.pause();
    }
  }, [state.isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = state.volume;
  }, [state.volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = state.playbackRate;
  }, [state.playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Math.abs(audio.currentTime - state.currentTime) > 1) {
      audio.currentTime = state.currentTime;
    }
  }, [state.currentTime]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      dispatch({ type: 'SET_TIME', payload: audio.currentTime });
    };

    const handleDurationChange = () => {
      dispatch({ type: 'SET_DURATION', payload: audio.duration });
    };

    const handleLoadedMetadata = () => {
      // Also set duration when metadata is loaded
      if (audio.duration && !isNaN(audio.duration)) {
        dispatch({ type: 'SET_DURATION', payload: audio.duration });
      }
    };

    const handleEnded = () => {
      dispatch({ type: 'PAUSE' });
      dispatch({ type: 'SET_TIME', payload: 0 });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // Manually trigger duration update if already loaded
    if (audio.duration && !isNaN(audio.duration)) {
      dispatch({ type: 'SET_DURATION', payload: audio.duration });
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [state.currentBrief]);

  // Context value
  const value: AudioPlayerContextValue = {
    state,
    loadBrief: (brief) => dispatch({ type: 'LOAD_BRIEF', payload: brief }),
    play: () => dispatch({ type: 'PLAY' }),
    pause: () => dispatch({ type: 'PAUSE' }),
    togglePlay: () => dispatch({ type: 'TOGGLE_PLAY' }),
    seek: (time) => dispatch({ type: 'SET_TIME', payload: time }),
    setVolume: (volume) => dispatch({ type: 'SET_VOLUME', payload: volume }),
    setPlaybackRate: (rate) => dispatch({ type: 'SET_PLAYBACK_RATE', payload: rate }),
    skipForward: (seconds) => dispatch({ type: 'SKIP_FORWARD', payload: seconds }),
    skipBackward: (seconds) => dispatch({ type: 'SKIP_BACKWARD', payload: seconds }),
    showPlayer: () => dispatch({ type: 'SHOW_PLAYER' }),
    hidePlayer: () => dispatch({ type: 'HIDE_PLAYER' }),
    audioRef,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      {/* Hidden audio element */}
      {state.currentBrief && (
        <audio
          ref={audioRef}
          src={state.currentBrief.audio_url}
          preload="metadata"
          style={{ display: 'none' }}
        />
      )}
    </AudioPlayerContext.Provider>
  );
}

// Custom hook
export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
