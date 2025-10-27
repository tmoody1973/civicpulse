'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Play, FileText } from 'lucide-react';
import type { PodcastEpisode } from './player';

interface EpisodeCardProps {
  episode: PodcastEpisode;
  onPlay: () => void;
  onViewTranscript?: () => void;
  compact?: boolean;
}

export function EpisodeCard({ episode, onPlay, onViewTranscript, compact = false }: EpisodeCardProps) {
  const formattedDate = new Date(episode.generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: compact ? undefined : 'numeric',
  });

  const formattedTime = new Date(episode.generatedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors cursor-pointer" onClick={onPlay}>
        <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
          <Play className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{episode.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{Math.round(episode.duration / 60)} min</span>
          </div>
        </div>
        <Badge variant={episode.type === 'daily' ? 'default' : 'secondary'} className="capitalize text-xs flex-shrink-0">
          {episode.type}
        </Badge>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base sm:text-lg">{episode.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formattedDate}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{Math.round(episode.duration / 60)} min</span>
              </div>
            </div>
          </div>
          <Badge variant={episode.type === 'daily' ? 'default' : 'secondary'} className="capitalize flex-shrink-0">
            {episode.type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bills Covered */}
        {episode.billsCovered && episode.billsCovered.length > 0 && (
          <div>
            <p className="text-xs sm:text-sm font-medium mb-2">Bills Covered:</p>
            <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
              {episode.billsCovered.slice(0, 3).map((bill) => (
                <li key={bill.id} className="truncate">
                  • {bill.title}
                </li>
              ))}
              {episode.billsCovered.length > 3 && (
                <li className="text-xs italic">
                  + {episode.billsCovered.length - 3} more bill{episode.billsCovered.length - 3 > 1 ? 's' : ''}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={onPlay} className="flex-1" size="sm">
            <Play className="w-4 h-4 mr-2" />
            Listen Now
          </Button>
          {onViewTranscript && episode.transcript && (
            <Button onClick={onViewTranscript} variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Transcript</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
