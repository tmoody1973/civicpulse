/**
 * Shared types for Raindrop Actor/Observer system
 */

export interface PodcastRequest {
  id: string;
  type: 'daily' | 'weekly';
  bills: string[];
  userId: string;
  timestamp: number;
  actorId?: string;
}

export interface GenerationStatus {
  podcastId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queuePosition?: number;
  startedAt?: number;
  completedAt?: number;
  audioUrl?: string;
  transcript?: string;
  duration?: number;
  error?: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'podcast_ready' | 'bill_update' | 'daily_brief';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: number;
}

export interface PodcastDialogue {
  host: 'sarah' | 'james';
  text: string;
}[]

export interface VultrUploadOptions {
  key: string;
  contentType: string;
  metadata?: Record<string, string>;
}
