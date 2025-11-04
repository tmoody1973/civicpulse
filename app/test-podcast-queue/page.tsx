/**
 * Test Page for Podcast Actor/Observer Demo
 *
 * Visit: http://localhost:3000/test-podcast-queue
 *
 * This page demonstrates the Actor/Observer pattern for podcast generation
 * Currently using mock responses - will work with real actors after Raindrop deployment
 */

import { PodcastQueueDemo } from '@/components/podcast-queue-demo';

export default function TestPodcastQueuePage() {
  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Podcast Actor Test</h1>
          <p className="text-muted-foreground">
            Demonstrating the Actor/Observer pattern for non-blocking podcast generation
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h2 className="font-semibold mb-2">How This Works:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Click "Generate Podcast" to queue a request</li>
            <li>Get instant feedback with queue position</li>
            <li>Status updates every 5 seconds (simulated)</li>
            <li>Receive notification when ready</li>
            <li>Continue browsing - no blocking! ⚡</li>
          </ol>
        </div>

        {/* Demo Component */}
        <PodcastQueueDemo
          bills={[
            '119-hr-1234',
            '119-s-567',
            '119-hr-890'
          ]}
        />

        {/* Technical Details */}
        <div className="border-t pt-6 space-y-4">
          <h2 className="font-semibold">Technical Details</h2>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Actor:</span> PodcastGenerator
            </div>
            <div>
              <span className="font-medium">Queue:</span> podcast-generation-queue
            </div>
            <div>
              <span className="font-medium">Observer:</span> PodcastQueueHandler
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span className="text-yellow-600 dark:text-yellow-400">
                Using mock responses (Raindrop not deployed yet)
              </span>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <div className="text-green-600 dark:text-green-400"># Test the API directly:</div>
            <div className="mt-2">curl -X POST http://localhost:3000/api/podcasts/queue</div>
            <div className="ml-4">-H &quot;Content-Type: application/json&quot;</div>
            <div className="ml-4">-d {`'{"type":"daily","bills":["119-hr-1234"]}'`}</div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="border-t pt-6 space-y-2">
          <h2 className="font-semibold">Next Steps to Go Live:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Deploy to Raindrop: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">raindrop build deploy</code></li>
            <li>Uncomment actual actor code in API routes</li>
            <li>Test with real podcast generation</li>
            <li>Monitor actor logs: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">raindrop logs --actor podcast-generator</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
