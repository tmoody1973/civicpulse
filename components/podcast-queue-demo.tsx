/**
 * Podcast Queue Demo Component
 *
 * Demonstrates the Actor/Observer pattern for podcast generation
 * Shows queue status, real-time updates, and completed podcasts
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, Play, X } from 'lucide-react';

interface QueueStatus {
  podcastId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queuePosition?: number;
  estimatedSeconds?: number;
  audioUrl?: string;
  error?: string;
}

export function PodcastQueueDemo({ bills = [] }: { bills?: string[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<QueueStatus | null>(null);
  const [history, setHistory] = useState<QueueStatus[]>([]);

  // Poll for status updates when podcast is queued or processing
  useEffect(() => {
    if (!currentStatus || !currentStatus.podcastId) return;
    if (currentStatus.status === 'completed' || currentStatus.status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/podcasts/status/${currentStatus.podcastId}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentStatus(data);

          // If completed, add to history
          if (data.status === 'completed' || data.status === 'failed') {
            setHistory(prev => [data, ...prev].slice(0, 10));

            // Show notification
            if (data.status === 'completed' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Your podcast is ready! 🎧', {
                body: 'Click to listen to your personalized brief',
                icon: '/icon-192.png'
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [currentStatus]);

  async function handleGenerate() {
    setIsGenerating(true);

    try {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      const response = await fetch('/api/podcasts/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily',
          bills: bills.length > 0 ? bills : ['119-hr-1234', '119-s-567'] // Demo bills
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentStatus({
          podcastId: data.podcastId,
          status: 'queued',
          queuePosition: data.queuePosition,
          estimatedSeconds: data.estimatedTime.seconds
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to queue podcast');
      }
    } catch (error) {
      console.error('Generate error:', error);
      alert('Failed to generate podcast. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCancel(podcastId: string) {
    try {
      const response = await fetch(`/api/podcasts/status/${podcastId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCurrentStatus(null);
      }
    } catch (error) {
      console.error('Cancel error:', error);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Podcast Generator</CardTitle>
          <CardDescription>
            Queue-based podcast generation with real-time status updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentStatus ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a personalized podcast about recent bills. Your request will be queued and processed in the background.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Queueing...
                  </>
                ) : (
                  'Generate Podcast'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Queued */}
              {currentStatus.status === 'queued' && (
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Queued</span>
                      <Badge variant="outline">Position #{currentStatus.queuePosition}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Estimated time: ~{Math.ceil((currentStatus.estimatedSeconds || 0) / 60)} minute
                      {Math.ceil((currentStatus.estimatedSeconds || 0) / 60) > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancel(currentStatus.podcastId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Processing */}
              {currentStatus.status === 'processing' && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="font-medium">Generating your podcast...</span>
                </div>
              )}

              {/* Completed */}
              {currentStatus.status === 'completed' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Your podcast is ready!</span>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => {
                      // TODO: Play podcast
                      window.open(currentStatus.audioUrl, '_blank');
                    }}>
                      <Play className="mr-2 h-4 w-4" />
                      Listen Now
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentStatus(null)}>
                      Generate Another
                    </Button>
                  </div>
                </div>
              )}

              {/* Failed */}
              {currentStatus.status === 'failed' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Generation failed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentStatus.error || 'An error occurred. Please try again.'}
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setCurrentStatus(null)}>
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Podcasts</CardTitle>
            <CardDescription>Your last {history.length} generated podcasts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.podcastId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {item.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {item.status === 'failed' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {new Date(parseInt(item.podcastId.split('-')[1])).toLocaleString()}
                    </span>
                  </div>
                  {item.status === 'completed' && item.audioUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(item.audioUrl, '_blank')}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
