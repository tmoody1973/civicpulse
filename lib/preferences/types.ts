/**
 * User Preference Types
 * Phase 1: Foundation & Memory System
 *
 * Defines interfaces for user preferences and settings
 * IMPORTANT: All preferences must respect user's elected officials from onboarding
 */

export interface UserProfile {
  userId: string;

  // User Identity (for personalization in newsletters, greetings, etc.)
  firstName?: string;
  lastName?: string;

  // Language Preference (for multi-lingual audio, UI, and content translation)
  preferredLanguage: string;  // ISO 639-1 code: 'en', 'es', 'fr', 'de', 'pt', 'it', 'hi', etc.

  // Policy Interests (from onboarding + learned from behavior)
  policyInterests: string[];  // ['climate', 'healthcare', 'education', ...]

  // Elected Officials (from onboarding - state/district)
  representatives: {
    bioguideId: string;      // Representative's ID
    name: string;
    chamber: 'house' | 'senate';
    state: string;
    district?: string;        // House only
    party: string;
  }[];

  // Location (from onboarding)
  location: {
    state: string;            // e.g., "MA"
    district?: string;        // e.g., "MA-07"
    city?: string;
    zipCode?: string;
  };

  // Notification Preferences
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;

    // What to notify about
    billUpdates: boolean;     // Bills user is tracking
    representativeActivity: boolean;  // When reps vote/co-sponsor
    podcastReady: boolean;    // When daily brief is generated
    newsAlerts: boolean;      // Breaking political news

    // Timing
    quietHours: {
      enabled: boolean;
      start: string;          // e.g., "22:00"
      end: string;            // e.g., "07:00"
    };
  };

  // News Source Preferences
  newsSources: string[];      // ['the-hill', 'politico', 'congress', 'perplexity']

  // Twitter Feed Preferences
  twitterFeedEnabled: boolean;
  twitterFeedFilters: {
    showAllReps: boolean;
    showOnlyMyReps: boolean;
    showHouseOnly: boolean;
    showSenateOnly: boolean;
    specificReps?: string[];  // Bioguide IDs
  };

  // Perplexity AI Preferences
  perplexityEnabled: boolean;
  perplexitySettings: {
    suggestQuestions: boolean;
    saveChatHistory: boolean;
    maxTokens: number;
  };

  // Podcast Preferences (will be expanded in Phase 5)
  podcastPreferences: {
    autoGenerate: boolean;
    generationTime?: string;  // e.g., "07:00"
    preferredLength: 'quick' | 'standard' | 'in-depth';  // 3-5min, 5-7min, 15-18min
    topics: string[];         // Same as policyInterests
    focus: string[];          // ['my-reps', 'my-state', 'trending', 'hearings']
    listeningDays: string[];  // ['monday', 'tuesday', ...]
  };

  // Learning Style
  learningStyle: 'quick' | 'detailed' | 'audio-focused';

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetPreferences {
  userId: string;
  widgetType: WidgetType;
  isVisible: boolean;
  position: number;          // Order on dashboard (0-indexed)
  filterSettings: Record<string, any>;  // Widget-specific filters
  updatedAt: Date;
}

export type WidgetType =
  | 'hero'                    // "For You" hero section
  | 'legislation'             // Legislation feed
  | 'twitter'                 // Representative Twitter feed
  | 'news'                    // News aggregation
  | 'podcast-queue'           // Podcast queue
  | 'perplexity-chat'         // AI chat
  | 'civic-impact';           // Analytics dashboard

export interface PreferenceUpdateContext {
  userId: string;
  updates: Partial<UserProfile>;
  source?: string;            // 'onboarding', 'settings', 'auto-learn'
  metadata?: Record<string, any>;
}

export interface DefaultPreferences {
  preferredLanguage: string;
  policyInterests: string[];
  notificationPreferences: UserProfile['notificationPreferences'];
  newsSources: string[];
  podcastPreferences: UserProfile['podcastPreferences'];
}

// Supported languages for audio generation, UI, and content translation
// Based on ElevenLabs Multilingual v2 model support
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
] as const;
