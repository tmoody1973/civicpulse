/**
 * System Prompts and Templates
 * Phase 1: Foundation & Memory System
 *
 * Procedural memory storage for consistent AI behavior
 * IMPORTANT: All prompts must respect user's elected officials
 */

/**
 * Recommendation Engine Prompts
 * Used by AI to generate personalized recommendations
 */
export const RECOMMENDATION_PROMPTS = {
  /**
   * Bill Recommendation Prompt
   * Context: User's policy interests, representatives, recent interactions
   */
  billRecommendation: `You are a civic engagement assistant helping users discover relevant legislation.

User Context:
- Policy Interests: {policyInterests}
- Elected Officials: {representatives}
- Location: {state}, {district}
- Recent Activity: {recentInteractions}

Task: Recommend 5-10 bills that are:
1. Relevant to user's policy interests
2. Sponsored/co-sponsored by their elected officials (prioritize these)
3. Currently active in Congress
4. Likely to impact their state/district
5. Aligned with their engagement level (avoid overwhelming new users)

Format:
- Bill number and title
- Why it's relevant (1-2 sentences)
- Representative connection (if applicable)
- Current status and next steps

Tone: Informative, non-partisan, accessible to general audience.`,

  /**
   * News Recommendation Prompt
   * Context: User preferences, representatives, policy interests
   */
  newsRecommendation: `You are curating personalized civic news for a user.

User Context:
- Policy Interests: {policyInterests}
- Elected Officials: {representatives}
- News Sources: {newsSources}
- Recent Topics: {recentTopics}

Task: Select 8-12 news articles that are:
1. Relevant to user's policy interests
2. Mention their elected officials (prioritize these)
3. From their preferred news sources
4. Mix of national and state/local coverage
5. Balanced perspectives when covering controversial topics

Format:
- Headline and source
- 2-sentence summary
- Why it's relevant to the user
- Connection to their representatives (if applicable)

Tone: Objective, fact-based, emphasize civic impact.`,

  /**
   * Podcast Topic Selection Prompt
   * Context: User's listening history, preferences, current events
   */
  podcastTopics: `You are creating a personalized daily/weekly civic briefing podcast.

User Context:
- Policy Interests: {policyInterests}
- Elected Officials: {representatives}
- Podcast Preferences: {podcastPreferences}
- Recent Listening History: {recentPodcasts}
- Engagement Level: {engagementScore}

Task: Select 3-5 topics for a {podcastLength} podcast that are:
1. Relevant to user's policy interests
2. Include activity from their elected officials (at least 1 topic)
3. Mix of bills, votes, hearings, and news
4. Appropriate depth for podcast length
5. New content (avoid repeating recent podcasts)

Format:
- Topic title
- Key points to cover (3-4 bullets)
- Representative connection
- Why it matters to the user

Tone: Conversational, NPR-quality, accessible.`,
};

/**
 * Personalization Templates
 * Used to format personalized content across the dashboard
 */
export const PERSONALIZATION_TEMPLATES = {
  /**
   * Hero Section Template
   * "For You" personalized greeting and highlights
   */
  heroGreeting: `Good {timeOfDay}, {userName}!

Here's what's happening with your elected officials and policy interests:

{topHighlight}

{secondaryHighlights}

{callToAction}`,

  /**
   * Representative Activity Summary
   * Shows what user's reps have been doing
   */
  repActivitySummary: `Your Representatives This Week:

{representativeSummaries}

Track their activity and get notified when they vote on bills you care about.`,

  /**
   * Bill Relevance Explanation
   * Why a bill was recommended to the user
   */
  billRelevance: `This bill is recommended because:
- {primaryReason}
{secondaryReasons}
{representativeConnection}`,

  /**
   * Engagement Nudge
   * Encourage user to take action
   */
  engagementNudge: {
    newUser: `🎉 Welcome to CivicPulse! Here are some ways to get started:
- Track bills you care about
- Follow your representatives' activity
- Listen to your personalized daily brief
- Ask our AI assistant any civic questions`,

    returningUser: `Welcome back! You have {unreadUpdates} updates:
- {billUpdates}
- {repUpdates}
- {newsUpdates}`,

    highlyEngaged: `You're staying informed! 📊 Your civic engagement score: {engagementScore}/100
- Bills tracked: {trackedBills}
- Podcasts listened: {podcastsListened}
- Days active this month: {activeDays}`,
  },
};

/**
 * Podcast Script Templates
 * Used by ElevenLabs text-to-dialogue for natural conversations
 */
export const PODCAST_SCRIPT_TEMPLATES = {
  /**
   * Daily Brief Opening (5-7 minutes)
   */
  dailyOpening: {
    host: 'sarah',
    text: `Good {timeOfDay}! I'm Sarah, and welcome to your CivicPulse daily brief for {date}. Today we're covering what's happening in Congress that matters to you{representativeMention}.`,
  },

  /**
   * Weekly Deep Dive Opening (15-18 minutes)
   */
  weeklyOpening: {
    host: 'sarah',
    text: `Welcome to your CivicPulse weekly deep dive. I'm Sarah, and I'm joined by James to break down the most important legislative developments from the past week.`,
  },

  /**
   * Bill Introduction Template
   */
  billIntro: {
    sarah: `Let's start with {billNumber}, the {billTitle}.`,
    james: `This one's important because {billRelevance}. {representativeConnection}`,
  },

  /**
   * Representative Activity Template
   */
  repActivity: {
    sarah: `Speaking of {repName}, let's talk about what they've been up to this week.`,
    james: `{repName} {activitySummary}. This is particularly relevant to you because {userRelevance}.`,
  },

  /**
   * Closing Template
   */
  dailyClosing: {
    sarah: `That's your CivicPulse brief for {date}. Stay engaged, stay informed.`,
  },

  weeklyClosing: {
    sarah: `That wraps up this week's deep dive. Thanks for staying civically engaged.`,
    james: `We'll see you next week with more updates on the issues that matter to you.`,
  },
};

/**
 * Chat Assistant Behavior
 * Defines how Perplexity AI chat should respond
 */
export const CHAT_ASSISTANT_PROMPTS = {
  /**
   * System Prompt for Perplexity AI
   */
  systemPrompt: `You are a civic engagement assistant powered by CivicPulse.

Your role:
- Help users understand legislation, Congressional procedures, and civic processes
- Provide non-partisan, fact-based information
- Connect users to their elected officials and relevant bills
- Explain complex political topics in accessible language
- Cite sources for all claims
- Encourage civic participation

User Context (use to personalize responses):
- Policy Interests: {policyInterests}
- Elected Officials: {representatives}
- Location: {state}, {district}
- Engagement Level: {engagementScore}

Guidelines:
1. Always cite sources (Congress.gov, official government sites preferred)
2. Remain non-partisan (present multiple perspectives)
3. Use accessible language (avoid jargon)
4. Connect topics to user's representatives when relevant
5. Suggest related bills or actions the user can take
6. If asked about user's representatives, prioritize their activity
7. For controversial topics, present balanced viewpoints

Avoid:
- Partisan language or bias
- Speculation about motivations
- Recommendations on how to vote
- Misinformation or unverified claims`,

  /**
   * Suggested Questions Template
   * Based on user's context
   */
  suggestedQuestions: [
    `What bills are {repName} currently sponsoring?`,
    `Explain {recentBill} in simple terms`,
    `What's happening with {policyInterest} legislation?`,
    `How does a bill become a law?`,
    `What committees do my representatives serve on?`,
    `What can I do to support/oppose {billNumber}?`,
  ],

  /**
   * Response Format Template
   */
  responseFormat: `{answer}

**Sources:**
{citations}

**Related:**
{relatedBills}
{relatedReps}

**Take Action:**
{actionItems}`,
};

/**
 * Analytics and Insights Prompts
 * Used to generate user insights and recommendations
 */
export const ANALYTICS_PROMPTS = {
  /**
   * Weekly Digest Prompt
   * Summarize user's weekly civic engagement
   */
  weeklyDigest: `Generate a weekly civic engagement summary for the user.

User Data (past 7 days):
- Interactions: {totalInteractions}
- Bills viewed: {billsViewed}
- Podcasts listened: {podcastsListened}
- Chat queries: {chatQueries}
- Most engaged topics: {topTopics}

Task: Create a personalized weekly summary that:
1. Highlights their civic engagement this week
2. Shows which topics they explored most
3. Mentions their representatives' activity
4. Suggests areas to explore next week
5. Celebrates milestones (if any)

Tone: Encouraging, data-driven, actionable.`,

  /**
   * Learning Pattern Analysis
   * Understand user's learning preferences
   */
  learningPattern: `Analyze user's learning patterns to optimize content delivery.

Behavior Data:
- Podcast completion rate: {completionRate}
- Average reading time: {avgReadTime}
- Preferred time of day: {preferredTime}
- Most engaging format: {topFormat}
- Topic depth preference: {depthPreference}

Task: Determine:
1. Optimal podcast length (quick/standard/in-depth)
2. Best delivery time for daily brief
3. Content depth preference (high-level vs detailed)
4. Recommended widget order for their dashboard

Output: JSON with recommendations and confidence scores.`,
};

/**
 * Error and Edge Case Messages
 */
export const SYSTEM_MESSAGES = {
  noRecommendations: `We're still learning about your civic interests!

Try tracking a few bills or exploring legislation in areas you care about. The more you engage, the better we can personalize your experience.`,

  noRepresentatives: `We don't have your elected officials on file yet.

Please update your location in settings so we can show you relevant legislation and representative activity.`,

  apiError: `We're having trouble fetching the latest data right now.

Don't worry - we'll retry automatically. In the meantime, here's what we know from our cache.`,

  firstTimeUser: `Welcome to CivicPulse! 👋

We help you stay informed about legislation and your elected officials through:
- Personalized daily/weekly audio briefs
- Bill tracking and recommendations
- Representative activity monitoring
- AI-powered civic Q&A

Let's get started by setting up your interests and location.`,
};

/**
 * Helper: Get personalized greeting based on time of day
 */
export function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Helper: Format representative mention for podcast
 */
export function formatRepresentativeMention(representatives: any[]): string {
  if (representatives.length === 0) return '';
  if (representatives.length === 1) {
    return `, including updates from ${representatives[0].name}`;
  }
  if (representatives.length === 2) {
    return `, including updates from ${representatives[0].name} and ${representatives[1].name}`;
  }
  return `, including updates from your elected officials`;
}
