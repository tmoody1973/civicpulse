/**
 * Phase 1 Integration Test Script
 * Tests SmartMemory, tracking, preferences, and procedural memory
 *
 * Run with: npx tsx scripts/test-phase-1.ts
 */

import { USER_MEMORY, ANALYTICS } from '../src/web/raindrop.gen.js';
import {
  trackInteraction,
  trackBillView,
  trackPodcastListen,
  getUserBehaviorPattern,
} from '../lib/tracking/user-interactions.js';
import {
  getUserProfile,
  updateUserProfile,
  getWidgetPreferences,
  updateWidgetPreferences,
  addPolicyInterest,
} from '../lib/preferences/user-preferences.js';
import {
  initializeProceduralMemory,
  getBillRecommendationPrompt,
  getChatAssistantPrompt,
  getPodcastTemplates,
  getSystemMessages,
} from '../lib/memory/procedural-init.js';

// Test configuration
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_SESSION_ID = 'test-session-' + Date.now();

// Colored console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, 'green');
}

function error(message: string) {
  log(`❌ ${message}`, 'red');
}

function info(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

async function runTests() {
  log('\n🚀 Starting Phase 1 Integration Tests\n', 'blue');
  log('═'.repeat(60), 'blue');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Initialize Procedural Memory
  log('\n📦 Test 1: Initialize Procedural Memory', 'yellow');
  try {
    await initializeProceduralMemory(USER_MEMORY);
    success('Procedural memory initialized');
    testsPassed++;
  } catch (err) {
    error(`Failed to initialize procedural memory: ${err}`);
    testsFailed++;
  }

  // Test 2: Track Interactions
  log('\n📊 Test 2: Track User Interactions', 'yellow');
  try {
    // Track bill view
    await trackBillView(USER_MEMORY, ANALYTICS, TEST_USER_ID, 'hr-3458', {
      billNumber: 'HR-3458',
      policyArea: 'Climate',
      readTime: 45,
    });
    success('Tracked bill view');

    // Track podcast listen
    await trackPodcastListen(USER_MEMORY, ANALYTICS, TEST_USER_ID, 'podcast-123', {
      podcastType: 'daily',
      duration: 420,
      completionRate: 0.95,
    });
    success('Tracked podcast listen');

    // Track generic interaction
    await trackInteraction(
      USER_MEMORY,
      ANALYTICS,
      {
        userId: TEST_USER_ID,
        interactionType: 'search',
        targetId: 'climate change bills',
        metadata: { resultCount: 15 },
      },
      { sessionId: TEST_SESSION_ID }
    );
    success('Tracked search interaction');

    testsPassed += 3;
  } catch (err) {
    error(`Failed to track interactions: ${err}`);
    testsFailed++;
  }

  // Test 3: Get User Behavior Pattern
  log('\n🧠 Test 3: Get User Behavior Pattern', 'yellow');
  try {
    // Note: This might return null for a brand new user
    const pattern = await getUserBehaviorPattern(ANALYTICS, TEST_USER_ID);
    if (pattern) {
      info(`User engagement score: ${pattern.engagementScore}`);
      info(`Total interactions: ${pattern.totalInteractions}`);
      info(`Policy interests: ${pattern.policyInterests.join(', ')}`);
      success('Retrieved user behavior pattern');
    } else {
      warn('No behavior pattern yet (expected for new user)');
    }
    testsPassed++;
  } catch (err) {
    error(`Failed to get behavior pattern: ${err}`);
    testsFailed++;
  }

  // Test 4: Create User Profile
  log('\n👤 Test 4: Create User Profile', 'yellow');
  try {
    await updateUserProfile(ANALYTICS, USER_MEMORY, {
      userId: TEST_USER_ID,
      updates: {
        policyInterests: ['climate', 'healthcare'],
        representatives: [
          {
            bioguideId: 'W000817',
            name: 'Elizabeth Warren',
            chamber: 'senate',
            state: 'MA',
            party: 'Democratic',
          },
          {
            bioguideId: 'P000617',
            name: 'Ayanna Pressley',
            chamber: 'house',
            state: 'MA',
            district: 'MA-07',
            party: 'Democratic',
          },
        ],
        location: {
          state: 'MA',
          district: 'MA-07',
          city: 'Boston',
          zipCode: '02108',
        },
        podcastPreferences: {
          autoGenerate: true,
          generationTime: '07:00',
          preferredLength: 'standard',
          topics: ['climate', 'healthcare'],
          focus: ['my-reps', 'my-state'],
          listeningDays: ['monday', 'wednesday', 'friday'],
        },
      },
      source: 'test',
    });
    success('Created user profile');
    testsPassed++;
  } catch (err) {
    error(`Failed to create user profile: ${err}`);
    testsFailed++;
  }

  // Test 5: Get User Profile
  log('\n📄 Test 5: Get User Profile', 'yellow');
  try {
    const profile = await getUserProfile(ANALYTICS, USER_MEMORY, TEST_USER_ID);
    if (profile) {
      info(`Policy interests: ${profile.policyInterests.join(', ')}`);
      info(`Representatives: ${profile.representatives.map((r) => r.name).join(', ')}`);
      info(`Location: ${profile.location.city}, ${profile.location.state}`);
      info(`Podcast auto-generate: ${profile.podcastPreferences.autoGenerate}`);
      success('Retrieved user profile');
    } else {
      error('User profile not found');
      testsFailed++;
    }
    testsPassed++;
  } catch (err) {
    error(`Failed to get user profile: ${err}`);
    testsFailed++;
  }

  // Test 6: Add Policy Interest
  log('\n🎯 Test 6: Add Policy Interest', 'yellow');
  try {
    await addPolicyInterest(ANALYTICS, USER_MEMORY, TEST_USER_ID, 'education');
    const updatedProfile = await getUserProfile(ANALYTICS, USER_MEMORY, TEST_USER_ID);
    if (updatedProfile && updatedProfile.policyInterests.includes('education')) {
      success('Added policy interest');
    } else {
      error('Policy interest not added');
      testsFailed++;
    }
    testsPassed++;
  } catch (err) {
    error(`Failed to add policy interest: ${err}`);
    testsFailed++;
  }

  // Test 7: Get Widget Preferences
  log('\n🧩 Test 7: Get Widget Preferences', 'yellow');
  try {
    const widgets = await getWidgetPreferences(ANALYTICS, TEST_USER_ID);
    info(`Found ${widgets.length} widgets`);
    widgets.forEach((w) => {
      info(`  - ${w.widgetType}: visible=${w.isVisible}, position=${w.position}`);
    });
    success('Retrieved widget preferences');
    testsPassed++;
  } catch (err) {
    error(`Failed to get widget preferences: ${err}`);
    testsFailed++;
  }

  // Test 8: Update Widget Preferences
  log('\n⚙️  Test 8: Update Widget Preferences', 'yellow');
  try {
    await updateWidgetPreferences(ANALYTICS, TEST_USER_ID, 'legislation', {
      isVisible: true,
      position: 0,
      filterSettings: { category: 'climate' },
    });
    const updatedWidgets = await getWidgetPreferences(ANALYTICS, TEST_USER_ID);
    const legislationWidget = updatedWidgets.find((w) => w.widgetType === 'legislation');
    if (legislationWidget && legislationWidget.filterSettings.category === 'climate') {
      success('Updated widget preferences');
    } else {
      error('Widget preferences not updated correctly');
      testsFailed++;
    }
    testsPassed++;
  } catch (err) {
    error(`Failed to update widget preferences: ${err}`);
    testsFailed++;
  }

  // Test 9: Get Bill Recommendation Prompt with Context
  log('\n📝 Test 9: Get Bill Recommendation Prompt', 'yellow');
  try {
    const profile = await getUserProfile(ANALYTICS, USER_MEMORY, TEST_USER_ID);
    if (profile) {
      const prompt = await getBillRecommendationPrompt(USER_MEMORY, {
        policyInterests: profile.policyInterests,
        representatives: profile.representatives,
        state: profile.location.state,
        district: profile.location.district,
        recentInteractions: [],
      });
      if (prompt.includes('Elizabeth Warren') && prompt.includes('climate')) {
        success('Generated personalized bill recommendation prompt');
        info(`Prompt length: ${prompt.length} characters`);
      } else {
        error('Prompt missing user context');
        testsFailed++;
      }
    } else {
      error('User profile not found');
      testsFailed++;
    }
    testsPassed++;
  } catch (err) {
    error(`Failed to get bill recommendation prompt: ${err}`);
    testsFailed++;
  }

  // Test 10: Get Chat Assistant Prompt
  log('\n💬 Test 10: Get Chat Assistant Prompt', 'yellow');
  try {
    const profile = await getUserProfile(ANALYTICS, USER_MEMORY, TEST_USER_ID);
    if (profile) {
      const prompt = await getChatAssistantPrompt(USER_MEMORY, {
        policyInterests: profile.policyInterests,
        representatives: profile.representatives,
        state: profile.location.state,
        district: profile.location.district,
        engagementScore: 85,
      });
      if (prompt.includes('Elizabeth Warren') && prompt.includes('climate')) {
        success('Generated personalized chat assistant prompt');
        info(`Prompt length: ${prompt.length} characters`);
      } else {
        error('Prompt missing user context');
        testsFailed++;
      }
    } else {
      error('User profile not found');
      testsFailed++;
    }
    testsPassed++;
  } catch (err) {
    error(`Failed to get chat assistant prompt: ${err}`);
    testsFailed++;
  }

  // Test 11: Get Podcast Templates
  log('\n🎙️  Test 11: Get Podcast Templates', 'yellow');
  try {
    const templates = await getPodcastTemplates(USER_MEMORY);
    if (templates && templates.dailyOpening && templates.weeklyOpening) {
      info(`Daily opening host: ${templates.dailyOpening.host}`);
      info(`Weekly opening host: ${templates.weeklyOpening.host}`);
      success('Retrieved podcast templates');
    } else {
      error('Podcast templates missing');
      testsFailed++;
    }
    testsPassed++;
  } catch (err) {
    error(`Failed to get podcast templates: ${err}`);
    testsFailed++;
  }

  // Test 12: Get System Messages
  log('\n📨 Test 12: Get System Messages', 'yellow');
  try {
    const messages = await getSystemMessages(USER_MEMORY);
    if (messages && messages.noRecommendations && messages.firstTimeUser) {
      info(`Found ${Object.keys(messages).length} system messages`);
      success('Retrieved system messages');
    } else {
      error('System messages missing');
      testsFailed++;
    }
    testsPassed++;
  } catch (err) {
    error(`Failed to get system messages: ${err}`);
    testsFailed++;
  }

  // Final Summary
  log('\n' + '═'.repeat(60), 'blue');
  log('\n📊 Test Summary', 'blue');
  log('═'.repeat(60) + '\n', 'blue');

  const totalTests = testsPassed + testsFailed;
  const passRate = ((testsPassed / totalTests) * 100).toFixed(1);

  if (testsFailed === 0) {
    success(`All ${testsPassed} tests passed! 🎉`);
  } else {
    warn(`Tests passed: ${testsPassed}/${totalTests} (${passRate}%)`);
    error(`Tests failed: ${testsFailed}/${totalTests}`);
  }

  log('\n' + '═'.repeat(60) + '\n', 'blue');

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((err) => {
  error(`Fatal error: ${err}`);
  process.exit(1);
});
