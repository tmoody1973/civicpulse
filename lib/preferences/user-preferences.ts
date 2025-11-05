/**
 * User Preference Management System
 * Phase 1: Foundation & Memory System
 *
 * Manages user preferences in SmartSQL and SmartMemory
 * IMPORTANT: Always respects user's elected officials from onboarding
 */

import type { SmartMemory, SmartSql } from '@liquidmetal-ai/raindrop-framework';
import type {
  UserProfile,
  WidgetPreferences,
  PreferenceUpdateContext,
  DefaultPreferences,
  WidgetType,
} from './types';

/**
 * Get user's complete profile with preferences
 *
 * @example
 * ```typescript
 * const profile = await getUserProfile(analytics, memory, 'user-123');
 * console.log(profile.policyInterests); // ['climate', 'healthcare']
 * console.log(profile.representatives); // [{ name: 'Elizabeth Warren', ... }]
 * ```
 */
export async function getUserProfile(
  analytics: SmartSql,
  memory: SmartMemory,
  userId: string,
  civicDb?: any // ✅ Optional: Pass to enable automatic migration
): Promise<UserProfile | null> {
  try {
    // Ensure table exists
    await initializePreferencesTable(analytics);

    // Query user profile
    const result = await analytics.executeQuery({
      sqlQuery: `
        SELECT
          user_id,
          first_name,
          last_name,
          preferred_language,
          policy_interests,
          representatives,
          location,
          notification_preferences,
          news_sources,
          twitter_feed_enabled,
          twitter_feed_filters,
          perplexity_enabled,
          perplexity_settings,
          podcast_preferences,
          learning_style,
          created_at,
          updated_at
        FROM user_profiles
        WHERE user_id = '${userId.replace(/'/g, "''")}'
      `,
    });

    if (!result.results) {
      // ✅ NEW: Trigger migration if civicDb is available
      if (civicDb) {
        console.log('Profile not found, attempting migration from users table');
        return await migrateUserFromLegacyTable(civicDb, analytics, memory, userId);
      }
      return null;
    }

    const data = JSON.parse(result.results);
    const row = data[0];

    if (!row) {
      // ✅ NEW: Trigger migration if civicDb is available
      if (civicDb) {
        console.log('Profile not found, attempting migration from users table');
        return await migrateUserFromLegacyTable(civicDb, analytics, memory, userId);
      }
      return null;
    }

    // Parse JSON fields
    return {
      userId: row.user_id,
      firstName: row.first_name || undefined,
      lastName: row.last_name || undefined,
      preferredLanguage: row.preferred_language || 'en',
      policyInterests: JSON.parse(row.policy_interests || '[]'),
      representatives: JSON.parse(row.representatives || '[]'),
      location: JSON.parse(row.location || '{}'),
      notificationPreferences: JSON.parse(
        row.notification_preferences || JSON.stringify(getDefaultPreferences().notificationPreferences)
      ),
      newsSources: JSON.parse(row.news_sources || '[]'),
      twitterFeedEnabled: row.twitter_feed_enabled === 1,
      twitterFeedFilters: JSON.parse(
        row.twitter_feed_filters || '{"showAllReps": true, "showOnlyMyReps": false}'
      ),
      perplexityEnabled: row.perplexity_enabled === 1,
      perplexitySettings: JSON.parse(
        row.perplexity_settings || '{"suggestQuestions": true, "saveChatHistory": true, "maxTokens": 1000}'
      ),
      podcastPreferences: JSON.parse(
        row.podcast_preferences || JSON.stringify(getDefaultPreferences().podcastPreferences)
      ),
      learningStyle: row.learning_style || 'quick',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Create or update user profile
 *
 * @example
 * ```typescript
 * await updateUserProfile(analytics, memory, {
 *   userId: 'user-123',
 *   updates: {
 *     policyInterests: ['climate', 'healthcare'],
 *     representatives: [...],
 *     location: { state: 'MA', district: 'MA-07' }
 *   }
 * });
 * ```
 */
export async function updateUserProfile(
  analytics: SmartSql,
  memory: SmartMemory,
  context: PreferenceUpdateContext
): Promise<void> {
  const { userId, updates, source = 'unknown' } = context;

  try {
    // Ensure table exists
    await initializePreferencesTable(analytics);

    // Get existing profile or create new
    let existingProfile = await getUserProfile(analytics, memory, userId);

    if (!existingProfile) {
      // Create new profile with defaults
      existingProfile = {
        userId,
        ...getDefaultPreferences(),
        representatives: [],
        location: {
          state: '', // Will be set during onboarding
        },
        twitterFeedEnabled: true,
        twitterFeedFilters: {
          showAllReps: true,
          showOnlyMyReps: false,
          showHouseOnly: false,
          showSenateOnly: false,
        },
        perplexityEnabled: true,
        perplexitySettings: { suggestQuestions: true, saveChatHistory: true, maxTokens: 1000 },
        learningStyle: 'quick',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserProfile;
    }

    // Merge updates
    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date(),
    };

    // Upsert to database
    await analytics.executeQuery({
      sqlQuery: `
        INSERT OR REPLACE INTO user_profiles (
          user_id,
          policy_interests,
          representatives,
          location,
          notification_preferences,
          news_sources,
          twitter_feed_enabled,
          twitter_feed_filters,
          perplexity_enabled,
          perplexity_settings,
          podcast_preferences,
          learning_style,
          created_at,
          updated_at
        ) VALUES (
          '${userId.replace(/'/g, "''")}',
          '${JSON.stringify(updatedProfile.policyInterests).replace(/'/g, "''")}',
          '${JSON.stringify(updatedProfile.representatives).replace(/'/g, "''")}',
          '${JSON.stringify(updatedProfile.location).replace(/'/g, "''")}',
          '${JSON.stringify(updatedProfile.notificationPreferences).replace(/'/g, "''")}',
          '${JSON.stringify(updatedProfile.newsSources).replace(/'/g, "''")}',
          ${updatedProfile.twitterFeedEnabled ? 1 : 0},
          '${JSON.stringify(updatedProfile.twitterFeedFilters).replace(/'/g, "''")}',
          ${updatedProfile.perplexityEnabled ? 1 : 0},
          '${JSON.stringify(updatedProfile.perplexitySettings).replace(/'/g, "''")}',
          '${JSON.stringify(updatedProfile.podcastPreferences).replace(/'/g, "''")}',
          '${updatedProfile.learningStyle}',
          '${existingProfile.createdAt.toISOString()}',
          '${updatedProfile.updatedAt.toISOString()}'
        )
      `,
    });

    // Store in SmartMemory semantic memory for AI access
    await storeProfileInMemory(memory, updatedProfile, source);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Store user profile in SmartMemory for AI personalization
 */
async function storeProfileInMemory(
  memory: SmartMemory,
  profile: UserProfile,
  source: string
): Promise<void> {
  try {
    // Store in semantic memory (knowledge base)
    await memory.putSemanticMemory({
      userId: profile.userId,
      type: 'user_profile',
      policyInterests: profile.policyInterests,
      representatives: profile.representatives.map((r) => ({
        name: r.name,
        chamber: r.chamber,
        state: r.state,
      })),
      location: profile.location,
      learningStyle: profile.learningStyle,
      updatedAt: profile.updatedAt.toISOString(),
      source,
    });
  } catch (error) {
    console.error('Error storing profile in memory:', error);
    // Don't throw - memory storage is nice-to-have
  }
}

/**
 * Get widget preferences for user's dashboard
 */
export async function getWidgetPreferences(
  analytics: SmartSql,
  userId: string
): Promise<WidgetPreferences[]> {
  try {
    // Ensure table exists
    await initializeWidgetPreferencesTable(analytics);

    const result = await analytics.executeQuery({
      sqlQuery: `
        SELECT
          user_id,
          widget_type,
          is_visible,
          position,
          filter_settings,
          updated_at
        FROM widget_preferences
        WHERE user_id = '${userId.replace(/'/g, "''")}'
        ORDER BY position ASC
      `,
    });

    if (!result.results) {
      return getDefaultWidgetPreferences(userId);
    }

    const data = JSON.parse(result.results);

    if (data.length === 0) {
      return getDefaultWidgetPreferences(userId);
    }

    return data.map((row: any) => ({
      userId: row.user_id,
      widgetType: row.widget_type,
      isVisible: row.is_visible === 1,
      position: row.position,
      filterSettings: JSON.parse(row.filter_settings || '{}'),
      updatedAt: new Date(row.updated_at),
    }));
  } catch (error) {
    console.error('Error getting widget preferences:', error);
    return getDefaultWidgetPreferences(userId);
  }
}

/**
 * Update widget preferences
 */
export async function updateWidgetPreferences(
  analytics: SmartSql,
  userId: string,
  widgetType: WidgetType,
  updates: Partial<Omit<WidgetPreferences, 'userId' | 'widgetType'>>
): Promise<void> {
  try {
    await initializeWidgetPreferencesTable(analytics);

    // Get existing preference or create default
    const existing = await getWidgetPreferences(analytics, userId);
    const widgetPref = existing.find((w) => w.widgetType === widgetType);

    const updated = {
      userId,
      widgetType,
      isVisible: updates.isVisible ?? widgetPref?.isVisible ?? true,
      position: updates.position ?? widgetPref?.position ?? 0,
      filterSettings: updates.filterSettings ?? widgetPref?.filterSettings ?? {},
      updatedAt: new Date(),
    };

    await analytics.executeQuery({
      sqlQuery: `
        INSERT OR REPLACE INTO widget_preferences (
          user_id,
          widget_type,
          is_visible,
          position,
          filter_settings,
          updated_at
        ) VALUES (
          '${userId.replace(/'/g, "''")}',
          '${widgetType}',
          ${updated.isVisible ? 1 : 0},
          ${updated.position},
          '${JSON.stringify(updated.filterSettings).replace(/'/g, "''")}',
          '${updated.updatedAt.toISOString()}'
        )
      `,
    });
  } catch (error) {
    console.error('Error updating widget preferences:', error);
    throw error;
  }
}

/**
 * Initialize user_profiles table
 */
async function initializePreferencesTable(analytics: SmartSql): Promise<void> {
  await analytics.executeQuery({
    sqlQuery: `
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        preferred_language TEXT DEFAULT 'en',
        policy_interests TEXT NOT NULL,
        representatives TEXT NOT NULL,
        location TEXT NOT NULL,
        notification_preferences TEXT NOT NULL,
        news_sources TEXT NOT NULL,
        twitter_feed_enabled INTEGER DEFAULT 1,
        twitter_feed_filters TEXT NOT NULL,
        perplexity_enabled INTEGER DEFAULT 1,
        perplexity_settings TEXT NOT NULL,
        podcast_preferences TEXT NOT NULL,
        learning_style TEXT DEFAULT 'quick',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
  });
}

/**
 * Initialize widget_preferences table
 */
async function initializeWidgetPreferencesTable(analytics: SmartSql): Promise<void> {
  await analytics.executeQuery({
    sqlQuery: `
      CREATE TABLE IF NOT EXISTS widget_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        widget_type TEXT NOT NULL,
        is_visible INTEGER DEFAULT 1,
        position INTEGER DEFAULT 0,
        filter_settings TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, widget_type)
      )
    `,
  });
}

/**
 * Get default preferences for new users
 */
export function getDefaultPreferences(): DefaultPreferences {
  return {
    preferredLanguage: 'en', // Default to English
    policyInterests: [], // Will be set during onboarding
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
      billUpdates: true,
      representativeActivity: true,
      podcastReady: true,
      newsAlerts: false,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00',
      },
    },
    newsSources: ['the-hill', 'politico', 'congress', 'perplexity'],
    podcastPreferences: {
      autoGenerate: false, // User must opt-in
      preferredLength: 'standard',
      topics: [], // Same as policyInterests
      focus: ['my-reps', 'my-state'],
      listeningDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
  };
}

/**
 * Get default widget preferences (all visible, standard order)
 */
function getDefaultWidgetPreferences(userId: string): WidgetPreferences[] {
  return [
    { userId, widgetType: 'hero', isVisible: true, position: 0, filterSettings: {}, updatedAt: new Date() },
    { userId, widgetType: 'legislation', isVisible: true, position: 1, filterSettings: { category: 'all' }, updatedAt: new Date() },
    { userId, widgetType: 'twitter', isVisible: true, position: 2, filterSettings: { filter: 'all' }, updatedAt: new Date() },
    { userId, widgetType: 'news', isVisible: true, position: 3, filterSettings: { source: 'all' }, updatedAt: new Date() },
    { userId, widgetType: 'podcast-queue', isVisible: true, position: 4, filterSettings: {}, updatedAt: new Date() },
    { userId, widgetType: 'perplexity-chat', isVisible: true, position: 5, filterSettings: {}, updatedAt: new Date() },
    { userId, widgetType: 'civic-impact', isVisible: true, position: 6, filterSettings: {}, updatedAt: new Date() },
  ];
}

/**
 * Helper: Add policy interest to user profile
 */
export async function addPolicyInterest(
  analytics: SmartSql,
  memory: SmartMemory,
  userId: string,
  interest: string
): Promise<void> {
  const profile = await getUserProfile(analytics, memory, userId);
  if (!profile) {
    throw new Error('User profile not found');
  }

  if (!profile.policyInterests.includes(interest)) {
    profile.policyInterests.push(interest);
    await updateUserProfile(analytics, memory, {
      userId,
      updates: { policyInterests: profile.policyInterests },
      source: 'auto-learn',
    });
  }
}

/**
 * Helper: Remove policy interest from user profile
 */
export async function removePolicyInterest(
  analytics: SmartSql,
  memory: SmartMemory,
  userId: string,
  interest: string
): Promise<void> {
  const profile = await getUserProfile(analytics, memory, userId);
  if (!profile) {
    throw new Error('User profile not found');
  }

  profile.policyInterests = profile.policyInterests.filter((i) => i !== interest);
  await updateUserProfile(analytics, memory, {
    userId,
    updates: { policyInterests: profile.policyInterests },
    source: 'settings',
  });
}

// ============================================================================
// MIGRATION: Copy data from legacy users table to user_profiles
// ============================================================================

/**
 * Migrate user data from CIVIC_DB users table to ANALYTICS user_profiles
 * Called automatically when user_profiles record doesn't exist
 *
 * This ensures existing users get enhanced Phase 1 features without data loss
 */
export async function migrateUserFromLegacyTable(
  civicDb: any, // SqlDatabase type
  analytics: SmartSql,
  memory: SmartMemory,
  userId: string
): Promise<UserProfile | null> {
  try {
    console.log(`🔄 Starting migration for user: ${userId}`);

    // 1. Fetch user data from legacy users table
    const result = await civicDb.prepare(`
      SELECT
        id,
        email,
        name,
        zip_code,
        city,
        state,
        district,
        interests,
        email_notifications,
        audio_enabled,
        audio_frequencies,
        onboarding_completed
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    if (!result) {
      console.log(`❌ User ${userId} not found in legacy users table`);
      return null;
    }

    // 2. Parse legacy data
    const legacyUser = result as {
      id: string;
      email: string;
      name?: string;
      zip_code?: string;
      city?: string;
      state?: string;
      district?: number;
      interests?: string; // JSON string
      email_notifications?: number; // SQLite boolean
      audio_enabled?: number;
      audio_frequencies?: string;
      onboarding_completed?: number;
    };

    console.log('📦 Legacy user data:', {
      userId: legacyUser.id,
      email: legacyUser.email,
      hasOnboardingData: !!legacyUser.state,
      hasInterests: !!legacyUser.interests,
      onboardingComplete: legacyUser.onboarding_completed === 1,
    });

    // 3. Parse interests (JSON string in users table)
    let policyInterests: string[] = [];
    if (legacyUser.interests) {
      try {
        const parsed = JSON.parse(legacyUser.interests);
        policyInterests = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse interests:', legacyUser.interests);
      }
    }

    // 4. Fetch representatives based on location
    let representatives: any[] = [];
    if (legacyUser.state) {
      console.log(`🔍 Fetching representatives for ${legacyUser.state}, district ${legacyUser.district}`);
      representatives = await fetchRepresentativesByLocation(
        civicDb,
        legacyUser.state,
        legacyUser.district
      );
      console.log(`✅ Found ${representatives.length} representatives`);
    }

    // 5. Parse name into firstName and lastName
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (legacyUser.name) {
      const nameParts = legacyUser.name.trim().split(/\s+/);
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || undefined;
    }

    // 6. Build user_profiles record with migrated data
    const migratedProfile: UserProfile = {
      userId: legacyUser.id,

      // ✅ User identity (for personalization)
      firstName,
      lastName,
      preferredLanguage: 'en', // Default to English for migrated users

      // ✅ Migrated from users table
      policyInterests, // From users.interests
      location: {
        state: legacyUser.state || '',
        district: legacyUser.district?.toString(),
        city: legacyUser.city,
        zipCode: legacyUser.zip_code,
      },
      representatives, // Fetched based on users.state/district
      notificationPreferences: {
        email: legacyUser.email_notifications === 1,
        push: false, // New in Phase 1
        sms: false, // New in Phase 1
        billUpdates: true, // Default
        representativeActivity: true,
        podcastReady: legacyUser.audio_enabled === 1,
        newsAlerts: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
      },

      // ✅ New Phase 1 fields with defaults
      newsSources: [], // User can configure later
      twitterFeedEnabled: true,
      twitterFeedFilters: {
        showAllReps: true,
        showOnlyMyReps: false,
        showHouseOnly: false,
        showSenateOnly: false,
      },
      perplexityEnabled: true,
      perplexitySettings: {
        suggestQuestions: true,
        saveChatHistory: true,
        maxTokens: 1000,
      },
      podcastPreferences: {
        autoGenerate: legacyUser.audio_enabled === 1,
        generationTime: 'morning', // Default
        preferredLength: 'quick',
        topics: policyInterests, // Same as policy interests
        focus: [],
        listeningDays: ['monday', 'wednesday', 'friday'],
      },
      learningStyle: 'quick', // Default, user can change

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('💾 Saving migrated profile to ANALYTICS database...');

    // 6. Save to ANALYTICS database
    await saveUserProfile(analytics, migratedProfile);

    // 7. Store in SmartMemory for AI personalization
    await storeProfileInMemory(memory, migratedProfile, 'migration');

    console.log('✅ Migration complete for user:', userId);
    return migratedProfile;

  } catch (error) {
    console.error('❌ Migration failed for user:', userId, error);
    return null;
  }
}

/**
 * Fetch representatives by location
 */
async function fetchRepresentativesByLocation(
  civicDb: any,
  state: string,
  district?: number
): Promise<any[]> {
  try {
    let query = `
      SELECT
        bioguide_id,
        name,
        party,
        chamber,
        state,
        district,
        image_url,
        twitter_handle
      FROM representatives
      WHERE state = ?
    `;

    const params: (string | number)[] = [state];

    // Add district filter for House members
    if (district !== undefined) {
      query += ` AND (chamber = 'senate' OR district = ?)`;
      params.push(district.toString());
    } else {
      query += ` AND chamber = 'senate'`; // Only senators if no district
    }

    const result = await civicDb.prepare(query)
      .bind(...params)
      .all();

    return (result.results || []).map((rep: any) => ({
      bioguideId: rep.bioguide_id,
      name: rep.name,
      chamber: rep.chamber,
      state: rep.state,
      district: rep.district,
      party: rep.party,
      imageUrl: rep.image_url,
      twitterHandle: rep.twitter_handle,
    }));
  } catch (error) {
    console.error('Error fetching representatives:', error);
    return [];
  }
}

/**
 * Save user profile to database
 */
async function saveUserProfile(
  analytics: SmartSql,
  profile: UserProfile
): Promise<void> {
  await analytics.executeQuery({
    sqlQuery: `
      INSERT INTO user_profiles (
        user_id,
        first_name,
        last_name,
        preferred_language,
        policy_interests,
        representatives,
        location,
        notification_preferences,
        news_sources,
        twitter_feed_enabled,
        twitter_feed_filters,
        perplexity_enabled,
        perplexity_settings,
        podcast_preferences,
        learning_style,
        created_at,
        updated_at
      ) VALUES (
        '${profile.userId.replace(/'/g, "''")}',
        ${profile.firstName ? `'${profile.firstName.replace(/'/g, "''")}'` : 'NULL'},
        ${profile.lastName ? `'${profile.lastName.replace(/'/g, "''")}'` : 'NULL'},
        '${profile.preferredLanguage}',
        '${JSON.stringify(profile.policyInterests).replace(/'/g, "''")}',
        '${JSON.stringify(profile.representatives).replace(/'/g, "''")}',
        '${JSON.stringify(profile.location).replace(/'/g, "''")}',
        '${JSON.stringify(profile.notificationPreferences).replace(/'/g, "''")}',
        '${JSON.stringify(profile.newsSources).replace(/'/g, "''")}',
        ${profile.twitterFeedEnabled ? 1 : 0},
        '${JSON.stringify(profile.twitterFeedFilters).replace(/'/g, "''")}',
        ${profile.perplexityEnabled ? 1 : 0},
        '${JSON.stringify(profile.perplexitySettings).replace(/'/g, "''")}',
        '${JSON.stringify(profile.podcastPreferences).replace(/'/g, "''")}',
        '${profile.learningStyle}',
        '${profile.createdAt.toISOString()}',
        '${profile.updatedAt.toISOString()}'
      )
      ON CONFLICT(user_id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        preferred_language = excluded.preferred_language,
        policy_interests = excluded.policy_interests,
        representatives = excluded.representatives,
        location = excluded.location,
        notification_preferences = excluded.notification_preferences,
        news_sources = excluded.news_sources,
        twitter_feed_enabled = excluded.twitter_feed_enabled,
        twitter_feed_filters = excluded.twitter_feed_filters,
        perplexity_enabled = excluded.perplexity_enabled,
        perplexity_settings = excluded.perplexity_settings,
        podcast_preferences = excluded.podcast_preferences,
        learning_style = excluded.learning_style,
        updated_at = excluded.updated_at
    `,
  });
}
