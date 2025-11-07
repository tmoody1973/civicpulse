'use client';

/**
 * Podcast Generation Test Component
 *
 * Demonstrates what users see during podcast generation:
 * 1. Initial button state
 * 2. Job submission (<1s)
 * 3. Progress polling (every 3s)
 * 4. Progress bar with messages
 * 5. Audio player when complete
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, CheckCircle2, XCircle } from 'lucide-react';

type JobStatus = {
  jobId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  progress: number;
  message: string;
  audioUrl?: string;
  duration?: number;
  error?: string;
};

export function PodcastGenerationDemo() {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Submit podcast generation job
  const handleGeneratePodcast = async (type: 'daily' | 'weekly') => {
    setIsSubmitting(true);
    setError(null);
    setJobStatus(null);

    try {
      console.log(`📻 Submitting ${type} podcast generation request...`);

      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate podcast');
      }

      const data = await response.json();
      console.log('✅ Job submitted:', data);

      // Initialize job status
      setJobStatus({
        jobId: data.jobId,
        status: 'queued',
        progress: 0,
        message: data.message,
      });

      // Start polling for status
      startPolling(data.jobId);

    } catch (err: any) {
      console.error('❌ Error submitting job:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Poll for job status every 3 seconds
  const startPolling = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        console.log(`📊 Polling status for job: ${jobId}`);

        const response = await fetch(`/api/audio-status/${jobId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch status');
        }

        const data = await response.json();
        console.log('📊 Status update:', data);

        setJobStatus({
          jobId: data.jobId,
          status: data.status,
          progress: data.progress,
          message: data.message,
          audioUrl: data.audioUrl,
          duration: data.duration,
          error: data.error,
        });

        // Stop polling if job is complete or failed
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(pollInterval);
          console.log(`✅ Polling stopped: Job ${data.status}`);
        }

      } catch (err: any) {
        console.error('❌ Error polling status:', err);
        setError(err.message);
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds
  };

  // Format duration (seconds → MM:SS)
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Podcast Generation Test</CardTitle>
        <CardDescription>
          Click a button to see the complete user experience during podcast generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Initial State: Generate Buttons */}
        {!jobStatus && !error && (
          <div className="flex gap-4">
            <Button
              onClick={() => handleGeneratePodcast('daily')}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Generate Daily Podcast (3 bills)'
              )}
            </Button>
            <Button
              onClick={() => handleGeneratePodcast('weekly')}
              disabled={isSubmitting}
              variant="outline"
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Generate Weekly Podcast (10 bills)'
              )}
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Processing State: Progress Bar */}
        {jobStatus && jobStatus.status !== 'complete' && jobStatus.status !== 'failed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{jobStatus.message}</p>
                <p className="text-xs text-muted-foreground">Job ID: {jobStatus.jobId}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={jobStatus.progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {jobStatus.progress}% complete
              </p>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                <strong>What's happening:</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  {jobStatus.progress >= 0 && <li>✅ Job submitted to queue</li>}
                  {jobStatus.progress >= 20 && <li>✅ Fetching congressional bills</li>}
                  {jobStatus.progress >= 40 && <li>✅ Generating dialogue script with Claude AI</li>}
                  {jobStatus.progress >= 60 && <li>✅ Creating audio with ElevenLabs (text-to-dialogue)</li>}
                  {jobStatus.progress >= 80 && <li>✅ Uploading to Vultr CDN</li>}
                  {jobStatus.progress < 20 && <li className="text-muted-foreground">⏳ Fetching congressional bills...</li>}
                  {jobStatus.progress >= 20 && jobStatus.progress < 40 && <li className="text-muted-foreground">⏳ Generating dialogue script with Claude AI...</li>}
                  {jobStatus.progress >= 40 && jobStatus.progress < 60 && <li className="text-muted-foreground">⏳ Creating audio with ElevenLabs...</li>}
                  {jobStatus.progress >= 60 && jobStatus.progress < 80 && <li className="text-muted-foreground">⏳ Uploading to Vultr CDN...</li>}
                  {jobStatus.progress >= 80 && jobStatus.progress < 100 && <li className="text-muted-foreground">⏳ Finalizing podcast...</li>}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Complete State: Audio Player */}
        {jobStatus && jobStatus.status === 'complete' && jobStatus.audioUrl && (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>{jobStatus.message}</strong>
                <p className="mt-1 text-sm">Duration: {formatDuration(jobStatus.duration)}</p>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <Play className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Your Podcast is Ready</h3>
              </div>

              <audio controls className="w-full" src={jobStatus.audioUrl}>
                Your browser does not support the audio element.
              </audio>

              <div className="mt-3 text-xs text-muted-foreground">
                <p>Job ID: {jobStatus.jobId}</p>
                <p>Audio URL: {jobStatus.audioUrl}</p>
              </div>
            </div>

            <Button
              onClick={() => setJobStatus(null)}
              variant="outline"
              className="w-full"
            >
              Generate Another Podcast
            </Button>
          </div>
        )}

        {/* Failed State */}
        {jobStatus && jobStatus.status === 'failed' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Podcast generation failed</strong>
                {jobStatus.error && <p className="mt-1 text-sm">{jobStatus.error}</p>}
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => setJobStatus(null)}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Technical Details */}
        <div className="rounded-lg bg-muted p-4 text-xs space-y-2">
          <h4 className="font-semibold text-sm">Technical Details:</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li><strong>Submission:</strong> Instant (&lt;1s) - Job queued immediately</li>
            <li><strong>Polling:</strong> Every 3 seconds - Check job status</li>
            <li><strong>Processing:</strong> 19-50s total - No timeout on background worker</li>
            <li><strong>Progress:</strong> 5 steps (0%, 20%, 40%, 60%, 80%, 100%)</li>
            <li><strong>Architecture:</strong> Raindrop queue-based background jobs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
