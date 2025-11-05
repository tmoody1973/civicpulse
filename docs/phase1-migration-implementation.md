# Phase 1 Migration: How Existing Accounts Get Enhanced

## Current Status: ⚠️ Migration Logic Needed

After reviewing the code, I found that **the automatic migration from `users` table to `user_profiles` is NOT yet implemented**. Here's what we have and what we need:

---

## What's Currently Implemented ✅

### 1. Profile Creation with Defaults

When a user's profile is requested but doesn't exist:

```typescript
// lib/preferences/user-preferences.ts - updateUserProfile()

if (!existingProfile) {
  // Creates profile with DEFAULT values (NOT from users table)
  existingProfile = {
    userId,
    policyInterests: [], // ❌ Empty, should copy from users.interests
    representatives: [], // ❌ Empty, should fetch from users.state/district
    location: {
      state: '', // ❌ Empty, should copy from users.state
    },
    twitterFeedEnabled: true,
    perplexityEnabled: true,
    learningStyle: 'quick',
    // ... other defaults
  };
}
```

**Problem:** This creates a profile but **doesn't migrate** data from the existing `users` table!

---

## What's Missing ❌

### Migration Function to Copy from `users` Table

We need a function that:
1. Reads data from CIVIC_DB `users` table
2. Transforms it into user_profiles format
3. Creates the user_profiles record with migrated data

---

## Solution: Implement Automatic Migration

### Step 1: Create Migration Helper Function

Add to `/lib/preferences/user-preferences.ts`:

```typescript
/**
 * Migrate user data from CIVIC_DB users table to ANALYTICS user_profiles
 * Called automatically when user_profiles record doesn't exist
 */
async function migrateUserFromLegacyTable(
  civicDb: SqlDatabase, // Pass from service
  analytics: SmartSql,
  memory: SmartMemory,
  userId: string
): Promise<UserProfile | null> {
  try {
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
      console.log(`User ${userId} not found in legacy users table`);
      return null;
    }

    // 2. Parse legacy data
    const legacyUser = result as {
      id: string;
      email: string;
      name: string;
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

    console.log('Migrating user from legacy table:', {
      userId: legacyUser.id,
      hasOnboardingData: !!legacyUser.state,
      hasInterests: !!legacyUser.interests,
    });

    // 3. Parse interests (JSON string in users table)
    let policyInterests: string[] = [];
    if (legacyUser.interests) {
      try {
        policyInterests = JSON.parse(legacyUser.interests);
      } catch (e) {
        console.error('Failed to parse interests:', legacyUser.interests);
      }
    }

    // 4. Fetch representatives based on location
    let representatives: any[] = [];
    if (legacyUser.state) {
      representatives = await fetchRepresentativesByLocation(
        civicDb,
        legacyUser.state,
        legacyUser.district
      );
    }

    // 5. Build user_profiles record with migrated data
    const migratedProfile: UserProfile = {
      userId: legacyUser.id,

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

    // 6. Save to ANALYTICS database
    await saveUserProfile(analytics, migratedProfile);

    // 7. Store in SmartMemory for AI personalization
    await storeProfileInMemory(memory, migratedProfile, 'migration');

    console.log('✅ Migration complete for user:', userId);
    return migratedProfile;

  } catch (error) {
    console.error('Migration failed for user:', userId, error);
    return null;
  }
}

/**
 * Fetch representatives by location
 */
async function fetchRepresentativesByLocation(
  civicDb: SqlDatabase,
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
      params.push(district);
    } else {
      query += ` AND chamber = 'senate'`; // Only senators if no district
    }

    const result = await civicDb.prepare(query)
      .bind(...params)
      .all();

    return result.results || [];
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
    `,
  });
}
```

---

### Step 2: Update `getUserProfile` to Trigger Migration

Modify `/lib/preferences/user-preferences.ts`:

```typescript
export async function getUserProfile(
  analytics: SmartSql,
  memory: SmartMemory,
  userId: string,
  civicDb?: SqlDatabase // ✅ Add optional civicDb parameter
): Promise<UserProfile | null> {
  try {
    // Ensure table exists
    await initializePreferencesTable(analytics);

    // Query user profile
    const result = await analytics.executeQuery({
      sqlQuery: `
        SELECT * FROM user_profiles
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

    // Parse and return existing profile
    return parseProfileFromRow(row);
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}
```

---

### Step 3: Update Preferences Service to Pass CIVIC_DB

Modify `/src/preferences/index.ts`:

```typescript
export default class PreferencesService extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    // ... CORS setup ...

    try {
      // ✅ Access both databases
      const { USER_MEMORY, ANALYTICS, CIVIC_DB } = this.env;

      // Route: GET /api/preferences/profile
      if (url.pathname === '/api/preferences/profile' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
          return this.jsonResponse(
            { success: false, error: 'userId is required' },
            corsHeaders,
            400
          );
        }

        // ✅ Pass CIVIC_DB to enable migration
        const profile = await getUserProfile(
          ANALYTICS,
          USER_MEMORY,
          userId,
          CIVIC_DB // ← Enables automatic migration
        );

        if (!profile) {
          return this.jsonResponse(
            { success: false, error: 'Profile not found and migration failed' },
            corsHeaders,
            404
          );
        }

        return this.jsonResponse({
          success: true,
          profile,
        }, corsHeaders);
      }

      // ... rest of routes ...
    }
  }
}
```

---

## How It Works: Step-by-Step Example

### Scenario: Existing User "Alice" Signs In

**Alice's existing data in `users` table:**
```sql
SELECT * FROM users WHERE email = 'alice@example.com';

-- Result:
id: 'user-abc-123'
email: 'alice@example.com'
name: 'Alice Johnson'
onboarding_completed: 1
zip_code: '02139'
city: 'Cambridge'
state: 'MA'
district: 7
interests: '["climate", "healthcare", "education"]'
email_notifications: 1
audio_enabled: 1
```

### What Happens:

**1. Alice loads her dashboard:**
```typescript
// Dashboard component calls
const response = await fetch('/api/preferences/profile?userId=user-abc-123');
```

**2. Preferences service receives request:**
```typescript
// src/preferences/index.ts
const profile = await getUserProfile(ANALYTICS, USER_MEMORY, userId, CIVIC_DB);
```

**3. getUserProfile checks for existing profile:**
```typescript
// lib/preferences/user-preferences.ts
const result = await analytics.executeQuery({
  sqlQuery: "SELECT * FROM user_profiles WHERE user_id = 'user-abc-123'"
});

if (!result.results) {
  // ❌ No profile found!
  // ✅ Trigger migration
  return await migrateUserFromLegacyTable(civicDb, analytics, memory, userId);
}
```

**4. Migration function executes:**
```typescript
// Step 1: Fetch from users table
const legacyUser = await civicDb.prepare(`
  SELECT * FROM users WHERE id = ?
`).bind('user-abc-123').first();

// Result:
{
  id: 'user-abc-123',
  state: 'MA',
  district: 7,
  interests: '["climate", "healthcare", "education"]',
  email_notifications: 1,
  audio_enabled: 1
}

// Step 2: Fetch representatives
const reps = await fetchRepresentativesByLocation(civicDb, 'MA', 7);
// Returns: [Elizabeth Warren, Ed Markey, Ayanna Pressley]

// Step 3: Build user_profiles record
const migratedProfile = {
  userId: 'user-abc-123',
  policyInterests: ['climate', 'healthcare', 'education'], // ✅ Copied!
  location: {
    state: 'MA', // ✅ Copied!
    district: '7', // ✅ Copied!
    city: 'Cambridge', // ✅ Copied!
    zipCode: '02139' // ✅ Copied!
  },
  representatives: [ // ✅ Fetched!
    {
      bioguideId: 'W000817',
      name: 'Elizabeth Warren',
      party: 'D',
      chamber: 'senate'
    },
    // ... Ed Markey, Ayanna Pressley
  ],
  notificationPreferences: {
    email: true, // ✅ From email_notifications
    podcastReady: true, // ✅ From audio_enabled
    // ... defaults for new fields
  },
  // ... Phase 1 enhancements with defaults
};

// Step 4: Save to ANALYTICS database
await saveUserProfile(analytics, migratedProfile);

// Step 5: Store in SmartMemory
await storeProfileInMemory(memory, migratedProfile, 'migration');
```

**5. Dashboard receives migrated profile:**
```json
{
  "success": true,
  "profile": {
    "userId": "user-abc-123",
    "policyInterests": ["climate", "healthcare", "education"],
    "location": {
      "state": "MA",
      "district": "7",
      "city": "Cambridge"
    },
    "representatives": [
      {
        "name": "Elizabeth Warren",
        "chamber": "senate",
        "party": "D"
      }
    ],
    "twitterFeedEnabled": true,
    "perplexityEnabled": true,
    "learningStyle": "quick"
  }
}
```

**6. Alice sees enhanced dashboard:**
- ✅ Her issue interests (climate, healthcare, education) preserved
- ✅ Her representatives displayed (Warren, Markey, Pressley)
- ✅ Her location settings intact
- ✅ New Phase 1 widgets enabled by default
- ✅ Can now configure new preferences (Twitter filters, Perplexity settings)

---

## Migration Trigger Points

The migration happens automatically on **first access** after Phase 1 deployment:

### Trigger 1: Dashboard Load
```typescript
// When user loads dashboard
useEffect(() => {
  fetchUserProfile(userId); // ✅ Triggers migration if needed
}, [userId]);
```

### Trigger 2: Settings Page
```typescript
// When user opens settings
const profile = await getUserProfile(...); // ✅ Triggers migration if needed
```

### Trigger 3: Tracking Event
```typescript
// When user clicks a bill (first interaction)
await trackBillView(...); // Could trigger profile creation
```

---

## Implementation Checklist

- [ ] Add `migrateUserFromLegacyTable()` function to `lib/preferences/user-preferences.ts`
- [ ] Add `fetchRepresentativesByLocation()` helper
- [ ] Add `saveUserProfile()` helper
- [ ] Update `getUserProfile()` to accept `civicDb` parameter and trigger migration
- [ ] Update `PreferencesService` to pass `CIVIC_DB` to getUserProfile
- [ ] Add migration logging for monitoring
- [ ] Test with existing user accounts
- [ ] Test with brand new users (should work as before)

---

## Testing the Migration

### Test 1: Existing User Migration
```typescript
// 1. Create test user in users table
await civicDb.prepare(`
  INSERT INTO users (id, email, state, district, interests, onboarding_completed)
  VALUES ('test-123', 'test@example.com', 'CA', 12, '["tech", "privacy"]', 1)
`).run();

// 2. Call preferences API (should trigger migration)
const response = await fetch('/api/preferences/profile?userId=test-123');
const data = await response.json();

// 3. Verify migration
expect(data.profile.policyInterests).toEqual(['tech', 'privacy']); // ✅ Copied
expect(data.profile.location.state).toBe('CA'); // ✅ Copied
expect(data.profile.representatives.length).toBeGreaterThan(0); // ✅ Fetched

// 4. Verify users table unchanged
const userAfter = await civicDb.prepare('SELECT * FROM users WHERE id = ?')
  .bind('test-123').first();
expect(userAfter).toEqual(userBefore); // ✅ Unchanged
```

---

## Summary

**Current State:**
- ❌ Migration logic NOT implemented
- ✅ Profile creation with defaults works
- ✅ Infrastructure in place (ANALYTICS, user_profiles table)

**What's Needed:**
1. Add migration function to read from `users` table
2. Update `getUserProfile` to trigger migration
3. Pass CIVIC_DB to preferences service

**Result After Implementation:**
- ✅ Existing users: Data automatically migrated on first access
- ✅ New users: Work as before with enhanced preferences
- ✅ Zero downtime: Migration happens lazily per user
- ✅ Zero data loss: Users table never modified

**Status:** 🚧 Implementation needed - migration logic must be added before Phase 1 is fully functional for existing users.
