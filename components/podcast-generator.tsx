'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Radio, FileAudio } from 'lucide-react';

interface PodcastResponse {
  success: boolean;
  audioUrl: string;
  duration: number;
  billsCovered: Array<{
    id: string;
    title: string;
    sponsor: string;
  }>;
  transcript: string;
  generationTimeMs: number;
  type: string;
}

export function PodcastGenerator() {
  const [loading, setLoading] = useState(false);
  const [podcast, setPodcast] = useState<PodcastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePodcast = async (type: 'daily' | 'weekly') => {
    setLoading(true);
    setError(null);
    setPodcast(null);

    try {
      const response = await fetch('/api/briefs/generate-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate podcast');
      }

      setPodcast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-6 h-6" />
          Generate Your HakiVo Podcast
        </CardTitle>
        <CardDescription>
          AI-powered audio briefings on the latest legislation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button
            onClick={() => generatePodcast('daily')}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileAudio className="w-4 h-4 mr-2" />
            )}
            Generate Daily Brief (8-12 min)
          </Button>
          <Button
            onClick={() => generatePodcast('weekly')}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileAudio className="w-4 h-4 mr-2" />
            )}
            Generate Weekly Deep Dive (10-12 min)
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {podcast && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Success!</strong> Podcast generated in{' '}
                {(podcast.generationTimeMs / 1000).toFixed(2)}s
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Podcast Details</h3>
              <p className="text-sm text-muted-foreground">
                Duration: ~{podcast.duration} seconds | Type: {podcast.type}
              </p>

              {podcast.billsCovered.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Bills Covered:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {podcast.billsCovered.map((bill) => (
                      <li key={bill.id}>
                        {bill.id}: {bill.title} (Sponsor: {bill.sponsor})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-1">Transcript Preview:</h4>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {podcast.transcript.slice(0, 500)}
                  {podcast.transcript.length > 500 && '...'}
                </div>
              </div>

              {podcast.audioUrl && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Listen to Your Podcast:</h4>
                  <audio controls className="w-full">
                    <source src={podcast.audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <p className="text-xs text-muted-foreground mt-2">
                    Audio URL: <code className="bg-muted px-1 py-0.5 rounded">{podcast.audioUrl}</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p>
            <strong>Status:</strong> Using real APIs! ✅
          </p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>✅ Congress.gov - Fetching real legislation</li>
            <li>✅ Claude Haiku 4.5 - Generating natural dialogue</li>
            <li>✅ ElevenLabs - Creating voice audio</li>
            <li>✅ Vultr Storage - Configured for audio hosting</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
