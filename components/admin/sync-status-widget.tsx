'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface SyncRun {
  id: number;
  sync_type: string;
  status: 'success' | 'failure' | 'running';
  started_at: string;
  completed_at: string | null;
  run_id: string | null;
  run_url: string | null;
  error_message: string | null;
  bills_fetched: number | null;
  bills_processed: number | null;
}

interface SyncStatusData {
  latest: SyncRun | null;
  history: SyncRun[];
  stats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    successRate: number;
  };
}

export function SyncStatusWidget() {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sync-status');

      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }

      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Running...';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    return `${minutes} min`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      success: 'default',
      failure: 'destructive',
      running: 'secondary'
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Bill Sync Status</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Bill Sync Status</CardTitle>
          <CardDescription className="text-red-500">Error: {error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data || !data.latest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Bill Sync Status</CardTitle>
          <CardDescription>No sync history found. The automated sync will run at 2 AM UTC daily.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { latest, history, stats } = data;

  return (
    <div className="space-y-4">
      {/* Latest Sync Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daily Bill Sync Status</CardTitle>
              <CardDescription>Automated synchronization with Congress.gov</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Last Run */}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Run</div>
              <div className="text-2xl font-bold">{formatDate(latest.started_at)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDuration(latest.started_at, latest.completed_at)} duration
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="flex items-center gap-2 mt-2">
                {getStatusIcon(latest.status)}
                {getStatusBadge(latest.status)}
              </div>
            </div>

            {/* Bills Fetched */}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Bills Fetched</div>
              <div className="text-2xl font-bold">{latest.bills_fetched || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {latest.bills_processed || 0} processed
              </div>
            </div>

            {/* Success Rate */}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.successfulRuns}/{stats.totalRuns} runs
              </div>
            </div>
          </div>

          {/* Error Message */}
          {latest.status === 'failure' && latest.error_message && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-md">
              <div className="text-sm font-medium text-red-800 dark:text-red-200">Error</div>
              <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                {latest.error_message}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {latest.run_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={latest.run_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Logs
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://github.com/YOUR_USERNAME/hakivo/actions/workflows/daily-bill-sync.yml"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Run Manually
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync History</CardTitle>
          <CardDescription>Last 10 automated syncs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(run.status)}
                  <div>
                    <div className="font-medium text-sm">{formatDate(run.started_at)}</div>
                    <div className="text-xs text-muted-foreground">
                      {run.bills_fetched || 0} bills • {formatDuration(run.started_at, run.completed_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(run.status)}
                  {run.run_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={run.run_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                No sync history yet. The first automated sync will run at 2 AM UTC.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
