/**
 * Podcast Generator Actor
 *
 * Manages user's podcast generation queue with persistent state
 * Each user gets their own actor instance for isolation
 *
 * Usage:
 *   const actorId = env.PODCAST_GENERATOR.idFromName(userId);
 *   const actor = env.PODCAST_GENERATOR.get(actorId);
 *   await actor.queuePodcast({ type: 'daily', bills: [...] });
 */

import { Actor, ActorState, Queue } from '@liquidmetal-ai/raindrop-framework';
import { PodcastRequest, GenerationStatus } from '../types';

interface Env {
  PODCAST_GENERATION_QUEUE: Queue;
  // Add other environment bindings as needed
}

export default class PodcastGenerator extends Actor<Env> {
  constructor(state: ActorState, env: Env) {
    super(state, env);
  }

  /**
   * Queue a new podcast generation request
   * Returns the position in queue
   */
  async queuePodcast(request: Omit<PodcastRequest, 'id' | 'timestamp' | 'actorId'>): Promise<{
    podcastId: string;
    queuePosition: number;
    estimatedSeconds: number;
  }> {
    const podcastId = `podcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fullRequest: PodcastRequest = {
      ...request,
      id: podcastId,
      timestamp: Date.now(),
      actorId: this.state.id.toString()
    };

    // Get current queue
    const queue = await this.state.storage.get<PodcastRequest[]>('queue') || [];

    // Add to queue
    queue.push(fullRequest);
    await this.state.storage.put('queue', queue);

    // Create status entry
    const status: GenerationStatus = {
      podcastId,
      status: 'queued',
      queuePosition: queue.length
    };
    await this.state.storage.put(`status:${podcastId}`, status);

    // Send to processing queue
    await this.env.PODCAST_GENERATION_QUEUE.send({
      ...fullRequest,
      actorId: this.state.id.toString()
    });

    console.log(`[PodcastGenerator] Queued podcast ${podcastId} at position ${queue.length} for user ${request.userId}`);

    return {
      podcastId,
      queuePosition: queue.length,
      estimatedSeconds: queue.length * 45 // ~45 seconds per podcast
    };
  }

  /**
   * Get status of a specific podcast
   */
  async getStatus(podcastId: string): Promise<GenerationStatus | null> {
    const status = await this.state.storage.get<GenerationStatus>(`status:${podcastId}`);
    return status || null;
  }

  /**
   * Get all pending podcasts in queue
   */
  async getQueue(): Promise<PodcastRequest[]> {
    return await this.state.storage.get<PodcastRequest[]>('queue') || [];
  }

  /**
   * Get generation history (last 10 podcasts)
   */
  async getHistory(): Promise<GenerationStatus[]> {
    const history = await this.state.storage.get<GenerationStatus[]>('history') || [];
    return history.slice(0, 10);
  }

  /**
   * Get latest completed podcast
   */
  async getLatest(): Promise<GenerationStatus | null> {
    const history = await this.state.storage.get<GenerationStatus[]>('history') || [];
    const completed = history.filter(h => h.status === 'completed');
    return completed.length > 0 ? completed[0] : null;
  }

  /**
   * Update status when generation progresses
   * Called by the observer during processing
   */
  async updateStatus(podcastId: string, updates: Partial<GenerationStatus>): Promise<void> {
    const status = await this.state.storage.get<GenerationStatus>(`status:${podcastId}`);

    if (!status) {
      console.error(`[PodcastGenerator] Status not found for podcast ${podcastId}`);
      return;
    }

    const updatedStatus: GenerationStatus = {
      ...status,
      ...updates
    };

    await this.state.storage.put(`status:${podcastId}`, updatedStatus);

    // If completed or failed, move to history
    if (updatedStatus.status === 'completed' || updatedStatus.status === 'failed') {
      // Add to history
      const history = await this.state.storage.get<GenerationStatus[]>('history') || [];
      history.unshift(updatedStatus); // Add to beginning
      await this.state.storage.put('history', history.slice(0, 10)); // Keep last 10

      // Remove from active queue
      const queue = await this.state.storage.get<PodcastRequest[]>('queue') || [];
      const filteredQueue = queue.filter(r => r.id !== podcastId);
      await this.state.storage.put('queue', filteredQueue);

      // Update queue positions for remaining items
      const updatedQueue = await this.state.storage.get<PodcastRequest[]>('queue') || [];
      for (let i = 0; i < updatedQueue.length; i++) {
        const request = updatedQueue[i];
        const reqStatus = await this.state.storage.get<GenerationStatus>(`status:${request.id}`);
        if (reqStatus && reqStatus.status === 'queued') {
          await this.state.storage.put(`status:${request.id}`, {
            ...reqStatus,
            queuePosition: i + 1
          });
        }
      }
    }

    console.log(`[PodcastGenerator] Updated podcast ${podcastId} to status: ${updatedStatus.status}`);
  }

  /**
   * Cancel a queued podcast
   * Returns true if successfully cancelled, false if not found or already processing
   */
  async cancel(podcastId: string): Promise<boolean> {
    const status = await this.state.storage.get<GenerationStatus>(`status:${podcastId}`);

    if (!status) {
      return false;
    }

    // Can only cancel if still queued
    if (status.status !== 'queued') {
      return false;
    }

    // Remove from queue
    const queue = await this.state.storage.get<PodcastRequest[]>('queue') || [];
    const filteredQueue = queue.filter(r => r.id !== podcastId);
    await this.state.storage.put('queue', filteredQueue);

    // Mark as failed/cancelled
    await this.updateStatus(podcastId, {
      status: 'failed',
      error: 'Cancelled by user',
      completedAt: Date.now()
    });

    console.log(`[PodcastGenerator] Cancelled podcast ${podcastId}`);

    return true;
  }

  /**
   * Clear history
   */
  async clearHistory(): Promise<void> {
    await this.state.storage.put('history', []);
    console.log(`[PodcastGenerator] Cleared history`);
  }

  /**
   * Get actor statistics
   */
  async getStats(): Promise<{
    queueLength: number;
    totalGenerated: number;
    successRate: number;
  }> {
    const queue = await this.state.storage.get<PodcastRequest[]>('queue') || [];
    const history = await this.state.storage.get<GenerationStatus[]>('history') || [];

    const totalGenerated = history.length;
    const successful = history.filter(h => h.status === 'completed').length;
    const successRate = totalGenerated > 0 ? (successful / totalGenerated) * 100 : 100;

    return {
      queueLength: queue.length,
      totalGenerated,
      successRate: Math.round(successRate * 10) / 10
    };
  }
}
