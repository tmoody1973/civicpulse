'use client';

/**
 * Bull Board Dashboard
 *
 * Simple redirect to inform users about Bull Board access
 *
 * For now, use Redis CLI or Bull Board in a separate process
 */

export default function BullBoardPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4">Bull Board Dashboard</h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">🎯 Queue Monitoring Options</h2>
          <p className="text-blue-800">
            Monitor your brief generation jobs using these methods:
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Option 1: Worker Logs</h3>
            <p className="text-gray-600 mb-2">
              The worker process (`npm run worker`) shows real-time progress in the console:
            </p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              <code>{`▶️  Job brief-user_123-456 started
📋 Fetching user preferences...
   Progress: 20%
📰 Fetching news articles...
   Found 10 news articles
   Progress: 40%
🎵 Generating audio...`}</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Option 2: Job Status API</h3>
            <p className="text-gray-600 mb-2">
              Query job status programmatically:
            </p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              <code>{`GET /api/briefs/status/:jobId

Response:
{
  "jobId": "brief-user_123-456",
  "progress": 60,
  "status": "active",
  "data": {
    "userId": "user_123",
    "userEmail": "user@example.com"
  }
}`}</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Option 3: Redis CLI</h3>
            <p className="text-gray-600 mb-2">
              Check queues directly in Redis:
            </p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              <code>{`redis-cli
> LLEN bull:brief-generation:waiting
> LLEN bull:brief-generation:active
> LLEN bull:brief-generation:completed
> LLEN bull:brief-generation:failed`}</code>
            </pre>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">ℹ️  Why No UI Dashboard?</h3>
            <p className="text-yellow-800 text-sm">
              Bull Board UI requires complex Express middleware integration that doesn't work seamlessly with Next.js App Router.
              The worker logs and status API provide real-time monitoring without the complexity.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold mb-3">Current Queue Stats</h3>
          <QueueStats />
        </div>
      </div>
    </div>
  );
}

function QueueStats() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="text-2xl font-bold text-blue-900">Check Logs</div>
        <div className="text-sm text-blue-700">npm run worker</div>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="text-2xl font-bold text-green-900">Status API</div>
        <div className="text-sm text-green-700">/api/briefs/status/:id</div>
      </div>
    </div>
  );
}
