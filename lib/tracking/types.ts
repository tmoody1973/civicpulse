/**
 * User Interaction Tracking Types
 * Phase 1: Foundation & Memory System
 *
 * Defines interfaces for tracking user behavior across the HakiVo platform
 */

export type InteractionType =
  | 'bill_view'           // User viewed a bill detail page
  | 'bill_track'          // User tracked/untracked a bill
  | 'podcast_listen'      // User listened to a podcast
  | 'podcast_complete'    // User completed a podcast
  | 'podcast_generate'    // User generated a new podcast
  | 'search'              // User performed a search
  | 'chat_query'          // User asked Perplexity AI a question
  | 'news_click'          // User clicked on a news article
  | 'tweet_click'         // User clicked on a representative's tweet
  | 'widget_interact'     // User interacted with a widget
  | 'preference_update'   // User updated their preferences
  | 'page_view'           // User viewed a page
  | 'share'               // User shared content
  | 'download';           // User downloaded content

export interface UserInteraction {
  userId: string;
  interactionType: InteractionType;
  targetId?: string;  // Bill ID, podcast ID, article ID, etc.
  metadata?: Record<string, any>;  // Additional context
  timestamp: Date;
}

export interface TrackingOptions {
  sessionId?: string;  // SmartMemory session ID
  skipMemory?: boolean;  // Skip storing in SmartMemory (for high-frequency events)
  skipDatabase?: boolean;  // Skip storing in database
}

export interface UserBehaviorPattern {
  userId: string;
  policyInterests: string[];  // ['climate', 'healthcare', ...]
  listeningTime?: Date;  // Typical podcast listening time
  listeningDays?: string[];  // ['monday', 'tuesday', ...]
  engagementScore: number;  // 0-100
  completionRate: number;  // 0-1 (percentage of podcasts completed)
  lastActive: Date;
  totalInteractions: number;
}

export interface InteractionContext {
  // User context
  userId: string;
  sessionId?: string;

  // Interaction details
  interactionType: InteractionType;
  targetId?: string;
  targetType?: 'bill' | 'podcast' | 'article' | 'tweet' | 'representative';

  // Metadata
  metadata?: {
    billNumber?: string;
    podcastType?: 'daily' | 'weekly';
    duration?: number;  // seconds
    completionRate?: number;  // 0-1
    source?: string;  // Where interaction originated
    [key: string]: any;
  };

  // Timing
  timestamp?: Date;
}
