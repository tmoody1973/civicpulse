'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, SkipForward, SkipBack, Volume2, Download, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TranscriptSegment {
  timestamp: number; // seconds
  speaker: 'sarah' | 'james';
  text: string;
  citation?: {
    source: string;
    url: string;
  };
}

interface EnhancedAudioPlayerProps {
  audioUrl: string;
  title: string;
  transcript?: TranscriptSegment[];
  onEnded?: () => void;
  className?: string;
}

export function EnhancedAudioPlayer({
  audioUrl,
  title,
  transcript = [],
  onEnded,
  className
}: EnhancedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Media Session API for lock screen controls
  useEffect(() => {
    if ('mediaSession' in navigator && audioRef.current) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'HakiVo',
        artwork: [
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
        setPlaying(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setPlaying(false);
      });

      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 15);
        }
      });
    }
  }, [title, duration]);

  // Save/restore playback position
  useEffect(() => {
    const savedPosition = localStorage.getItem(`playback-${audioUrl}`);
    if (savedPosition && audioRef.current) {
      audioRef.current.currentTime = parseFloat(savedPosition);
    }

    return () => {
      if (audioRef.current && currentTime > 0 && currentTime < duration - 5) {
        localStorage.setItem(`playback-${audioUrl}`, currentTime.toString());
      }
    };
  }, [audioUrl, currentTime, duration]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with form inputs
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-15);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(15);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playing]);

  const handlePlayPause = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handlePlaybackRateChange = (rate: string) => {
    const rateValue = parseFloat(rate);
    setPlaybackRate(rateValue);
    if (audioRef.current) {
      audioRef.current.playbackRate = rateValue;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume === 0 ? 1 : volume;
        setIsMuted(false);
        setVolume(volume === 0 ? 1 : volume);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const jumpToTimestamp = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const downloadAudio = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${title}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Find current transcript segment
  const currentSegmentIndex = transcript.findIndex((seg, idx) => {
    const nextTimestamp = transcript[idx + 1]?.timestamp || duration;
    return currentTime >= seg.timestamp && currentTime < nextTimestamp;
  });

  return (
    <div className={cn('space-y-4 p-4 bg-background border rounded-lg', className)}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          localStorage.removeItem(`playback-${audioUrl}`);
          onEnded?.();
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Progress bar */}
      <div className="space-y-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="cursor-pointer"
          aria-label="Seek audio position"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSkip(-15)}
          aria-label="Skip back 15 seconds"
          className="relative"
        >
          <SkipBack className="h-5 w-5" />
          <span className="text-[10px] absolute -bottom-1 font-medium">15</span>
        </Button>

        <Button
          size="lg"
          onClick={handlePlayPause}
          className="w-14 h-14 rounded-full"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSkip(15)}
          aria-label="Skip forward 15 seconds"
          className="relative"
        >
          <SkipForward className="h-5 w-5" />
          <span className="text-[10px] absolute -bottom-1 font-medium">15</span>
        </Button>
      </div>

      {/* Additional controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Volume control */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="flex-shrink-0"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="w-24"
            aria-label="Volume"
          />
        </div>

        {/* Playback speed */}
        <Select value={playbackRate.toString()} onValueChange={handlePlaybackRateChange}>
          <SelectTrigger className="w-[100px]" aria-label="Playback speed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.75">0.75x</SelectItem>
            <SelectItem value="1">1x</SelectItem>
            <SelectItem value="1.25">1.25x</SelectItem>
            <SelectItem value="1.5">1.5x</SelectItem>
            <SelectItem value="2">2x</SelectItem>
          </SelectContent>
        </Select>

        {/* Download button */}
        <Button variant="ghost" size="icon" onClick={downloadAudio} aria-label="Download audio">
          <Download className="h-4 w-4" />
        </Button>

        {/* Toggle transcript */}
        {transcript.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </Button>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-muted-foreground text-center">
        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">Space</span> to play/pause •{' '}
        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">←</span> skip back •{' '}
        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">→</span> skip forward
      </div>

      {/* Transcript with clickable timestamps */}
      {showTranscript && transcript.length > 0 && (
        <div className="mt-6 space-y-3 max-h-96 overflow-y-auto border-t pt-4">
          <h3 className="font-semibold text-sm flex items-center justify-between">
            <span>Transcript</span>
            <span className="text-muted-foreground font-normal">Click to jump to timestamp</span>
          </h3>
          {transcript.map((segment, index) => {
            const isActive = index === currentSegmentIndex;
            return (
              <div
                key={index}
                className={cn(
                  'p-3 rounded-md cursor-pointer transition-colors',
                  isActive
                    ? 'bg-primary/10 border-l-2 border-primary'
                    : 'bg-muted/30 hover:bg-muted/50'
                )}
                onClick={() => jumpToTimestamp(segment.timestamp)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground font-mono flex-shrink-0 mt-0.5">
                    {formatTime(segment.timestamp)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold capitalize block mb-1">
                      {segment.speaker}
                    </span>
                    <p className="text-sm">{segment.text}</p>
                    {segment.citation && (
                      <a
                        href={segment.citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Source: {segment.citation.source}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
