/**
 * User Interaction Tracking System
 * Phase 1: Foundation & Memory System
 *
 * Tracks user behavior in SmartMemory and SmartSQL for personalization
 */

import type { SmartMemory, SmartSql } from '@liquidmetal-ai/raindrop-framework';
import type {
  InteractionContext,
  InteractionType,
  TrackingOptions,
  UserBehaviorPattern,
} from './types';

/**
 * Track a user interaction in SmartMemory and/or database
 *
 * @example
 * ```typescript
 * await trackInteraction(env, {
 *   userId: 'user-123',
 *   interactionType: 'bill_view',
 *   targetId: 'hr-3458',
 *   metadata: { billNumber: 'HR-3458', readTime: 45 }
 * });
 * ```
 */
export async function trackInteraction(
  memory: SmartMemory,
  analytics: SmartSql,
  context: InteractionContext,
  options: TrackingOptions = {}
): Promise<void> {
  const {
    userId,
    interactionType,
    targetId,
    targetType,
    metadata = {},
    timestamp = new Date(),
  } = context;

  const { skipMemory = false, skipDatabase = false } = options;

  try {
    // Store in SmartMemory (Working Memory)
    if (!skipMemory) {
      await storeInMemory(memory, userId, context, options.sessionId);
    }

    // Store in Analytics Database
    if (!skipDatabase) {
      await storeInDatabase(analytics, {
        userId,
        interactionType,
        targetId,
        metadata,
        timestamp,
      });
    }
  } catch (error) {
    console.error('Error tracking interaction:', error);
    // Don't throw - tracking errors shouldn't break user experience
  }
}

/**
 * Store interaction in SmartMemory working memory
 */
async function storeInMemory(
  memory: SmartMemory,
  userId: string,
  context: InteractionContext,
  sessionId?: string
): Promise<void> {
  // Get or create session
  let workingMemory;

  if (sessionId) {
    workingMemory = await memory.getWorkingMemorySession(sessionId);
  } else {
    const session = await memory.startWorkingMemorySession();
    workingMemory = session.workingMemory;
  }

  // Create memory entry content
  const content = formatInteractionForMemory(context);

  // Store in working memory
  await workingMemory.putMemory({
    content,
    key: context.interactionType,
    agent: 'tracking_system',
    timeline: `user_${userId}`,
  });
}

/**
 * Store interaction in Analytics database
 */
async function storeInDatabase(
  analytics: SmartSql,
  data: {
    userId: string;
    interactionType: string;
    targetId?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
  }
): Promise<void> {
  // Create table if not exists
  await analytics.executeQuery({
    sqlQuery: `
      CREATE TABLE IF NOT EXISTS user_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        target_id TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
  });

  // Insert interaction
  // SmartSQL doesn't support parameters field - embed values directly
  const escapedUserId = data.userId.replace(/'/g, "''");
  const escapedInteractionType = data.interactionType.replace(/'/g, "''");
  const escapedTargetId = data.targetId ? `'${data.targetId.replace(/'/g, "''")}'` : 'NULL';
  const escapedMetadata = data.metadata ? `'${JSON.stringify(data.metadata).replace(/'/g, "''")}'` : 'NULL';
  const escapedTimestamp = `'${data.timestamp.toISOString()}'`;

  await analytics.executeQuery({
    sqlQuery: `
      INSERT INTO user_interactions (user_id, interaction_type, target_id, metadata, created_at)
      VALUES ('${escapedUserId}', '${escapedInteractionType}', ${escapedTargetId}, ${escapedMetadata}, ${escapedTimestamp})
    `,
  });
}

/**
 * Format interaction for human-readable memory entry
 */
function formatInteractionForMemory(context: InteractionContext): string {
  const { interactionType, targetId, metadata = {} } = context;

  const parts: string[] = [`User ${interactionType.replace('_', ' ')}`];

  if (targetId) {
    parts.push(`on ${targetId}`);
  }

  // Add relevant metadata
  if (metadata.billNumber) {
    parts.push(`(bill: ${metadata.billNumber})`);
  }
  if (metadata.duration) {
    parts.push(`(duration: ${Math.round(metadata.duration)}s)`);
  }
  if (metadata.completionRate !== undefined) {
    parts.push(`(completion: ${Math.round(metadata.completionRate * 100)}%)`);
  }

  return parts.join(' ');
}

/**
 * Get user's behavior pattern from recent interactions
 *
 * @example
 * ```typescript
 * const pattern = await getUserBehaviorPattern(env, 'user-123');
 * console.log(pattern.policyInterests); // ['climate', 'healthcare']
 * console.log(pattern.engagementScore); // 85
 * ```
 */
export async function getUserBehaviorPattern(
  analytics: SmartSql,
  userId: string
): Promise<UserBehaviorPattern | null> {
  try {
    const escapedUserId = userId.replace(/'/g, "''");

    // Query recent interactions
    const result = await analytics.executeQuery({
      sqlQuery: `
        SELECT
          COUNT(*) as total_interactions,
          MAX(created_at) as last_active
        FROM user_interactions
        WHERE user_id = '${escapedUserId}'
        AND created_at > datetime('now', '-30 days')
      `,
    });

    if (!result.results) {
      return null;
    }

    const data = JSON.parse(result.results);
    const row = data[0];

    if (!row || row.total_interactions === 0) {
      return null;
    }

    // Get policy interests from bill interactions
    const interestsResult = await analytics.executeQuery({
      sqlQuery: `
        SELECT DISTINCT json_extract(metadata, '$.policyArea') as policy_area
        FROM user_interactions
        WHERE user_id = '${escapedUserId}'
        AND interaction_type IN ('bill_view', 'bill_track')
        AND json_extract(metadata, '$.policyArea') IS NOT NULL
        LIMIT 10
      `,
    });

    const policyInterests: string[] = [];
    if (interestsResult.results) {
      const interests = JSON.parse(interestsResult.results);
      interests.forEach((i: any) => {
        if (i.policy_area) policyInterests.push(i.policy_area);
      });
    }

    // Calculate engagement score (simplified)
    const engagementScore = Math.min(100, row.total_interactions * 2);

    return {
      userId,
      policyInterests,
      engagementScore,
      completionRate: 0.7, // TODO: Calculate from podcast completion data
      lastActive: new Date(row.last_active),
      totalInteractions: row.total_interactions,
    };
  } catch (error) {
    console.error('Error getting user behavior pattern:', error);
    return null;
  }
}

/**
 * Track bill view interaction
 */
export async function trackBillView(
  memory: SmartMemory,
  analytics: SmartSql,
  userId: string,
  billId: string,
  metadata: { billNumber?: string; policyArea?: string; readTime?: number } = {}
): Promise<void> {
  await trackInteraction(memory, analytics, {
    userId,
    interactionType: 'bill_view',
    targetId: billId,
    targetType: 'bill',
    metadata,
  });
}

/**
 * Track podcast listen interaction
 */
export async function trackPodcastListen(
  memory: SmartMemory,
  analytics: SmartSql,
  userId: string,
  podcastId: string,
  metadata: {
    podcastType?: 'daily' | 'weekly';
    duration?: number;
    completionRate?: number;
  } = {}
): Promise<void> {
  const interactionType = metadata.completionRate && metadata.completionRate > 0.9
    ? 'podcast_complete'
    : 'podcast_listen';

  await trackInteraction(memory, analytics, {
    userId,
    interactionType,
    targetId: podcastId,
    targetType: 'podcast',
    metadata,
  });
}

/**
 * Track search query
 */
export async function trackSearch(
  memory: SmartMemory,
  analytics: SmartSql,
  userId: string,
  query: string,
  metadata: { resultCount?: number; clickedResult?: string } = {}
): Promise<void> {
  await trackInteraction(memory, analytics, {
    userId,
    interactionType: 'search',
    targetId: query,
    metadata,
  });
}

/**
 * Track Perplexity AI chat query
 */
export async function trackChatQuery(
  memory: SmartMemory,
  analytics: SmartSql,
  userId: string,
  query: string,
  metadata: { responseTime?: number; satisfied?: boolean } = {}
): Promise<void> {
  await trackInteraction(memory, analytics, {
    userId,
    interactionType: 'chat_query',
    targetId: query,
    metadata,
  });
}
