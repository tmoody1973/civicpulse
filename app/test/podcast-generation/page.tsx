/**
 * Podcast Generation Test Page
 *
 * Demonstrates the complete user experience during podcast generation.
 * Shows:
 * - Initial state (generate buttons)
 * - Job submission (<1s response)
 * - Progress polling (every 3s)
 * - Progress bar with step-by-step messages
 * - Audio player when complete
 *
 * Access at: http://localhost:3000/test/podcast-generation
 */

import { PodcastGenerationDemo } from '@/components/test/PodcastGenerationDemo';

export default function PodcastGenerationTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Podcast Generation Test
          </h1>
          <p className="text-muted-foreground text-lg">
            Experience the complete user flow from request to audio playback
          </p>
        </div>

        {/* Demo Component */}
        <div className="flex justify-center">
          <PodcastGenerationDemo />
        </div>

        {/* Explanation Section */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-2xl font-semibold">What You'll See</h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                Initial State
              </h3>
              <p className="text-muted-foreground">
                Two buttons: "Generate Daily Podcast" (3 bills) and "Generate Weekly Podcast" (10 bills).
                Click one to start the process.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                Job Submission (&lt;1 second)
              </h3>
              <p className="text-muted-foreground">
                The request is sent to <code className="px-1 py-0.5 rounded bg-muted">/api/generate-podcast</code>.
                You get an instant response with a job ticket (job ID). This solves the timeout problem because
                the API route returns immediately instead of waiting for the entire podcast to be generated.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                Progress Polling (every 3 seconds)
              </h3>
              <p className="text-muted-foreground">
                The component polls <code className="px-1 py-0.5 rounded bg-muted">/api/audio-status/[jobId]</code> every 3 seconds.
                You see real-time progress updates as the background worker processes your request.
              </p>
            </div>

            {/* Step 4 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">4</span>
                Progress Bar (0% → 100%)
              </h3>
              <p className="text-muted-foreground">
                Watch the progress bar move through 5 stages:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>0%:</strong> Job submitted to queue</li>
                <li><strong>20%:</strong> Fetching congressional bills from Congress.gov</li>
                <li><strong>40%:</strong> Generating dialogue script with Claude Sonnet 4</li>
                <li><strong>60%:</strong> Creating audio with ElevenLabs text-to-dialogue</li>
                <li><strong>80%:</strong> Uploading to Vultr CDN</li>
                <li><strong>100%:</strong> Your podcast is ready!</li>
              </ul>
            </div>

            {/* Step 5 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">5</span>
                Audio Player
              </h3>
              <p className="text-muted-foreground">
                When complete, an HTML5 audio player appears with your podcast. You can play, pause, and seek.
                The audio is hosted on Vultr CDN for fast playback worldwide.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Architecture */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Technical Architecture</h2>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Problem Solved</h3>
              <p className="text-sm">
                Podcast generation takes 19-50 seconds. Netlify has a 26-second timeout limit.
                Without the queue pattern, production deployments would fail with timeouts.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Solution</h3>
              <p className="text-sm">
                <strong>Queue-based background jobs using Raindrop Platform:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-4 mt-2">
                <li>User submits request → API returns job ticket immediately (&lt;1s)</li>
                <li>Background worker processes job without timeout limits (19-50s)</li>
                <li>User polls for status every 3 seconds to see progress</li>
                <li>When complete, user gets audio URL and can play podcast</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Why It Works</h3>
              <p className="text-sm">
                The initial request returns in &lt;1 second (within timeout limits).
                The actual processing happens separately in a background worker that has no timeout.
                The polling requests are also fast (&lt;100ms each), so they never timeout.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Stack</h3>
              <ul className="space-y-1 text-sm">
                <li><strong>Queue:</strong> Raindrop Platform queue system</li>
                <li><strong>Worker:</strong> Raindrop Task worker (no timeout limits)</li>
                <li><strong>Cache:</strong> Raindrop KV Cache (job status storage)</li>
                <li><strong>AI:</strong> Claude Sonnet 4 (dialogue generation)</li>
                <li><strong>Voice:</strong> ElevenLabs text-to-dialogue (natural conversations)</li>
                <li><strong>Storage:</strong> Vultr Object Storage + CDN (audio hosting)</li>
                <li><strong>Frontend:</strong> Next.js 16 App Router (polling & UI)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Built for the Liquid Metal Hackathon using Raindrop Platform 🚀</p>
          <p className="mt-1">
            <a href="/" className="underline hover:text-primary">
              Back to Dashboard
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
